// ------------------------------------------------------------------
// roadmap.js - The roadmap home for modules/roadmap/. A read-only,
// print-ready render of the LaunchPad roadmap tables in Supabase.
// Two independent controls over one dataset:
//   Level   Executive (curated) / Team (all) / Backlog / Parked
//   Layout  Timeline (default, the continuous spanning roadmap) /
//           Cascade (the same work as stacked stage bands)
// The pure HTML builders live in roadmap-views.js (App.roadmapView) so
// they unit-test without a DOM. This file is the shell: fetch, switch,
// route, print. Editing the roadmap is a database change (see
// docs/ROADMAP.md and docs/ROADMAP-PROCESS.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var LEVELS = [
    { key: "exec", label: "Executive" },
    { key: "team", label: "Team" },
    { key: "backlog", label: "Backlog" },
    { key: "parked", label: "Parked" },
  ];
  var LAYOUTS = [
    { key: "timeline", label: "Timeline" },
    { key: "cascade", label: "Cascade" },
  ];
  var LEVEL_STORE = "roadmap-level";
  var LAYOUT_STORE = "roadmap-layout";
  var DELIVERED_STORE = "roadmap-delivered";

  var data = { categories: [], areas: [], items: [], backlog: [] };
  var current = "exec";
  var layout = "timeline";
  var showDelivered = true;

  function find(list, key) { return list.filter(function (x) { return x.key === key; })[0]; }

  // The hash carries both: "#team/cascade". Layout defaults to Timeline.
  function readState() {
    var parts = (window.location.hash || "").replace(/^#/, "").split("/");
    current = find(LEVELS, parts[0]) ? parts[0] : stored(LEVEL_STORE, LEVELS, "exec");
    layout = find(LAYOUTS, parts[1]) ? parts[1] : stored(LAYOUT_STORE, LAYOUTS, "timeline");
  }
  function stored(key, list, fallback) {
    var v = null;
    try { v = window.localStorage.getItem(key); } catch (e) { v = null; }
    return find(list, v) ? v : fallback;
  }
  function hashFor() { return current + "/" + layout; }

  // Delivered visibility is a view-only preference (localStorage), not
  // part of the shareable hash.
  function readDelivered() {
    try { return window.localStorage.getItem(DELIVERED_STORE) !== "hidden"; }
    catch (e) { return true; }
  }

  function render(host) {
    var opts = { showDelivered: showDelivered };
    host.innerHTML = layout === "cascade"
      ? App.roadmapView.cascade(data, current, opts)
      : App.roadmapView.timeline(data, current, opts);
  }

  function renderDelivered(btn) {
    btn.setAttribute("aria-pressed", String(showDelivered));
    btn.textContent = showDelivered ? "Hide delivered" : "Show delivered";
  }

  function tabs(list, activeKey, cls) {
    return list.map(function (x) {
      var on = x.key === activeKey;
      return '<button class="' + cls + '" type="button" role="tab" data-key="' + x.key +
        '" aria-selected="' + on + '"' + (on ? ' aria-current="true"' : "") + ">" +
        App.escape(x.label) + "</button>";
    }).join("");
  }

  function renderControls(nav, layoutNav, host) {
    nav.innerHTML = tabs(LEVELS, current, "rmv-switch-btn");
    layoutNav.innerHTML = tabs(LAYOUTS, layout, "rmv-switch-btn");
    nav.querySelectorAll("button[data-key]").forEach(function (b) {
      b.addEventListener("click", function () { set(LEVEL_STORE, "current", b.getAttribute("data-key"), nav, layoutNav, host); });
    });
    layoutNav.querySelectorAll("button[data-key]").forEach(function (b) {
      b.addEventListener("click", function () { set(LAYOUT_STORE, "layout", b.getAttribute("data-key"), nav, layoutNav, host); });
    });
  }

  function set(storeKey, which, value, nav, layoutNav, host) {
    if (which === "current") { if (!find(LEVELS, value) || value === current) return; current = value; }
    else { if (!find(LAYOUTS, value) || value === layout) return; layout = value; }
    try { window.localStorage.setItem(storeKey, value); } catch (e) { /* ignore */ }
    if (window.location.hash.replace(/^#/, "") !== hashFor()) window.location.hash = hashFor();
    renderControls(nav, layoutNav, host);
    render(host);
  }

  App.onAuthed(async function () {
    var host = document.getElementById("roadmap-content");
    var nav = document.getElementById("roadmap-switch");
    var layoutNav = document.getElementById("roadmap-layout");
    readState();
    showDelivered = readDelivered();

    var delBtn = document.getElementById("roadmap-delivered");
    if (delBtn) {
      renderDelivered(delBtn);
      delBtn.addEventListener("click", function () {
        showDelivered = !showDelivered;
        try { window.localStorage.setItem(DELIVERED_STORE, showDelivered ? "shown" : "hidden"); }
        catch (e) { /* ignore */ }
        renderDelivered(delBtn);
        render(host);
      });
    }

    var dlBtn = document.getElementById("roadmap-download");
    if (dlBtn) dlBtn.addEventListener("click", function () { window.print(); });

    // A closed <details> renders no content on paper; expand any first.
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
        .select("id, area_id, category_id, title, summary, status, horizon, end_horizon, " +
          "presentation, audience, priority, effort, impact, sort_order, updated_at, tags")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.backlogItems)
        .select("id, area_id, type, title, summary, status, horizon, end_horizon, " +
          "priority, resolution, sort_order, tags")
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
