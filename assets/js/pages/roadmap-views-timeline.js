// ------------------------------------------------------------------
// roadmap-views-timeline.js - The Timeline layout for the roadmap home:
// the continuous Delivered|Now|Next|Later|Parked axis where a bar SPANS
// the columns it runs across. Split out of roadmap-views.js per the size
// budget's exit plan; shares helpers via App._rmv and extends
// App.roadmapView with timeline(). Data-in / string-out, no DOM.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var R = App._rmv;

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

  // Now, Next and Later are the stages the reader can toggle off by
  // clicking their header; Delivered and Parked are structural and stay.
  function isHideable(key) { return key === "now" || key === "next" || key === "later"; }

  // One timeline header cell for band index b. A hideable stage renders as
  // a button (data-band drives the toggle in roadmap.js); a hidden stage
  // keeps its struck-through header so a second click brings it back.
  function bandHeadCell(b, hidden) {
    var band = R.BANDS[b];
    if (!isHideable(band.key)) return '<span class="rmv-tl-col">' + App.escape(band.label) + "</span>";
    var off = !!(hidden && hidden[band.key]);
    return '<button type="button" class="rmv-tl-col rmv-band-toggle' +
      (off ? " rmv-band-toggle--off" : "") + '" data-band="' + band.key +
      '" aria-pressed="' + (off ? "true" : "false") + '">' + App.escape(band.label) + "</button>";
  }

  // Shared grid renderer over pre-placed rows. maxBand caps the axis
  // (ACTIVE_MAX for Team/Executive, PARKED for Backlog); hiding delivered
  // drops the Delivered column and clamps spans into it. A stage toggled
  // off keeps its column and struck header, but the work that begins in it
  // has been filtered out upstream (bandVisible), so the column reads empty.
  // preordered keeps the caller's order (used to group child bars under
  // their parent); otherwise rows sort by timelineOrder.
  function timelineGrid(placed, maxBand, showDelivered, emptyMsg, pick, preordered, hidden) {
    var visible = showDelivered ? placed
      : placed.filter(function (p) { return p._e >= 2; });
    if (!visible.length) return emptyMsg;
    var first = showDelivered ? 0 : 2;
    var head = '<div class="rmv-tl-head"><span class="rmv-tl-label"></span>' +
      R.BANDS.slice(first, maxBand + 1).map(function (b, k) {
        return bandHeadCell(first + k, hidden); }).join("") + "</div>";
    var ordered = preordered ? visible : visible.slice().sort(timelineOrder);
    var body = ordered.map(function (p) {
      var s = p._s < first ? first : p._s, e = p._e > maxBand ? maxBand : p._e;
      var progCls = p._prog ? " rmv-prog-" + p._prog.bucket : "";
      var idAttr = p._id ? ' data-item-id="' + App.escape(p._id) + '"' : "";
      var colStyle = "grid-column:" + (s - first + 2) + " / " + (e - first + 3);
      var dot = p._dot ? '<span class="rmv-theme-dot rm-cat-' +
        App.escape(p._dot.key) + '" aria-hidden="true"></span>' : "";
      var bar = '<span class="rmv-tl-bar' + (p.done ? " rmv-tl-bar--done" : "") +
        (p._s === R.PARKED ? " rmv-tl-bar--parked" : "") + (p._ws ? " rmv-tl-bar--ws" : "") +
        R.catClass(p._cat) + progCls +
        '"' + idAttr + ' style="' + colStyle + '">' + App.escape(p.label) + dot + "</span>";
      var rowCls = "rmv-tl-row" + (p._child ? " rmv-tl-row--child" : "") + R.pickCls(p._id, pick);
      return '<div class="' + rowCls + '"><span class="rmv-tl-label">' +
        App.escape(p._catLabel) + "</span>" + bar + R.pickBox(p._id, pick) + "</div>";
    }).join("");
    return '<div class="rmv-tl' + (showDelivered ? "" : " rmv-tl--nodelivered") +
      '" style="--tl-cols:' + (maxBand - first + 1) + '">' + head + body + "</div>";
  }

  // Place one item as a timeline row (bar = title). child marks an
  // indented nested work item so it renders under its parent. A child bar
  // inherits its PARENT's theme colour so a workstream family reads as one
  // block; when the child's own theme disagrees, that theme surfaces only
  // as a faint dot (_dot) at the bar's right end - a quiet flag for
  // spotting misaligned tagging without breaking the family's colour.
  function placeItem(i, ctx, child, parent) {
    var ownId = R.themeIdOf(i, ctx), own = ownId ? ctx.catById[ownId] : null;
    var cat = own, dot = null;
    if (child && parent) {
      var pId = R.themeIdOf(parent, ctx), pCat = pId ? ctx.catById[pId] : null;
      cat = pCat;
      if (own && (!pCat || pCat.id !== own.id)) dot = own;
    }
    return { _s: R.colStart(i), _e: R.colEnd(i), _cat: cat, _dot: dot,
      _catLabel: cat ? cat.label : "General", _pri: i.priority, _so: i.sort_order,
      _bug: R.bugRank(i), _catSo: cat ? cat.sort_order : 1e9,
      label: i.title, done: i.status === "done", _id: i.id, _prog: R.progressOf(i),
      _ws: i.level === "workstream", _child: !!child };
  }

  // Pre-order rows for a bars-with-children view: sort top-level rows by
  // timelineOrder, then drop each workstream's nested work items (indented,
  // in childOrder: Now above Next above Later, shorter spans first)
  // immediately after it so a child groups under its parent. keepChild
  // (optional) filters children to the level's membership.
  function placedWithChildren(tops, ctx, keepChild) {
    var placedTops = tops.map(function (i) { return { p: placeItem(i, ctx), item: i }; });
    placedTops.sort(function (a, b) { return timelineOrder(a.p, b.p); });
    var out = [];
    placedTops.forEach(function (entry) {
      out.push(entry.p);
      R.barKids(entry.item, ctx).filter(function (k) {
        return !keepChild || keepChild(k);
      }).sort(R.childOrder).forEach(function (k) {
        out.push(placeItem(k, ctx, true, entry.item));
      });
    });
    return out;
  }

  function timeline(data, level, opts) {
    var show = !opts || opts.showDelivered !== false;
    var expanded = !!(opts && opts.expanded);
    var hidden = (opts && opts.hiddenBands) || null;
    var pick = opts && opts.custom
      ? { custom: true, unpicked: opts.unpicked || {}, excluded: opts.excluded || {} } : null;
    var ctx = R.context(data);
    // The Backlog level is the master list: it mirrors the backlog module
    // and carries every work_item (all scopes, including portal and unfiled
    // work), so nothing captured is ever invisible in the roadmap tool.
    // Exec and Team stay product-scoped. See docs/ROADMAP-PLAYBOOK.md.
    var all = level === "backlog" ? (data.items || [])
      : R.productItems(data.items || [], ctx.scopeByArea);
    if (opts && opts.hideFixes) all = all.filter(function (i) { return !R.isFix(i); });
    all = all.filter(function (i) { return R.bandVisible(i, hidden); });
    if (!all.length) return R.emptyNotice();
    if (level === "exec") {
      return R.execBoard(all, ctx, show, expanded) + R.freshnessHtml(all);
    }
    var tops = R.topLevel(all);
    if (level === "workstreams") {
      // The strategic gantt: workstreams only, standalone items hidden,
      // nested items collapsed until the Detailed breakdown.
      var wsList = R.teamList(tops).filter(function (i) { return i.level === "workstream"; });
      var wsGrid = timelineGrid(wsList.map(function (i) { return placeItem(i, ctx); }),
        R.ACTIVE_MAX, show,
        '<p class="notice">No active workstreams. Mark a top-level item as a ' +
        "workstream to show it here.</p>", pick, false, hidden);
      return wsGrid + (expanded ? R.breakdown(R.visibleDetail(wsList, show), ctx) : "") +
        R.freshnessHtml(all);
    }
    if (level === "backlog") {
      // The master list as bars: every top-level row, each workstream's
      // nested work items indented beneath it.
      var grid = timelineGrid(
        placedWithChildren(tops, ctx, function (k) { return R.bandVisible(k, hidden); }),
        R.PARKED, show, R.emptyNotice(), pick, true, hidden);
      return grid + (expanded ? R.breakdown(R.visibleDetail(tops, show), ctx) : "") +
        R.freshnessHtml(all);
    }
    // Work Items: workstreams (bold) with their nested work items indented
    // beneath, plus standalone items - all bars. Deliverables never appear.
    var teamTops = R.teamList(tops);
    var teamGrid = timelineGrid(placedWithChildren(teamTops, ctx,
      function (k) { return R.teamMember(k) && R.bandVisible(k, hidden); }), R.ACTIVE_MAX, show,
      '<p class="notice">No active roadmap work. Items wait in the Backlog ' +
      "until scheduled (set a horizon of now, next or later).</p>", pick, true, hidden);
    return teamGrid + (expanded ? R.breakdown(R.visibleDetail(teamTops, show), ctx) : "") +
      R.freshnessHtml(all);
  }

  App.roadmapView.timeline = timeline;
})();
