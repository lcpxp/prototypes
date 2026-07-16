// ------------------------------------------------------------------
// roadmap-views.js - Pure HTML builders for the roadmap home
// (modules/roadmap/). Data-in / string-out, no DOM, so they load in a
// Node vm for unit testing (tests/unit/roadmap-views.test.js). The DOM
// wiring, data fetch and switcher live in roadmap.js.
//
// One dataset (work_items), three levels x two layouts:
//   Level   Executive - a theme rollup of active work, always complete.
//           Team      - active work at item level.
//           Backlog   - every item (active + parked + delivered).
//   Layout  Timeline  - a continuous Delivered|Now|Next|Later|Parked
//           axis where a bar SPANS the columns it runs across.
//           Cascade   - the same work as stacked bands, an item
//           repeating under each band it covers.
//
// Placement derives from an item's own fields, so a move between views
// is a data edit (see docs/ROADMAP.md, docs/ROADMAP-PROCESS.md):
//   Delivered = status 'done'
//   Parked    = not done AND (horizon 'someday' OR status 'dropped')
//   Active    = the rest (horizon now/next/later)
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var PRESENTATION = {
    current: "Current focus", ongoing: "Ongoing",
    wind: "Wrapping up", bridge: "Next horizon", sequenced: "",
  };

  // The continuous axis: delivered(0) | now(1) | next(2) | later(3) |
  // parked(4). Team and Executive show the active bands (up to Later);
  // Backlog adds the Parked column.
  var BANDS = [
    { key: "delivered", label: "Delivered" },
    { key: "now", label: "Now" },
    { key: "next", label: "Next" },
    { key: "later", label: "Later" },
    { key: "parked", label: "Parked" },
  ];
  var ACTIVE_MAX = 3;
  var PARKED = 4;

  function presentationLabel(p) { return PRESENTATION[p] || ""; }

  // Column index for a horizon; someday folds into the Parked band.
  function hzIdx(h) {
    return h === "now" ? 1 : h === "next" ? 2 : h === "later" ? 3 : PARKED;
  }
  // An item's start and end columns, from its own fields.
  function colStart(i) {
    if (i.status === "done") return 0;
    if (i.status === "dropped") return PARKED;
    return hzIdx(i.horizon);
  }
  function colEnd(i) {
    if (i.status === "done") return 0;
    if (i.status === "dropped") return PARKED;
    var s = hzIdx(i.horizon), e = hzIdx(i.end_horizon || i.horizon);
    return e < s ? s : e;
  }
  function isParked(i) { return colStart(i) === PARKED; }
  function isActive(i) { var s = colStart(i); return s >= 1 && s <= ACTIVE_MAX; }

  function productItems(items, scopeByArea) {
    return items.filter(function (i) { return scopeByArea[i.area_id] === "product"; });
  }
  function byOrder(a, b) {
    return (a.priority - b.priority) || (a.sort_order - b.sort_order);
  }

  function context(data) {
    var catById = {}, scopeByArea = {}, themeOfArea = {};
    (data.categories || []).forEach(function (c) { catById[c.id] = c; });
    (data.areas || []).forEach(function (a) {
      scopeByArea[a.id] = a.scope; themeOfArea[a.id] = a.category_id || null;
    });
    var catSorted = (data.categories || []).slice()
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    return { catById: catById, catSorted: catSorted,
      scopeByArea: scopeByArea, themeOfArea: themeOfArea };
  }

  // An item's theme: its own category, else the theme of its area.
  function themeIdOf(i, ctx) { return i.category_id || ctx.themeOfArea[i.area_id] || null; }

  function groupBy(items, keyFn) {
    var out = {};
    items.forEach(function (i) { var k = keyFn(i) || "none"; (out[k] = out[k] || []).push(i); });
    return out;
  }
  function catClass(cat) { return cat ? " rm-cat-" + App.escape(cat.key) : ""; }

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

  // Order: start band, then span length (longer runs sink lower), then
  // priority. Current work floats to the top; long tasks spill right.
  function timelineOrder(a, b) {
    return (a._s - b._s) || ((a._e - a._s) - (b._e - b._s)) ||
      (a._pri - b._pri) || (a._so - b._so);
  }

  // Shared grid renderer over pre-placed rows. maxBand caps the axis
  // (ACTIVE_MAX for Team/Executive, PARKED for Backlog); hiding
  // delivered drops the Delivered column and clamps spans into it.
  function timelineGrid(placed, maxBand, showDelivered, emptyMsg) {
    var visible = showDelivered ? placed
      : placed.filter(function (p) { return p._e >= 1; });
    if (!visible.length) return emptyMsg;
    var first = showDelivered ? 0 : 1;
    var head = '<div class="rmv-tl-head"><span class="rmv-tl-label"></span>' +
      BANDS.slice(first, maxBand + 1).map(function (b) {
        return '<span class="rmv-tl-col">' + b.label + "</span>"; }).join("") + "</div>";
    var body = visible.slice().sort(timelineOrder).map(function (p) {
      var s = p._s < first ? first : p._s, e = p._e > maxBand ? maxBand : p._e;
      var bar = '<span class="rmv-tl-bar' + (p.done ? " rmv-tl-bar--done" : "") +
        (p._s === PARKED ? " rmv-tl-bar--parked" : "") + catClass(p._cat) +
        '" style="grid-column:' + (s - first + 2) + " / " + (e - first + 3) + '">' +
        App.escape(p.label) + "</span>";
      return '<div class="rmv-tl-row"><span class="rmv-tl-label">' +
        App.escape(p._catLabel) + "</span>" + bar + "</div>";
    }).join("");
    return '<div class="rmv-tl' + (showDelivered ? "" : " rmv-tl--nodelivered") +
      '" style="--tl-cols:' + (maxBand - first + 1) + '">' + head + body + "</div>";
  }

  // Place one item as a timeline row (bar = title).
  function placeItem(i, ctx) {
    var catId = themeIdOf(i, ctx), cat = catId ? ctx.catById[catId] : null;
    return { _s: colStart(i), _e: colEnd(i), _cat: cat,
      _catLabel: cat ? cat.label : "General", _pri: i.priority, _so: i.sort_order,
      label: i.title, done: i.status === "done" };
  }

  // Roll a theme's items into one lane (bar = item count) for Executive.
  function themeLane(cat, items) {
    var s = PARKED, e = 0, pri = Infinity, so = Infinity;
    items.forEach(function (i) {
      var cs = colStart(i), ce = colEnd(i);
      if (cs < s) s = cs;
      if (ce > e) e = ce;
      if (i.priority < pri) pri = i.priority;
      if (i.sort_order < so) so = i.sort_order;
    });
    var n = items.length;
    return { _s: s, _e: e, _cat: cat, _catLabel: cat ? cat.label : "General",
      _pri: pri, _so: so, done: e === 0,
      label: n + (n === 1 ? " item" : " items") };
  }

  // Executive keeps active work (plus delivered when shown), never
  // parked, rolled up by theme in category order. Always complete.
  function execLanes(items, ctx, showDelivered) {
    var live = items.filter(function (i) {
      if (isParked(i)) return false;
      if (i.status === "done") return showDelivered;
      return true;
    });
    var byCat = groupBy(live, function (i) { return themeIdOf(i, ctx); });
    var lanes = ctx.catSorted.filter(function (c) { return byCat[c.id]; })
      .map(function (c) { return themeLane(c, byCat[c.id]); });
    if (byCat.none) lanes.push(themeLane(null, byCat.none));
    return lanes;
  }

  // Team keeps active work at item level, plus delivered when shown.
  function teamList(items) {
    return items.filter(function (i) { return i.status === "done" || isActive(i); });
  }

  function timeline(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var ctx = context(data);
    var all = productItems(data.items || [], ctx.scopeByArea);
    if (!all.length) return emptyNotice();
    if (level === "exec") {
      return timelineGrid(execLanes(all, ctx, show), ACTIVE_MAX, show,
        '<p class="notice">No active roadmap work to summarise. Schedule ' +
        "work by setting a horizon of now, next or later.</p>") + freshnessHtml(all);
    }
    if (level === "backlog") {
      return timelineGrid(all.map(function (i) { return placeItem(i, ctx); }), PARKED, show,
        emptyNotice()) + freshnessHtml(all);
    }
    return timelineGrid(teamList(all).map(function (i) { return placeItem(i, ctx); }),
      ACTIVE_MAX, show,
      '<p class="notice">No active roadmap work. Items wait in the Backlog ' +
      "until scheduled (set a horizon of now, next or later).</p>") + freshnessHtml(all);
  }

  // --- Cascade: stacked stage bands, spanning items repeat ---------

  function itemCard(item, cat) {
    var band = colStart(item);
    var label = band === 1 ? presentationLabel(item.presentation) : "";
    return '<li class="rm-card rm-card--' + BANDS[band].key + catClass(cat) + '">' +
      (label ? '<p class="rm-state rm-state--' + App.escape(item.presentation) + '">' +
        App.escape(label) + "</p>" : "") +
      "<h3>" + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") + "</li>";
  }

  function themeBlock(cat, items, cardFn) {
    var desc = cat && cat.description
      ? '<p class="rmv-theme-desc">' + App.escape(cat.description) + "</p>" : "";
    var cards = items.length ? '<ul class="rmv-cards">' +
      items.map(cardFn).join("") + "</ul>" : "";
    return '<section class="rmv-theme' + catClass(cat) + '">' +
      '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
      desc + cards + "</section>";
  }

  function themeBlocks(ctx, byCat, cardFn) {
    var blocks = ctx.catSorted.filter(function (c) { return byCat[c.id]; })
      .map(function (c) { return themeBlock(c, byCat[c.id].slice().sort(byOrder), cardFn); });
    if (byCat.none) blocks.push(themeBlock(null, byCat.none.slice().sort(byOrder), cardFn));
    return '<div class="rmv-themes">' + blocks.join("") + "</div>";
  }

  function bandHead(label, key) {
    return '<h2 class="rmv-band-head rmv-band-head--' + App.escape(key) + '">' +
      App.escape(label) + "</h2>";
  }

  // Stack items into the bands they span, grouped by theme. Executive
  // groups whole themes (description card, no items); Team/Backlog show
  // item cards. maxBand caps the axis.
  function bandsCascade(list, ctx, maxBand, show, exec) {
    var html = "";
    for (var idx = 0; idx <= maxBand; idx++) {
      if (idx === 0 && !show) continue;
      var inBand = list.filter(function (i) { return colStart(i) <= idx && colEnd(i) >= idx; });
      if (!inBand.length) continue;
      var byCat = groupBy(inBand, function (i) { return themeIdOf(i, ctx); });
      var body = exec
        ? '<div class="rmv-themes">' + ctx.catSorted.filter(function (c) { return byCat[c.id]; })
            .map(function (c) { return themeBlock(c, [], null); })
            .concat(byCat.none ? [themeBlock(null, [], null)] : []).join("") + "</div>"
        : themeBlocks(ctx, byCat, function (i) { return itemCard(i, ctx.catById[themeIdOf(i, ctx)] || null); });
      html += '<section class="rmv-band">' + bandHead(BANDS[idx].label, BANDS[idx].key) +
        body + "</section>";
    }
    return html;
  }

  function cascade(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var ctx = context(data);
    var all = productItems(data.items || [], ctx.scopeByArea);
    if (!all.length) return emptyNotice();
    if (level === "exec") {
      var live = all.filter(function (i) {
        if (isParked(i)) return false;
        if (i.status === "done") return show;
        return true;
      });
      return bandsCascade(live, ctx, ACTIVE_MAX, show, true) + freshnessHtml(all);
    }
    var list = level === "backlog" ? all : teamList(all);
    var maxBand = level === "backlog" ? PARKED : ACTIVE_MAX;
    return bandsCascade(list, ctx, maxBand, show, false) + freshnessHtml(all);
  }

  App.roadmapView = {
    colStart: colStart, colEnd: colEnd, isParked: isParked, isActive: isActive,
    productItems: productItems, byOrder: byOrder,
    presentationLabel: presentationLabel, freshnessHtml: freshnessHtml,
    timeline: timeline, cascade: cascade,
  };
})();
