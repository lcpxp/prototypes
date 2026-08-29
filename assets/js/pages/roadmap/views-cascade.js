// ------------------------------------------------------------------
// roadmap/views-cascade.js - The Cascade layout for the roadmap home:
// the same work as stacked stage bands (Now/Next/Later, plus Parked for
// Backlog). A card sits in full in its START band; a span it runs into
// renders as a slim continuation strip (A4). On Work Items and Backlog a
// workstream's nested work items render as inset child cards right after
// it; deliverables never appear (drawer only). Split out of
// roadmap-views.js to stay within budget; shares helpers via App.roadmapViewsShared and
// extends App.roadmapView with cascade(). Executive is layout-independent
// (defers to execBoard). Data-in / string-out, no DOM.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var R = App.roadmapViewsShared;

  // A slim continuation strip: a spanning card's appearance in a band
  // after its start - title and (for a workstream) its tag only, no
  // summary, progress or pick box (picks live on the start-band card).
  function contCard(item, cat, isChild, dot) {
    var ws = item.level === "workstream";
    return '<li class="rm-card rm-card--cont' + (ws ? " rm-card--ws" : "") +
      (isChild ? " rm-card--child" : "") + R.catClass(cat) +
      '" data-item-id="' + App.escape(item.id) + '">' +
      (ws ? '<p class="rmv-ws-tag">Workstream</p>' : "") +
      "<h3>" + App.escape(item.title) + "</h3>" + (dot || "") + "</li>";
  }

  // The full card in its start band. isChild insets it and adds a
  // "Part of <workstream>" eyebrow so a nested work item reads as owned.
  function fullCard(item, cat, pick, isChild, parentTitle, dot) {
    var band = R.colStart(item);
    var label = band === 2 ? R.presentationLabel(item.presentation) : "";
    var prog = R.progressOf(item);
    var ws = item.level === "workstream";
    var eyebrow = isChild && parentTitle
      ? '<p class="rmv-part-of">Part of ' + App.escape(parentTitle) + "</p>" : "";
    return '<li class="rm-card rm-card--' + R.BANDS[band].key + (ws ? " rm-card--ws" : "") +
      (isChild ? " rm-card--child" : "") + R.catClass(cat) + R.pickCls(item.id, pick) +
      '" data-item-id="' + App.escape(item.id) + '">' +
      (ws ? '<p class="rmv-ws-tag">Workstream</p>' : "") + eyebrow +
      (label ? '<p class="rm-state rm-state--' + App.escape(item.presentation) + '">' +
        App.escape(label) + "</p>" : "") +
      "<h3>" + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") +
      '<div class="rm-card-progress rmv-prog-' + prog.bucket +
      '" role="img" aria-label="Progress: ' + App.escape(prog.label) + '"><span></span></div>' +
      R.pickBox(item.id, pick) + (dot || "") + "</li>";
  }

  // A card for `item` in band `idx`: full at its start band, continuation
  // strip in the later bands it spans. A child card inherits its PARENT's
  // theme colour; when its own theme disagrees, that theme shows only as a
  // faint dot - a quiet flag for spotting misaligned tagging (mirrors
  // placeItem in roadmap-views.js).
  function cardIn(item, ctx, pick, idx, isChild, parentTitle, parent) {
    var own = ctx.catById[R.themeIdOf(item, ctx)] || null;
    var cat = own, dotFor = null;
    if (isChild && parent) {
      var pCat = ctx.catById[R.themeIdOf(parent, ctx)] || null;
      cat = pCat;
      if (own && (!pCat || pCat.id !== own.id)) dotFor = own;
    }
    // A delivered card loses its lane fill (settled-history styling), so its
    // theme survives as a dot - mirrors the delivered timeline bar. A
    // delivered card with no theme carries no dot.
    if (item.status === "done" && !dotFor) dotFor = own;
    var dot = dotFor ? '<span class="rmv-theme-dot rm-cat-' + App.escape(dotFor.key) +
      '" aria-hidden="true"></span>' : "";
    return R.colStart(item) === idx
      ? fullCard(item, cat, pick, isChild, parentTitle, dot)
      : contCard(item, cat, isChild, dot);
  }

  // Every band heading is a collapse toggle (data-band drives the toggle in
  // roadmap.js); clicking one takes that band off the board. A hidden band
  // collapses to just its struck header, still clickable to restore.
  function bandHead(label, key, off) {
    var cls = "rmv-band-head rmv-band-head--" + App.escape(key);
    return '<button type="button" class="' + cls + " rmv-band-toggle" +
      (off ? " rmv-band-toggle--off" : "") + '" data-band="' + App.escape(key) +
      '" aria-pressed="' + (off ? "true" : "false") + '">' + App.escape(label) + "</button>";
  }

  // A hidden stage collapses to just its (clickable, struck) header.
  function offBand(idx) {
    return '<section class="rmv-band rmv-band--off">' +
      bandHead(R.BANDS[idx].label, R.BANDS[idx].key, true) + "</section>";
  }

  function themeSection(cat, cardsHtml) {
    var desc = cat && cat.description
      ? '<p class="rmv-theme-desc">' + App.escape(cat.description) + "</p>" : "";
    return '<section class="rmv-theme' + R.catClass(cat) + '">' +
      '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
      desc + '<ul class="rmv-cards">' + cardsHtml + "</ul></section>";
  }

  function inBandFn(idx) {
    return function (i) { return R.colStart(i) <= idx && R.colEnd(i) >= idx; };
  }

  // Simple bands (Workstreams level): one card per in-band item, grouped
  // by theme and ordered by byOrder. No children.
  function bandsSimple(list, ctx, maxBand, show, pick, hidden) {
    var html = "";
    for (var idx = 0; idx <= maxBand; idx++) {
      if (idx <= 1 && !show) continue;
      if (hidden && hidden[R.BANDS[idx].key]) { html += offBand(idx); continue; }
      var inBand = list.filter(inBandFn(idx));
      if (!inBand.length) continue;
      var byCat = R.groupBy(inBand, function (i) { return R.themeIdOf(i, ctx); });
      var i2 = idx;
      var blocks = ctx.catSorted.filter(function (c) { return byCat[c.id]; })
        .map(function (c) {
          return themeSection(c, byCat[c.id].slice().sort(R.byOrder)
            .map(function (i) { return cardIn(i, ctx, pick, i2); }).join(""));
        });
      if (byCat.none) blocks.push(themeSection(null, byCat.none.slice().sort(R.byOrder)
        .map(function (i) { return cardIn(i, ctx, pick, i2); }).join("")));
      html += '<section class="rmv-band">' + bandHead(R.BANDS[idx].label, R.BANDS[idx].key) +
        '<div class="rmv-themes">' + blocks.join("") + "</div></section>";
    }
    return html;
  }

  // Grouped bands (Work Items / Backlog): each in-band top-level row, then
  // its in-band nested work items right after it, kept in the parent's
  // theme block. keepChild narrows children to the level's membership.
  function bandsGrouped(tops, ctx, maxBand, show, pick, keepChild, hidden) {
    var html = "";
    var sortedTops = tops.slice().sort(R.byOrder);
    for (var idx = 0; idx <= maxBand; idx++) {
      if (idx <= 1 && !show) continue;
      if (hidden && hidden[R.BANDS[idx].key]) { html += offBand(idx); continue; }
      var inBand = inBandFn(idx);
      var perTheme = {};
      sortedTops.forEach(function (top) {
        var kids = R.barKids(top, ctx).filter(function (k) { return !keepChild || keepChild(k); });
        var topIn = inBand(top);
        var kidsIn = kids.filter(inBand).sort(R.childOrder);
        if (!topIn && !kidsIn.length) return;
        var key = R.themeIdOf(top, ctx) || "none";
        var bucket = perTheme[key] = perTheme[key] || [];
        if (topIn) bucket.push({ item: top });
        kidsIn.forEach(function (k) {
          bucket.push({ item: k, child: true, parentTitle: top.title, parent: top });
        });
      });
      var keys = Object.keys(perTheme);
      if (!keys.length) continue;
      var i2 = idx;
      function block(cat, entries) {
        return themeSection(cat, entries.map(function (e) {
          return cardIn(e.item, ctx, pick, i2, e.child, e.parentTitle, e.parent);
        }).join(""));
      }
      var blocks = ctx.catSorted.filter(function (c) { return perTheme[c.id]; })
        .map(function (c) { return block(c, perTheme[c.id]); });
      if (perTheme.none) blocks.push(block(null, perTheme.none));
      html += '<section class="rmv-band">' + bandHead(R.BANDS[idx].label, R.BANDS[idx].key) +
        '<div class="rmv-themes">' + blocks.join("") + "</div></section>";
    }
    return html;
  }

  function cascade(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var expanded = !!(opts && opts.expanded);
    var hidden = (opts && opts.hiddenBands) || null;
    var pick = opts && opts.custom
      ? { custom: true, unpicked: opts.unpicked || {}, excluded: opts.excluded || {} } : null;
    var ctx = R.context(data);
    // Backlog mirrors the master list (all scopes); Exec/Team stay
    // product-scoped. See timeline() in roadmap-views.js.
    var all = level === "backlog" ? (data.items || [])
      : R.productItems(data.items || [], ctx.scopeByArea);
    if (opts && opts.hideFixes) all = all.filter(function (i) { return !R.isFix(i); });
    // Any hidden band collapses to its struck header, which is how it is
    // restored - so fall through (rather than short-circuit to the empty
    // notice) whenever a band is hidden, even if nothing else remains.
    var anyHidden = !!(hidden && Object.keys(hidden).some(function (k) { return hidden[k]; }));
    all = all.filter(function (i) { return R.bandVisible(i, hidden); });
    if (!all.length && !anyHidden) return R.emptyNotice();
    if (level === "exec") {
      return R.execBoard(all, ctx, show, expanded) + R.freshnessHtml(all);
    }
    var tops = R.topLevel(all);
    if (level === "workstreams") {
      var wsList = R.teamList(tops).filter(function (i) { return i.level === "workstream"; });
      return bandsSimple(wsList, ctx, R.ACTIVE_MAX, show, pick, hidden) +
        (expanded ? R.breakdown(R.visibleDetail(wsList, show), ctx) : "") + R.freshnessHtml(all);
    }
    var list = level === "backlog" ? tops : R.teamList(tops);
    var maxBand = level === "backlog" ? R.PARKED : R.ACTIVE_MAX;
    var base = level === "backlog" ? null : R.teamMember;
    var keepChild = function (k) { return (base ? base(k) : true) && R.bandVisible(k, hidden); };
    return bandsGrouped(list, ctx, maxBand, show, pick, keepChild, hidden) +
      (expanded ? R.breakdown(R.visibleDetail(list, show), ctx) : "") + R.freshnessHtml(all);
  }

  App.roadmapView.cascade = cascade;
})();
