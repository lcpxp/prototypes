// ------------------------------------------------------------------
// roadmap-views-cascade.js - The Cascade layout for the roadmap home:
// the same work as stacked stage bands (Now/Next/Later, plus Parked for
// Backlog), an item repeating under each band it spans. Split out of
// roadmap-views.js to keep both files within budget; shares its helpers
// via the private App._rmv namespace and extends App.roadmapView with
// cascade(). Executive is layout-independent, so it defers to the shared
// department-first execBoard. Data-in / string-out, no DOM.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var R = App._rmv;

  function itemCard(item, cat, pick) {
    var band = R.colStart(item);
    var label = band === 1 ? R.presentationLabel(item.presentation) : "";
    var prog = R.progressOf(item);
    var ws = item.level === "workstream";
    return '<li class="rm-card rm-card--' + R.BANDS[band].key + (ws ? " rm-card--ws" : "") +
      R.catClass(cat) + R.pickCls(item.id, pick) +
      '" data-item-id="' + App.escape(item.id) + '">' +
      (ws ? '<p class="rmv-ws-tag">Workstream</p>' : "") +
      (label ? '<p class="rm-state rm-state--' + App.escape(item.presentation) + '">' +
        App.escape(label) + "</p>" : "") +
      "<h3>" + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") +
      '<div class="rm-card-progress rmv-prog-' + prog.bucket +
      '" role="img" aria-label="Progress: ' + App.escape(prog.label) + '"><span></span></div>' +
      R.pickBox(item.id, pick) + "</li>";
  }

  function themeBlock(cat, items, cardFn) {
    var desc = cat && cat.description
      ? '<p class="rmv-theme-desc">' + App.escape(cat.description) + "</p>" : "";
    var cards = items.length ? '<ul class="rmv-cards">' +
      items.map(cardFn).join("") + "</ul>" : "";
    return '<section class="rmv-theme' + R.catClass(cat) + '">' +
      '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
      desc + cards + "</section>";
  }

  function themeBlocks(ctx, byCat, cardFn) {
    var blocks = ctx.catSorted.filter(function (c) { return byCat[c.id]; })
      .map(function (c) { return themeBlock(c, byCat[c.id].slice().sort(R.byOrder), cardFn); });
    if (byCat.none) blocks.push(themeBlock(null, byCat.none.slice().sort(R.byOrder), cardFn));
    return '<div class="rmv-themes">' + blocks.join("") + "</div>";
  }

  function bandHead(label, key) {
    return '<h2 class="rmv-band-head rmv-band-head--' + App.escape(key) + '">' +
      App.escape(label) + "</h2>";
  }

  // Stack items into the bands they span, grouped by theme, item cards
  // per theme. maxBand caps the axis (Team up to Later, Backlog adds
  // Parked). Executive no longer routes here - it uses execBoard.
  function bandsCascade(list, ctx, maxBand, show, pick) {
    var html = "";
    for (var idx = 0; idx <= maxBand; idx++) {
      if (idx === 0 && !show) continue;
      var inBand = list.filter(function (i) { return R.colStart(i) <= idx && R.colEnd(i) >= idx; });
      if (!inBand.length) continue;
      var byCat = R.groupBy(inBand, function (i) { return R.themeIdOf(i, ctx); });
      var body = themeBlocks(ctx, byCat, function (i) {
        return itemCard(i, ctx.catById[R.themeIdOf(i, ctx)] || null, pick);
      });
      html += '<section class="rmv-band">' + bandHead(R.BANDS[idx].label, R.BANDS[idx].key) +
        body + "</section>";
    }
    return html;
  }

  function cascade(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var expanded = !!(opts && opts.expanded);
    var pick = opts && opts.custom ? { custom: true, unpicked: opts.unpicked || {} } : null;
    var ctx = R.context(data);
    // Backlog mirrors the master list (all scopes); Exec/Team stay
    // product-scoped. See timeline() in roadmap-views.js.
    var pool = level === "backlog" ? (data.items || [])
      : R.productItems(data.items || [], ctx.scopeByArea);
    var all = R.filterShareholder(pool, ctx, !!(opts && opts.shareholder));
    if (!all.length) return R.emptyNotice();
    if (level === "exec") {
      return R.execBoard(all, ctx, show, expanded) + R.freshnessHtml(all);
    }
    var tops = R.topLevel(all);
    if (level === "workstreams") {
      var wsList = R.teamList(tops).filter(function (i) { return i.level === "workstream"; });
      return bandsCascade(wsList, ctx, R.ACTIVE_MAX, show, pick) +
        (expanded ? R.breakdown(R.visibleDetail(wsList, show), ctx) : "") + R.freshnessHtml(all);
    }
    var list = level === "backlog" ? tops : R.teamList(tops);
    var maxBand = level === "backlog" ? R.PARKED : R.ACTIVE_MAX;
    return bandsCascade(list, ctx, maxBand, show, pick) +
      (expanded ? R.breakdown(R.visibleDetail(list, show), ctx) : "") + R.freshnessHtml(all);
  }

  App.roadmapView.cascade = cascade;
})();
