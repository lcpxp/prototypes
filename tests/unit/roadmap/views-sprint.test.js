// ------------------------------------------------------------------
// tests/unit/roadmap/views-sprint.test.js - Benchmarks for the Sprint
// Roadmap BOARD (App.roadmapView.sprintStreams / sprintItems): the axis,
// the spans, the external marking and hide mode.
//
// The cards below the board are benchmarked in views-sprint-cards.test.js,
// following the split the builders themselves took. Both files share the
// fixture below, deliberately: two readings of one allocation have to be
// checked against the same allocation or they prove nothing together.
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
      summary: "Complete the automated path from approval to a configured merchant.",
      pxp_staff_value: "An operator stops configuring settlement by hand.",
      merchant_value: "A merchant is live on the terms agreed.",
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
    // Counted from one, not from zero. The SLOT stays zero-indexed
    // everywhere behind this; only the label counts, because "Sprint +0"
    // reads as the sprint before the first one to anyone not holding the
    // data model in their head.
    assert.match(html, /Sprint 1</, "the axis must label the first slot");
    assert.match(html, /Sprint 4</, "the axis must run to the last occupied slot");
    assert.doesNotMatch(html, /Sprint \+/,
      "an offset from zero is not a sprint anyone can name");
    assert.doesNotMatch(html, /\b\d{2}-\d{2}\b/,
      "an unanchored plan must never render a YY-NN sprint code");
    assert.match(html, /Numbering is relative until a start date is set/,
      "the unanchored state is stated once, on the column headings");
    assert.equal(
      html.split("Numbering is relative until a start date is set").length - 1, 1,
      "and exactly once: a fact with two homes is a fact that will drift");
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

test("an external stretch is marked on the sprints it actually occupies", () => {
  // The stakeholder bar is one shape across several sprints, so saying
  // "this stream is externally gated" does not answer the question the
  // room asks, which is WHICH sprints sit with someone else. The segment
  // rides the same grid cells the work does. w2's external item runs
  // slots 0 to 3, so the segment spans grid columns 2 to 6.
  const V = loadView();
  const html = V.sprintStreams(sample());
  assert.match(html, /rmv-sp-ext-seg rm-cat-pipeline" style="grid-column:2 \/ 6"/,
    "the segment lands on the external work's own sprints, in the stream's colour");
  assert.match(html, /rmv-sp-ext-who">EIT</,
    "and names the party, so the fact survives without the colour");
  assert.match(html, /Built elsewhere: EIT/,
    "the card says the same thing in words");
});

test("a stream wears the same number on its bar and on its card", () => {
  // Colour cannot carry "this one" across a room on its own: a projector
  // flattens hue and two streams can share a category. The number can,
  // and it must be the SAME number in both halves or it pairs nothing.
  const V = loadView();
  for (const html of [V.sprintStreams(sample()), V.sprintItems(sample())]) {
    const label = html.indexOf('rmv-sp-no" aria-hidden="true">1</span><span class="rmv-sp-name">Payment Service');
    const card = html.indexOf('rmv-sp-no" aria-hidden="true">1</span>Payment Service');
    assert.ok(label > -1, "the board's first stream is numbered on its row");
    assert.ok(card > -1, "and its card carries the same number");
    assert.ok(label < card, "board first, then cards, in one order");
  }
});

test("the key is a key, and nothing on it invites a click", () => {
  // It used to be a strip of pills wearing switch styling that asked to
  // be clicked and did nothing when it was. An ambiguous control is
  // worse than no control.
  const V = loadView();
  const html = V.sprintLegend();
  assert.match(html, /rmv-sp-legend-head">Key</, "it says what it is");
  assert.doesNotMatch(html, /<button|data-item-id|data-hide-id|aria-pressed|href=/,
    "and carries nothing a reader could mistake for a control");
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

test("the stakeholder bars run contiguously, with the benefits below", () => {
  // The waterfall is the one thing this view exists to show, and a
  // benefit set between two bars pushes them far enough apart that it
  // cannot be read. Bars first, in one block; what each stream buys
  // after the board.
  const V = loadView();
  const html = V.sprintStreams(sample());
  const lastBar = html.lastIndexOf("rmv-tl-row rmv-sp-row");
  const firstNote = html.indexOf("rmv-sp-notes");
  assert.ok(firstNote > lastBar,
    "every bar row must come before the benefit block, not be split by it");
  assert.equal((html.slice(0, lastBar).match(/rmv-sp-benefit/g) || []).length, 0,
    "no benefit prose may sit between two bars");
  assert.match(html, /Completes the automated path/,
    "the benefit is still shown, below the board");
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

test("no eyes until hide mode is on", () => {
  // The board stays clean when nobody is editing what it shows. This is
  // the roadmap's custom-view bargain: a toolbar toggle reveals the
  // per-row control, and nothing before that.
  const V = loadView();
  for (const html of [V.sprintStreams(sample()), V.sprintItems(sample())]) {
    assert.doesNotMatch(html, /data-hide-id=/, "no row carries an eye");
    assert.doesNotMatch(html, /rmv-sp--hiding/, "the board is not in hide mode");
  }
});

test("hide mode puts an eye on every workstream and every item", () => {
  const V = loadView();
  const o = { hideMode: true };
  const streams = V.sprintStreams(sample(), o);
  assert.match(streams, /rmv-sp--hiding/, "the board says it is in hide mode");
  assert.equal((streams.match(/data-hide-id=/g) || []).length, 2,
    "the stakeholder view has one eye per workstream");

  const items = V.sprintItems(sample(), o);
  // Two workstream heads plus three items.
  assert.equal((items.match(/data-hide-id=/g) || []).length, 5,
    "the delivery view has an eye on each workstream AND each item");
  assert.match(items, /data-hide-id="i2"/, "an item's eye carries its own id");
  assert.match(items, /data-hide-id="w1"/, "a workstream's eye carries its own id");
});

test("a hidden row keeps its eye while hide mode is on", () => {
  // A control you cannot reach is a row you cannot get back.
  const V = loadView();
  const o = { hideMode: true, hidden: { w2: true } };
  const html = V.sprintItems(sample(), o);
  assert.match(html, /data-hide-id="w2" aria-pressed="true"/,
    "the hidden row's eye reads as pressed");
  assert.match(html, /rmv-unpicked/, "and the row dims");
  assert.match(html, /Fulfilment/, "but it is still there to bring back");
});

test("leaving hide mode is what actually removes the hidden rows", () => {
  const V = loadView();
  const o = { hidden: { w2: true } };
  for (const html of [V.sprintStreams(sample(), o), V.sprintItems(sample(), o)]) {
    assert.doesNotMatch(html, /Serials on the order/,
      "a hidden workstream takes its items with it");
    assert.doesNotMatch(html, /Closes the loop on device serials/,
      "and its benefit card");
    assert.match(html, /Payment Service/, "everything else stays");
    assert.match(html, /Sprint 4</,
      "and the axis still runs the whole plan, so nothing slides left");
  }
});

test("an item can be hidden without hiding its workstream", () => {
  const V = loadView();
  const html = V.sprintItems(sample(), { hidden: { i2: true } });
  assert.doesNotMatch(html, /Integrate/, "the item goes");
  assert.match(html, /Map the process/, "its sibling stays");
  assert.match(html, /Payment Service/, "and so does the workstream");
});

test("hiding changes nothing about the plan itself", () => {
  // It is a view preference. If it ever started filtering the DATA the
  // board would quietly disagree with the database about what is
  // allocated, which is the one thing this board must not do.
  const V = loadView();
  const o = { hideMode: true, hidden: { w1: true, w2: true } };
  assert.equal(
    (V.sprintItems(sample()).match(/data-item-id=/g) || []).length,
    (V.sprintItems(sample(), o).match(/data-item-id=/g) || []).length,
    "while hide mode is on, dimming every row must not remove a single bar");
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

test("the axis can be read as a priority scale instead of as sprints", () => {
  // The columns, the order and the bars are identical; what switches is
  // what the reader is told they mean. Not a relabelling trick: work is
  // allocated by workstream priority, so earlier columns hold
  // higher-priority work by construction. This lets the board be
  // discussed as an ordering in a room that has not agreed a start date.
  const V = loadView();
  const o = { priorityLabels: true };
  for (const html of [V.sprintStreams(sample(), o), V.sprintItems(sample(), o)]) {
    assert.match(html, /Highest priority/, "one end of the scale is labelled");
    assert.match(html, /Lowest priority/, "and so is the other");
    assert.doesNotMatch(html, /rmv-sp-col">Sprint /,
      "the column heads stop claiming to be sprints while the scale is on");
    assert.match(html, /Left is highest priority, right is lowest/,
      "and the gutter says which way the scale runs");
    assert.doesNotMatch(html, /Numbering is relative until a start date is set/,
      "the sprint note answers a question nobody asked in this reading");
    assert.match(html, /rmv-sp-head--priority/,
      "the head says which reading it is carrying");
  }
});

test("only the ends of the priority scale are captioned", () => {
  // A scale is defined by its extremes. Captioning the columns between
  // them would invent precision the ordering does not carry.
  const V = loadView();
  const html = V.sprintStreams(sample(), { priorityLabels: true });
  assert.equal((html.match(/Highest priority/g) || []).length, 1);
  assert.equal((html.match(/Lowest priority/g) || []).length, 1);
  assert.equal((html.match(/rmv-sp-col--priority/g) || []).length, 4,
    "every column still gets a head cell, captioned or not, or the rule " +
    "joining them into one scale would stop halfway");
});

test("the priority scale relabels the axis and moves nothing", () => {
  // If it ever started reordering or re-spanning, the board would
  // disagree with the database about what is allocated - the one thing
  // this board must not do, in either reading.
  const V = loadView();
  const plain = V.sprintItems(sample());
  const scaled = V.sprintItems(sample(), { priorityLabels: true });
  const bars = (h) => (h.match(/grid-column:\d+ \/ \d+/g) || []).join(",");
  assert.equal(bars(plain), bars(scaled),
    "every bar occupies exactly the columns it did before");
  assert.equal((plain.match(/data-item-id=/g) || []).length,
    (scaled.match(/data-item-id=/g) || []).length,
    "and the same rows are drawn");
});

test("a one-column plan calls the scale what it is", () => {
  // "Highest" and "Lowest" on the same cell would be nonsense.
  const V = loadView();
  const base = sample();
  const one = {
    sprintItems: [base.sprintItems[0]],
    sprintStreams: [Object.assign({}, base.sprintStreams[0],
      { first_slot: 0, last_slot: 0, item_count: 1 })],
    metrics: [], sprintCodes: {},
  };
  const html = V.sprintStreams(one, { priorityLabels: true });
  assert.match(html, /rmv-sp-col--priority">Priority</,
    "a single column is simply the priority column");
  assert.doesNotMatch(html, /Highest priority/, "with no scale to run along");
});
