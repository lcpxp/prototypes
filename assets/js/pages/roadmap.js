// ------------------------------------------------------------------
// roadmap.js - The roadmap home for modules/roadmap/. A read-only,
// print-ready render of the LaunchPad work_items table in Supabase.
// Two independent controls over one dataset:
//   Level   Executive (theme rollup) / Team (active) / Backlog (all)
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
  ];
  var LAYOUTS = [
    { key: "timeline", label: "Timeline" },
    { key: "cascade", label: "Cascade" },
  ];
  var LEVEL_STORE = "roadmap-level";
  var LAYOUT_STORE = "roadmap-layout";
  var DELIVERED_STORE = "roadmap-delivered";
  var EXPAND_STORE = "roadmap-expanded";

  var data = { categories: [], areas: [], items: [] };
  var current = "exec";
  var layout = "timeline";
  var showDelivered = true;
  var expanded = false;
  var ctx = null;
  var itemsById = {};

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

  // Compact vs Detailed is a view-only preference (localStorage), not
  // part of the shareable hash. Detailed expands the Executive rollup
  // into its child items.
  function readExpanded() {
    try { return window.localStorage.getItem(EXPAND_STORE) === "expanded"; }
    catch (e) { return false; }
  }

  function render(host) {
    var opts = { showDelivered: showDelivered, expanded: expanded };
    host.innerHTML = layout === "cascade"
      ? App.roadmapView.cascade(data, current, opts)
      : App.roadmapView.timeline(data, current, opts);
  }

  function renderDelivered(btn) {
    btn.setAttribute("aria-pressed", String(showDelivered));
    btn.textContent = showDelivered ? "Hide delivered" : "Show delivered";
  }

  function renderExpanded(btn) {
    btn.setAttribute("aria-pressed", String(expanded));
    btn.textContent = expanded ? "Compact view" : "Detailed view";
  }

  // Download a JSON object as a file (the KPI-ready export).
  function download(name, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function safeName(s) {
    return String(s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 40) || "item";
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
    expanded = readExpanded();

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

    var expandBtn = document.getElementById("roadmap-detail-toggle");
    if (expandBtn) {
      renderExpanded(expandBtn);
      expandBtn.addEventListener("click", function () {
        expanded = !expanded;
        try { window.localStorage.setItem(EXPAND_STORE, expanded ? "expanded" : "compact"); }
        catch (e) { /* ignore */ }
        renderExpanded(expandBtn);
        render(host);
      });
    }

    var exportBtn = document.getElementById("roadmap-export-json");
    if (exportBtn) exportBtn.addEventListener("click", function () {
      download("roadmap-kpi-export.json", App.roadmapDetail.toKpiRoadmap(data.items, ctx));
    });

    // Detail drawer: any element carrying a data-item-id opens the item.
    var drawer = document.getElementById("roadmap-drawer");
    var scrim = document.getElementById("roadmap-scrim");
    var drawerBody = document.getElementById("rmd-body");
    var closeBtn = document.getElementById("rmd-close");
    var lastFocus = null;

    function openDrawer(item) {
      if (!drawer || !drawerBody) return;
      drawerBody.innerHTML = App.roadmapDetail.drawerHtml(item, ctx);
      lastFocus = document.activeElement;
      drawer.hidden = false;
      if (scrim) scrim.hidden = false;
      document.body.classList.add("rmd-open");
      var itemExport = document.getElementById("rmd-export");
      if (itemExport) itemExport.addEventListener("click", function () {
        download("roadmap-item-" + safeName(item.title) + ".json",
          App.roadmapDetail.toKpiItem(item, ctx));
      });
      if (closeBtn) closeBtn.focus();
    }
    function closeDrawer() {
      if (drawer) drawer.hidden = true;
      if (scrim) scrim.hidden = true;
      document.body.classList.remove("rmd-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (scrim) scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer && !drawer.hidden) closeDrawer();
    });
    host.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-item-id]") : null;
      if (!el) return;
      var item = itemsById[el.getAttribute("data-item-id")];
      if (item) openDrawer(item);
    });

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

    // The three lists are independent, so fetch them in parallel.
    var results = await Promise.all([
      App.db.from(App.registry.tables.roadmapCategories)
        .select("id, key, label, description, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workAreas)
        .select("id, key, title, scope, category_id, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workItems)
        .select("id, area_id, category_id, title, summary, status, horizon, end_horizon, " +
          "presentation, priority, effort, impact, department, starts_on, ends_on, progress, " +
          "prd_status, project_status, start_sprint, end_sprint, attributes, " +
          "sort_order, updated_at, tags")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workItemPhases)
        .select("work_item_id, phase, quarter, starts_on, ends_on, start_tbc, end_tbc, sort_order")
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

    // Attach phases to their items (the phases table may be empty).
    var phases = results[3] && !results[3].error ? results[3].data || [] : [];
    var phasesByItem = {};
    phases.forEach(function (p) {
      (phasesByItem[p.work_item_id] = phasesByItem[p.work_item_id] || []).push(p);
    });
    itemsById = {};
    data.items.forEach(function (i) {
      i.phases = phasesByItem[i.id] || [];
      itemsById[i.id] = i;
    });
    ctx = App.roadmapView.context(data);

    renderControls(nav, layoutNav, host);
    render(host);
  });
})();
