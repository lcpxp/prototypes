// ------------------------------------------------------------------
// shared/work-items-data.js - The reads over work_items and work_notes that the
// list pages deliberately no longer carry.
//
// The roadmap board and the backlog table draw the same rows, and
// neither shows an item's prose or its notes: only a drawer or a modal
// does, one item at a time. So those come off the page load
// (docs/plan/80-LOAD-SPEED.md) and are fetched here instead - one item's
// worth when a drawer opens, or a whole set's worth at the moment an
// export is pressed.
//
// Shared by both pages because it is one table and one rule. Anything
// roadmap-specific belongs beside the board fetch, not here.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Active entries lead, then resolved or superseded, each kept in its
  // recency order, so replaced context sits below the current record.
  // Anything the status vocabulary grows to that is not 'active' sorts
  // with the replaced ones, which is the safe direction: a new status
  // appears below the live record rather than above it.
  var STATUS_RANK = { active: 0 };
  function ranked(rows) {
    return rows.slice().sort(function (a, b) {
      return (STATUS_RANK[a.status] != null ? 0 : 1) -
        (STATUS_RANK[b.status] != null ? 0 : 1);
    });
  }

  function has(item, key) {
    return Object.prototype.hasOwnProperty.call(item, key);
  }

  // Loaded is PRESENCE, not truthiness - the same rule App.lazyDetail
  // holds. An item whose details are genuinely empty is loaded, and
  // guarding on truthiness asks the database for it again on every
  // export, forever, with nothing ever looking wrong.
  function pending(items, key) {
    return (items || []).filter(function (i) { return !has(i, key); });
  }

  // Ids travel in the query string of a PostgREST `in.()` filter, so a
  // whole board is around 10KB of URL - past the header buffer of more
  // than one proxy between here and Postgres. Ask in batches instead:
  // three requests that work beat one that fails at a row count nobody
  // predicted.
  var BATCH = 100;
  function batches(ids) {
    var out = [];
    for (var i = 0; i < ids.length; i += BATCH) out.push(ids.slice(i, i + BATCH));
    return out;
  }

  function loadNotes(item) {
    return App.db.from(App.registry.tables.workNotes)
      .select("work_item_id, kind, body, status, created_at")
      .eq("work_item_id", item.id)
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return { notes: ranked(res.data || []) };
      });
  }

  // One row's long columns, the ones a surface shows one row at a time.
  function loadColumns(item, cols) {
    return App.db.from(App.registry.tables.workItems)
      .select(cols.join(", "))
      .eq("id", item.id)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        // A row RLS withheld answers null rather than undefined, so the
        // drawer caches "nothing to show" instead of asking again on
        // every open.
        var out = {};
        cols.forEach(function (c) { out[c] = res.data ? res.data[c] : null; });
        return out;
      });
  }

  // What a drawer needs and the board does not carry: the prose, the
  // stories and the notes. One settled set, so the drawer paints once
  // rather than three times, and one failed read fails the set - the
  // drawer says so instead of showing part of it as though it were all
  // of it.
  function loadDrawer(item) {
    return Promise.all([loadColumns(item, ["details", "user_stories"]), loadNotes(item)])
      .then(function (parts) {
        return { details: parts[0].details, user_stories: parts[0].user_stories,
          notes: parts[1].notes };
      });
  }

  // The backlog modal shows the prose but not the notes or the stories,
  // so it asks for one field rather than paying for sections it does not
  // render.
  function loadModal(item) {
    return loadColumns(item, ["details"]);
  }

  // One long column for a whole set of rows, in batches. details and
  // user_stories are both shown one row at a time, so both stay off the
  // page load and come back for an export that writes them.
  function columnLoader(col) {
    return function (items) {
      var todo = pending(items, col);
      if (!todo.length) return Promise.resolve();
      var byId = {};
      todo.forEach(function (i) { byId[i.id] = i; });
      return Promise.all(batches(Object.keys(byId)).map(function (ids) {
        return App.db.from(App.registry.tables.workItems)
          .select("id, " + col).in("id", ids);
      })).then(function (results) {
        results.forEach(function (res) {
          if (res.error) throw res.error;
          (res.data || []).forEach(function (row) {
            if (byId[row.id]) byId[row.id][col] = row[col];
          });
        });
        // A row RLS withheld has been answered too, or the next export
        // asks again for something it will never be given.
        todo.forEach(function (i) { if (!has(i, col)) i[col] = null; });
      });
    };
  }

  function loadNotesFor(items) {
    var todo = pending(items, "notes");
    if (!todo.length) return Promise.resolve();
    var byId = {};
    todo.forEach(function (i) { byId[i.id] = i; });
    return Promise.all(batches(Object.keys(byId)).map(function (ids) {
      return App.db.from(App.registry.tables.workNotes)
        .select("work_item_id, kind, body, status, created_at")
        .in("work_item_id", ids)
        .order("created_at", { ascending: false });
    })).then(function (results) {
      // A given item's notes all land in one batch, because the batches
      // partition the ids - so the recency order each request was asked
      // for survives the regrouping.
      var grouped = {};
      results.forEach(function (res) {
        if (res.error) throw res.error;
        (res.data || []).forEach(function (row) {
          (grouped[row.work_item_id] = grouped[row.work_item_id] || []).push(row);
        });
      });
      todo.forEach(function (i) { i.notes = ranked(grouped[i.id] || []); });
    });
  }

  var LOADERS = {
    details: columnLoader("details"),
    user_stories: columnLoader("user_stories"),
    notes: loadNotesFor,
  };

  // The stories as paste-ready text, for Azure DevOps ("devops") or the
  // company roadmap ("roadmap"). The layout is the database's
  // (sprint_story_pack in supabase/schema/38_sprint_handoff.sql), so a
  // copy from the drawer and a session's printout are the same text.
  function loadStoryPack(id, part) {
    return App.db.rpc("sprint_story_pack", { p_id: id, p_part: part })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || "";
      });
  }

  // Fetch the named heavy fields for a set of rows and write them onto
  // those rows, so the export builders stay pure and stay synchronous.
  //
  // Rejects if any read fails, and the caller must then cancel the
  // download: a file written without a column it used to carry is data
  // loss nobody notices until they open it.
  function loadForExport(items, keys) {
    return Promise.all((keys || []).map(function (k) {
      return LOADERS[k](items || []);
    })).then(function () { return items; });
  }

  App.workItemsData = {
    loadDrawer: loadDrawer,
    loadModal: loadModal,
    loadNotes: loadNotes,
    loadForExport: loadForExport,
    loadStoryPack: loadStoryPack,
    ranked: ranked,
    STATUS_RANK: STATUS_RANK,
    BATCH: BATCH,
  };
})();
