// ------------------------------------------------------------------
// tests/unit/roadmap/views-sprint.test.js - Benchmarks for the Sprint
// Roadmap builders (App.roadmapView.sprintStreams / sprintItems).
//
// The claims worth defending, in the order they would hurt if broken:
//   1. An unanchored plan never shows a sprint code. Inventing one is
//      the failure this whole model exists to prevent.
//   2. A bar spans the sprints its allocation says, and no others.
//   3. External work is visibly external, because the reader's question
//      is "is anyone moving this".
//   4. How long the WORK takes never reaches the surface - no capacity,
//      no velocity, no effort - whatever the data carries. A benefit
//      measured in days is a different axis and does render; the last
//      two cases hold that line in both directions.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadView } = require("../../lib/roadmap.js");

// Two streams: one PXP-only, one externally gated, overlapping in the
// middle the way the real plan does.
function sample(overrides) {
  const items = [
    { work_item_id: "i1", title: "Map the process", workstream_id: "w1",
      workstream_title: "Payment Service", category_key: "integrations",
      slot: 0, span: 1, slip_slots: 0, effective_slot: 0, effective_end_slot: 0,
      sequence_position: 1, overlap: "parallel", is_external: false,
      external_party: null, external_status: null,
      start_code: null, end_code: null, anchored: false, priority: 10, progress: 0 },
    { work_item_id: "i2", title: "Integrate", workstream_id: "w1",
      workstream_title: "Payment Service", category_key: "integrations",
      slot: 2, span: 2, slip_slots: 0, effective_slot: 2, effective_end_slot: 3,
      sequence_position: 2, overlap: "overlappable", is_external: false,
      external_party: null, external_status: null,
      start_code: null, end_code: null, anchored: false, priority: 20, progress: 25 },
    { work_item_id: "i3", title: "Serials on the order", workstream_id: "w2",
      workstream_title: "Fulfilment", category_key: "pipeline",
      slot: 0, span: 4, slip_slots: 0, effective_slot: 0, effective_end_slot: 3,
      sequence_position: 1, overlap: "parallel", is_external: true,
      external_party: "EIT", external_status: "requested",
      start_code: null, end_code: null, anchored: false, priority: 10, progress: 0 },
  ];
  const streams = [
    { workstream_id: "w1", workstream_title: "Payment Service", priority: 10,
      first_slot: 0, last_slot: 3, slots_spanned: 4, item_count: 2,
      external_item_count: 0, externally_gated: false,
      business_benefit: "Completes the automated path from approval to a configured merchant.",
      start_code: null, end_code: null },
    { workstream_id: "w2", workstream_title: "Fulfilment", priority: 20,
      first_slot: 0, last_slot: 3, slots_spanned: 4, item_count: 1,
      external_item_count: 1, externally_gated: true,
      business_benefit: "Closes the loop on device serials.",
      start_code: null, end_code: null },
  ];
  const metrics = [
    { work_item_id: "i1", workstream_id: "w1", metric_kind: "time_saved",
      unit: "minutes", basis: "per_application", total: 30,
      weakest_confidence: "owner_stated", metric_rows: 1 },
    { work_item_id: "i3", workstream_id: "w2", metric_kind: "touches_removed",
      unit: "count", basis: "per_order", total: 2,
      weakest_confidence: "estimated", metric_rows: 1 },
  ];
  return Object.assign({ sprintItems: items, sprintStreams: streams,
    metrics, sprintCodes: {} }, overrides || {});
}

function anchored(data) {
  data.sprintItems.forEach((r) => { r.anchored = true; });
  data.sprintItems[0].start_code = "26-20";
  data.sprintItems[0].end_code = "26-20";
  data.sprintCodes = { 0: "26-20", 1: "26-21", 2: "26-22", 3: "26-23" };
  return data;
}

test("an unanchored plan labels columns as offsets and shows no sprint code", () => {
  const V = loadView();
  for (const html of [V.sprintStreams(sample()), V.sprintItems(sample())]) {
    assert.match(html, /Sprint \+0/, "the axis must label the first slot");
    assert.match(html, /Sprint \+3/, "the axis must run to the last occupied slot");
    assert.doesNotMatch(html, /\b\d{2}-\d{2}\b/,
      "an unanchored plan must never render a YY-NN sprint code");
    assert.match(html, /Sprint numbering starts when delivery starts/,
      "the unanchored state is stated once, above the axis");
  }
});

test("an anchored plan labels every column with its real sprint", () => {
  const V = loadView();
  const html = V.sprintItems(anchored(sample()));
  for (const code of ["26-20", "26-21", "26-22", "26-23"]) {
    assert.ok(html.includes(code), `the axis must carry ${code} once anchored`);
  }
  assert.doesNotMatch(html, /Sprint numbering starts when delivery starts/,
    "the unanchored note must disappear once the plan is anchored");
});

test("a bar spans exactly the sprints its allocation says", () => {
  const V = loadView();
  const html = V.sprintItems(sample());
  // Column 1 is the label gutter, so slot n starts at line n + 2.
  assert.ok(html.includes("grid-column:2 / 3"), "slot 0 span 1 occupies one column");
  assert.ok(html.includes("grid-column:4 / 6"), "slot 2 span 2 occupies two columns");
  assert.ok(html.includes("grid-column:2 / 6"), "slot 0 span 4 occupies four columns");
});

test("external work is drawn as external and names the party", () => {
  const V = loadView();
  const html = V.sprintItems(sample());
  assert.match(html, /rmv-sp-bar--ext/, "an external allocation gets the outline treatment");
  assert.match(html, /EIT/, "the party doing the work is named on the bar");
  const pxpOnly = sample({ sprintItems: sample().sprintItems.filter((r) => !r.is_external) });
  assert.doesNotMatch(V.sprintItems(pxpOnly), /rmv-sp-bar--ext/,
    "a plan with no external work must not mark anything external");
});

test("overlappability is rendered, not merely stored", () => {
  const V = loadView();
  const html = V.sprintItems(sample());
  assert.match(html, /rmv-sp-bar--overlap/, "an overlappable bar is marked");
  assert.match(html, /rmv-sp-bar--parallel/, "a parallel bar is marked");
});

test("the stakeholder view carries the benefit and its metric chips", () => {
  const V = loadView();
  const html = V.sprintStreams(sample());
  assert.match(html, /Completes the automated path/, "the workstream benefit is shown");
  assert.match(html, /Time saved 30 minutes per application/,
    "a metric renders as a readable quantity with its basis");
  assert.match(html, /Touches removed 2 per order/,
    "a count metric drops the unit word rather than reading '2 count per order'");
  assert.match(html, /rmv-sp-chip--soft/,
    "a chip whose weakest input is an estimate is marked as soft");
});

test("no delivery duration, capacity or velocity reaches the surface", () => {
  const V = loadView();
  const data = anchored(sample());
  for (const html of [V.sprintStreams(data), V.sprintItems(data)]) {
    for (const word of ["developer", "velocity", "capacity", "man-day",
      "person-day", "effort", "estimate"]) {
      assert.ok(!html.toLowerCase().includes(word),
        `"${word}" must never appear on the Sprint Roadmap`);
    }
  }
});

test("a benefit measured in days is not a delivery duration", () => {
  // The rule is that how long the WORK takes stays off the surface -
  // spans are the only unit for that. It is not a ban on the word: a
  // lag_removed metric in days describes how long a MERCHANT waits
  // today, which is the value being bought and is exactly the kind of
  // figure the board exists to show. Held as its own case so the two
  // are not confused by a later reader, or by a blunter assertion.
  const V = loadView();
  const data = sample();
  data.metrics.push({ work_item_id: "i1", workstream_id: "w1",
    metric_kind: "lag_removed", unit: "days", basis: "per_application",
    total: 3, weakest_confidence: "estimated", metric_rows: 1 });
  const html = V.sprintStreams(data);
  assert.match(html, /Waiting time removed 3 days per application/,
    "a lag metric renders as the wait it removes");
  // And still no delivery duration anywhere near it.
  assert.ok(!html.toLowerCase().includes("developer"));
  assert.doesNotMatch(html, /\bsprints? to deliver\b/i);
});

test("an empty allocation says so rather than drawing an empty grid", () => {
  const V = loadView();
  const empty = { sprintItems: [], sprintStreams: [], metrics: [], sprintCodes: {} };
  for (const html of [V.sprintStreams(empty), V.sprintItems(empty)]) {
    assert.match(html, /No work is allocated to a sprint yet/);
    assert.doesNotMatch(html, /rmv-tl-head/, "no axis is drawn when there is nothing on it");
  }
});

test("items group under their workstream in slot then sequence order", () => {
  const V = loadView();
  const html = V.sprintItems(sample());
  const mapAt = html.indexOf("Map the process");
  const integrateAt = html.indexOf("Integrate");
  const serialsAt = html.indexOf("Serials on the order");
  assert.ok(mapAt < integrateAt,
    "slot 0 must render before slot 2 within the same workstream");
  assert.ok(integrateAt < serialsAt,
    "a workstream's items stay together rather than interleaving by slot");
});

test("every bar carries its category's theme class", () => {
  // The sprint views come from a database VIEW, so they hold
  // category_key - a string - where every other view holds the category
  // row. R.catClass reads both; when it read only the row, every sprint
  // bar rendered rm-cat-undefined, no --rm-a or --rm-s resolved, and the
  // whole board came out the pale grey that made it unreadable.
  const V = loadView();
  for (const html of [V.sprintStreams(sample()), V.sprintItems(sample())]) {
    assert.match(html, /rm-cat-integrations/,
      "a bar must carry its own category's theme class");
    assert.match(html, /rm-cat-pipeline/,
      "a second category must resolve to its own class, not the first's");
    assert.doesNotMatch(html, /rm-cat-undefined/,
      "a category key must never render as rm-cat-undefined");
  }
});

test("every rendered value is escaped", () => {
  const V = loadView();
  const data = sample();
  data.sprintItems[0].title = '<img src=x onerror="alert(1)">';
  data.sprintStreams[0].business_benefit = "<script>alert(1)</script>";
  const html = V.sprintStreams(data) + V.sprintItems(data);
  assert.doesNotMatch(html, /<img src=x/, "item titles must be escaped");
  assert.doesNotMatch(html, /<script>alert/, "benefit text must be escaped");
  assert.match(html, /&lt;img/, "the escaped form is what reaches the DOM");
});
