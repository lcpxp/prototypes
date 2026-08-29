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

  function loadDetail(item) {
    return App.db.from(App.registry.tables.workItems)
      .select("details")
      .eq("id", item.id)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        // A row RLS withheld answers null rather than undefined, so the
        // drawer caches "nothing to show" instead of asking again on
        // every open.
        return res.data ? res.data.details : null;
      });
  }

  // What a drawer needs and the board does not carry. One settled pair,
  // so the drawer paints once rather than twice, and one failed read
  // fails the pair - the drawer says so instead of showing half of it as
  // though it were all of it.
  function loadDrawer(item) {
    return Promise.all([loadDetail(item), loadNotes(item)])
      .then(function (parts) {
        return { details: parts[0], notes: parts[1].notes };
      });
  }

  // The backlog modal shows the prose but not the notes, so it asks for
  // one field rather than paying for a section it does not render.
  function loadModal(item) {
    return loadDetail(item).then(function (details) {
      return { details: details };
    });
  }

  function loadDetails(items) {
    var todo = pending(items, "details");
    if (!todo.length) return Promise.resolve();
    var byId = {};
    todo.forEach(function (i) { byId[i.id] = i; });
    return Promise.all(batches(Object.keys(byId)).map(function (ids) {
      return App.db.from(App.registry.tables.workItems)
        .select("id, details").in("id", ids);
    })).then(function (results) {
      results.forEach(function (res) {
        if (res.error) throw res.error;
        (res.data || []).forEach(function (row) {
          if (byId[row.id]) byId[row.id].details = row.details;
        });
      });
      // A row RLS withheld has been answered too, or the next export
      // asks again for something it will never be given.
      todo.forEach(function (i) { if (!has(i, "details")) i.details = null; });
    });
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

  var LOADERS = { details: loadDetails, notes: loadNotesFor };

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
    ranked: ranked,
    STATUS_RANK: STATUS_RANK,
    BATCH: BATCH,
  };
})();
