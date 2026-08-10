// ------------------------------------------------------------------
// tests/unit/roadmap-views-exec.test.js - Benchmarks for the Executive
// (Categories) board, split from roadmap-views.test.js per its size-budget
// exit plan. The Executive level is the department-first rollup: each
// department, the categories it owns and their item counts; layout-
// independent (Timeline and Cascade defer to the same board). Shares the
// loader and dataset in tests/lib/roadmap.js.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadView, sampleData } = require("../lib/roadmap.js");

test("exec is department-first: departments own categories with counts, no titles when compact", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "exec");
  // Departments (registry order puts Sales before Product and Technology).
  assert.match(html, /Sales &amp; Commercial/);
  assert.match(html, /Product and Technology/);
  assert.ok(html.indexOf("Sales &amp; Commercial") < html.indexOf("Product and Technology"),
    "departments follow registry order");
  // Category counts under a department (Core has delivered i1 + active i3).
  assert.match(html, /rmv-exec-cat-name">Core<\/span><span class="rmv-exec-cat-count">2 items</);
  assert.match(html, /rmv-exec-cat-name">Unity<\/span><span class="rmv-exec-cat-count">1 item</);
  // Compact view names no items and shows no percentage.
  assert.doesNotMatch(html, /Unity integration/, "compact exec names no items");
  assert.doesNotMatch(html, /%/, "no percentage at the top level");
  assert.doesNotMatch(html, /US market/, "parked work never reaches the exec rollup");
});

test("exec detailed lists items with a step summary, still no percentage", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "exec", { expanded: true });
  assert.match(html, /rmv-exec-item-title">Unity integration/, "detailed exec names the items");
  // i2 has two sub-steps, one done: a subtle count replaces the old NN% pill.
  assert.match(html, /1 of 2 steps/);
  assert.doesNotMatch(html, /rmv-prog-pill/, "the numeric progress pill is gone");
  assert.doesNotMatch(html, /%/, "detailed exec still shows no percentage");
});

test("exec ignores layout: cascade renders the same department board", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "exec");
  assert.match(html, /rmv-exec-dept/);
  assert.match(html, /Product and Technology/);
  assert.doesNotMatch(html, /rmv-band-head/, "exec is not banded");
  assert.doesNotMatch(html, /Unity integration/, "compact exec names no items");
});
