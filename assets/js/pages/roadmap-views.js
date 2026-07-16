// ------------------------------------------------------------------
// roadmap-views.js - Pure HTML builders for the roadmap home
// (modules/roadmap/). Data-in / string-out, no DOM, so they load in a
// Node vm for unit testing (tests/unit/roadmap-views.test.js). The DOM
// wiring, data fetch and switcher live in roadmap.js.
//
// One dataset, two layouts x four levels:
//   Layout  Timeline (default) - a continuous Delivered|Now|Next|Later
//           axis where an activity's bar SPANS the columns it runs
//           across (Now -> Next, Now -> Later), so long-running work
//           visibly spills onward. Cascade - the same work as stacked
//           stage bands, an item appearing under each band it covers.
//   Level   Executive (curated audience='exec'), Team (everything),
//           Backlog (open feeder), Parked (de-scoped, reasoning kept).
//
// Placement derives from an item's own fields (horizon = start band,
// end_horizon = the band it runs through), so moving or extending an
// item is a data edit (see docs/ROADMAP.md, docs/ROADMAP-PROCESS.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var PRESENTATION = {
    current: "Current focus", ongoing: "Ongoing",
    wind: "Wrapping up", bridge: "Next horizon", sequenced: "",
  };

  // The continuous axis: delivered(0) | now(1) | next(2) | later(3).
  var BANDS = [
    { key: "delivered", label: "Delivered" },
    { key: "now", label: "Now" },
    { key: "next", label: "Next" },
    { key: "later", label: "Later" },
  ];
  var BACKLOG_OPEN = ["open", "planned", "in_progress", "blocked"];
  var BACKLOG_PARKED = ["dropped", "done"];

  function presentationLabel(p) { return PRESENTATION[p] || ""; }

  // Column index for a horizon; someday folds into Later.
  function hzIdx(h) {
    return h === "now" ? 1 : h === "next" ? 2 : h === "later" ? 3 : 3;
  }
  // An item's start and end columns. Delivered work sits in column 0.
  function colStart(i) { return i.status === "done" ? 0 : hzIdx(i.horizon); }
  function colEnd(i) {
    if (i.status === "done") return 0;
    var s = hzIdx(i.horizon), e = hzIdx(i.end_horizon || i.horizon);
    return e < s ? s : e;
  }

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
    return '<p class="notice">No roadmap items yet. Items are rows in the ' +
      "roadmap_items table in Supabase (see docs/ROADMAP.md).</p>";
  }

  // --- Timeline: the continuous, spanning-bar layout ---------------

  // Order: start band, then span length (longer runs sink lower), then
  // priority. Current work floats to the top; long tasks spill right.
  function timelineOrder(a, b) {
    return (a._s - b._s) || ((a._e - a._s) - (b._e - b._s)) ||
      (a._row.priority - b._row.priority) || (a._row.sort_order - b._row.sort_order);
  }

  function timelineHtml(rows, ctx, useAreaTheme, emptyMsg, showDelivered) {
    // Delivered work can be hidden; when it is, the Delivered column
    // drops off the axis and the remaining columns shift left.
    var visible = showDelivered ? rows
      : rows.filter(function (r) { return r.status !== "done"; });
    if (!visible.length) return emptyMsg;
    var first = showDelivered ? 0 : 1;
    var placed = visible.map(function (r) {
      var catId = useAreaTheme ? ctx.themeOfArea[r.area_id] : r.category_id;
      return { _row: r, _s: colStart(r), _e: colEnd(r), _cat: catId ? ctx.catById[catId] : null };
    }).sort(timelineOrder);
    var head = '<div class="rmv-tl-head"><span class="rmv-tl-label"></span>' +
      BANDS.slice(first).map(function (b) { return '<span class="rmv-tl-col">' + b.label + "</span>"; })
        .join("") + "</div>";
    var body = placed.map(function (p) {
      var done = p._row.status === "done";
      // Grid column 1 is the label gutter; data columns follow, shifted
      // by the first visible band.
      var bar = '<span class="rmv-tl-bar' + (done ? " rmv-tl-bar--done" : "") + catClass(p._cat) +
        '" style="grid-column:' + (p._s - first + 2) + " / " + (p._e - first + 3) + '">' +
        App.escape(p._row.title) + "</span>";
      return '<div class="rmv-tl-row"><span class="rmv-tl-label">' +
        App.escape(p._cat ? p._cat.label : "General") + "</span>" + bar + "</div>";
    }).join("");
    return '<div class="rmv-tl' + (showDelivered ? "" : " rmv-tl--nodelivered") + '">' +
      head + body + "</div>" + freshnessHtml(rows);
  }

  // The rows and theme source for each level.
  function levelRows(data, level, ctx) {
    if (level === "backlog" || level === "parked") {
      var group = level === "backlog" ? BACKLOG_OPEN : BACKLOG_PARKED;
      var rows = productItems((data.backlog || []).filter(function (i) {
        return group.indexOf(i.status) !== -1; }), ctx.scopeByArea);
      return { rows: rows, useAreaTheme: true };
    }
    var items = productItems(data.items || [], ctx.scopeByArea);
    if (level === "exec") {
      items = items.filter(function (i) { return i.audience === "exec"; });
    }
    return { rows: items, useAreaTheme: false };
  }

  function timeline(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var ctx = context(data);
    var r = levelRows(data, level, ctx);
    var empty = level === "backlog"
      ? '<p class="notice">No open product backlog items. The backlog feeds the roadmap.</p>'
      : level === "parked"
      ? '<p class="notice">Nothing parked. De-scoped items land here with the reasoning kept.</p>'
      : emptyNotice();
    return timelineHtml(r.rows, ctx, r.useAreaTheme, empty, show);
  }

  // --- Cascade: stacked stage bands, spanning items repeat ---------

  function itemCard(item, cat) {
    var label = colStart(item) === 1 ? presentationLabel(item.presentation) : "";
    var bandClass = BANDS[colStart(item)].key;
    return '<li class="rm-card rm-card--' + bandClass + catClass(cat) + '">' +
      (label ? '<p class="rm-state rm-state--' + App.escape(item.presentation) + '">' +
        App.escape(label) + "</p>" : "") +
      "<h3>" + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") + "</li>";
  }

  function themeBlock(cat, items) {
    var desc = cat && cat.description
      ? '<p class="rmv-theme-desc">' + App.escape(cat.description) + "</p>" : "";
    var cards = items.length ? '<ul class="rmv-cards">' +
      items.map(function (i) { return itemCard(i, cat); }).join("") + "</ul>" : "";
    return '<section class="rmv-theme' + catClass(cat) + '">' +
      '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
      desc + cards + "</section>";
  }

  function themeBlocks(catSorted, byCat) {
    var blocks = catSorted.filter(function (c) { return byCat[c.id]; })
      .map(function (c) { return themeBlock(c, byCat[c.id].slice().sort(byOrder)); });
    if (byCat.none) blocks.push(themeBlock(null, byCat.none.slice().sort(byOrder)));
    return '<div class="rmv-themes">' + blocks.join("") + "</div>";
  }

  function bandHead(label, key) {
    return '<h2 class="rmv-band-head rmv-band-head--' + App.escape(key) + '">' +
      App.escape(label) + "</h2>";
  }

  function teamCascadeHtml(data, showDelivered) {
    var ctx = context(data);
    var items = productItems(data.items || [], ctx.scopeByArea);
    if (!items.length) return emptyNotice();
    var html = "";
    BANDS.forEach(function (band, idx) {
      if (!showDelivered && idx === 0) return; // Delivered band hidden.
      var inBand = items.filter(function (i) { return colStart(i) <= idx && colEnd(i) >= idx; });
      if (!inBand.length) return;
      html += '<section class="rmv-band">' + bandHead(band.label, band.key) +
        themeBlocks(ctx.catSorted, groupBy(inBand, function (i) { return i.category_id; })) +
        "</section>";
    });
    return html + freshnessHtml(items);
  }

  // --- Executive cascade: the curated one-pager --------------------

  function deliveredBuckets(delivered, catById) {
    if (!delivered.length) return "";
    var cards = delivered.map(function (i) {
      var cat = i.category_id ? catById[i.category_id] : null;
      return '<li class="rm-card rmv-bucket' + catClass(cat) + '">' +
        (cat ? '<p class="rmv-card-eyebrow">' + App.escape(cat.label) + "</p>" : "") +
        "<h3>" + App.escape(i.title) + "</h3>" +
        (i.summary ? '<p class="rm-card-sum">' + App.escape(i.summary) + "</p>" : "") + "</li>";
    }).join("");
    return '<ul class="rmv-cards rmv-delivered">' + cards + "</ul>";
  }

  function execCascadeHtml(data, showDelivered) {
    var ctx = context(data);
    var items = productItems(data.items || [], ctx.scopeByArea);
    if (!items.length) return emptyNotice();
    var delivered = items.filter(function (i) { return i.status === "done"; }).sort(byOrder);
    var execLive = items.filter(function (i) { return i.audience === "exec" && i.status !== "done"; });
    var standalone = execLive.filter(function (i) { return !i.category_id; });
    var byCat = groupBy(execLive.filter(function (i) { return i.category_id; }),
      function (i) { return i.category_id; });
    var html = showDelivered
      ? bandHead("Delivered", "delivered") + deliveredBuckets(delivered, ctx.catById) : "";
    html += bandHead("In focus", "now") + themeBlocks(ctx.catSorted, byCat);
    if (standalone.length) {
      html += bandHead("Standalone", "later") +
        '<div class="rmv-themes">' + themeBlock(null, standalone.sort(byOrder)) + "</div>";
    }
    return html + freshnessHtml(items);
  }

  // --- Backlog / Parked cascade: grouped by theme ------------------

  function backlogCard(item, withReason) {
    return '<li class="rm-card"><h3>' + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") +
      (withReason && item.resolution
        ? '<p class="rmv-reason">' + App.escape(item.resolution) + "</p>" : "") +
      '<p class="rmv-meta">' + App.statusBadge(item.status) +
      ' <span class="badge">' + App.escape(item.type) + "</span></p></li>";
  }

  function backlogGrouped(list, ctx, cardFn) {
    var byCat = groupBy(list, function (i) { return ctx.themeOfArea[i.area_id]; });
    var order = ctx.catSorted.map(function (c) { return c.id; }).concat(["none"]);
    var sections = order.filter(function (k) { return byCat[k]; }).map(function (k) {
      var cat = k !== "none" ? ctx.catById[k] : null;
      return '<section class="rmv-theme' + catClass(cat) + '">' +
        '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
        '<ul class="rmv-cards">' + byCat[k].slice().sort(byOrder).map(cardFn).join("") +
        "</ul></section>";
    }).join("");
    return '<div class="rmv-themes">' + sections + "</div>";
  }

  function backlogCascadeHtml(data) {
    var ctx = context(data);
    var open = productItems((data.backlog || []).filter(function (i) {
      return BACKLOG_OPEN.indexOf(i.status) !== -1; }), ctx.scopeByArea);
    if (!open.length) {
      return '<p class="notice">No open product backlog items. The backlog ' +
        "feeds the roadmap; items are rows in the backlog_items table.</p>";
    }
    return backlogGrouped(open, ctx, function (i) { return backlogCard(i, false); });
  }

  function parkedCascadeHtml(data) {
    var ctx = context(data);
    var parked = productItems((data.backlog || []).filter(function (i) {
      return BACKLOG_PARKED.indexOf(i.status) !== -1; }), ctx.scopeByArea);
    if (!parked.length) {
      return '<p class="notice">Nothing parked. De-scoped items land here with ' +
        "the reasoning kept, so a decision is never lost.</p>";
    }
    return backlogGrouped(parked, ctx, function (i) { return backlogCard(i, true); });
  }

  function cascade(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    if (level === "exec") return execCascadeHtml(data, show);
    if (level === "backlog") return backlogCascadeHtml(data);
    if (level === "parked") return parkedCascadeHtml(data);
    return teamCascadeHtml(data, show);
  }

  App.roadmapView = {
    colStart: colStart, colEnd: colEnd,
    productItems: productItems, byOrder: byOrder,
    presentationLabel: presentationLabel, freshnessHtml: freshnessHtml,
    timeline: timeline, cascade: cascade,
  };
})();
