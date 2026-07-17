// ------------------------------------------------------------------
// sprints.js - The sprint + date engine (App.sprints). Pure, no DOM,
// so it loads in a Node vm for unit testing (tests/unit/sprints.test.js).
//
// Sprints run in fortnightly blocks: each starts on a Monday and ends
// on the second Friday (the ten working days between are the sprint;
// weekends are not worked). Codes are "YY-NN": YY the sprint year,
// NN 01..26. Sprint 26-01 starts Monday 22 December 2025 (the anchor),
// so 26-16 is Mon 20 Jul 2026 and today's cycle is 26-15. Codes roll
// past 26-26 into 27-01, etc.
//
// This module does the deterministic conversions (date <-> sprint <->
// quarter, and a sprint's coarse Now/Next/Later band). The looser
// "talk in sprints" phrasing ("push this back a couple of sprints") is
// translated to database edits per the ruleset in docs/SPRINTS.md.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var SPRINTS_PER_YEAR = 26;
  var ANCHOR_YEAR = 26;                     // the YY of sprint 26-01
  var ANCHOR_MS = Date.UTC(2025, 11, 22);   // Mon 22 Dec 2025, sprint 26-01
  var DAY_MS = 86400000;
  var SPRINT_MS = 14 * DAY_MS;              // Monday to the next-but-one Monday
  var SPRINT_LEN_DAYS = 11;                 // Monday .. second Friday, inclusive
  var CODE_RE = /^(\d{2})-(\d{2})$/;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }

  // Positive modulo, so indices before the anchor still map cleanly.
  function mod(n, m) { return ((n % m) + m) % m; }

  // A sprint's global index counting from 26-01 = 0. Null for a code
  // that is not a valid YY-NN with NN in 1..26.
  function codeIndex(code) {
    var m = CODE_RE.exec(String(code || ""));
    if (!m) return null;
    var yy = parseInt(m[1], 10), nn = parseInt(m[2], 10);
    if (nn < 1 || nn > SPRINTS_PER_YEAR) return null;
    return (yy - ANCHOR_YEAR) * SPRINTS_PER_YEAR + (nn - 1);
  }

  function indexToCode(idx) {
    var yy = ANCHOR_YEAR + Math.floor(idx / SPRINTS_PER_YEAR);
    var nn = mod(idx, SPRINTS_PER_YEAR) + 1;
    return pad2(yy) + "-" + pad2(nn);
  }

  // Milliseconds at UTC midnight for a Date, epoch ms, or ISO string.
  function toMs(value) {
    if (value == null) return Date.now();
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    var s = String(value);
    return Date.parse(s.length === 10 ? s + "T00:00:00Z" : s);
  }

  // The calendar range a sprint code covers, as ISO dates. Null for an
  // invalid code.
  function sprintToRange(code) {
    var idx = codeIndex(code);
    if (idx === null) return null;
    var start = ANCHOR_MS + idx * SPRINT_MS;
    return { start: iso(start), end: iso(start + SPRINT_LEN_DAYS * DAY_MS) };
  }

  // The sprint whose fortnight contains a date (weekend tail included).
  function dateToSprint(value) {
    var idx = Math.floor((toMs(value) - ANCHOR_MS) / SPRINT_MS);
    return indexToCode(idx);
  }

  function currentSprint(today) { return dateToSprint(today); }

  // The calendar quarter a sprint starts in, e.g. "Q3 2026".
  function sprintToQuarter(code) {
    var range = sprintToRange(code);
    if (!range) return null;
    var d = new Date(range.start + "T00:00:00Z");
    return "Q" + (Math.floor(d.getUTCMonth() / 3) + 1) + " " + d.getUTCFullYear();
  }

  // The coarse horizon band a sprint reads as, relative to today. Keeps
  // a precise sprint and a coarse phrase resolving the same way:
  //   this / next sprint (<=1 out) -> now
  //   2-3 out                      -> next
  //   4-6 out                      -> later
  //   7+ out (or unknown)          -> someday
  function bandForSprint(code, today) {
    var idx = codeIndex(code);
    if (idx === null) return null;
    var dist = idx - codeIndex(currentSprint(today));
    if (dist <= 1) return "now";
    if (dist <= 3) return "next";
    if (dist <= 6) return "later";
    return "someday";
  }

  App.sprints = {
    ANCHOR: "2025-12-22",
    SPRINTS_PER_YEAR: SPRINTS_PER_YEAR,
    codeIndex: codeIndex,
    indexToCode: indexToCode,
    sprintToRange: sprintToRange,
    dateToSprint: dateToSprint,
    currentSprint: currentSprint,
    sprintToQuarter: sprintToQuarter,
    bandForSprint: bandForSprint,
  };
})();
