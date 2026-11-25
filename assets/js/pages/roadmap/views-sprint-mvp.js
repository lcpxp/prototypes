// ------------------------------------------------------------------
// roadmap/views-sprint-mvp.js - The MVP marking on the Sprint Roadmap:
// which sprints of a workstream deliver its MVP, and which of its items
// make that MVP up.
//
// One fact, two readings. An item is part of its workstream's MVP when
// it carries the `mvp` tag; v_sprint_plan_items states that as is_mvp,
// so the board and a session querying the plan agree. The stakeholder
// bar reads it as a WINDOW - a dimension line, end stop to end stop,
// under the first to the last sprint the MVP items occupy - and the
// delivery view reads it per item, as "(MVP)" after the title. Nothing
// here is stored or computed twice: the window is derived from the item
// rows the board already holds, the way the external segments are.
//
// Its own file rather than more of views-sprint.js, on the seam
// tests/size-budget.json keeps for that module: this is a marking laid
// over the plan, it draws nothing the plan would miss without it, and it
// moves in one piece with its CSS (assets/css/sprints.css, "the MVP
// window"). Loaded before views-sprint.js, which reads
// App.roadmapSprintMvp when it draws.
//
// Data in, string out - no DOM - so it loads in the Node vm alongside
// the other view builders. docs/SPRINT-DELIVERY.md, Part C, "The MVP",
// is the one home for what the tag means.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  // The MVP window of each workstream: the first to the last sprint its
  // MVP items occupy. A stream with no MVP item has no window, and its
  // bar carries no line.
  function windows(rows) {
    var out = {};
    (rows || []).forEach(function (r) {
      if (!r || !r.is_mvp || !r.workstream_id) return;
      var s = num(r.effective_slot, 0);
      var e = num(r.effective_end_slot, s);
      if (e < s) e = s;
      var w = out[r.workstream_id];
      if (!w) {
        out[r.workstream_id] = { first: s, last: e };
      } else {
        if (s < w.first) w.first = s;
        if (e > w.last) w.last = e;
      }
    });
    return out;
  }

  // The line itself: |<-- MVP -->|, end stops on the window's first and
  // last sprint, drawn inside the stream's coloured bar (sprints.css).
  // The caller passes the grid placement and the span's words, so the
  // coordinate rule and the sprint labels each keep their one home in
  // views-sprint.js.
  function bracket(win, catCls, gridStyle, spanWords) {
    if (!win) return "";
    return '<span class="rmv-sp-mvp' + (catCls || "") + '" style="' + gridStyle +
      '" title="MVP: ' + App.escape(spanWords) + '">' +
      '<span class="rmv-sp-mvp-tag">MVP</span></span>';
  }

  // The per-item reading: "(MVP)" after the title, on every MVP item and
  // on no other, so a reader running down the row ends sees the MVP
  // without counting brackets.
  function flag(row) {
    return row && row.is_mvp ? ' <span class="rmv-sp-mvp-flag">(MVP)</span>' : "";
  }

  // Whether the plan carries any MVP at all: the key names the marking
  // only when there is one to read.
  function any(rows) {
    return (rows || []).some(function (r) { return !!(r && r.is_mvp); });
  }

  App.roadmapSprintMvp = { windows: windows, bracket: bracket, flag: flag, any: any };
})();
