// ------------------------------------------------------------------
// roadmap/detail-values.js - Formatting and derivation for the roadmap
// item drawer and both of its exports (App.roadmapDetailValues). Data
// in, value out: no DOM and no HTML, so the drawer builders in
// roadmap-detail.js and the export builders in roadmap-detail-export.js
// read the same labels and numbers rather than each deriving their own.
//
// Split out of roadmap-detail.js, which had reached its line budget with
// two lines to spare. It previously exposed these as App._rmd - a name
// only roadmap-detail-export.js knew to look for, and one that said
// nothing about what it held.
//
// Depends on App.roadmapView (bandLabel, endBandLabel), App.sprints
// (sprintToRange) and App.departmentLabel. Loaded before
// roadmap-detail.js; benchmarked through it.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var STATUS = {
    idea: "Idea", planned: "Planned", in_progress: "In progress",
    blocked: "Blocked", done: "Delivered", dropped: "Dropped",
  };
  var PRD_STATUS = {
    n_a: "N/A", in_progress: "In progress", pre_approved: "Pre-approved",
    approved: "Approved", rejected: "Rejected",
  };
  var PROJECT_STATUS = {
    planned: "Planned", in_progress: "In progress", pending: "Pending",
    on_hold: "On hold", completed: "Completed",
  };
  var PHASE = { discovery: "Discovery", build: "Build", certification: "Certification", launch: "Launch" };
  var PHASE_ORDER = ["discovery", "build", "certification", "launch"];
  function day(x) { return x ? String(x).slice(0, 10) : ""; }
  function dateRange(a, b) {
    a = day(a); b = day(b);
    if (a && b) return a + " to " + b;
    return a || b || "";
  }
  function byPhase(a, b) {
    return (PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)) ||
      ((a.sort_order || 0) - (b.sort_order || 0));
  }
  function sprintRange(code) {
    var r = App.sprints && App.sprints.sprintToRange(code);
    return r ? code + " (" + r.start + " to " + r.end + ")" : code;
  }
  function cap(v) { return v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : ""; }
  function keyLabel(k) { return cap(String(k).replace(/_/g, " ")); }
  function titleOf(id, ctx) {
    var it = id && ctx.itemById ? ctx.itemById[id] : null;
    return it ? it.title : "";
  }
  function listText(v) { return Array.isArray(v) ? v.join(", ") : (v == null ? "" : String(v)); }
  function ordinal(n) {
    n = parseInt(n, 10);
    if (!n || n < 1) return "";
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function clean(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === null || v === undefined || v === "") return;
      if (Array.isArray(v) && v.length === 0) return;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) return;
      out[k] = v;
    });
    return out;
  }
  function attrs(item) { return item.attributes || {}; }
  function bandText(item) {
    var b = App.roadmapView.bandLabel(item);
    return item.end_horizon && item.end_horizon !== item.horizon
      ? b + " to " + App.roadmapView.endBandLabel(item) : b;
  }
  var KNOWN_ATTRS = ["pnl_vertical", "team", "region", "customer", "resources",
    "cost", "merchant_value", "pxp_value", "blockers", "prd_link",
    "assignee_rank", "priority_band"];
  function businessAreaLabels(item) {
    return (item.associated_departments || []).map(function (d) {
      return App.departmentLabel(d) || d;
    });
  }
  function priorityBand(item) {
    var pb = attrs(item).priority_band;
    if (pb != null) return parseInt(pb, 10);
    if (item.priority == null) return null;
    return Math.max(1, Math.floor(item.priority / 10));
  }
  function priorityLabel(item) {
    var b = priorityBand(item);
    return (b == null || isNaN(b)) ? "" : "P" + b;
  }

  App.roadmapDetailValues = {
    STATUS: STATUS,
    PRD_STATUS: PRD_STATUS,
    PROJECT_STATUS: PROJECT_STATUS,
    PHASE: PHASE,
    PHASE_ORDER: PHASE_ORDER,
    KNOWN_ATTRS: KNOWN_ATTRS,
    day: day,
    dateRange: dateRange,
    byPhase: byPhase,
    sprintRange: sprintRange,
    cap: cap,
    keyLabel: keyLabel,
    titleOf: titleOf,
    listText: listText,
    ordinal: ordinal,
    clean: clean,
    attrs: attrs,
    bandText: bandText,
    businessAreaLabels: businessAreaLabels,
    priorityBand: priorityBand,
    priorityLabel: priorityLabel,
  };
})();
