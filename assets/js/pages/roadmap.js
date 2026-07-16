// ------------------------------------------------------------------
// roadmap.js - The roadmap home for modules/roadmap/. A read-only,
// print-ready render of the LaunchPad roadmap tables in Supabase, with
// a level switcher over one dataset:
//   Executive  the curated C-suite one-pager (default; prints)
//   Team       the full picture, in a Cascade or Timeline layout
//   Backlog    the open feeder, grouped by theme
//   Parked     de-scoped items with the reasoning kept
// The pure HTML builders live in roadmap-views.js (App.roadmapView) so
// they unit-test without a DOM. This file is the shell: fetch, switch,
// route, print. Editing the roadmap is a database change (see
// docs/ROADMAP.md and docs/ROADMAP-PROCESS.md); the page renders live
// table state.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var LEVELS = [
    { key: "exec", label: "Executive", build: "execHtml" },
    { key: "team", label: "Team", build: null },
    { key: "backlog", label: "Backlog", build: "backlogHtml" },
    { key: "parked", label: "Parked", build: "parkedHtml" },
  ];
  // Team's two layouts. Cascade is the default reading; Timeline ranks
  // by priority and shows overlap.
  var LAYOUTS = [
    { key: "cascade", label: "Cascade", build: "cascadeHtml" },
    { key: "timeline", label: "Timeline", build: "timelineHtml" },
  ];
  var LEVEL_STORE = "roadmap-level";
  var LAYOUT_STORE = "roadmap-layout";

  var data = { categories: [], areas: [], items: [], backlog: [] };
  var current = "exec";
  var layout = "cascade";

  function find(list, key) {
    return list.filter(function (x) { return x.key === key; })[0];
  }

  // The hash is level, plus /layout for Team: "#team/timeline".
  function readState() {
    var parts = (window.location.hash || "").replace(/^#/, "").split("/");
    current = find(LEVELS, parts[0]) ? parts[0] : storedLevel();
    layout = find(LAYOUTS, parts[1]) ? parts[1] : storedLayout();
  }

  function storedLevel() {
    var v = null;
    try { v = window.localStorage.getItem(LEVEL_STORE); } catch (e) { v = null; }
    return find(LEVELS, v) ? v : "exec";
  }

  function storedLayout() {
    var v = null;
    try { v = window.localStorage.getItem(LAYOUT_STORE); } catch (e) { v = null; }
    return find(LAYOUTS, v) ? v : "cascade";
  }

  function hashFor() {
    return current === "team" ? current + "/" + layout : current;
  }

  function builderName() {
    return current === "team" ? find(LAYOUTS, layout).build : find(LEVELS, current).build;
  }

  function render(host) {
    host.innerHTML = App.roadmapView[builderName()](data);
  }

  function tabs(list, activeKey, cls) {
    return list.map(function (x) {
      var on = x.key === activeKey;
      return '<button class="' + cls + '" type="button" role="tab" data-key="' +
        x.key + '" aria-selected="' + on + '"' + (on ? ' aria-current="true"' : "") +
        ">" + App.escape(x.label) + "</button>";
    }).join("");
  }

  function renderControls(nav, layoutNav, host) {
    nav.innerHTML = tabs(LEVELS, current, "rmv-switch-btn");
    nav.querySelectorAll("button[data-key]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLevel(button.getAttribute("data-key"), nav, layoutNav, host);
      });
    });
    layoutNav.hidden = current !== "team";
    layoutNav.innerHTML = current === "team"
      ? tabs(LAYOUTS, layout, "rmv-switch-btn") : "";
    layoutNav.querySelectorAll("button[data-key]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLayout(button.getAttribute("data-key"), nav, layoutNav, host);
      });
    });
  }

  function apply(nav, layoutNav, host) {
    if (window.location.hash.replace(/^#/, "") !== hashFor()) {
      window.location.hash = hashFor();
    }
    renderControls(nav, layoutNav, host);
    render(host);
  }

  function setLevel(key, nav, layoutNav, host) {
    if (!find(LEVELS, key) || key === current) return;
    current = key;
    try { window.localStorage.setItem(LEVEL_STORE, key); } catch (e) { /* ignore */ }
    apply(nav, layoutNav, host);
  }

  function setLayout(key, nav, layoutNav, host) {
    if (!find(LAYOUTS, key) || key === layout) return;
    layout = key;
    try { window.localStorage.setItem(LAYOUT_STORE, key); } catch (e) { /* ignore */ }
    apply(nav, layoutNav, host);
  }

  App.onAuthed(async function () {
    var host = document.getElementById("roadmap-content");
    var nav = document.getElementById("roadmap-switch");
    var layoutNav = document.getElementById("roadmap-layout");
    readState();

    var dlBtn = document.getElementById("roadmap-download");
    if (dlBtn) dlBtn.addEventListener("click", function () { window.print(); });

    // A closed <details> renders no content on paper; expand any before
    // printing. Opening is idempotent, so beforeprint's known quirks are
    // harmless; never re-close.
    window.addEventListener("beforeprint", function () {
      document.querySelectorAll("details").forEach(function (d) { d.open = true; });
    });

    // Back/forward or an edited hash re-syncs level and layout.
    window.addEventListener("hashchange", function () {
      var before = hashFor();
      readState();
      if (hashFor() !== before) { renderControls(nav, layoutNav, host); render(host); }
    });

    // The four lists are independent, so fetch them in parallel.
    var results = await Promise.all([
      App.db.from(App.registry.tables.roadmapCategories)
        .select("id, key, label, description, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workAreas)
        .select("id, key, title, scope, category_id, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.roadmapItems)
        .select("id, area_id, category_id, title, summary, status, horizon, " +
          "presentation, audience, priority, effort, impact, sort_order, updated_at, tags")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.backlogItems)
        .select("id, area_id, type, title, summary, status, priority, " +
          "resolution, sort_order, tags")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

    var itemsResult = results[2];
    if (itemsResult.error) {
      host.innerHTML = '<p class="notice error">Could not load the roadmap: ' +
        App.escape(itemsResult.error.message) + "</p>";
      return;
    }
    data.categories = results[0].error ? [] : results[0].data || [];
    data.areas = results[1].error ? [] : results[1].data || [];
    data.items = itemsResult.data || [];
    data.backlog = results[3].error ? [] : results[3].data || [];

    renderControls(nav, layoutNav, host);
    render(host);
  });
})();
