// ------------------------------------------------------------------
// tests/unit/roadmap/views-sprint-cards.test.js - Benchmarks for the
// workstream cards below the Sprint Roadmap (App.roadmapSprintCards),
// rendered into both boards by sprintStreams and sprintItems alike.
//
// The claims worth defending:
//   1. The card's fixed order holds - name, span, summary, audiences,
//      value, then the case in full - because a speaker moving between
//      streams needs the eye to land in the same place every time.
//   2. A figure reads as a figure, with its basis in English, and an
//      unmeasured one is marked in its own shape rather than in a
//      paler grey.
//   3. How long the WORK takes never reaches the surface. A benefit
//      measured in days is a different axis and does render; that line
//      is held here in both directions.
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

test("the stakeholder view carries the benefit and its metric chips", () => {
  const V = loadView();
  const html = V.sprintStreams(sample());
  assert.match(html, /Completes the automated path/, "the workstream benefit is shown");
  // The figure is the hero and the words sit under it: across a room a
  // sentence is a grey smudge and a number is legible.
  assert.match(html,
    /rmv-sp-fig"><span>30<\/span><span class="rmv-sp-unit">minutes<\/span>/,
    "the quantity and its unit lead the tile");
  assert.match(html, /rmv-sp-kind">Time saved</, "the kind labels it");
  assert.match(html, /rmv-sp-basis">per application</,
    "and the basis renders as English, not as the stored enum");
  // A count metric drops the unit word rather than reading "2 count per
  // order", and an unmeasured one wears a tilde with the word behind it
  // for anyone not reading the shape.
  assert.match(html,
    /<span class="visually-hidden">Approximately <\/span><span>~2<\/span>/,
    "an unmeasured count reads as a marked bare number");
  assert.match(html, /rmv-sp-metric--soft/,
    "a tile whose weakest input is unmeasured is marked in its own shape");
});

test("a card opens on what the thing is, then what we stop doing by hand", () => {
  // The card is a discussion surface, not a paragraph. A block of prose
  // has no entry point: a reader has to consume it before they can say
  // anything about it.
  const V = loadView();
  const html = V.sprintStreams(sample());
  // Fixed order on every card, so the eye lands in the same place each
  // time the speaker moves on: name, span, summary, the benefit, the
  // figures, then the long-form case.
  const name = html.indexOf("rmv-sp-note-head");
  const meta = html.indexOf("rmv-sp-meta");
  const lede = html.indexOf("Complete the automated path");
  const values = html.indexOf("rmv-sp-values");
  const tile = html.indexOf("rmv-sp-metrics");
  const prose = html.indexOf("rmv-sp-more");
  assert.ok(name > -1, "the workstream name is the card's heading");
  assert.ok(name < meta, "its span and count sit directly under it");
  assert.ok(meta < lede, "then the summary");
  assert.ok(lede < values, "then what the acquirer stops doing by hand");
  assert.ok(values < tile, "then what it is worth");
  assert.ok(tile < prose, "and the long-form case last");
  // ONE reading, and it says whose. The partner and merchant readings
  // are the work item's business, not this board's: three lines of
  // audience detail pushed the figures down and split the attention of a
  // room that came to hear the operational case.
  assert.match(html,
    /rmv-sp-vlabel">Business benefit \(Acquirer\/us\)<\/span>/,
    "the beneficiary is named outright, not left as 'Acquirer staff'");
  assert.match(html, /rmv-sp-vtext">An operator stops configuring settlement by hand/,
    "and the reading sits under its label");
  assert.doesNotMatch(html, /Partner staff|Merchant<\/|merchant_value/,
    "the other audiences stay in the drawer, off this board");
});

test("the prose is folded away, but only when something else leads", () => {
  const V = loadView();
  const with_lede = V.sprintStreams(sample());
  assert.match(with_lede, /<details class="rmv-sp-more"/,
    "with a headline above it, the case in full is a disclosure");
  assert.match(with_lede, /Completes the automated path/,
    "and the prose is still there to open");

  // w2 has a benefit but no summary, so its prose IS the summary.
  const data = sample();
  assert.ok(!data.sprintStreams[1].summary, "the second stream has no summary");
  assert.match(V.sprintStreams(data), /Closes the loop on device serials/,
    "a stream with no headline shows its benefit outright, not behind a fold");
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
  assert.match(html,
    /<span>~3<\/span><span class="rmv-sp-unit">days<\/span>/,
    "a lag metric renders the wait it removes as a quantity");
  assert.match(html, /rmv-sp-kind">Waiting time removed</,
    "named as the wait, not as a duration of work");
  // And still no delivery duration anywhere near it.
  assert.ok(!html.toLowerCase().includes("developer"));
  assert.doesNotMatch(html, /\bsprints? to deliver\b/i);
});

test("both views carry the same workstream summaries, at stream level only", () => {
  // Switching from the stakeholder view to the delivery view should not
  // lose what the work is FOR. It should not gain eighteen paragraphs
  // either: the cards stay at workstream level in both.
  const V = loadView();
  const items = V.sprintItems(sample());
  assert.match(items, /rmv-sp-notes/,
    "the delivery view must carry the workstream cards too");
  assert.match(items, /Completes the automated path/,
    "a workstream's benefit is shown on the delivery view");
  assert.equal((items.match(/rmv-sp-note-card/g) || []).length, 2,
    "one card per workstream, never one per item");
});

test("a card says whether the stream ever ends", () => {
  // A bar's length says when work runs and never whether it stops. A
  // room being asked to fund a stream asks the second question, and the
  // board had no answer to it: six bars of similar shape, one of which
  // is a standing commitment rather than a piece of work with an end.
  const V = loadView();
  const data = sample();
  data.sprintStreams[0].scope = "finite";
  data.sprintStreams[1].scope = "continuous";
  const html = V.sprintStreams(data);
  assert.match(html,
    /rmv-sp-scope rmv-sp-scope--finite">Finite scope - this one ends</,
    "a bounded stream says so");
  assert.match(html,
    /rmv-sp-scope--continuous">Ongoing - maintained and improved, not finished</,
    "and a standing one says something different in WORDS, so the fact " +
    "survives a projector that flattens the dashed outline carrying it too");
});

test("a staged stream says a stage is a place it can stop", () => {
  // The distinction that would otherwise be lost: staged work is
  // finite, but stopping after a stage is a legitimate outcome rather
  // than an abandonment, and that is a different thing to say about a
  // stream than either "this ends" or "this runs forever".
  const V = loadView();
  const data = sample();
  data.sprintStreams[0].scope = "staged";
  assert.match(V.sprintStreams(data),
    /Staged scope - each stage is a stopping point/);
});

test("a stream with no scope recorded claims none", () => {
  // Defaulting to "finite" would be inventing a commitment nobody made.
  const V = loadView();
  assert.doesNotMatch(V.sprintStreams(sample()), /rmv-sp-scope/,
    "an unclassified stream must not be labelled as bounded by default");
});

test("the ceilings a stream lifts sit under the figures", () => {
  // The tiles answer "how much, per unit". These answer "and what stops
  // being a limit", which is the half a figure cannot carry: 8-10
  // merchants a day is a wall, not a quantity to be summed across a
  // sprint. They sit under the tiles because they are the prose half of
  // the same claim, not a second set of numbers.
  const V = loadView();
  const data = sample();
  data.sprintStreams[0].scale_notes = [
    "Manual setup caps throughput at 8-10 merchants a day; automating it removes the ceiling.",
    "An approval landing out of hours stops waiting for someone to be at a desk.",
  ];
  const html = V.sprintStreams(data);
  assert.match(html,
    /rmv-sp-scale-tag">Manual setup caps throughput at 8-10 merchants a day/,
    "the ceiling is stated in full, not truncated to a figure");
  assert.equal((html.match(/rmv-sp-scale-tag/g) || []).length, 2,
    "one tag per ceiling: merged into a paragraph they stop being scannable");
  const tile = html.indexOf("rmv-sp-metrics");
  const scale = html.indexOf("rmv-sp-scale");
  const prose = html.indexOf("rmv-sp-more");
  assert.ok(tile > -1 && tile < scale, "the figures come first");
  assert.ok(scale < prose, "and the long-form case is still last on the card");
});

test("a stream with no ceiling recorded renders no tag list", () => {
  const V = loadView();
  assert.doesNotMatch(V.sprintStreams(sample()), /rmv-sp-scale/,
    "an empty list must not leave an empty ul on the card");
});

test("scope and ceiling text are escaped like everything else", () => {
  const V = loadView();
  const data = sample();
  data.sprintStreams[0].scale_notes = ['<script>alert(1)</script>'];
  const html = V.sprintStreams(data);
  assert.doesNotMatch(html, /<script>alert/, "a ceiling note must be escaped");
  assert.match(html, /&lt;script/, "the escaped form is what reaches the DOM");
});

test("a card states its rank when the axis is read as priority", () => {
  // Reading the columns as a priority scale while every card underneath
  // says "SPRINTS 1 TO 4" is two answers to one question. The rank
  // REPLACES the span, and it is the number already on the bar, so the
  // board and the card cannot disagree about where a stream sits.
  const V = loadView();
  const html = V.sprintStreams(sample(), { priorityLabels: true });
  assert.match(html, /Priority 1 of 2/, "the leading stream states its rank");
  assert.match(html, /Priority 2 of 2/, "and so does the one behind it");
  assert.doesNotMatch(html, /Sprints 1 to 4/,
    "the sprint span goes: in this reading the columns are not sprints");
});

test("the sprint span is what a card leads with by default", () => {
  const V = loadView();
  const html = V.sprintStreams(sample());
  assert.match(html, /Sprints 1 to 4/, "the default reading is still the span");
  assert.doesNotMatch(html, /Priority \d+ of/,
    "and it does not claim a rank nobody asked for");
});

test("a card tags the functions that have a claim but do not own it", () => {
  // Product and Technology or Operations own every stream on this board,
  // so printing the OWNER would put the same two words on all six cards
  // and carry no information. What a reader wants is the function
  // outside that pair whose requirements the work answers to.
  const V = loadView();
  const data = sample();
  data.sprintStreams[0].associated_departments =
    ["operations_onboarding", "risk_underwriting"];
  const html = V.sprintStreams(data);
  assert.match(html, /rmv-sp-stake-label">Also a stakeholder</,
    "the relationship is named, singular for one function");
  assert.match(html, /rmv-sp-stake-tag">Risk &amp; Underwriting</,
    "and the function is tagged, in the registry's exact wording");
  assert.doesNotMatch(html, /Operations and Onboarding/,
    "a delivery function is not a stakeholder tag: it owns the work");
});

test("two extra stakeholders read as plural, and both are tagged", () => {
  const V = loadView();
  const data = sample();
  data.sprintStreams[0].associated_departments =
    ["legal_compliance", "finance_revenue", "product_technology"];
  const html = V.sprintStreams(data);
  assert.match(html, /rmv-sp-stake-label">Also stakeholders</);
  assert.match(html, /Legal &amp; Compliance/);
  assert.match(html, /Finance and Revenue/);
  assert.doesNotMatch(html, /Product and Technology/,
    "the delivery pair stays out however many others there are");
});

test("a stream with no outside stakeholder shows no tag row", () => {
  const V = loadView();
  const data = sample();
  data.sprintStreams[0].associated_departments = ["product_technology"];
  data.sprintStreams[1].associated_departments = [];
  assert.doesNotMatch(V.sprintStreams(data), /rmv-sp-stake/,
    "an empty list must not leave a dangling label on the card");
});
