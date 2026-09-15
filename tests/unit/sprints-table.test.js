// ------------------------------------------------------------------
// tests/unit/sprints-table.test.js - The drift gate between the sprint
// ENGINE and the sprint TABLE.
//
// assets/js/core/sprints.js is the one home for the code/date
// conversion. supabase/schema/35_sprints.sql materialises it into a
// table so SQL can join on a sprint - which is a second copy of the
// same arithmetic, and a second copy is the thing this repo's one-home
// rule exists to prevent.
//
// It is allowed to exist only because this test makes the copies
// provably identical: the seed's arithmetic is re-evaluated here in
// JavaScript and checked, row for row, against what App.sprints says.
// A hand-edited seed row, a changed anchor, or a drifted cadence fails
// here rather than silently mis-dating a roadmap.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

const SCHEMA = "supabase/schema/35_sprints.sql";
const ROWS = 78; // generate_series(0, 77) - three sprint years.

function loadSprints() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/sprints.js"), sandbox, { filename: "sprints.js" });
  return sandbox.App.sprints;
}

// The seed expressed as JavaScript. This mirrors the SQL in
// 35_sprints.sql exactly; the assertions below then prove that what it
// mirrors agrees with the engine.
function seedRow(i) {
  const year = 26 + Math.floor(i / 26);
  const code = String(year).padStart(2, "0") + "-" +
    String((i % 26) + 1).padStart(2, "0");
  const startMs = Date.UTC(2025, 11, 22) + i * 14 * 86400000;
  const start = new Date(startMs);
  const end = new Date(startMs + 11 * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return {
    idx: i,
    code,
    starts_on: iso(start),
    ends_on: iso(end),
    quarter: "Q" + (Math.floor(start.getUTCMonth() / 3) + 1) +
             " " + start.getUTCFullYear(),
  };
}

test("every seeded sprint matches App.sprints on code, start and end", () => {
  const S = loadSprints();
  for (let i = 0; i < ROWS; i++) {
    const row = seedRow(i);
    assert.equal(S.indexToCode(i), row.code,
      `sprint index ${i}: the table seeds ${row.code}, the engine says ${S.indexToCode(i)}`);
    assert.equal(S.codeIndex(row.code), i,
      `${row.code} must round-trip back to index ${i}`);
    const range = S.sprintToRange(row.code);
    assert.equal(range.start, row.starts_on,
      `${row.code} starts ${range.start} per the engine, ${row.starts_on} per the seed`);
    assert.equal(range.end, row.ends_on,
      `${row.code} ends ${range.end} per the engine, ${row.ends_on} per the seed`);
  }
});

test("every seeded quarter matches App.sprints", () => {
  const S = loadSprints();
  for (let i = 0; i < ROWS; i++) {
    const row = seedRow(i);
    assert.equal(S.sprintToQuarter(row.code), row.quarter,
      `${row.code}: engine says ${S.sprintToQuarter(row.code)}, seed says ${row.quarter}`);
  }
});

test("the seed's anchor is the engine's anchor, stated once each", () => {
  const S = loadSprints();
  const sql = read(SCHEMA);
  assert.match(sql, /date '2025-12-22'/,
    "the seed must anchor on 22 Dec 2025");
  assert.equal(S.ANCHOR, "2025-12-22",
    "App.sprints must anchor on the same date the seed does");
  assert.equal(S.SPRINTS_PER_YEAR, 26,
    "the seed rolls the year every 26 sprints, so the engine must agree");
  assert.match(sql, /i % 26 \+ 1/,
    "the seed's ordinal must roll on the same 26 the engine uses");
});

test("the schema cites the engine rather than restating the calendar", () => {
  const sql = read(SCHEMA);
  assert.match(sql, /assets\/js\/core\/sprints\.js/,
    "35_sprints.sql must name the engine it materialises");
  assert.match(sql, /docs\/SPRINTS\.md/,
    "35_sprints.sql must point at the calendar's documented home");
});

test("this test covers every row the seed actually writes", () => {
  // The checks above are only worth their runtime if they span the
  // whole seeded calendar. If someone extends generate_series and not
  // ROWS, the tail of the table would go unchecked - so read the bound
  // out of the SQL rather than trusting the constant to have kept up.
  const sql = read(SCHEMA);
  const m = sql.match(/generate_series\(0,\s*(\d+)\)/);
  assert.ok(m, "35_sprints.sql must seed the calendar with generate_series(0, n)");
  assert.equal(ROWS, Number(m[1]) + 1,
    `the seed writes ${Number(m[1]) + 1} sprints; ROWS is ${ROWS}, so ` +
    `${Math.abs(ROWS - Number(m[1]) - 1)} row(s) go unchecked. Update ROWS.`);
});
