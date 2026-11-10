// ------------------------------------------------------------------
// roadmap/views-sprint-hide.js - Hide mode on the Sprint Roadmap: the
// view state that lets a reader drop rows from the board they are
// looking at.
//
// Split from views-sprint.js on the seam tests/size-budget.json named:
// this is view state rather than rendering. It draws nothing of the
// plan, reads no allocation field, and moved with its markup in one
// piece. The board asks it three things - is this row dimmed, does it
// carry an eye, is it dropped - and knows nothing else about it.
//
// Loaded before views-sprint.js, which reads App.roadmapSprintHide once.
// Data in, string out - no DOM - so it loads in the Node vm alongside
// the other view builders.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Hiding a row. ONE mechanism, worked the way the roadmap's custom
  // view already works: a toolbar toggle reveals a control on every row,
  // and pressing a row's control drops it.
  //
  // In hide mode nothing actually disappears - a hidden row dims and
  // keeps its eye, because a control you cannot reach is a row you
  // cannot get back. Leaving hide mode is what removes them. The axis
  // never changes either way: it is a property of the PLAN, not of what
  // is being looked at, so the rows still shown keep their real
  // positions rather than sliding left to fill a gap.
  //
  // Hiding a workstream hides everything inside it; hiding one item
  // hides only that item. Both are the same gesture in the same place.
  //
  // View-only, held in the browser (assets/js/pages/sprints/sprints.js).
  // It changes nothing in the database and no other reader sees it.
  function isHidden(id, opts) {
    return !!(opts && opts.hidden && id && opts.hidden[id]);
  }
  function hiddenCls(id, opts) {
    return isHidden(id, opts) ? " rmv-unpicked rmv-sp-hidden" : "";
  }
  // Drawn only in hide mode, so the board stays clean the rest of the
  // time. It is the last child of the row and .rmv-tl parks it in the
  // trailing column, the same way the roadmap parks its pick box.
  function eye(id, opts, what) {
    if (!opts || !opts.hideMode || !id) return "";
    var off = isHidden(id, opts);
    return '<button type="button" class="rmv-sp-eye" data-hide-id="' +
      App.escape(id) + '" aria-pressed="' + (off ? "true" : "false") +
      '" title="' + (off ? "Show " : "Hide ") + App.escape(what) +
      '" aria-label="' + (off ? "Show " : "Hide ") + App.escape(what) +
      '">' + (off ? EYE_OFF : EYE_ON) + "</button>";
  }
  var EYE_ON =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>' +
    '<circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 3l18 18"/>' +
    '<path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.4 3.4"/>' +
    '<path d="M6.3 6.4A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.2-1"/>' +
    '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  // A row is drawn unless it is hidden AND we have left hide mode.
  function dropped(id, opts) {
    return isHidden(id, opts) && !(opts && opts.hideMode);
  }

  App.roadmapSprintHide = { cls: hiddenCls, eye: eye, dropped: dropped };
})();
