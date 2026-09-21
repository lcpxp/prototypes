// ------------------------------------------------------------------
// sprints/sprints.js - The Sprint Roadmap page shell.
//
// Its own page rather than a tab on the roadmap, because it answers a
// different question for a different audience: the roadmap says WHAT is
// being done and in what order, this says WHEN, across sprints. The two
// stay intrinsically linked - every bar here opens that item's drawer on
// the roadmap, and the roadmap links back - so there is one detail
// surface rather than a second copy to keep in step.
//
// The rendering is App.roadmapView.sprintStreams / sprintItems, the same
// builders the roadmap used, over the same .rmv-tl coordinate model the
// horizon board draws with. Only the column width and the colour are
// this page's own (assets/css/sprints.css).
//
// The drawer is the roadmap's drawer - App.roadmapDrawer over
// App.roadmapDetail.drawerHtml - so a bar opens detail in place rather
// than sending the reader to another page and losing the board they were
// reading. One detail surface, two boards.
//
// It fetches only the rows this board draws (the allocated items and the
// workstreams they hang from), not the whole work set: about two dozen
// rows against the roadmap's three hundred. The heavy fields still
// arrive when a drawer opens, through the same lazy loader.
//
// Read-only, like every board here. Allocation is a database write;
// docs/SPRINT-DELIVERY.md carries the rules.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var VIEWS = [
    { key: "plan", label: "Workstreams" },
    { key: "delivery", label: "Work items" },
  ];

  var data = { sprintItems: [], sprintStreams: [], metrics: [],
    sprintCodes: {}, currentCode: null };
  var current = "plan";
  var wide = false;
  // Which reading the column headings carry: sprints, or a priority
  // scale. A view preference like the two below it - it relabels the
  // axis and changes nothing about the plan - so it is remembered per
  // browser and no other reader sees it.
  var priorityLabels = false;
  // Hide mode, and what is hidden. View-only and per-browser, like every
  // other preference here - it changes nothing in the database and no
  // other reader sees it.
  var hideMode = false;
  var hidden = {};

  function readHidden() {
    if (!App.store) return {};
    var raw = App.store.get("sprints.hidden");
    if (!raw) return {};
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) { return {}; }
  }
  function writeHidden() {
    if (App.store) App.store.set("sprints.hidden", JSON.stringify(hidden));
  }
  function hiddenCount() { return Object.keys(hidden).length; }

  function known(key) { return VIEWS.some(function (v) { return v.key === key; }); }

  function readState() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (known(hash)) return hash;
    var stored = App.store && App.store.get("sprints.view");
    return known(stored) ? stored : "plan";
  }

  // Where an item lives, for the one case the drawer cannot serve: a row
  // this board drew but did not fetch. App.linkHref is the one home for
  // that address (registry.js). It takes the entity TYPE, not a module -
  // passing a module key here built no URL at all and every bar led to
  // /undefined.
  function itemHref(id) {
    return (App.linkHref && App.linkHref("work_item", id, App.root)) || "";
  }

  function tabs() {
    return VIEWS.map(function (v) {
      var on = v.key === current;
      return '<button type="button" class="rmv-switch-btn" data-key="' +
        App.escape(v.key) + '" role="tab" aria-selected="' + on + '"' +
        (on ? ' aria-current="true"' : "") + ">" + App.escape(v.label) + "</button>";
    }).join("");
  }

  function render(host) {
    var opts = { wide: wide, hideMode: hideMode, hidden: hidden,
      priorityLabels: priorityLabels };
    host.innerHTML = App.roadmapView.sprintLegend() +
      (current === "delivery"
        ? App.roadmapView.sprintItems(data, opts)
        : App.roadmapView.sprintStreams(data, opts));
  }

  function setView(key, nav, host) {
    if (!known(key) || key === current) return;
    current = key;
    if (App.store) App.store.set("sprints.view", key);
    if (window.location.hash.replace(/^#/, "") !== key) window.location.hash = key;
    nav.innerHTML = tabs();
    wireTabs(nav, host);
    render(host);
  }

  function wireTabs(nav, host) {
    nav.querySelectorAll("button[data-key]").forEach(function (b) {
      b.addEventListener("click", function () {
        setView(b.getAttribute("data-key"), nav, host);
      });
    });
  }

  // The roadmap's drawer, over this board's rows. Returns open(id),
  // which reports whether it could open - so the caller has one place to
  // decide what happens when it could not.
  //
  // Returns null rather than half a drawer if the read fails or the
  // modules are absent: a bar then falls back to the roadmap, which is
  // the behaviour this page had before the drawer existed.
  async function wireDrawer(host, ids) {
    if (!App.roadmapDrawer || !App.roadmapDetail || !ids.length) return null;

    var reads = await Promise.all([
      App.db.from(App.registry.tables.workItems).select("*").in("id", ids),
      App.db.from(App.registry.tables.roadmapCategories).select("*"),
      App.db.from(App.registry.tables.workAreas).select("*"),
    ]);
    if (reads[0].error) return null;

    var board = {
      items: reads[0].data || [],
      categories: reads[1].error ? [] : reads[1].data || [],
      areas: reads[2].error ? [] : reads[2].data || [],
    };
    var byId = {};
    var allocByItem = {};
    data.sprintItems.forEach(function (r) { allocByItem[r.work_item_id] = r; });
    board.items.forEach(function (i) {
      i.allocation = allocByItem[i.id] || null;
      byId[i.id] = i;
    });
    if (App.roadmapView.markRecency) App.roadmapView.markRecency(board.items);

    var ctx = App.roadmapView.context(board);
    // This page carries no export machinery, so the drawer must not
    // offer a button that would do nothing.
    ctx.canExport = false;

    var open = App.roadmapDrawer({
      lookup: function (id) { return byId[id]; },
      getCtx: function () { return ctx; },
      lazyKeys: ["details", "notes"],
      load: App.workItemsData.loadDrawer,
      download: function () {},
    });

    // Opening by id keeps the caller from having to know how rows are
    // indexed here, and gives it a truthful answer when the row is not
    // one this board fetched.
    return function (id) {
      var item = byId[id];
      if (!item) return false;
      open(item);
      return true;
    };
  }

  App.onAuthed(async function () {
    var host = document.getElementById("sprints-content");
    var nav = document.getElementById("sprints-switch");
    var stateLine = document.getElementById("sprints-state");
    var wideBtn = document.getElementById("sprints-wide");
    var hideBtn = document.getElementById("sprints-hide");
    var priorityBtn = document.getElementById("sprints-priority");
    if (!host || !nav) return;

    current = readState();
    nav.innerHTML = tabs();
    wireTabs(nav, host);

    hidden = readHidden();
    if (hideBtn) {
      // Hide mode is deliberately NOT remembered. It is the state you are
      // in while choosing what to drop, not a way you want the board to
      // open - what persists is the choice itself.
      hideBtn.addEventListener("click", function () {
        hideMode = !hideMode;
        hideBtn.setAttribute("aria-pressed", String(hideMode));
        render(host);
        state();
      });
    }

    if (wideBtn) {
      wide = !!(App.store && App.store.get("sprints.wide") === "1");
      wideBtn.setAttribute("aria-pressed", String(wide));
      wideBtn.addEventListener("click", function () {
        wide = !wide;
        if (App.store) App.store.set("sprints.wide", wide ? "1" : "0");
        wideBtn.setAttribute("aria-pressed", String(wide));
        render(host);
      });
    }

    if (priorityBtn) {
      priorityLabels = !!(App.store &&
        App.store.get("sprints.priorityLabels") === "1");
      priorityBtn.setAttribute("aria-pressed", String(priorityLabels));
      priorityBtn.addEventListener("click", function () {
        priorityLabels = !priorityLabels;
        if (App.store) {
          App.store.set("sprints.priorityLabels", priorityLabels ? "1" : "0");
        }
        priorityBtn.setAttribute("aria-pressed", String(priorityLabels));
        render(host);
      });
    }

    var results = await Promise.all([
      App.db.from(App.registry.tables.sprintPlanItems).select("*")
        .order("slot", { ascending: true }),
      App.db.from(App.registry.tables.sprintPlanStreams).select("*"),
      App.db.from(App.registry.tables.workItemMetricRollup).select("*"),
      App.db.from(App.registry.tables.sprints).select("idx, code")
        .order("idx", { ascending: true }),
    ]);

    if (results[0].error) {
      App.notice(host, "error",
        "Could not load the sprint plan: " + results[0].error.message);
      return;
    }
    data.sprintItems = results[0].data || [];
    data.sprintStreams = results[1].error ? [] : results[1].data || [];
    data.metrics = results[2].error ? [] : results[2].data || [];

    // Resolve the anchor from any allocated row already carrying a real
    // code, then label every column from it. Unanchored, this stays
    // empty and the board reads Sprint +N, which is the truth.
    var sprints = results[3].error ? [] : results[3].data || [];
    var byCode = {};
    sprints.forEach(function (s) { byCode[s.code] = s.idx; });
    var anchorIdx = null;
    data.sprintItems.forEach(function (r) {
      if (anchorIdx === null && r.start_code && byCode[r.start_code] != null) {
        anchorIdx = byCode[r.start_code] - (Number(r.effective_slot) || 0);
      }
    });
    if (anchorIdx !== null) {
      sprints.forEach(function (s) {
        if (s.idx >= anchorIdx) data.sprintCodes[s.idx - anchorIdx] = s.code;
      });
    }

    // Everything the drawer needs, for this board's rows only. The
    // roadmap fetches the whole work set because it draws the whole work
    // set; this one draws about two dozen rows and asks for those.
    var ids = {};
    data.sprintItems.forEach(function (r) {
      if (r.work_item_id) ids[r.work_item_id] = true;
      if (r.workstream_id) ids[r.workstream_id] = true;
    });
    data.sprintStreams.forEach(function (r) {
      if (r.workstream_id) ids[r.workstream_id] = true;
    });
    var openDrawer = await wireDrawer(host, Object.keys(ids));

    // A bar opens that item's detail in place. The bars carry
    // data-item-id rather than an href, so the click is delegated here.
    // A row this board drew but did not fetch (it should not happen, but
    // a view can outrun a read) falls back to the roadmap rather than
    // doing nothing; a row with no address at all stays put.
    host.addEventListener("click", function (e) {
      // The picker sits inside the render host, so it is handled here
      // and returns before the bar handler below - a chip is a control,
      // not a row, and must not also open a drawer.
      // A row's eye is a control, not the row: it must not also open a
      // drawer, so it is handled first and returns.
      var toggle = e.target.closest && e.target.closest("[data-hide-id]");
      if (toggle) {
        var key = toggle.getAttribute("data-hide-id");
        if (hidden[key]) delete hidden[key]; else hidden[key] = true;
        writeHidden();
        render(host);
        state();
        return;
      }
      // A disclosure inside a card is a control, not the card. Without
      // this, reaching for the long-form case opened the drawer over it.
      if (e.target.closest && e.target.closest("[data-no-drawer]")) return;
      var el = e.target.closest && e.target.closest("[data-item-id]");
      if (!el) return;
      var id = el.getAttribute("data-item-id");
      if (openDrawer && openDrawer(id)) return;
      var href = itemHref(id);
      if (href) window.location.href = href;
    });

    // The readout says what the board holds, and - crucially - how much
    // of it is being kept off screen. Rows hidden with no trace of it
    // anywhere is how a reader ends up quoting half a plan.
    function state() {
      if (!stateLine) return;
      var n = data.sprintItems.length;
      var streams = data.sprintStreams.length;
      var h = hiddenCount();
      // Whether the plan is anchored is NOT repeated here. It is stated
      // on the column headings, where the confusion it answers actually
      // arises, and a fact with two homes is a fact that will drift.
      stateLine.textContent = (n === 0
        ? "Nothing is allocated yet."
        : n + (n === 1 ? " item" : " items") + " across " + streams +
          (streams === 1 ? " workstream." : " workstreams.")) +
        (h ? " " + h + (h === 1 ? " row hidden." : " rows hidden.") : "");
    }
    state();

    render(host);
    window.addEventListener("hashchange", function () {
      var next = readState();
      if (next !== current) setView(next, nav, host);
    });
  });
})();
