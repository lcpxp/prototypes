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
// docs/ROADMAP.md and docs/ROADMAP-PLAYBOOK.md).
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
  // Every board column can be collapsed by clicking its header: it drops
  // that band's work and shrinks the column to a seam. Keys match the BANDS
  // in roadmap-views.js. Only these known keys are honoured from storage, so
  // a stale or hand-edited value can never hide something unexpected.
  var HIDEABLE = ["previously", "recently", "now", "next", "later", "parked"];

  var P = App.roadmapPrefs;

  var data = { categories: [], areas: [], items: [] };
  var current = "workstreams";
  var layout = "timeline";
  var showDelivered = true;
  var expanded = false;
  var wide = false;
  var department = "";
  var customOn = false;
  var unpicked = {};
  var hideFixes = false;
  var hiddenBands = {};
  var ctx = null;
  var itemsById = {};

  function find(list, key) { return list.filter(function (x) { return x.key === key; })[0]; }

  // The hash carries both: "#team/cascade". Layout defaults to Timeline.
  // A stored level or layout is only the fallback for a visit with no
  // hash, so a shared link always wins.
  function readState() {
    var parts = (window.location.hash || "").replace(/^#/, "").split("/");
    current = find(LEVELS, parts[0]) ? parts[0] : P.readLevel(LEVELS, "workstreams");
    layout = find(LAYOUTS, parts[1]) ? parts[1] : P.readLayout(LAYOUTS, "timeline");
  }
  function hashFor() { return current + "/" + layout; }

  // The body flag drives the custom-view CSS (the trailing checkbox column
  // and the print pruning); the markup itself comes from the builders.
  function syncCustomBody() { document.body.classList.toggle("rm-custom", customOn); }

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
      unpicked: unpicked, excluded: excluded, hideFixes: hideFixes, hiddenBands: hiddenBands,
      wide: wide };
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

  // The Expand board control is icon-only (arrows-out), so its state reads
  // through aria-pressed plus an aria-label/title rather than a text swap.
  // Pressed means the board is currently expanded; pressing it fits the
  // board back to the viewport width.
  function renderWideToggle(btn) {
    var label = wide ? "Fit board to width" : "Expand board";
    btn.setAttribute("aria-pressed", String(wide));
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
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
      b.addEventListener("click", function () { set(P.KEYS.level, "current", b.getAttribute("data-key"), nav, layoutNav, host); });
    });
    layoutNav.querySelectorAll("button[data-key]").forEach(function (b) {
      b.addEventListener("click", function () { set(P.KEYS.layout, "layout", b.getAttribute("data-key"), nav, layoutNav, host); });
    });
  }

  function set(storeKey, which, value, nav, layoutNav, host) {
    if (which === "current") { if (!find(LEVELS, value) || value === current) return; current = value; }
    else { if (!find(LAYOUTS, value) || value === layout) return; layout = value; }
    P.writeChoice(storeKey, value);
    if (window.location.hash.replace(/^#/, "") !== hashFor()) window.location.hash = hashFor();
    renderControls(nav, layoutNav, host);
    render(host);
  }

  App.onAuthed(async function () {
    var host = document.getElementById("roadmap-content");
    var nav = document.getElementById("roadmap-switch");
    var layoutNav = document.getElementById("roadmap-layout");
    readState();
    showDelivered = P.readDelivered();
    expanded = P.readExpanded();
    wide = P.readWide();
    department = P.readDepartment();
    customOn = P.readCustom();
    unpicked = P.readUnpicked();
    hideFixes = P.readHideFixes();
    hiddenBands = P.readHiddenBands(HIDEABLE);
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
        P.writeDepartment(department);
        render(host);
      });
    }

    var delBtn = document.getElementById("roadmap-delivered");
    if (delBtn) {
      renderDelivered(delBtn);
      delBtn.addEventListener("click", function () {
        showDelivered = !showDelivered;
        P.writeDelivered(showDelivered);
        renderDelivered(delBtn);
        render(host);
      });
    }

    var expandBtn = document.getElementById("roadmap-detail-toggle");
    if (expandBtn) {
      renderExpanded(expandBtn);
      expandBtn.addEventListener("click", function () {
        expanded = !expanded;
        P.writeExpanded(expanded);
        renderExpanded(expandBtn);
        render(host);
      });
    }

    var customBtn = document.getElementById("roadmap-custom");
    if (customBtn) {
      renderToggle(customBtn, customOn, "Custom view", "Exit custom view");
      customBtn.addEventListener("click", function () {
        customOn = !customOn;
        P.writeCustom(customOn);
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
        P.writeHideFixes(hideFixes);
        renderBugToggle(fixesBtn);
        render(host);
      });
    }

    var wideBtn = document.getElementById("roadmap-wide");
    if (wideBtn) {
      renderWideToggle(wideBtn);
      wideBtn.addEventListener("click", function () {
        wide = !wide;
        P.writeWide(wide);
        renderWideToggle(wideBtn);
        render(host);
      });
    }

    // Export: the dropdown wiring and the three format handlers live in
    // roadmap-export.js; it reads the rows and ctx at click time so the
    // export always reflects the current department/custom selection.
    App.roadmapExport.wire(function () { return { rows: exportRows(), ctx: ctx }; });

    // Detail drawer: any element carrying a data-item-id opens the item.
    // The drawer's open/close, deep-link URL sync and in-drawer navigation
    // live in roadmap-drawer.js; the board's own click/change handlers
    // (band toggles, custom-view picks) stay here.
    var openDrawer = App.roadmapDrawer({
      lookup: function (id) { return itemsById[id]; },
      getCtx: function () { return ctx; },
      lazyKeys: ["details", "notes"],
      load: App.workItemsData.loadDrawer,
      download: function (item) {
        App.roadmapExport.downloadJson(
          "roadmap-item-" + App.roadmapExport.safeName(item.title) + ".json",
          App.roadmapDetail.toKpiItem(item, ctx));
      },
    });

    host.addEventListener("click", function (e) {
      // A column header toggles that column off, then on: it stays put -
      // struck through in the cascade, shrunk to a labelled seam in the
      // timeline - so a second click brings the column back.
      var toggle = e.target.closest ? e.target.closest("[data-band]") : null;
      if (toggle) {
        var key = toggle.getAttribute("data-band");
        if (hiddenBands[key]) delete hiddenBands[key]; else hiddenBands[key] = true;
        P.writeHiddenBands(hiddenBands);
        render(host);
        return;
      }
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
      P.writeUnpicked(unpicked);
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
      App.db.from(App.registry.tables.workItemsBoard)
        // The drawer renders every column it is handed and names the
        // ones it does not lay out by hand (App.detail.facts), so the
        // fetch stays select("*") - a column added tomorrow arrives
        // instead of needing this line edited before it could be seen.
        //
        // What it selects from is the view rather than the table: the
        // view is work_items without details, which is 102,956 bytes of
        // prose that only ever appears in one drawer at a time. The
        // column decision lives in SQL beside the schema, where a
        // migration is already being written whenever a column is
        // added, and schema-drift.test.js fails if the two diverge.
        // docs/plan/80-LOAD-SPEED.md.
        .select("*")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workItemPhases)
        .select("work_item_id, phase, quarter, starts_on, ends_on, start_tbc, end_tbc, sort_order")
        .order("sort_order", { ascending: true }),
      // Notes are NOT fetched here. Nothing on the board reads them -
      // only the drawer does, one item at a time - and carrying all 116
      // put 63KB on every page load to show a handful.
      // App.workItemsData fetches them when a drawer opens, and again in
      // bulk when an export is pressed. docs/plan/80-LOAD-SPEED.md.
      // Source-document titles for the provenance link (read gated on
      // backlog access, so a denied fetch just leaves the field blank).
      App.db.from(App.registry.tables.workDocuments)
        .select("id, title"),
      // Typed relationships between work items. Read separately rather
      // than joined, because a link is one row that both of its ends
      // display: the map below indexes each link under BOTH item ids,
      // with the reading that applies from that end.
      App.db.from(App.registry.tables.knowledgeLinks)
        .select("from_type, from_id, to_type, to_id, kind, note, confidence")
        .is("valid_to", null),
      // Milestones. Empty today, kept deliberately (see
      // docs/plan/40-SURFACING.md), and until now milestone_id was
      // neither selected nor rendered - so setting one would have been
      // invisible from the moment anybody first used it.
      App.db.from(App.registry.tables.roadmapMilestones)
        .select("id, title, due_on"),
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
    itemsById = {};
    data.items.forEach(function (i) {
      i.phases = phasesByItem[i.id] || [];
      itemsById[i.id] = i;
    });
    // Split delivered work into Recently/Previously completed by stamping
    // each done item against the current clock, once, before any render.
    App.roadmapView.markRecency(data.items);
    ctx = App.roadmapView.context(data);
    // Enrich the shared context with lookups the drawer needs: a document
    // title map for the source-document link, and a per-assignee item count
    // so the ownership line can read "Xavier - 1st of 5".
    var docs = results[4] && !results[4].error ? results[4].data || [] : [];
    ctx.docById = {};
    docs.forEach(function (d) { ctx.docById[d.id] = d; });
    var milestones = results[6] && !results[6].error ? results[6].data || [] : [];
    ctx.milestoneById = {};
    milestones.forEach(function (m) { ctx.milestoneById[m.id] = m; });
    ctx.assigneeCounts = {};
    data.items.forEach(function (i) {
      if (i.assignee) ctx.assigneeCounts[i.assignee] = (ctx.assigneeCounts[i.assignee] || 0) + 1;
    });

    // Typed links, indexed under both ends. A symmetric kind reads the
    // same either way ("Related to"); a directional one flips, so the
    // item pointed AT reads the inverse ("Includes" against "Part of").
    // Mirrors the knowledge_graph view in supabase/schema/33_links.sql;
    // the labels live here because the page never reads link_kinds.
    var links = results[5] && !results[5].error ? results[5].data || [] : [];
    var linkIndex = App.links.index(links);
    ctx.linkIndex = linkIndex;
    // Work items already have their titles in memory; anything else a
    // link reaches is fetched by id, one query per entity type present,
    // so a board with no cross-type links issues no extra request.
    ctx.linkTitles = {};
    data.items.forEach(function (i) { ctx.linkTitles["work_item:" + i.id] = i.title; });

    renderControls(nav, layoutNav, host);
    render(host);

    // Titles for the far end of cross-type links arrive after the board
    // has painted; the drawer reads them when it opens, so nothing waits
    // on a request it may not need.
    App.links.loadTitles(linkIndex, ctx.linkTitles).then(function (titles) {
      Object.keys(titles).forEach(function (key) {
        if (!ctx.linkTitles[key]) ctx.linkTitles[key] = titles[key];
      });
    });

    // Deep link: ?item=<id> opens that work item's drawer on load.
    var requestedItem = new URLSearchParams(window.location.search).get("item");
    if (requestedItem && itemsById[requestedItem]) openDrawer(itemsById[requestedItem]);
  });
})();
