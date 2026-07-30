// ------------------------------------------------------------------
// appreview-board.js - The triage board page for
// modules/app-review/wave.html: state, fetching, wiring and the
// filter interactions. The HTML itself is built by
// appreview-render.js, and the drawer body by appreview-detail.js.
//
// Filter state lives in memory for the session only. Nothing about a
// record is written to browser storage - these rows carry merchant and
// partner names, and they belong in Supabase and nowhere else.
//
// Read-only: the page never writes. Confirming, reclassifying, closing
// a wave and carrying the watch list forward all happen in a Claude
// Code session (docs/APP-REVIEW.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  var M = App.appReview;
  var F = App.appReviewFindings;
  var R = App.appReviewRender;

  var state = {
    wave: null,
    apps: [],
    evidence: {},
    // The render context: everything a builder needs, assembled once.
    ctx: { categories: {}, statuses: {}, dupes: {}, active: [], now: 0 },
    drawer: null,
  };

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function day(value) {
    if (!value) return "";
    var parsed = new Date(value);
    return isNaN(parsed) ? "" : parsed.toISOString().slice(0, 10);
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  function renderAll() {
    state.ctx.now = Date.now();
    document.getElementById("ar-split").innerHTML =
      R.splitHtml(state.apps, state.ctx);
    document.getElementById("ar-partner-blockers").innerHTML =
      R.partnerPanelHtml(state.apps);

    var doNow = R.doNowHtml(state.apps, state.ctx);
    document.getElementById("ar-donow-head").textContent = doNow.heading;
    document.getElementById("ar-donow").innerHTML = doNow.html;

    renderFiltered();
  }

  // Only the parts a filter change can affect, so toggling a category
  // does not rebuild the headline counts or the do-now strip - both of
  // which describe the whole wave, not the current view of it.
  function renderFiltered() {
    document.getElementById("ar-legend").innerHTML =
      R.legendHtml(state.apps, state.ctx);
    document.getElementById("ar-board").innerHTML =
      R.boardHtml(state.apps, state.ctx);
    document.getElementById("ar-showing").textContent =
      "Showing " + M.visible(state.apps, state.ctx.active).length +
      " of " + state.apps.length;
  }

  function renderWaveHead() {
    document.getElementById("ar-wave-name").textContent = state.wave.name;
    document.title = state.wave.name +
      " - Application review - LPio / LaunchPad IO";
    document.getElementById("ar-wave-meta").innerHTML =
      '<p class="ar-wave-state">' + App.statusBadge(state.wave.state) +
      "<span>Opened " + App.escape(day(state.wave.opened_at)) +
      (state.wave.closed_at
        ? ", closed " + App.escape(day(state.wave.closed_at)) : "") +
      "</span></p>" +
      (state.wave.notes
        ? '<p class="lede">' + App.escape(state.wave.notes) + "</p>" : "");
  }

  // ----------------------------------------------------------------
  // Interaction
  // ----------------------------------------------------------------

  function openApplication(id) {
    var app = state.apps.filter(function (row) { return row.id === id; })[0];
    if (!app || !state.drawer) return;
    state.drawer.open(App.appReviewDetail(app, {
      categories: state.ctx.categories,
      statuses: state.ctx.statuses,
      dupes: state.ctx.dupes,
      evidence: state.evidence[id] || [],
      now: Date.now(),
    }), { label: "Application detail: " + app.merchant_name });
  }

  // Categories toggle independently and all start on, so hiding one or
  // two is a single click rather than re-picking everything else.
  function toggleCategory(key) {
    var at = state.ctx.active.indexOf(key);
    if (at === -1) state.ctx.active.push(key);
    else state.ctx.active.splice(at, 1);
    renderFiltered();
  }

  // A group heading solos its group - the fastest way to pull the
  // standing list out of a worked board. Clicking a soloed heading
  // again restores everything.
  function soloGroup(groupKey) {
    var members = Object.keys(state.ctx.categories).filter(function (key) {
      return state.ctx.categories[key].group_key === groupKey;
    });
    var alreadySolo = state.ctx.active.length === members.length &&
      members.every(function (key) {
        return state.ctx.active.indexOf(key) !== -1;
      });
    state.ctx.active = alreadySolo
      ? Object.keys(state.ctx.categories) : members;
    renderFiltered();
  }

  function wire() {
    state.drawer = App.drawer({
      drawer: "ar-drawer", scrim: "ar-scrim",
      body: "ar-drawer-body", close: "ar-drawer-close",
      openClass: "ar-drawer-open",
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest) return;
      var chip = event.target.closest("[data-category]");
      if (chip) { toggleCategory(chip.getAttribute("data-category")); return; }
      var head = event.target.closest("[data-group]");
      if (head) { soloGroup(head.getAttribute("data-group")); return; }
      var row = event.target.closest("[data-application]");
      if (row) openApplication(row.getAttribute("data-application"));
    });

    // Board rows are focusable, so they must activate from the
    // keyboard too. Buttons already do this for free.
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (!event.target.closest) return;
      var row = event.target.closest("tr[data-application]");
      if (!row) return;
      event.preventDefault();
      openApplication(row.getAttribute("data-application"));
    });
  }

  // ----------------------------------------------------------------
  // Load
  // ----------------------------------------------------------------

  async function loadEvidence(ids) {
    if (!ids.length) return;
    var result = await App.db.from(App.registry.tables.reviewEvidence)
      .select("application_id, occurred_on, source, actor, direction, " +
        "summary, is_truncated, signal, screenshot_ref")
      .in("application_id", ids)
      .is("deleted_at", null)
      .order("occurred_on", { ascending: true });
    (result.data || []).forEach(function (row) {
      if (!state.evidence[row.application_id]) {
        state.evidence[row.application_id] = [];
      }
      state.evidence[row.application_id].push(row);
    });
  }

  App.onAuthed(async function () {
    var host = document.getElementById("ar-board");
    var id = param("wave");
    if (!id) {
      App.notice(host, "error",
        "No wave named in the address. Open one from the wave list.");
      return;
    }

    var results = await Promise.all([
      App.db.from(App.registry.tables.reviewWaves)
        .select("id, name, state, opened_at, closed_at, notes")
        .eq("id", id).is("deleted_at", null).maybeSingle(),
      App.db.from(App.registry.tables.reviewApplications)
        .select("*").eq("wave_id", id).is("deleted_at", null)
        .order("display_order", { ascending: true }),
      App.db.from(App.registry.tables.triageCategories)
        .select("key, label, description, group_key, colour_token, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.launchpadStatuses)
        .select("key, label, age_meaningful, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    var failed = results.filter(function (r) { return r.error; })[0];
    if (failed) {
      App.notice(host, "error",
        "Could not load this wave: " + failed.error.message);
      return;
    }
    if (!results[0].data) {
      App.notice(host, "error",
        "No wave with that id, or it is not one you have access to.");
      return;
    }

    state.wave = results[0].data;
    state.apps = results[1].data || [];
    state.ctx.categories = M.index(results[2].data || []);
    state.ctx.statuses = M.index(results[3].data || []);
    state.ctx.dupes = F.duplicateKeys(state.apps);
    // Every category showing by default: the board opens as the whole
    // picture, and filtering is subtraction from it.
    state.ctx.active = Object.keys(state.ctx.categories);

    await loadEvidence(state.apps.map(function (app) { return app.id; }));

    renderWaveHead();
    wire();
    renderAll();

    // Deep link straight into one application's drawer.
    var wanted = param("application");
    if (wanted) openApplication(wanted);
  });
})();
