// ------------------------------------------------------------------
// roadmap-views-exec.js - The Executive (Categories) board for the
// roadmap home: a department-first rollup of active work - each
// department, the categories it owns and their item counts, expanding
// to item rows when Detailed is on. Layout-independent: Timeline and
// Cascade both defer to it, so the same summary prints either way.
// Split out of roadmap-views.js to keep that file within budget;
// shares helpers via the private App._rmv namespace and attaches
// execBoard back onto it. Data-in / string-out, no DOM.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var R = App._rmv;

  // The Executive dataset: active work, plus delivered when shown, never
  // parked. Top-level items only (sub-steps roll into their parent).
  function execLive(items, ctx, show) {
    return items.filter(function (i) {
      if (R.colStart(i) === R.PARKED) return false;
      if (i.status === "done") return show;
      return true;
    });
  }

  // Group live work by owning department (registry order, Unassigned
  // last), then by theme/category, each with its item list for counts.
  function execDeptGroups(live, ctx) {
    var byDept = R.groupBy(live, function (i) { return i.department || "none"; });
    var order = ((App.registry && App.registry.departments) || []).map(function (d) { return d.key; });
    var keys = [];
    order.forEach(function (k) { if (byDept[k]) keys.push(k); });
    Object.keys(byDept).forEach(function (k) {
      if (k !== "none" && keys.indexOf(k) === -1) keys.push(k);
    });
    if (byDept.none) keys.push("none");
    return keys.map(function (k) {
      var items = byDept[k];
      var byCat = R.groupBy(items, function (i) { return R.themeIdOf(i, ctx); });
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
    var st = R.childStats(i, ctx);
    var band = R.BANDS[R.colStart(i)];
    var steps = st.total
      ? '<span class="rmv-exec-item-steps">' + st.done + " of " + st.total + " steps</span>" : "";
    return '<li class="rmv-exec-item rm-card--' + band.key +
      '" data-item-id="' + App.escape(i.id) + '">' +
      '<span class="rmv-exec-item-title">' + App.escape(i.title) + "</span>" + steps +
      '<span class="rmv-exec-item-band">' + App.escape(band.label) + "</span></li>";
  }

  // One category line under a department: name and count (compact); the
  // item list appears when Detailed is on.
  function execCatRow(entry, expanded, ctx) {
    var label = entry.cat ? entry.cat.label : "General";
    var head = '<div class="rmv-exec-cat-head">' +
      '<span class="rmv-exec-cat-name">' + App.escape(label) + "</span>" +
      '<span class="rmv-exec-cat-count">' + countLabel(entry.items.length) + "</span></div>";
    var list = expanded ? '<ul class="rmv-exec-items">' +
      entry.items.slice().sort(R.byOrder).map(function (i) { return execItemRow(i, ctx); }).join("") +
      "</ul>" : "";
    return '<li class="rmv-exec-cat' + R.catClass(entry.cat) + '">' + head + list + "</li>";
  }

  function execDeptSection(g, expanded, ctx) {
    return '<section class="rmv-exec-dept">' +
      '<h3 class="rmv-exec-dept-name">' + App.escape(g.label) +
      '<span class="rmv-exec-dept-count">' + countLabel(g.items.length) + "</span></h3>" +
      '<ul class="rmv-exec-cats">' +
      g.cats.map(function (c) { return execCatRow(c, expanded, ctx); }).join("") + "</ul></section>";
  }

  // Executive board: departments -> categories -> counts, expanding to
  // items when Detailed.
  function execBoard(all, ctx, show, expanded) {
    var groups = execDeptGroups(execLive(R.topLevel(all), ctx, show), ctx);
    if (!groups.length) {
      return '<p class="notice">No active roadmap work to summarise. Schedule ' +
        "work by setting a horizon of now, next or later.</p>";
    }
    return '<div class="rmv-exec">' +
      groups.map(function (g) { return execDeptSection(g, expanded, ctx); }).join("") + "</div>";
  }

  R.execBoard = execBoard;
  App.roadmapView.execBoard = execBoard;
})();
