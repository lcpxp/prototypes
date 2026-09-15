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
  // The shape a business benefit takes. Hand-written labels rather than
  // sentence-cased keys because these are read by stakeholders, not by
  // editors: "Revenue enabled" and "Revenue retained" have to be told
  // apart at a glance. defect_cost is the honest type for a row whose
  // benefit is that it is broken - a cost of leaving it, not a case for
  // doing it - so it reads as a cost, not as a benefit.
  var BENEFIT_TYPE = {
    cost_removed: "Cost removed", failure_prevented: "Failure prevented",
    revenue_enabled: "Revenue enabled", revenue_retained: "Revenue retained",
    decision_enabled: "Decision enabled", obligation_met: "Obligation met",
    defect_cost: "Cost of leaving it",
  };
  // Drafted content must never read like checked content. Confirmed is
  // deliberately unlabelled - the absence of a marker is the signal, so
  // a confirmed benefit reads as plain prose and only the unchecked one
  // carries a badge.
  var BENEFIT_STATUS = { drafted: "Draft - not yet confirmed", confirmed: "" };
  var SALES_ROUTE = { direct: "Direct sales", partner: "Partner sales" };

  // How an allocated item behaves against the ones either side of it on
  // the Sprint Roadmap. The label has to carry the CONSEQUENCE, not the
  // key: "exclusive" alone tells a reader nothing about why two bars do
  // or do not sit side by side in the same sprint column.
  var OVERLAP = {
    exclusive: "Holds its sprints alone",
    overlappable: "Can share its first and last sprint",
    parallel: "Runs alongside anything",
  };
  // Where a party outside PXP has got to. An allocation carrying one of
  // these consumes no PXP capacity, so this is the only signal on the
  // board that says whether that bar is moving.
  var EXTERNAL_STATUS = {
    not_started: "Not started", requested: "Requested", committed: "Committed",
    in_progress: "In progress", delivered: "Delivered", slipped: "Slipped",
  };
  // The countable half of a benefit (docs/VALUE-CAPTURE.md). Labels are
  // written for a stakeholder reading a bar, so they name the thing that
  // stops happening rather than the column it is stored in.
  var METRIC_KIND = {
    time_saved: "Time saved", touches_removed: "Touches removed",
    steps_removed: "Steps removed", tools_removed: "External tools removed",
    providers_removed: "Providers removed", lag_removed: "Waiting time removed",
    volume_enabled: "Volume enabled", spend_removed: "Spend removed",
  };
  // Units render INLINE beside the number, so they are lower case and
  // count carries no word at all - "2 count per order" reads worse than
  // "2 per order", and the kind already says what is being counted.
  var METRIC_UNIT = {
    minutes: "minutes", hours: "hours", days: "days",
    count: "", percent: "%", currency_gbp: "GBP",
  };
  var METRIC_BASIS = {
    per_application: "per application", per_merchant: "per merchant",
    per_order: "per order", per_partner: "per partner",
    per_week: "per week", per_month: "per month", per_year: "per year",
    one_off: "one-off",
  };
  // Mirrors benefit_status: an unchecked figure must never read like a
  // checked one. Owner stated is the strongest claim an assistant can
  // record, and it may only be used where the owner gave the number.
  var METRIC_CONFIDENCE = {
    estimated: "Estimated", measured: "Measured", owner_stated: "Owner stated",
  };
  // "30 minutes per application". Trims cleanly when the unit is blank.
  function metricText(m) {
    if (!m) return "";
    var n = Number(m.value);
    var value = isFinite(n) ? String(n % 1 === 0 ? n : n.toFixed(2)) : String(m.value || "");
    var unit = METRIC_UNIT[m.unit] !== undefined ? METRIC_UNIT[m.unit] : m.unit;
    var basis = METRIC_BASIS[m.basis] || m.basis || "";
    return [value, unit, basis].filter(Boolean).join(" ");
  }
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
    BENEFIT_TYPE: BENEFIT_TYPE,
    BENEFIT_STATUS: BENEFIT_STATUS,
    SALES_ROUTE: SALES_ROUTE,
    OVERLAP: OVERLAP,
    EXTERNAL_STATUS: EXTERNAL_STATUS,
    METRIC_KIND: METRIC_KIND,
    METRIC_UNIT: METRIC_UNIT,
    METRIC_BASIS: METRIC_BASIS,
    METRIC_CONFIDENCE: METRIC_CONFIDENCE,
    metricText: metricText,
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
