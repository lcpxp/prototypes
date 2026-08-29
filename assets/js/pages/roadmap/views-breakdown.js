// ------------------------------------------------------------------
// roadmap-views-breakdown.js - The Detailed breakdown for the roadmap
// home: the Category -> Area -> item drill-down shown under the Work
// Items and Backlog levels when Detailed is on. Split out of
// roadmap-views.js per its size-budget exit plan; shares helpers via
// App.roadmapViewsShared and attaches breakdown onto it (and App.roadmapView).
// Data-in / string-out, no DOM.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var R = App.roadmapViewsShared;

  // One item in the breakdown: title, owning department tag, band, its
  // summary, and its deliverables checklist.
  function breakdownItemRow(i, ctx) {
    var dept = App.departmentLabel(i.department);
    var deptTag = dept ? '<span class="rmv-td-dept">' + App.escape(dept) + "</span>" : "";
    var summary = i.summary ? '<p class="rmv-td-sum">' + App.escape(i.summary) + "</p>" : "";
    return '<li class="rmv-td-item rm-card--' + R.BANDS[R.colStart(i)].key +
      '" data-item-id="' + App.escape(i.id) + '">' +
      '<div class="rmv-td-item-head"><span class="rmv-td-title">' + App.escape(i.title) + "</span>" +
      deptTag + '<span class="rmv-td-band">' + App.escape(R.bandLabel(i)) + "</span></div>" +
      summary + R.checklistHtml(i, ctx) + "</li>";
  }

  // The Detailed breakdown: everything the level lists, grouped
  // Category -> Area -> item, so the level reads as a full drill-down.
  function breakdown(list, ctx) {
    if (!list.length) return "";
    var byCat = R.groupBy(list, function (i) { return R.themeIdOf(i, ctx); });
    function areaSort(a, b) {
      var aa = ctx.areaById[a], ab = ctx.areaById[b];
      return (aa ? aa.sort_order : 1e9) - (ab ? ab.sort_order : 1e9);
    }
    function catBlock(cat, catItems) {
      var byArea = R.groupBy(catItems, function (i) { return i.area_id || "none"; });
      var areas = Object.keys(byArea).sort(areaSort).map(function (aid) {
        var a = ctx.areaById[aid];
        var rows = byArea[aid].slice().sort(R.byOrder)
          .map(function (i) { return breakdownItemRow(i, ctx); }).join("");
        return '<div class="rmv-td-area"><h4 class="rmv-td-area-name">' +
          App.escape(a ? a.title : "General") + '</h4><ul class="rmv-td-items">' + rows + "</ul></div>";
      }).join("");
      return '<section class="rmv-td-cat' + R.catClass(cat) + '">' +
        '<h3 class="rm-lane-label">' + App.escape(cat ? cat.label : "General") + "</h3>" +
        areas + "</section>";
    }
    var blocks = ctx.catSorted.filter(function (c) { return byCat[c.id]; })
      .map(function (c) { return catBlock(c, byCat[c.id]); });
    if (byCat.none) blocks.push(catBlock(null, byCat.none));
    return '<div class="rmv-td">' + blocks.join("") + "</div>";
  }

  R.breakdown = breakdown;
  App.roadmapView.breakdown = breakdown;
})();
