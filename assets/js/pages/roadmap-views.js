// ------------------------------------------------------------------
// roadmap-views.js - Pure HTML builders for the roadmap home
// (modules/roadmap/). Data-in / string-out, no DOM, so they load in a
// Node vm for unit testing (tests/unit/roadmap-views.test.js). The DOM
// wiring, data fetch and switcher live in roadmap.js. The cascade family
// lives in roadmap-views-cascade.js, sharing these helpers via the
// private App._rmv namespace.
//
// One dataset (work_items), three levels x two layouts:
//   Level   Executive - a department-first rollup of active work: each
//           department, the categories it owns and their item counts.
//           Layout-independent (the C-suite one-pager).
//           Team      - active work at item level; Detailed adds a
//           Category -> Area -> item breakdown with sub-step checklists.
//           Backlog   - every item (active + parked + delivered).
//   Layout  Timeline  - a continuous Delivered|Now|Next|Later|Parked
//           axis where a bar SPANS the columns it runs across.
//           Cascade   - the same work as stacked bands.
//
// Placement derives from an item's own fields, so a move between views
// is a data edit (see docs/ROADMAP.md, docs/ROADMAP-PROCESS.md):
//   Delivered = status 'done'
//   Parked    = not done AND (horizon 'someday' OR status 'dropped')
//   Active    = the rest (horizon now/next/later)
// Sub-items (parent_id set) are never placed as their own bars; they
// surface nested under their parent in the detail and the drawer.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var PRESENTATION = {
    current: "Current focus", ongoing: "Ongoing",
    wind: "Wrapping up", bridge: "Next horizon", sequenced: "",
  };

  // The continuous axis: previously(0) | recently(1) | now(2) | next(3) |
  // later(4) | parked(5). Delivered work splits by recency - shipped
  // within RECENT_DAYS is Recently completed (a rolling list), older work
  // Previously completed. Team/Executive show up to Later; Backlog adds
  // Parked.
  var BANDS = [
    { key: "previously", label: "Previously completed" },
    { key: "recently", label: "Recently completed" },
    { key: "now", label: "Now" },
    { key: "next", label: "Next" },
    { key: "later", label: "Later" },
    { key: "parked", label: "Parked" },
  ];
  var ACTIVE_MAX = 4;
  var PARKED = 5;
  var RECENT_DAYS = 28;

  // Tag each done item as recently completed (within RECENT_DAYS) or not,
  // reading resolved_at (falling back to updated_at for rows closed before
  // the stamp existed). "now" is injected once here so the pure placement
  // builders stay deterministic; unmarked items default to Previously.
  function markRecency(items, now) {
    var cutoff = (now || Date.now()) - RECENT_DAYS * 864e5;
    (items || []).forEach(function (i) {
      var t = i.status === "done" ? (i.resolved_at || i.updated_at) : null;
      i._recentDone = !!t && Date.parse(t) >= cutoff;
    });
    return items;
  }

  function presentationLabel(p) { return PRESENTATION[p] || ""; }

  // Column index for a horizon; someday folds into the Parked band.
  function hzIdx(h) {
    return h === "now" ? 2 : h === "next" ? 3 : h === "later" ? 4 : PARKED;
  }
  // The delivered column an item lands in: recent (1) vs historic (0).
  function doneCol(i) { return i._recentDone ? 1 : 0; }
  // An item's start and end columns, from its own fields.
  function colStart(i) {
    if (i.status === "done") return doneCol(i);
    if (i.status === "dropped") return PARKED;
    return hzIdx(i.horizon);
  }
  function colEnd(i) {
    if (i.status === "done") return doneCol(i);
    if (i.status === "dropped") return PARKED;
    var s = hzIdx(i.horizon), e = hzIdx(i.end_horizon || i.horizon);
    return e < s ? s : e;
  }
  function isParked(i) { return colStart(i) === PARKED; }
  function isActive(i) { var s = colStart(i); return s >= 2 && s <= ACTIVE_MAX; }

  function productItems(items, scopeByArea) {
    return items.filter(function (i) { return scopeByArea[i.area_id] === "product"; });
  }

  // A maintenance "fix": a standalone item (no workstream parent, not a
  // workstream itself) of a fix-flavoured type. Fixes carry their domain
  // tags and a soft relates_to link but stay off the strategic gantt; the
  // Hide fixes toggle drops them from the Work Items and Backlog levels.
  function isFix(i) {
    return !i.parent_id && i.level !== "workstream" &&
      (i.type === "bug" || i.type === "task" || i.type === "improvement");
  }

  // Only items without a parent are placed on the board; sub-items
  // surface nested under their parent, never as their own bars.
  function topLevel(items) {
    return items.filter(function (i) { return !i.parent_id; });
  }

  // Narrow a dataset to one department, matching either the build owner
  // (work_items.department) or a business area association
  // (associated_departments - a department that wants visibility without
  // owning), so an Operations view surfaces everything Operations cares
  // about. A falsy dept returns the data unchanged (the "all" default).
  function byDepartment(data, dept) {
    if (!dept) return data;
    return {
      categories: data.categories,
      areas: data.areas,
      items: (data.items || []).filter(function (i) {
        return i.department === dept ||
          (!!i.associated_departments && i.associated_departments.indexOf(dept) !== -1);
      }),
    };
  }
  // Bugs always sink below other work at the same level, whatever their
  // stored priority number; ties then fall to priority and sort_order.
  function bugRank(i) { return i.type === "bug" ? 1 : 0; }
  function byOrder(a, b) {
    return (bugRank(a) - bugRank(b)) ||
      (a.priority - b.priority) || (a.sort_order - b.sort_order);
  }

  function context(data) {
    var catById = {}, scopeByArea = {}, themeOfArea = {}, areaById = {};
    (data.categories || []).forEach(function (c) { catById[c.id] = c; });
    (data.areas || []).forEach(function (a) {
      scopeByArea[a.id] = a.scope; themeOfArea[a.id] = a.category_id || null;
      areaById[a.id] = a;
    });
    // Map each parent to its ordered sub-items so the detail and drawer
    // can nest them without another pass over the dataset.
    var childrenByParent = {};
    (data.items || []).forEach(function (i) {
      if (i.parent_id) (childrenByParent[i.parent_id] = childrenByParent[i.parent_id] || []).push(i);
    });
    Object.keys(childrenByParent).forEach(function (pid) { childrenByParent[pid].sort(byOrder); });
    var catSorted = (data.categories || []).slice()
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    return { catById: catById, catSorted: catSorted, scopeByArea: scopeByArea,
      themeOfArea: themeOfArea, areaById: areaById, childrenByParent: childrenByParent };
  }

  // An item's theme: its own category, else the theme of its area.
  function themeIdOf(i, ctx) { return i.category_id || ctx.themeOfArea[i.area_id] || null; }

  function groupBy(items, keyFn) {
    var out = {};
    items.forEach(function (i) { var k = keyFn(i) || "none"; (out[k] = out[k] || []).push(i); });
    return out;
  }
  function catClass(cat) { return cat ? " rm-cat-" + App.escape(cat.key) : ""; }

  // Custom view: a per-row checkbox for hand-picking what a one-off PDF or
  // export carries, without any database change. pick = { custom, unpicked }
  // comes from roadmap.js; unpicked is a map of the ids the owner has
  // deselected. No pick object means the feature is off and nothing renders.
  function pickOn(pick) { return !!(pick && pick.custom); }
  function isUnpicked(id, pick) {
    return pickOn(pick) && !!(pick.unpicked && pick.unpicked[id]);
  }
  function pickCls(id, pick) { return isUnpicked(id, pick) ? " rmv-unpicked" : ""; }
  function pickBox(id, pick) {
    if (!pickOn(pick)) return "";
    return '<label class="rmv-pick"><input type="checkbox" data-pick-id="' +
      App.escape(id) + '"' + (isUnpicked(id, pick) ? "" : " checked") +
      ' aria-label="Include this item in the custom PDF and export"></label>';
  }

  // Coarse progress: a stored 0-100 snapped to checkpoints for a subtle
  // bar. Delivered work reads as complete regardless of the stored value.
  // The number itself is never shown at board level - progress is a
  // subtle internal signal (see docs/ROADMAP-PROCESS.md).
  var PROG_STOPS = [0, 25, 50, 75, 90, 100];
  var PROG_LABELS = {
    0: "Not started", 25: "Started", 50: "Halfway",
    75: "Well underway", 90: "Nearly done", 100: "Complete",
  };
  function progressOf(item) {
    var raw = item.status === "done" ? 100
      : Math.max(0, Math.min(100, parseInt(item.progress, 10) || 0));
    var bucket = PROG_STOPS[0];
    PROG_STOPS.forEach(function (s) {
      if (Math.abs(s - raw) < Math.abs(bucket - raw)) bucket = s;
    });
    return { pct: raw, bucket: bucket, label: PROG_LABELS[bucket] };
  }

  // Resolve an item's theme label and start/end band labels, so the
  // detail drawer and JSON export read the same placement the board shows.
  function themeLabel(i, ctx) {
    var id = themeIdOf(i, ctx), cat = id ? ctx.catById[id] : null;
    return cat ? cat.label : "General";
  }
  function bandLabel(i) { return BANDS[colStart(i)].label; }
  function endBandLabel(i) { return BANDS[colEnd(i)].label; }
  function areaTitleOf(i, ctx) { var a = ctx.areaById[i.area_id]; return a ? a.title : ""; }

  // Sub-steps of an item (its child work items), and a done/total read
  // used in place of a percentage - a subtle progress signal.
  function childItems(item, ctx) { return ctx.childrenByParent[item.id] || []; }
  function childStats(item, ctx) {
    var kids = childItems(item, ctx);
    var done = kids.filter(function (k) { return k.status === "done"; }).length;
    return { total: kids.length, done: done };
  }
  // A compact checklist of an item's sub-steps: each step's done state is
  // a CSS-drawn mark (no glyphs), the step title, and a click-through to
  // the step's own drawer. Empty when the item has no sub-items.
  function checklistHtml(item, ctx) {
    var kids = childItems(item, ctx);
    if (!kids.length) return "";
    var st = childStats(item, ctx);
    var steps = kids.map(function (k) {
      var done = k.status === "done";
      return '<li class="rmv-step' + (done ? " rmv-step--done" : "") +
        '" data-item-id="' + App.escape(k.id) + '">' +
        '<span class="rmv-step-mark" aria-hidden="true"></span>' +
        '<span class="rmv-step-title">' + App.escape(k.title) + "</span></li>";
    }).join("");
    return '<div class="rmv-steps"><p class="rmv-steps-head">Steps: ' + st.done +
      " of " + st.total + " done</p><ul class=\"rmv-step-list\">" + steps + "</ul></div>";
  }

  function freshnessHtml(items) {
    var latest = "";
    items.forEach(function (i) { if (i.updated_at && i.updated_at > latest) latest = i.updated_at; });
    return latest ? '<p class="rm-updated">Data as of ' + App.escape(latest.slice(0, 10)) + "</p>" : "";
  }
  function emptyNotice() {
    return '<p class="notice">No work items yet. Items are rows in the ' +
      "work_items table in Supabase (see docs/ROADMAP.md).</p>";
  }

  // --- Timeline: the continuous, spanning-bar layout ---------------

  // Order: start band, then workstreams above standalone items (a
  // standalone item always sinks below the workstreams in its band, even
  // at equal span), then bugs sink below everything else in the band,
  // then span length (a run that extends into the next band sinks below
  // work that finishes in this one), then priority. Equal-priority rows
  // cluster by theme lane so the Parked stack reads grouped, not
  // scattered. Current work floats to the top; long tasks spill right.
  function timelineOrder(a, b) {
    return (a._s - b._s) || ((b._ws ? 1 : 0) - (a._ws ? 1 : 0)) ||
      (a._bug - b._bug) || ((a._e - a._s) - (b._e - b._s)) ||
      (a._pri - b._pri) || (a._catSo - b._catSo) || (a._so - b._so);
  }

  // Shared grid renderer over pre-placed rows. maxBand caps the axis
  // (ACTIVE_MAX for Team/Executive, PARKED for Backlog); hiding
  // delivered drops the Delivered column and clamps spans into it.
  function timelineGrid(placed, maxBand, showDelivered, emptyMsg, pick) {
    var visible = showDelivered ? placed
      : placed.filter(function (p) { return p._e >= 2; });
    if (!visible.length) return emptyMsg;
    var first = showDelivered ? 0 : 2;
    var head = '<div class="rmv-tl-head"><span class="rmv-tl-label"></span>' +
      BANDS.slice(first, maxBand + 1).map(function (b) {
        return '<span class="rmv-tl-col">' + b.label + "</span>"; }).join("") + "</div>";
    var body = visible.slice().sort(timelineOrder).map(function (p) {
      var s = p._s < first ? first : p._s, e = p._e > maxBand ? maxBand : p._e;
      var progCls = p._prog ? " rmv-prog-" + p._prog.bucket : "";
      var idAttr = p._id ? ' data-item-id="' + App.escape(p._id) + '"' : "";
      var bar = '<span class="rmv-tl-bar' + (p.done ? " rmv-tl-bar--done" : "") +
        (p._s === PARKED ? " rmv-tl-bar--parked" : "") + (p._ws ? " rmv-tl-bar--ws" : "") +
        catClass(p._cat) + progCls +
        '"' + idAttr + ' style="grid-column:' + (s - first + 2) + " / " + (e - first + 3) + '">' +
        App.escape(p.label) + "</span>";
      return '<div class="rmv-tl-row' + pickCls(p._id, pick) + '"><span class="rmv-tl-label">' +
        App.escape(p._catLabel) + "</span>" + bar + pickBox(p._id, pick) + "</div>";
    }).join("");
    return '<div class="rmv-tl' + (showDelivered ? "" : " rmv-tl--nodelivered") +
      '" style="--tl-cols:' + (maxBand - first + 1) + '">' + head + body + "</div>";
  }

  // Place one item as a timeline row (bar = title).
  function placeItem(i, ctx) {
    var catId = themeIdOf(i, ctx), cat = catId ? ctx.catById[catId] : null;
    return { _s: colStart(i), _e: colEnd(i), _cat: cat,
      _catLabel: cat ? cat.label : "General", _pri: i.priority, _so: i.sort_order,
      _bug: bugRank(i), _catSo: cat ? cat.sort_order : 1e9,
      label: i.title, done: i.status === "done", _id: i.id, _prog: progressOf(i),
      _ws: i.level === "workstream" };
  }

  // --- Executive: department-first rollup ---------------------------

  // The Executive dataset: active work, plus delivered when shown, never
  // parked. Top-level items only (sub-steps roll into their parent).
  function execLive(items, ctx, show) {
    return items.filter(function (i) {
      if (isParked(i)) return false;
      if (i.status === "done") return show;
      return true;
    });
  }

  // Group live work by owning department (registry order, Unassigned
  // last), then by theme/category, each with its item list for counts.
  function execDeptGroups(live, ctx) {
    var byDept = groupBy(live, function (i) { return i.department || "none"; });
    var order = ((App.registry && App.registry.departments) || []).map(function (d) { return d.key; });
    var keys = [];
    order.forEach(function (k) { if (byDept[k]) keys.push(k); });
    Object.keys(byDept).forEach(function (k) {
      if (k !== "none" && keys.indexOf(k) === -1) keys.push(k);
    });
    if (byDept.none) keys.push("none");
    return keys.map(function (k) {
      var items = byDept[k];
      var byCat = groupBy(items, function (i) { return themeIdOf(i, ctx); });
      var cats = ctx.catSorted.filter(function (c) { return byCat[c.id]; })
        .map(function (c) { return { cat: c, items: byCat[c.id] }; });
      if (byCat.none) cats.push({ cat: null, items: byCat.none });
      return { key: k, label: k === "none" ? "Unassigned" : (App.departmentLabel(k) || k),
        items: items, cats: cats };
    });
  }

  function countLabel(n) { return n + (n === 1 ? " item" : " items"); }

  // A child row in the expanded Executive view: title, a subtle step
  // summary (done/total) in place of the old numeric percentage, and the
  // item's band. Clickable through to the drawer.
  function execItemRow(i, ctx) {
    var st = childStats(i, ctx);
    var steps = st.total
      ? '<span class="rmv-exec-item-steps">' + st.done + " of " + st.total + " steps</span>" : "";
    return '<li class="rmv-exec-item rm-card--' + BANDS[colStart(i)].key +
      '" data-item-id="' + App.escape(i.id) + '">' +
      '<span class="rmv-exec-item-title">' + App.escape(i.title) + "</span>" + steps +
      '<span class="rmv-exec-item-band">' + App.escape(bandLabel(i)) + "</span></li>";
  }

  // One category line under a department: name and count (compact); the
  // item list appears when Detailed is on.
  function execCatRow(entry, expanded, ctx) {
    var label = entry.cat ? entry.cat.label : "General";
    var head = '<div class="rmv-exec-cat-head">' +
      '<span class="rmv-exec-cat-name">' + App.escape(label) + "</span>" +
      '<span class="rmv-exec-cat-count">' + countLabel(entry.items.length) + "</span></div>";
    var list = expanded ? '<ul class="rmv-exec-items">' +
      entry.items.slice().sort(byOrder).map(function (i) { return execItemRow(i, ctx); }).join("") +
      "</ul>" : "";
    return '<li class="rmv-exec-cat' + catClass(entry.cat) + '">' + head + list + "</li>";
  }

  function execDeptSection(g, expanded, ctx) {
    return '<section class="rmv-exec-dept">' +
      '<h3 class="rmv-exec-dept-name">' + App.escape(g.label) +
      '<span class="rmv-exec-dept-count">' + countLabel(g.items.length) + "</span></h3>" +
      '<ul class="rmv-exec-cats">' +
      g.cats.map(function (c) { return execCatRow(c, expanded, ctx); }).join("") + "</ul></section>";
  }

  // Executive board: departments -> categories -> counts, expanding to
  // items when Detailed. Layout-independent, so the same summary prints
  // whether Timeline or Cascade is selected.
  function execBoard(all, ctx, show, expanded) {
    var groups = execDeptGroups(execLive(topLevel(all), ctx, show), ctx);
    if (!groups.length) {
      return '<p class="notice">No active roadmap work to summarise. Schedule ' +
        "work by setting a horizon of now, next or later.</p>";
    }
    return '<div class="rmv-exec">' +
      groups.map(function (g) { return execDeptSection(g, expanded, ctx); }).join("") + "</div>";
  }

  // --- Team / Backlog detail breakdown ------------------------------

  // Team keeps active work at item level, plus delivered when shown.
  function teamList(items) {
    return items.filter(function (i) { return i.status === "done" || isActive(i); });
  }

  // One item in the Detailed breakdown: title, owning department tag,
  // band, its summary, and its sub-step checklist.
  function breakdownItemRow(i, ctx) {
    var dept = App.departmentLabel(i.department);
    var deptTag = dept ? '<span class="rmv-td-dept">' + App.escape(dept) + "</span>" : "";
    var summary = i.summary ? '<p class="rmv-td-sum">' + App.escape(i.summary) + "</p>" : "";
    return '<li class="rmv-td-item rm-card--' + BANDS[colStart(i)].key +
      '" data-item-id="' + App.escape(i.id) + '">' +
      '<div class="rmv-td-item-head"><span class="rmv-td-title">' + App.escape(i.title) + "</span>" +
      deptTag + '<span class="rmv-td-band">' + App.escape(bandLabel(i)) + "</span></div>" +
      summary + checklistHtml(i, ctx) + "</li>";
  }

  // The Detailed breakdown: everything the level lists, grouped
  // Category -> Area -> item, so Team reads as a full drill-down.
  function breakdown(list, ctx) {
    if (!list.length) return "";
    var byCat = groupBy(list, function (i) { return themeIdOf(i, ctx); });
    function areaSort(a, b) {
      var aa = ctx.areaById[a], ab = ctx.areaById[b];
      return (aa ? aa.sort_order : 1e9) - (ab ? ab.sort_order : 1e9);
    }
    function catBlock(cat, catItems) {
      var byArea = groupBy(catItems, function (i) { return i.area_id || "none"; });
      var areas = Object.keys(byArea).sort(areaSort).map(function (aid) {
        var a = ctx.areaById[aid];
        var rows = byArea[aid].slice().sort(byOrder)
          .map(function (i) { return breakdownItemRow(i, ctx); }).join("");
        return '<div class="rmv-td-area"><h4 class="rmv-td-area-name">' +
          App.escape(a ? a.title : "General") + '</h4><ul class="rmv-td-items">' + rows + "</ul></div>";
      }).join("");
      return '<section class="rmv-td-cat' + catClass(cat) + '">' +
        '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
        areas + "</section>";
    }
    var blocks = ctx.catSorted.filter(function (c) { return byCat[c.id]; })
      .map(function (c) { return catBlock(c, byCat[c.id]); });
    if (byCat.none) blocks.push(catBlock(null, byCat.none));
    return '<div class="rmv-td">' + blocks.join("") + "</div>";
  }

  // Drop delivered work from a detail list when delivered is hidden, so
  // the breakdown tracks the board above it.
  function visibleDetail(list, show) {
    return show ? list : list.filter(function (i) { return i.status !== "done"; });
  }

  function timeline(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var expanded = !!(opts && opts.expanded);
    var pick = opts && opts.custom ? { custom: true, unpicked: opts.unpicked || {} } : null;
    var ctx = context(data);
    // The Backlog level is the master list: it mirrors the backlog module
    // and carries every work_item (all scopes, including portal and unfiled
    // work), so nothing captured is ever invisible in the roadmap tool.
    // Exec and Team stay product-scoped. See docs/ROADMAP-PLAYBOOK.md.
    var all = level === "backlog" ? (data.items || [])
      : productItems(data.items || [], ctx.scopeByArea);
    if (opts && opts.hideFixes) all = all.filter(function (i) { return !isFix(i); });
    if (!all.length) return emptyNotice();
    if (level === "exec") {
      return execBoard(all, ctx, show, expanded) + freshnessHtml(all);
    }
    var tops = topLevel(all);
    if (level === "workstreams") {
      // The strategic gantt: workstreams only, standalone items hidden.
      var wsList = teamList(tops).filter(function (i) { return i.level === "workstream"; });
      var wsGrid = timelineGrid(wsList.map(function (i) { return placeItem(i, ctx); }),
        ACTIVE_MAX, show,
        '<p class="notice">No active workstreams. Mark a top-level item as a ' +
        "workstream to show it here.</p>", pick);
      return wsGrid + (expanded ? breakdown(visibleDetail(wsList, show), ctx) : "") +
        freshnessHtml(all);
    }
    if (level === "backlog") {
      var grid = timelineGrid(tops.map(function (i) { return placeItem(i, ctx); }),
        PARKED, show, emptyNotice(), pick);
      return grid + (expanded ? breakdown(visibleDetail(tops, show), ctx) : "") + freshnessHtml(all);
    }
    var teamTops = teamList(tops);
    var teamGrid = timelineGrid(teamTops.map(function (i) { return placeItem(i, ctx); }),
      ACTIVE_MAX, show,
      '<p class="notice">No active roadmap work. Items wait in the Backlog ' +
      "until scheduled (set a horizon of now, next or later).</p>", pick);
    return teamGrid + (expanded ? breakdown(visibleDetail(teamTops, show), ctx) : "") +
      freshnessHtml(all);
  }

  // Shared internals for the cascade family (roadmap-views-cascade.js).
  App._rmv = {
    BANDS: BANDS, ACTIVE_MAX: ACTIVE_MAX, PARKED: PARKED,
    presentationLabel: presentationLabel, colStart: colStart, colEnd: colEnd,
    productItems: productItems, isFix: isFix, byOrder: byOrder, context: context,
    themeIdOf: themeIdOf, groupBy: groupBy, catClass: catClass, progressOf: progressOf,
    topLevel: topLevel, teamList: teamList, freshnessHtml: freshnessHtml,
    emptyNotice: emptyNotice, breakdown: breakdown, execBoard: execBoard,
    visibleDetail: visibleDetail,
    pickCls: pickCls, pickBox: pickBox,
  };

  App.roadmapView = {
    colStart: colStart, colEnd: colEnd, isParked: isParked, isActive: isActive,
    productItems: productItems, isFix: isFix, byDepartment: byDepartment, byOrder: byOrder, context: context,
    markRecency: markRecency,
    themeLabel: themeLabel, bandLabel: bandLabel, endBandLabel: endBandLabel,
    areaTitleOf: areaTitleOf, progressOf: progressOf,
    childItems: childItems, childStats: childStats, checklistHtml: checklistHtml,
    presentationLabel: presentationLabel, freshnessHtml: freshnessHtml,
    topLevel: topLevel, execBoard: execBoard, breakdown: breakdown,
    timeline: timeline,
  };
})();
