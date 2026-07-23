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

  // The grouping switch. Department is a separate dropdown filter, not a
  // level. Internal keys stay exec/team for the render branches they drive;
  // the labels are what the switch shows.
  var LEVELS = [
    { key: "workstreams", label: "Workstreams" },
    { key: "exec", label: "Categories" },
    { key: "team", label: "Work Items" },
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
  var DEPT_STORE = "roadmap-department";
  var CUSTOM_STORE = "roadmap-custom";
  var PICK_STORE = "roadmap-unpicked";
  var HIDEFIXES_STORE = "roadmap-hidefixes";
  var HIDDEN_STORE = "roadmap-hidden-bands";
  // The stages the Hide control can drop from the board. Keys match the
  // Now/Next/Later bands in roadmap-views.js (BANDS); delivered and parked
  // are never hideable here.
  var HIDEABLE = [{ key: "now", label: "Now" }, { key: "next", label: "Next" }, { key: "later", label: "Later" }];

  var data = { categories: [], areas: [], items: [] };
  var current = "workstreams";
  var layout = "timeline";
  var showDelivered = true;
  var expanded = false;
  var department = "";
  var customOn = false;
  var unpicked = {};
  var hideFixes = false;
  var hiddenBands = {};
  var ctx = null;
  var itemsById = {};

  function find(list, key) { return list.filter(function (x) { return x.key === key; })[0]; }

  // The hash carries both: "#team/cascade". Layout defaults to Timeline.
  function readState() {
    var parts = (window.location.hash || "").replace(/^#/, "").split("/");
    current = find(LEVELS, parts[0]) ? parts[0] : stored(LEVEL_STORE, LEVELS, "workstreams");
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

  // Department is a view-only filter (localStorage), not part of the
  // shareable hash. "" means all departments; an unknown stored key
  // falls back to all, so a retired department never sticks.
  function readDepartment() {
    var v = "";
    try { v = window.localStorage.getItem(DEPT_STORE) || ""; } catch (e) { v = ""; }
    var known = (App.registry.departments || []).some(function (d) { return d.key === v; });
    return known ? v : "";
  }

  // Custom view is a view-only preference (localStorage), not part of the
  // shareable hash: it turns on the per-row picker whose deselections
  // live in unpicked (an id -> true map).
  function readCustom() {
    try { return window.localStorage.getItem(CUSTOM_STORE) === "on"; } catch (e) { return false; }
  }
  function readUnpicked() {
    try { return JSON.parse(window.localStorage.getItem(PICK_STORE) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function persistUnpicked() {
    try { window.localStorage.setItem(PICK_STORE, JSON.stringify(unpicked)); }
    catch (e) { /* ignore */ }
  }
  // The body flag drives the custom-view CSS (the trailing checkbox column
  // and the print pruning); the markup itself comes from the builders.
  function syncCustomBody() { document.body.classList.toggle("rm-custom", customOn); }

  // Hidden stages are a view-only preference (localStorage), not part of the
  // shareable hash: a map of band key -> true for each stage the owner took
  // off the board. Only known Now/Next/Later keys are honoured, so a stale
  // or hand-edited value can never hide anything unexpected.
  function readHiddenBands() {
    var out = {};
    try {
      var raw = JSON.parse(window.localStorage.getItem(HIDDEN_STORE) || "{}") || {};
      HIDEABLE.forEach(function (b) { if (raw[b.key]) out[b.key] = true; });
    } catch (e) { /* ignore */ }
    return out;
  }
  function persistHidden() {
    try { window.localStorage.setItem(HIDDEN_STORE, JSON.stringify(hiddenBands)); }
    catch (e) { /* ignore */ }
  }
  // Tint the trigger and name the hidden stages in its title when the filter
  // is active, so a hidden stage never reads as missing data.
  function renderHideTrigger(btn) {
    var names = HIDEABLE.filter(function (b) { return hiddenBands[b.key]; })
      .map(function (b) { return b.label; });
    btn.classList.toggle("is-active", names.length > 0);
    btn.setAttribute("title", names.length ? "Hidden stages: " + names.join(", ") : "Hide stages");
  }

  // The dataset the board and the export both draw, narrowed to the
  // selected department (categories and areas stay intact).
  function viewData() { return App.roadmapView.byDepartment(data, department); }

  // The rows an export carries: the department-filtered set, narrowed to
  // the custom-view selection when active. Unpicking a parent drops its
  // whole subtree (expandUnpicked), so an export never carries a child
  // whose parent was deselected.
  function exportRows() {
    var items = viewData().items;
    if (!customOn) return items;
    var drop = App.roadmapView.expandUnpicked(unpicked, ctx);
    return items.filter(function (i) { return !drop[i.id]; });
  }

  function render(host) {
    // excluded = the descendants of unpicked rows: they dim and lose their
    // own checkbox on screen (re-picking the parent restores them), and
    // exportRows drops them too.
    var excluded = {};
    if (customOn && ctx) {
      var drop = App.roadmapView.expandUnpicked(unpicked, ctx);
      Object.keys(drop).forEach(function (id) { if (!unpicked[id]) excluded[id] = true; });
    }
    var opts = { showDelivered: showDelivered, expanded: expanded, custom: customOn,
      unpicked: unpicked, excluded: excluded, hideFixes: hideFixes, hiddenBands: hiddenBands };
    var vd = viewData();
    host.innerHTML = layout === "cascade"
      ? App.roadmapView.cascade(vd, current, opts)
      : App.roadmapView.timeline(vd, current, opts);
  }

  function renderDelivered(btn) {
    btn.setAttribute("aria-pressed", String(showDelivered));
    btn.textContent = showDelivered ? "Hide delivered" : "Show delivered";
  }

  function renderExpanded(btn) {
    btn.setAttribute("aria-pressed", String(expanded));
    btn.textContent = expanded ? "Compact view" : "Detailed view";
  }

  // Generic on/off toolbar toggle: aria state plus a label naming the
  // action it now performs (matching Hide delivered / Detailed view).
  function renderToggle(btn, active, offLabel, onLabel) {
    btn.setAttribute("aria-pressed", String(active));
    btn.textContent = active ? onLabel : offLabel;
  }

  // The Hide fixes control is icon-only (a bug), so its state reads through
  // aria-pressed plus an aria-label/title rather than a text swap. Pressed
  // (selected) means fixes are currently shown; pressing it hides them.
  function renderBugToggle(btn) {
    var label = hideFixes ? "Show fixes" : "Hide fixes";
    btn.setAttribute("aria-pressed", String(!hideFixes));
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  }

  // Download a JSON object as a file (the KPI-ready export), via the
  // shared App.download helper.
  function downloadJson(name, obj) {
    App.download(name, JSON.stringify(obj, null, 2), "application/json");
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
    // Executive is a layout-independent summary, so the Timeline/Cascade
    // switch has no effect there; hide it rather than leave a dead toggle.
    layoutNav.hidden = current === "exec";
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
    department = readDepartment();
    customOn = readCustom();
    unpicked = readUnpicked();
    try { hideFixes = window.localStorage.getItem(HIDEFIXES_STORE) === "on"; }
    catch (e) { hideFixes = false; }
    hiddenBands = readHiddenBands();
    syncCustomBody();

    var deptSelect = document.getElementById("roadmap-department");
    if (deptSelect) {
      (App.registry.departments || []).forEach(function (d) {
        var option = document.createElement("option");
        option.value = d.key;
        option.textContent = d.label;
        deptSelect.appendChild(option);
      });
      deptSelect.value = department;
      deptSelect.addEventListener("change", function () {
        department = deptSelect.value;
        try { window.localStorage.setItem(DEPT_STORE, department); }
        catch (e) { /* ignore */ }
        render(host);
      });
    }

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

    var customBtn = document.getElementById("roadmap-custom");
    if (customBtn) {
      renderToggle(customBtn, customOn, "Custom view", "Exit custom view");
      customBtn.addEventListener("click", function () {
        customOn = !customOn;
        try { window.localStorage.setItem(CUSTOM_STORE, customOn ? "on" : "off"); }
        catch (e) { /* ignore */ }
        renderToggle(customBtn, customOn, "Custom view", "Exit custom view");
        syncCustomBody();
        render(host);
      });
    }

    var fixesBtn = document.getElementById("roadmap-hidefixes");
    if (fixesBtn) {
      renderBugToggle(fixesBtn);
      fixesBtn.addEventListener("click", function () {
        hideFixes = !hideFixes;
        try { window.localStorage.setItem(HIDEFIXES_STORE, hideFixes ? "on" : "off"); }
        catch (e) { /* ignore */ }
        renderBugToggle(fixesBtn);
        render(host);
      });
    }

    // Hide stages: a Now/Next/Later checklist in the same dropdown pattern
    // as Export (toggle on the trigger, dismiss on an outside click or
    // Escape). Each unchecked stage drops from the board and stays dropped
    // across levels and layouts; the selection is a view preference only.
    var hideTrigger = document.getElementById("roadmap-hide-trigger");
    var hideMenu = document.getElementById("roadmap-hide-menu");
    function setHideOpen(open) {
      hideMenu.hidden = !open;
      hideTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (hideTrigger && hideMenu) {
      renderHideTrigger(hideTrigger);
      // Keep the menu open while several stages are toggled: a click inside
      // must not reach the document dismiss handler below.
      hideMenu.addEventListener("click", function (event) { event.stopPropagation(); });
      hideMenu.querySelectorAll("input[data-band]").forEach(function (box) {
        box.checked = !hiddenBands[box.getAttribute("data-band")];
        box.addEventListener("change", function () {
          var key = box.getAttribute("data-band");
          if (box.checked) delete hiddenBands[key]; else hiddenBands[key] = true;
          persistHidden();
          renderHideTrigger(hideTrigger);
          render(host);
        });
      });
      hideTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        setHideOpen(hideMenu.hidden);
      });
      document.addEventListener("click", function () {
        if (!hideMenu.hidden) setHideOpen(false);
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !hideMenu.hidden) {
          setHideOpen(false);
          hideTrigger.focus();
        }
      });
    }

    // Export: a single trigger opens a menu of the three formats, mirroring
    // the account menu's dropdown pattern (toggle on the trigger, dismiss on
    // an outside click or Escape). Picking a format then lets the click
    // bubble to the document listener, which closes the menu.
    var exportTrigger = document.getElementById("roadmap-export-trigger");
    var exportMenu = document.getElementById("roadmap-export-menu");
    function setExportOpen(open) {
      exportMenu.hidden = !open;
      exportTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (exportTrigger && exportMenu) {
      exportTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        setExportOpen(exportMenu.hidden);
      });
      document.addEventListener("click", function () {
        if (!exportMenu.hidden) setExportOpen(false);
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !exportMenu.hidden) {
          setExportOpen(false);
          exportTrigger.focus();
        }
      });
    }

    var exportBtn = document.getElementById("roadmap-export-json");
    if (exportBtn) exportBtn.addEventListener("click", function () {
      downloadJson("roadmap-kpi-export.json", App.roadmapDetail.toKpiRoadmap(exportRows(), ctx));
    });

    var csvBtn = document.getElementById("roadmap-export-csv");
    if (csvBtn) csvBtn.addEventListener("click", function () {
      App.download("roadmap-export.csv",
        App.roadmapDetail.toCsvRoadmap(exportRows(), ctx), "text/csv");
    });

    var dlBtn = document.getElementById("roadmap-download");
    if (dlBtn) dlBtn.addEventListener("click", function () { window.print(); });

    // Detail drawer: any element carrying a data-item-id opens the item.
    var drawer = document.getElementById("roadmap-drawer");
    var scrim = document.getElementById("roadmap-scrim");
    var drawerBody = document.getElementById("rmd-body");
    var closeBtn = document.getElementById("rmd-close");
    var lastFocus = null;

    // Reflect the open item in the URL (?item=<id>) so a drawer is
    // shareable and deep-linkable, without disturbing the view-state
    // hash (#level/layout).
    function setItemParam(id) {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      if (id) url.searchParams.set("item", id);
      else url.searchParams.delete("item");
      window.history.replaceState(null, "", url.href);
    }

    function openDrawer(item) {
      if (!drawer || !drawerBody) return;
      drawerBody.innerHTML = App.roadmapDetail.drawerHtml(item, ctx);
      lastFocus = document.activeElement;
      drawer.hidden = false;
      if (scrim) scrim.hidden = false;
      document.body.classList.add("rmd-open");
      setItemParam(item.id);
      var itemExport = document.getElementById("rmd-export");
      if (itemExport) itemExport.addEventListener("click", function () {
        downloadJson("roadmap-item-" + safeName(item.title) + ".json",
          App.roadmapDetail.toKpiItem(item, ctx));
      });
      if (closeBtn) closeBtn.focus();
    }
    function closeDrawer() {
      if (drawer) drawer.hidden = true;
      if (scrim) scrim.hidden = true;
      document.body.classList.remove("rmd-open");
      setItemParam(null);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (scrim) scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer && !drawer.hidden) closeDrawer();
    });
    host.addEventListener("click", function (e) {
      // A custom-view checkbox click must not open the drawer beneath it.
      if (e.target.closest && e.target.closest(".rmv-pick")) return;
      var el = e.target.closest ? e.target.closest("[data-item-id]") : null;
      if (!el) return;
      var item = itemsById[el.getAttribute("data-item-id")];
      if (item) openDrawer(item);
    });

    // Custom view: a row's checkbox toggles whether it rides the PDF and
    // the JSON/CSV export. Selection is a view preference (localStorage);
    // it changes nothing in the database. Re-render to keep every copy of
    // a spanning item (cascade) and its dim state in sync.
    host.addEventListener("change", function (e) {
      var box = e.target;
      if (!box || !box.getAttribute || box.getAttribute("data-pick-id") === null) return;
      var id = box.getAttribute("data-pick-id");
      if (box.checked) delete unpicked[id]; else unpicked[id] = true;
      persistUnpicked();
      render(host);
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

    // The lists are independent, so fetch them in parallel. Notes are
    // extra context for the drawer; their read is gated on backlog
    // access, so a denied fetch just leaves the section empty.
    var results = await Promise.all([
      App.db.from(App.registry.tables.roadmapCategories)
        .select("id, key, label, description, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workAreas)
        .select("id, key, title, scope, category_id, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workItems)
        .select("id, parent_id, relates_to_id, area_id, category_id, title, summary, details, type, level, " +
          "status, horizon, end_horizon, " +
          "presentation, priority, effort, impact, department, associated_departments, starts_on, ends_on, progress, " +
          "prd_status, project_status, start_sprint, end_sprint, attributes, " +
          "sort_order, updated_at, resolution, resolved_at, requested_by, external_ref, tags")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workItemPhases)
        .select("work_item_id, phase, quarter, starts_on, ends_on, start_tbc, end_tbc, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workNotes)
        .select("work_item_id, kind, body, created_at")
        .eq("status", "active")
        .not("work_item_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);

    var itemsResult = results[2];
    if (itemsResult.error) {
      App.notice(host, "error", "Could not load the roadmap: " + itemsResult.error.message);
      return;
    }
    data.categories = results[0].error ? [] : results[0].data || [];
    data.areas = results[1].error ? [] : results[1].data || [];
    data.items = itemsResult.data || [];

    // Attach phases and notes to their items (either table may be empty
    // or, for notes, unreadable without backlog access).
    var phases = results[3] && !results[3].error ? results[3].data || [] : [];
    var phasesByItem = {};
    phases.forEach(function (p) {
      (phasesByItem[p.work_item_id] = phasesByItem[p.work_item_id] || []).push(p);
    });
    var notes = results[4] && !results[4].error ? results[4].data || [] : [];
    var notesByItem = {};
    notes.forEach(function (n) {
      (notesByItem[n.work_item_id] = notesByItem[n.work_item_id] || []).push(n);
    });
    itemsById = {};
    data.items.forEach(function (i) {
      i.phases = phasesByItem[i.id] || [];
      i.notes = notesByItem[i.id] || [];
      itemsById[i.id] = i;
    });
    // Split delivered work into Recently/Previously completed by stamping
    // each done item against the current clock, once, before any render.
    App.roadmapView.markRecency(data.items);
    ctx = App.roadmapView.context(data);

    renderControls(nav, layoutNav, host);
    render(host);

    // Deep link: ?item=<id> opens that work item's drawer on load.
    var requestedItem = new URLSearchParams(window.location.search).get("item");
    if (requestedItem && itemsById[requestedItem]) openDrawer(itemsById[requestedItem]);
  });
})();
