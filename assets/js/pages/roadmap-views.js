// ------------------------------------------------------------------
// roadmap-views.js - Pure HTML builders for the roadmap home
// (modules/roadmap/). Data-in / string-out, no DOM, so they load in a
// Node vm for unit testing (tests/unit/roadmap-views.test.js). The DOM
// wiring, data fetch and level switcher live in roadmap.js.
//
// One dataset, four altitudes:
//   Executive  themes + the 7 Delivered buckets + audience='exec'
//              headline items; the printable C-suite one-pager.
//   Team       every item, as a cascade of stage bands
//              (Delivered -> Now -> Next -> Later), each theme a block.
//   Backlog    open backlog_items grouped by theme (the feeder).
//   Parked     de-scoped backlog_items with the reasoning kept.
//
// Placement derives from an item's own fields, so moving an item is a
// data edit (see docs/ROADMAP.md, docs/ROADMAP-PROCESS.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var PRESENTATION = {
    current: "Current focus",
    ongoing: "Ongoing",
    wind: "Wrapping up",
    bridge: "Next horizon",
    sequenced: "",
  };

  // The cascade's stage bands, top to bottom.
  var BANDS = [
    { key: "delivered", label: "Delivered" },
    { key: "now", label: "Now" },
    { key: "next", label: "Next" },
    { key: "later", label: "Later" },
  ];

  var BACKLOG_OPEN = ["open", "planned", "in_progress", "blocked"];
  var BACKLOG_PARKED = ["dropped", "done"];

  function presentationLabel(p) { return PRESENTATION[p] || ""; }

  // Which stage band an item sits in, from its own fields.
  function columnOf(item) {
    if (item.status === "done") return "delivered";
    if (item.horizon === "next") return "next";
    if (item.horizon === "now") return "now";
    return "later";
  }

  function productItems(items, scopeByArea) {
    return items.filter(function (i) { return scopeByArea[i.area_id] === "product"; });
  }

  function byOrder(a, b) {
    return (a.priority - b.priority) || (a.sort_order - b.sort_order);
  }

  // Shared lookups derived once per render.
  function context(data) {
    var catById = {}, scopeByArea = {}, themeOfArea = {};
    (data.categories || []).forEach(function (c) { catById[c.id] = c; });
    (data.areas || []).forEach(function (a) {
      scopeByArea[a.id] = a.scope;
      themeOfArea[a.id] = a.category_id || null;
    });
    var catSorted = (data.categories || []).slice()
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    return { catById: catById, catSorted: catSorted,
      scopeByArea: scopeByArea, themeOfArea: themeOfArea };
  }

  function groupBy(items, keyFn) {
    var out = {};
    items.forEach(function (i) {
      var k = keyFn(i) || "none";
      (out[k] = out[k] || []).push(i);
    });
    return out;
  }

  function catClass(cat) { return cat ? " rm-cat-" + App.escape(cat.key) : ""; }

  // One roadmap item, rendered at the density its band calls for. Now
  // items carry a state label; every card carries its theme accent.
  function itemCard(item, cat) {
    var band = columnOf(item);
    var label = band === "now" ? presentationLabel(item.presentation) : "";
    return (
      '<li class="rm-card rm-card--' + band + catClass(cat) + '">' +
      (label ? '<p class="rm-state rm-state--' + App.escape(item.presentation) +
        '">' + App.escape(label) + "</p>" : "") +
      "<h3>" + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") +
      "</li>"
    );
  }

  // A theme's block: label + description + its item cards. Always the
  // same shell, so a two-item theme still reads as a full section.
  function themeBlock(cat, items) {
    var label = cat ? cat.label : "General";
    var desc = cat && cat.description
      ? '<p class="rmv-theme-desc">' + App.escape(cat.description) + "</p>" : "";
    var cards = items.length
      ? '<ul class="rmv-cards">' + items.map(function (i) {
          return itemCard(i, cat); }).join("") + "</ul>"
      : "";
    return '<section class="rmv-theme' + catClass(cat) + '">' +
      '<h3 class="rm-lane-label">' + App.escape(label) + "</h3>" + desc + cards +
      "</section>";
  }

  // Themes rendered in sort order, each with the items handed to it.
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

  function freshnessHtml(items) {
    var latest = "";
    items.forEach(function (i) {
      if (i.updated_at && i.updated_at > latest) latest = i.updated_at;
    });
    if (!latest) return "";
    return '<p class="rm-updated">Data as of ' +
      App.escape(latest.slice(0, 10)) + "</p>";
  }

  function emptyNotice() {
    return '<p class="notice">No roadmap items yet. Items are rows in the ' +
      "roadmap_items table in Supabase (see docs/ROADMAP.md).</p>";
  }

  // --- Executive: the curated C-suite one-pager --------------------

  function deliveredBuckets(delivered, catById) {
    if (!delivered.length) return "";
    var cards = delivered.map(function (i) {
      var cat = i.category_id ? catById[i.category_id] : null;
      return '<li class="rm-card rmv-bucket' + catClass(cat) + '">' +
        (cat ? '<p class="rmv-card-eyebrow">' + App.escape(cat.label) + "</p>" : "") +
        "<h3>" + App.escape(i.title) + "</h3>" +
        (i.summary ? '<p class="rm-card-sum">' + App.escape(i.summary) + "</p>" : "") +
        "</li>";
    }).join("");
    return '<ul class="rmv-cards rmv-delivered">' + cards + "</ul>";
  }

  function execHtml(data) {
    var ctx = context(data);
    var items = productItems(data.items || [], ctx.scopeByArea);
    if (!items.length) return emptyNotice();

    var delivered = items.filter(function (i) { return i.status === "done"; })
      .sort(byOrder);
    var execLive = items.filter(function (i) {
      return i.audience === "exec" && i.status !== "done"; });
    var standalone = execLive.filter(function (i) { return !i.category_id; });
    var byCat = groupBy(execLive.filter(function (i) { return i.category_id; }),
      function (i) { return i.category_id; });

    var html = bandHead("Delivered", "delivered") +
      deliveredBuckets(delivered, ctx.catById);
    html += bandHead("In focus", "now") + themeBlocks(ctx.catSorted, byCat);
    if (standalone.length) {
      html += bandHead("Standalone", "later") +
        '<div class="rmv-themes">' + themeBlock(null, standalone.sort(byOrder)) + "</div>";
    }
    return html + freshnessHtml(items);
  }

  // --- Team: the cascade of stage bands ----------------------------

  function cascadeHtml(data) {
    var ctx = context(data);
    var items = productItems(data.items || [], ctx.scopeByArea);
    if (!items.length) return emptyNotice();

    var html = "";
    BANDS.forEach(function (band) {
      var bandItems = items.filter(function (i) { return columnOf(i) === band.key; });
      if (!bandItems.length) return;
      var byCat = groupBy(bandItems, function (i) { return i.category_id; });
      html += '<section class="rmv-band">' + bandHead(band.label, band.key) +
        themeBlocks(ctx.catSorted, byCat) + "</section>";
    });
    return html + freshnessHtml(items);
  }

  // --- Team timeline: priority-ranked bars, overlap visible --------

  var TL_COLS = ["Now", "Next", "Later"];

  // The columns an item's bar spans, 1..3 (Now, Next, Later). An
  // ongoing item runs on through Later; a bridge item reaches into the
  // next column; everything else sits in its own horizon.
  function horizonSpan(item) {
    var start = item.horizon === "now" ? 1 : item.horizon === "next" ? 2 : 3;
    var end = start;
    if (item.presentation === "ongoing") end = 3;
    else if (item.presentation === "bridge") end = Math.min(3, start + 1);
    return [start, end];
  }

  function timelineHtml(data) {
    var ctx = context(data);
    var items = productItems(data.items || [], ctx.scopeByArea);
    var live = items.filter(function (i) { return columnOf(i) !== "delivered"; })
      .sort(byOrder);
    if (!live.length) {
      return '<p class="notice">No live roadmap items. Delivered work is on the ' +
        "Executive and Team views.</p>";
    }
    var head = '<div class="rmv-tl-head"><span class="rmv-tl-label"></span>' +
      TL_COLS.map(function (c) { return '<span class="rmv-tl-col">' + c + "</span>"; })
        .join("") + "</div>";
    var rows = live.map(function (i) {
      var cat = i.category_id ? ctx.catById[i.category_id] : null;
      var span = horizonSpan(i);
      // Column 1 is the label gutter, so the grid columns are offset by 1.
      var bar = '<span class="rmv-tl-bar' + catClass(cat) + '" style="grid-column:' +
        (span[0] + 1) + " / " + (span[1] + 2) + '">' + App.escape(i.title) + "</span>";
      return '<div class="rmv-tl-row"><span class="rmv-tl-label">' +
        App.escape(cat ? cat.label : "General") + "</span>" + bar + "</div>";
    }).join("");
    return '<div class="rmv-tl">' + head + rows + "</div>" + freshnessHtml(items);
  }

  // --- Backlog: the open feeder, grouped by theme ------------------

  function backlogCard(item, extraReason) {
    return '<li class="rm-card"><h3>' + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") +
      (extraReason && item.resolution
        ? '<p class="rmv-reason">' + App.escape(item.resolution) + "</p>" : "") +
      '<p class="rmv-meta">' + App.statusBadge(item.status) +
      ' <span class="badge">' + App.escape(item.type) + "</span></p></li>";
  }

  function backlogGrouped(list, ctx, cardFn) {
    var byCat = groupBy(list, function (i) { return ctx.themeOfArea[i.area_id]; });
    var order = ctx.catSorted.map(function (c) { return c.id; }).concat(["none"]);
    var sections = order.filter(function (k) { return byCat[k]; }).map(function (k) {
      var cat = k !== "none" ? ctx.catById[k] : null;
      var rows = byCat[k].slice().sort(byOrder).map(cardFn).join("");
      return '<section class="rmv-theme' + catClass(cat) + '">' +
        '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
        '<ul class="rmv-cards">' + rows + "</ul></section>";
    }).join("");
    return '<div class="rmv-themes">' + sections + "</div>";
  }

  function backlogHtml(data) {
    var ctx = context(data);
    // Product-scope only: the roadmap's feeder, not the portal's own
    // development (which the dedicated backlog module still shows).
    var open = productItems((data.backlog || []).filter(function (i) {
      return BACKLOG_OPEN.indexOf(i.status) !== -1; }), ctx.scopeByArea);
    if (!open.length) {
      return '<p class="notice">No open product backlog items. The backlog ' +
        "feeds the roadmap; items are rows in the backlog_items table.</p>";
    }
    return backlogGrouped(open, ctx, function (i) { return backlogCard(i, false); });
  }

  function parkedHtml(data) {
    var ctx = context(data);
    var parked = productItems((data.backlog || []).filter(function (i) {
      return BACKLOG_PARKED.indexOf(i.status) !== -1; }), ctx.scopeByArea);
    if (!parked.length) {
      return '<p class="notice">Nothing parked. De-scoped items land here with ' +
        "the reasoning kept, so a decision is never lost.</p>";
    }
    return backlogGrouped(parked, ctx, function (i) { return backlogCard(i, true); });
  }

  App.roadmapView = {
    columnOf: columnOf,
    productItems: productItems,
    byOrder: byOrder,
    presentationLabel: presentationLabel,
    freshnessHtml: freshnessHtml,
    execHtml: execHtml,
    cascadeHtml: cascadeHtml,
    timelineHtml: timelineHtml,
    backlogHtml: backlogHtml,
    parkedHtml: parkedHtml,
  };
})();
