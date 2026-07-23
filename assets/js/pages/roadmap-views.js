// ------------------------------------------------------------------
// roadmap-views.js - Pure HTML builders for the roadmap home
// (modules/roadmap/). Data-in / string-out, no DOM, so they load in a
// Node vm for unit testing (tests/unit/roadmap-views.test.js). The DOM
// wiring, data fetch and switcher live in roadmap.js. The cascade family
// lives in roadmap-views-cascade.js and the Executive board in
// roadmap-views-exec.js, sharing these helpers via the private App._rmv
// namespace.
//
// Levels: Workstreams (workstream bars only), Categories (the
// department-first rollup in roadmap-views-exec.js), Work Items (bars
// only: workstreams in bold with their nested work items indented, plus
// standalone items; Detailed adds a Category -> Area breakdown from
// roadmap-views-breakdown.js) and Backlog (the same bar model over every
// item). Layouts: Timeline (a continuous Delivered|Now|Next|Later|Parked
// axis where a bar SPANS the columns it runs across) and Cascade (stacked
// bands, in roadmap-views-cascade.js).
//
// Placement derives from an item's own fields, so a move between views is
// a data edit: Delivered = status 'done'; Parked = not done AND (horizon
// 'someday' OR status 'dropped'); Active = the rest. Deliverables
// (level='deliverable', or any child of an item) NEVER render as bars -
// they list only in their parent's drawer; nested work items render as
// their own indented bars under their workstream.
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

  // Only top-level, non-deliverable rows are placed as bars. Deliverables
  // never reach the board even if bad data leaves one parentless; work
  // items and workstreams without a parent do.
  function topLevel(items) {
    return items.filter(function (i) { return !i.parent_id && i.level !== "deliverable"; });
  }

  // A parent's children that render as their own (indented) bars: only a
  // workstream's non-deliverable children. Children of a work item are
  // never bars (deliverables by position). childrenByParent is byOrder.
  function barKids(parent, ctx) {
    if (!parent || parent.level !== "workstream") return [];
    return (ctx.childrenByParent[parent.id] || []).filter(function (k) {
      return k.level !== "deliverable";
    });
  }
  // A parent's drawer-only deliverables: every child of a work item (by
  // position), or the deliverable-level children of a workstream.
  function deliverablesOf(parent, ctx) {
    var kids = (ctx.childrenByParent[parent.id] || []);
    if (parent.level !== "workstream") return kids;
    return kids.filter(function (k) { return k.level === "deliverable"; });
  }

  // Does an item belong to a department, by owner or business-area
  // association?
  function inDepartment(i, dept) {
    return i.department === dept ||
      (!!i.associated_departments && i.associated_departments.indexOf(dept) !== -1);
  }

  // Narrow a dataset to one department: keep an item that matches (owner
  // or association); keep a workstream that has any matching child (the
  // association shown by those children under it); a DIRECTLY matched
  // parent keeps its whole family, one kept only via associations keeps
  // just the matching children. Falsy dept returns the data unchanged.
  function byDepartment(data, dept) {
    if (!dept) return data;
    var items = data.items || [];
    var byId = {}, childrenByParent = {};
    items.forEach(function (i) {
      byId[i.id] = i;
      if (i.parent_id) (childrenByParent[i.parent_id] = childrenByParent[i.parent_id] || []).push(i);
    });
    var keep = {};
    items.forEach(function (i) { if (inDepartment(i, dept)) keep[i.id] = true; });
    items.forEach(function (i) {
      if (i.level === "workstream" &&
        (childrenByParent[i.id] || []).some(function (k) { return inDepartment(k, dept); })) {
        keep[i.id] = true;
      }
    });
    items.forEach(function (i) {
      if (i.parent_id && byId[i.parent_id] && inDepartment(byId[i.parent_id], dept)) keep[i.id] = true;
    });
    return {
      categories: data.categories,
      areas: data.areas,
      items: items.filter(function (i) { return keep[i.id]; }),
    };
  }

  // Custom-view export helper: given the directly-unpicked map, return the
  // full set to drop - each unpicked id plus all its descendants - so an
  // export never carries a child whose parent was deselected.
  function expandUnpicked(unpicked, ctx) {
    var out = {};
    if (!unpicked) return out;
    var stack = [];
    Object.keys(unpicked).forEach(function (id) {
      if (unpicked[id]) { out[id] = true; stack.push(id); }
    });
    while (stack.length) {
      var id = stack.pop();
      (ctx.childrenByParent[id] || []).forEach(function (k) {
        if (!out[k.id]) { out[k.id] = true; stack.push(k.id); }
      });
    }
    return out;
  }
  // Bugs always sink below other work at the same level, whatever their
  // stored priority number. Otherwise priority interleaves everything;
  // workstreams win ties, so at default priorities they and their items
  // naturally outrank loose items unless one is deliberately promoted.
  function bugRank(i) { return i.type === "bug" ? 1 : 0; }
  function wsRank(i) { return i.level === "workstream" ? 0 : 1; }
  function byOrder(a, b) {
    return (bugRank(a) - bugRank(b)) || (a.priority - b.priority) ||
      (wsRank(a) - wsRank(b)) || (a.sort_order - b.sort_order);
  }

  function context(data) {
    var catById = {}, scopeByArea = {}, themeOfArea = {}, areaById = {};
    (data.categories || []).forEach(function (c) { catById[c.id] = c; });
    (data.areas || []).forEach(function (a) {
      scopeByArea[a.id] = a.scope; themeOfArea[a.id] = a.category_id || null;
      areaById[a.id] = a;
    });
    // Map each parent to its ordered sub-items so the detail and drawer
    // can nest them without another pass over the dataset; itemById lets
    // the drawer resolve parent_id/relates_to_id back to titles.
    var childrenByParent = {}, itemById = {};
    (data.items || []).forEach(function (i) {
      itemById[i.id] = i;
      if (i.parent_id) (childrenByParent[i.parent_id] = childrenByParent[i.parent_id] || []).push(i);
    });
    Object.keys(childrenByParent).forEach(function (pid) { childrenByParent[pid].sort(byOrder); });
    var catSorted = (data.categories || []).slice()
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    return { catById: catById, catSorted: catSorted, scopeByArea: scopeByArea,
      themeOfArea: themeOfArea, areaById: areaById,
      childrenByParent: childrenByParent, itemById: itemById };
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
  // export carries, without any database change. pick = { custom, unpicked,
  // excluded } comes from roadmap.js; unpicked is a map of the ids the owner
  // deselected (each keeps a clickable box), excluded is their descendants -
  // rows dropped BECAUSE a parent was unpicked, so they dim and lose their
  // own box (re-picking the parent restores them). No pick object means the
  // feature is off and nothing renders.
  function pickOn(pick) { return !!(pick && pick.custom); }
  function isUnpicked(id, pick) {
    return pickOn(pick) && !!(pick.unpicked && pick.unpicked[id]);
  }
  function isExcluded(id, pick) {
    return pickOn(pick) && !!(pick.excluded && pick.excluded[id]);
  }
  function pickCls(id, pick) {
    return (isUnpicked(id, pick) || isExcluded(id, pick)) ? " rmv-unpicked" : "";
  }
  function pickBox(id, pick) {
    if (!pickOn(pick) || isExcluded(id, pick)) return "";
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

  // All direct children of an item, and a done/total read used in place of
  // a percentage - a subtle progress signal for the exec rollup.
  function childItems(item, ctx) { return ctx.childrenByParent[item.id] || []; }
  function childStats(item, ctx) {
    var kids = childItems(item, ctx);
    var done = kids.filter(function (k) { return k.status === "done"; }).length;
    return { total: kids.length, done: done };
  }
  // One clickable step row (a CSS-drawn done mark, the title, a
  // click-through to that row's own drawer), shared by the deliverables
  // checklist and the workstream's work-items list.
  function stepRow(k) {
    var done = k.status === "done";
    return '<li class="rmv-step' + (done ? " rmv-step--done" : "") +
      '" data-item-id="' + App.escape(k.id) + '">' +
      '<span class="rmv-step-mark" aria-hidden="true"></span>' +
      '<span class="rmv-step-title">' + App.escape(k.title) + "</span></li>";
  }
  // A compact checklist of a parent's deliverables (drawer-only detail):
  // done/total header plus a step row each. Empty when there are none.
  function checklistHtml(item, ctx) {
    var kids = deliverablesOf(item, ctx);
    if (!kids.length) return "";
    var done = kids.filter(function (k) { return k.status === "done"; }).length;
    return '<div class="rmv-steps"><p class="rmv-steps-head">Deliverables: ' + done +
      " of " + kids.length + " done</p><ul class=\"rmv-step-list\">" +
      kids.map(stepRow).join("") + "</ul></div>";
  }
  // A workstream's nested work items as a clickable list (for its drawer's
  // "Work items" section); each opens its own drawer. Empty when none.
  function itemListHtml(item, ctx) {
    var kids = barKids(item, ctx);
    if (!kids.length) return "";
    return '<ul class="rmv-step-list rmv-item-list">' + kids.map(stepRow).join("") + "</ul>";
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

  // Order: start band, then bugs sink below everything else in the band,
  // then priority - loose items interleave with workstreams by priority
  // number, with workstreams winning ties so at default priorities they
  // naturally lead their band unless an item is deliberately promoted.
  // Remaining ties: span length (a run that extends into the next band
  // sinks below work that finishes in this one), then theme lane so the
  // Parked stack reads grouped, not scattered. Current work floats to
  // the top; long tasks spill right.
  function timelineOrder(a, b) {
    return (a._s - b._s) || (a._bug - b._bug) || (a._pri - b._pri) ||
      ((a._ws ? 0 : 1) - (b._ws ? 0 : 1)) ||
      ((a._e - a._s) - (b._e - b._s)) ||
      (a._catSo - b._catSo) || (a._so - b._so);
  }

  // Shared grid renderer over pre-placed rows. maxBand caps the axis
  // (ACTIVE_MAX for Team/Executive, PARKED for Backlog); hiding
  // delivered drops the Delivered column and clamps spans into it.
  // preordered keeps the caller's order (used to group child bars under
  // their parent); otherwise rows sort by timelineOrder.
  function timelineGrid(placed, maxBand, showDelivered, emptyMsg, pick, preordered) {
    var visible = showDelivered ? placed
      : placed.filter(function (p) { return p._e >= 2; });
    if (!visible.length) return emptyMsg;
    var first = showDelivered ? 0 : 2;
    var head = '<div class="rmv-tl-head"><span class="rmv-tl-label"></span>' +
      BANDS.slice(first, maxBand + 1).map(function (b) {
        return '<span class="rmv-tl-col">' + b.label + "</span>"; }).join("") + "</div>";
    var ordered = preordered ? visible : visible.slice().sort(timelineOrder);
    var body = ordered.map(function (p) {
      var s = p._s < first ? first : p._s, e = p._e > maxBand ? maxBand : p._e;
      var progCls = p._prog ? " rmv-prog-" + p._prog.bucket : "";
      var idAttr = p._id ? ' data-item-id="' + App.escape(p._id) + '"' : "";
      var cols = "grid-column:" + (s - first + 2) + " / " + (e - first + 3);
      var bar = '<span class="rmv-tl-bar' + (p.done ? " rmv-tl-bar--done" : "") +
        (p._s === PARKED ? " rmv-tl-bar--parked" : "") + (p._ws ? " rmv-tl-bar--ws" : "") +
        catClass(p._cat) + progCls +
        '"' + idAttr + ' style="' + cols + '">' + App.escape(p.label) + "</span>";
      var rowCls = "rmv-tl-row" + (p._child ? " rmv-tl-row--child" : "") + pickCls(p._id, pick);
      return '<div class="' + rowCls + '"><span class="rmv-tl-label">' +
        App.escape(p._catLabel) + "</span>" + bar + pickBox(p._id, pick) + "</div>";
    }).join("");
    return '<div class="rmv-tl' + (showDelivered ? "" : " rmv-tl--nodelivered") +
      '" style="--tl-cols:' + (maxBand - first + 1) + '">' + head + body + "</div>";
  }

  // Place one item as a timeline row (bar = title). child marks an
  // indented nested work item so it renders under its parent.
  function placeItem(i, ctx, child) {
    var catId = themeIdOf(i, ctx), cat = catId ? ctx.catById[catId] : null;
    return { _s: colStart(i), _e: colEnd(i), _cat: cat,
      _catLabel: cat ? cat.label : "General", _pri: i.priority, _so: i.sort_order,
      _bug: bugRank(i), _catSo: cat ? cat.sort_order : 1e9,
      label: i.title, done: i.status === "done", _id: i.id, _prog: progressOf(i),
      _ws: i.level === "workstream", _child: !!child };
  }

  // Pre-order rows for a bars-with-children view: sort top-level rows by
  // timelineOrder, then drop each workstream's nested work items (indented,
  // in byOrder) immediately after it so a child groups under its parent.
  // keepChild (optional) filters children to the level's membership.
  function placedWithChildren(tops, ctx, keepChild) {
    var placedTops = tops.map(function (i) { return { p: placeItem(i, ctx), item: i }; });
    placedTops.sort(function (a, b) { return timelineOrder(a.p, b.p); });
    var out = [];
    placedTops.forEach(function (entry) {
      out.push(entry.p);
      barKids(entry.item, ctx).forEach(function (k) {
        if (!keepChild || keepChild(k)) out.push(placeItem(k, ctx, true));
      });
    });
    return out;
  }
  // Team membership: active work plus delivered (parked children drop off
  // the Work Items board just like parked top-level rows do).
  function teamMember(i) { return i.status === "done" || isActive(i); }

  // --- Team / Backlog helpers ---------------------------------------
  // The Detailed Category -> Area breakdown lives in
  // roadmap-views-breakdown.js (App._rmv.breakdown); the Executive board
  // in roadmap-views-exec.js (App._rmv.execBoard).

  // Team keeps active work at item level, plus delivered when shown.
  function teamList(items) {
    return items.filter(function (i) { return i.status === "done" || isActive(i); });
  }

  // Drop delivered work from a detail list when delivered is hidden, so
  // the breakdown tracks the board above it.
  function visibleDetail(list, show) {
    return show ? list : list.filter(function (i) { return i.status !== "done"; });
  }
  // The Detailed breakdown is built in roadmap-views-breakdown.js and
  // attached to App._rmv at load; call it at render time.
  function breakdown(list, ctx) { return App._rmv.breakdown(list, ctx); }

  function timeline(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var expanded = !!(opts && opts.expanded);
    var pick = opts && opts.custom
      ? { custom: true, unpicked: opts.unpicked || {}, excluded: opts.excluded || {} } : null;
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
      return App._rmv.execBoard(all, ctx, show, expanded) + freshnessHtml(all);
    }
    var tops = topLevel(all);
    if (level === "workstreams") {
      // The strategic gantt: workstreams only, standalone items hidden,
      // nested items collapsed until the Detailed breakdown.
      var wsList = teamList(tops).filter(function (i) { return i.level === "workstream"; });
      var wsGrid = timelineGrid(wsList.map(function (i) { return placeItem(i, ctx); }),
        ACTIVE_MAX, show,
        '<p class="notice">No active workstreams. Mark a top-level item as a ' +
        "workstream to show it here.</p>", pick);
      return wsGrid + (expanded ? breakdown(visibleDetail(wsList, show), ctx) : "") +
        freshnessHtml(all);
    }
    if (level === "backlog") {
      // The master list as bars: every top-level row, each workstream's
      // nested work items indented beneath it.
      var grid = timelineGrid(placedWithChildren(tops, ctx),
        PARKED, show, emptyNotice(), pick, true);
      return grid + (expanded ? breakdown(visibleDetail(tops, show), ctx) : "") + freshnessHtml(all);
    }
    // Work Items: workstreams (bold) with their nested work items indented
    // beneath, plus standalone items - all bars. Deliverables never appear.
    var teamTops = teamList(tops);
    var teamGrid = timelineGrid(placedWithChildren(teamTops, ctx, teamMember), ACTIVE_MAX, show,
      '<p class="notice">No active roadmap work. Items wait in the Backlog ' +
      "until scheduled (set a horizon of now, next or later).</p>", pick, true);
    return teamGrid + (expanded ? breakdown(visibleDetail(teamTops, show), ctx) : "") +
      freshnessHtml(all);
  }

  // Shared internals for the cascade family (roadmap-views-cascade.js)
  // and the Executive board (roadmap-views-exec.js, which attaches
  // execBoard onto this namespace).
  App._rmv = {
    BANDS: BANDS, ACTIVE_MAX: ACTIVE_MAX, PARKED: PARKED,
    presentationLabel: presentationLabel, colStart: colStart, colEnd: colEnd,
    productItems: productItems, isFix: isFix, byOrder: byOrder, context: context,
    themeIdOf: themeIdOf, groupBy: groupBy, catClass: catClass, progressOf: progressOf,
    topLevel: topLevel, teamList: teamList, freshnessHtml: freshnessHtml,
    emptyNotice: emptyNotice, bandLabel: bandLabel,
    childStats: childStats, checklistHtml: checklistHtml,
    barKids: barKids, deliverablesOf: deliverablesOf, teamMember: teamMember,
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
    barKids: barKids, deliverablesOf: deliverablesOf, itemListHtml: itemListHtml,
    expandUnpicked: expandUnpicked,
    presentationLabel: presentationLabel, freshnessHtml: freshnessHtml,
    topLevel: topLevel, breakdown: breakdown,
    timeline: timeline,
  };
})();
