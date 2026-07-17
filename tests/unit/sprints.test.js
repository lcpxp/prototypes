// ------------------------------------------------------------------
// tests/unit/sprints.test.js - Benchmarks for the sprint engine
// (App.sprints in assets/js/core/sprints.js). Pure date maths, loaded
// in a Node vm with no DOM. Anchor: sprint 26-01 starts Mon 22 Dec
// 2025, fortnightly Monday -> second Friday, codes rolling YY-NN.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadSprints() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/sprints.js"), sandbox, { filename: "sprints.js" });
  return sandbox.App.sprints;
}

test("the anchor sprint 26-01 starts Mon 22 Dec 2025", () => {
  const S = loadSprints();
  const r = S.sprintToRange("26-01");
  assert.equal(r.start, "2025-12-22");
  assert.equal(r.end, "2026-01-02");
});

test("26-16 lands on the user's landmark: Mon 20 Jul - Fri 31 Jul 2026", () => {
  const S = loadSprints();
  const r = S.sprintToRange("26-16");
  assert.equal(r.start, "2026-07-20");
  assert.equal(r.end, "2026-07-31");
});

test("dateToSprint maps a date into its fortnight", () => {
  const S = loadSprints();
  // 17 Jul 2026 is the final Friday of 26-15 (the cycle at time of build).
  assert.equal(S.dateToSprint("2026-07-17"), "26-15");
  assert.equal(S.dateToSprint("2026-07-20"), "26-16");
  assert.equal(S.dateToSprint("2025-12-22"), "26-01");
});

test("sprint codes round-trip through index", () => {
  const S = loadSprints();
  for (const code of ["26-01", "26-15", "26-26", "27-01"]) {
    assert.equal(S.indexToCode(S.codeIndex(code)), code);
  }
});

test("codes roll past 26-26 into the next sprint year", () => {
  const S = loadSprints();
  // 26-26 ends mid-Dec 2026; 27-01 is the following Monday.
  assert.equal(S.sprintToRange("26-26").start, "2026-12-07");
  assert.equal(S.sprintToRange("27-01").start, "2026-12-21");
});

test("sprintToQuarter reads the starting calendar quarter", () => {
  const S = loadSprints();
  assert.equal(S.sprintToQuarter("26-01"), "Q4 2025");
  assert.equal(S.sprintToQuarter("26-04"), "Q1 2026");
  assert.equal(S.sprintToQuarter("26-16"), "Q3 2026");
});

test("bandForSprint applies the distance table relative to today", () => {
  const S = loadSprints();
  const today = "2026-07-17"; // current sprint 26-15
  assert.equal(S.bandForSprint("26-15", today), "now");   // this sprint
  assert.equal(S.bandForSprint("26-16", today), "now");   // next sprint
  assert.equal(S.bandForSprint("26-18", today), "next");  // 3 out
  assert.equal(S.bandForSprint("26-20", today), "later"); // 5 out
  assert.equal(S.bandForSprint("26-23", today), "someday"); // 8 out
});

test("invalid codes return null, not a guess", () => {
  const S = loadSprints();
  assert.equal(S.codeIndex("26-99"), null);
  assert.equal(S.codeIndex("nonsense"), null);
  assert.equal(S.sprintToRange("26-00"), null);
  assert.equal(S.bandForSprint("", "2026-07-17"), null);
});
