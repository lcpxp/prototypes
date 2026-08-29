// ------------------------------------------------------------------
// app-review/model.js - What the board derives from a single row: its
// group, its age, its state marker, what it is waiting on, and the
// orderings built from those. Pure functions, no DOM and no network,
// so the rules that matter are testable on their own
// (tests/unit/app-review/model.test.js).
//
// The cross-record half - duplicates, the partner rollup and the
// findings that need the evidence trail - is in appreview-findings.js.
//
// Nothing here is ever stored. Age, group membership, the three-way
// split and the do-now ordering are all computed per render from the
// columns in supabase/schema/50_review.sql. Storing any of them would
// let a derived value drift out of step with what it was derived from.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  // How long a record sits before its age is worth pointing at. Only
  // ever applied where the status makes age mean something (see
  // ageOf), so this is a display threshold, not a rule about the work.
  var STALE_DAYS = 14;

  // The three groups, in reading order. Labels are the board's own
  // headings; the counts beside them are the headline read.
  var GROUPS = [
    { key: "needs_action", label: "Needs action" },
    { key: "ongoing", label: "Ongoing attention" },
    { key: "settled", label: "Settled" },
  ];

  // Execution order within "Needs action" when nothing sets an explicit
  // priority_rank. Act first because it is doable today; monitor last
  // because confirming an assumption is the cheapest of the five.
  var CATEGORY_WEIGHT = {
    act: 1, investigate: 2, blocked: 3, chase: 4, monitor: 5,
  };

  // ----------------------------------------------------------------
  // Grouping
  // ----------------------------------------------------------------

  // Which of the three groups a row belongs to.
  //
  // Confirmation wins over category, and that asymmetry is the point:
  // "I have looked at this and it needs nothing" is a fact about the
  // review, not about the application, so it can settle a row of any
  // category without changing what that row is.
  //
  // The reverse does NOT hold. A 'monitor' row is an assumption that
  // nothing is needed, and verifying an assumption is work, so it
  // stays in Needs action until a human confirms it. An unclassified
  // row lands there too - nobody has judged it yet.
  function groupOf(app, categories) {
    if (!app) return "needs_action";
    if (app.confirmed_at) return "settled";
    var category = categories && categories[app.triage_category];
    return category ? category.group_key : "needs_action";
  }

  // Counts per group, in GROUPS order, plus the total.
  function split(apps, categories) {
    var counts = { needs_action: 0, ongoing: 0, settled: 0, total: 0 };
    (apps || []).forEach(function (app) {
      counts[groupOf(app, categories)] += 1;
      counts.total += 1;
    });
    return counts;
  }

  // Counts per category key, for the legend.
  function categoryCounts(apps, categories) {
    var counts = {};
    Object.keys(categories || {}).forEach(function (key) { counts[key] = 0; });
    (apps || []).forEach(function (app) {
      var key = app.triage_category;
      if (key in counts) counts[key] += 1;
    });
    return counts;
  }

  // ----------------------------------------------------------------
  // Age
  // ----------------------------------------------------------------

  // Age in days, plus whether that age means anything.
  //
  // Age is a staleness signal only for statuses past the partner's
  // control. "Application In Progress" may be a live edit or a dormant
  // draft that legitimately sits for months - nothing has been handed
  // to us, so there is nothing to chase and the number is noise. The
  // status lookup carries that judgement (launchpad_statuses.
  // age_meaningful), and is_draft suppresses it per record.
  //
  // The days figure is still returned when the signal is off: how long
  // a record has existed is a fact worth showing. What changes is
  // whether the board flags it.
  function ageOf(app, statuses, now) {
    var result = { days: null, isSignal: false, isStale: false };
    if (!app || !app.created_in_launchpad_at) return result;
    var created = Date.parse(app.created_in_launchpad_at);
    if (isNaN(created)) return result;

    var today = now === undefined || now === null ? Date.now() : now;
    result.days = Math.max(0, Math.floor((today - created) / MS_PER_DAY));

    var status = statuses && statuses[app.launchpad_status];
    result.isSignal = !app.is_draft && !!(status && status.age_meaningful);
    result.isStale = result.isSignal && result.days >= STALE_DAYS;
    return result;
  }

  // ----------------------------------------------------------------
  // Markers, triggers and ordering
  // ----------------------------------------------------------------

  // One glyph per row so the fastest read on the board is scanning a
  // single edge. Colour never carries meaning alone; this and the
  // category badge are what carry it when colour is unavailable.
  //
  // "assumed" is deliberately distinct from "settled": an unconfirmed
  // monitor row must never look like a confirmed one.
  function marker(app, categories) {
    if (app && app.confirmed_at) return "settled";
    if (app && app.triage_category === "monitor") return "assumed";
    var group = groupOf(app, categories);
    if (group === "ongoing") return "ongoing";
    if (group === "settled") return "settled";
    return "open";
  }

  // The glyph for each marker is presentation and lives in the board
  // (appreview-board.js); these labels are the meaning, and are what
  // the row announces to a screen reader.
  var MARKER_LABEL = {
    open: "Needs action",
    assumed: "Assumed, needs confirming",
    ongoing: "Ongoing attention",
    settled: "Settled",
  };

  // What a watch item is waiting on. Either a date or a named
  // dependency - never a bare "next review" date, which is what makes
  // a standing list rot quietly.
  function triggerOf(app) {
    if (!app || !app.next_trigger_type) return null;
    if (app.next_trigger_type === "date") {
      return { kind: "date", value: app.next_trigger_date, label: app.next_trigger_date };
    }
    return {
      kind: app.next_trigger_type,
      value: app.next_trigger_label,
      label: app.next_trigger_label,
    };
  }

  // Highest-value actions in execution order. Explicit priority_rank
  // wins; otherwise category weight, then the source list order so two
  // equal rows stay in the order they were read in.
  function doNowOrder(apps, categories) {
    return (apps || [])
      .filter(function (app) { return groupOf(app, categories) === "needs_action"; })
      .slice()
      .sort(function (a, b) {
        var ra = a.priority_rank === null || a.priority_rank === undefined
          ? Infinity : a.priority_rank;
        var rb = b.priority_rank === null || b.priority_rank === undefined
          ? Infinity : b.priority_rank;
        if (ra !== rb) return ra - rb;
        var wa = CATEGORY_WEIGHT[a.triage_category] || 99;
        var wb = CATEGORY_WEIGHT[b.triage_category] || 99;
        if (wa !== wb) return wa - wb;
        return (a.display_order || 0) - (b.display_order || 0);
      });
  }

  // The wave's output: what carries forward. Dated triggers first and
  // soonest-first, because those are the ones that can be missed;
  // named dependencies after them, then anything with no trigger set
  // at all - which is itself a gap worth seeing.
  function carryForward(apps, categories) {
    return (apps || [])
      .filter(function (app) { return groupOf(app, categories) === "ongoing"; })
      .slice()
      .sort(function (a, b) {
        var ta = triggerOf(a);
        var tb = triggerOf(b);
        var da = ta && ta.kind === "date" ? ta.value : null;
        var db = tb && tb.kind === "date" ? tb.value : null;
        if (da && db) return String(da).localeCompare(String(db));
        if (da) return -1;
        if (db) return 1;
        if (ta && !tb) return -1;
        if (tb && !ta) return 1;
        return (a.display_order || 0) - (b.display_order || 0);
      });
  }

  // ----------------------------------------------------------------
  // Filtering
  // ----------------------------------------------------------------

  // Categories are multi-select and all start on, so hiding one or two
  // is a single click rather than a re-pick of everything else.
  function visible(apps, activeKeys) {
    if (!activeKeys) return (apps || []).slice();
    return (apps || []).filter(function (app) {
      return activeKeys.indexOf(app.triage_category) !== -1;
    });
  }

  // Turn a lookup array into a key-addressed map.
  function index(rows) {
    var map = {};
    (rows || []).forEach(function (row) { map[row.key] = row; });
    return map;
  }

  App.appReview = {
    GROUPS: GROUPS,
    STALE_DAYS: STALE_DAYS,
    MARKER_LABEL: MARKER_LABEL,
    groupOf: groupOf,
    split: split,
    categoryCounts: categoryCounts,
    ageOf: ageOf,
    marker: marker,
    triggerOf: triggerOf,
    doNowOrder: doNowOrder,
    carryForward: carryForward,
    visible: visible,
    index: index,
  };
})();
