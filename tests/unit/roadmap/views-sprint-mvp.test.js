// ------------------------------------------------------------------
// tests/unit/roadmap/views-sprint-mvp.test.js - Benchmarks for the MVP
// marking on the Sprint Roadmap (assets/js/pages/roadmap/
// views-sprint-mvp.js, drawn by views-sprint.js).
//
// The claims worth defending, in the order they would hurt if broken:
//   1. The line spans exactly the sprints the MVP items occupy, first
//      to last - never the whole bar by default, never a guess.
//   2. A stream with no MVP item carries no line at all.
//   3. Every MVP item, and no other, reads "(MVP)" after its title.
//   4. The key names the marking only when there is one to read.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadView } = require("../../lib/roadmap.js");

function row(id, ws, title, s, e, extra) {
  return Object.assign({
    work_item_id: id, title, workstream_id: ws,
    workstream_title: ws === "w1" ? "Inbound API" : "Pricing",
    category_key: ws === "w1" ? "partners" : "pricing",
    slot: s, span: e - s + 1, slip_slots: 0, effective_slot: s, effective_end_slot: e,
    sequence_position: 1, overlap: "overlappable", is_external: false,
    external_party: null, external_status: null, start_code: null, end_code: null,
    anchored: false, priority: 10, progress: 0, is_mvp: false,
  }, extra || {});
}

// w1 runs sprints 0 to 3 with its MVP in 0 to 2; w2 has no MVP at all.
function sample() {
  const items = [
    row("a", "w1", "Decide the method", 0, 0, { is_mvp: true, overlap: "parallel" }),
    row("b", "w1", "Build the lead route", 1, 1, { is_mvp: true }),
    row("c", "w1", "Test it end to end", 2, 2, { is_mvp: true }),
    row("d", "w1", "Partner applications", 3, 3),
    row("e", "w2", "Pricing API", 1, 2),
  ];
  const streams = [
    { workstream_id: "w1", workstream_title: "Inbound API", priority: 10,
      first_slot: 0, last_slot: 3, slots_spanned: 4, item_count: 4,
      external_item_count: 0, externally_gated: false },
    { workstream_id: "w2", workstream_title: "Pricing", priority: 20,
      first_slot: 1, last_slot: 2, slots_spanned: 2, item_count: 1,
      external_item_count: 0, externally_gated: false },
  ];
  return { sprintItems: items, sprintStreams: streams, metrics: [], sprintCodes: {} };
}

const LINE = /<span class="rmv-sp-mvp[^"]*" style="([^"]*)"/g;

function lines(html) {
  return [...html.matchAll(LINE)].map((m) => m[1]);
}

test("the MVP line spans exactly the sprints its items occupy, on both tabs", () => {
  // Slots 0 to 2 are grid columns 2 to 5, the same rule every bar uses.
  const V = loadView();
  for (const html of [V.sprintStreams(sample()), V.sprintItems(sample())]) {
    assert.deepEqual(lines(html), ["grid-column:2 / 5"],
      "one line, under the MVP's sprints and not the whole bar");
    assert.match(html, /rmv-sp-mvp rm-cat-partners"/,
      "in its stream's colour, like the external segment");
    assert.match(html, /rmv-sp-mvp-tag">MVP</, "and it says what it is");
  }
});

test("a stream with no MVP item carries no line", () => {
  const V = loadView();
  const data = sample();
  data.sprintItems.forEach((r) => { r.is_mvp = false; });
  assert.deepEqual(lines(V.sprintStreams(data)), []);
  assert.deepEqual(lines(V.sprintItems(data)), []);
});

test("the window runs first to last even when an MVP item sits apart", () => {
  // MVP items in sprints 0 and 3 only: the MVP is delivered across 0 to 3.
  const V = loadView();
  const data = sample();
  data.sprintItems[1].is_mvp = false;
  data.sprintItems[2].is_mvp = false;
  data.sprintItems[3].is_mvp = true;
  assert.deepEqual(lines(V.sprintStreams(data)), ["grid-column:2 / 6"]);
});

test("every MVP item, and no other, reads (MVP) after its title", () => {
  const V = loadView();
  const html = V.sprintItems(sample());
  for (const t of ["Decide the method", "Build the lead route", "Test it end to end"]) {
    assert.match(html, new RegExp(t + ' <span class="rmv-sp-mvp-flag">\\(MVP\\)</span>'),
      t + " is marked");
  }
  for (const t of ["Partner applications", "Pricing API"]) {
    assert.doesNotMatch(html, new RegExp(t + " <span"), t + " is not");
  }
  assert.doesNotMatch(V.sprintStreams(sample()), /rmv-sp-mvp-flag/,
    "the stakeholder tab carries the line, not per-item labels");
});

test("the key names the MVP only when the plan has one", () => {
  const V = loadView();
  assert.match(V.sprintLegend(sample()), /rmv-sp-key--mvp">MVP</);
  const none = sample();
  none.sprintItems.forEach((r) => { r.is_mvp = false; });
  assert.doesNotMatch(V.sprintLegend(none), /rmv-sp-key--mvp/);
  assert.doesNotMatch(V.sprintLegend(), /rmv-sp-key--mvp/,
    "and a caller passing nothing gets the key it always had");
});

test("the line names its sprints, and only while the columns are sprints", () => {
  const V = loadView();
  const data = sample();
  data.sprintItems.forEach((r) => { r.anchored = true; });
  data.sprintItems[0].start_code = "26-25";
  data.sprintItems[2].end_code = "27-01";
  data.sprintItems[2].start_code = "27-01";
  data.sprintCodes = { 0: "26-25", 1: "26-26", 2: "27-01", 3: "27-02" };
  assert.match(V.sprintStreams(data), /title="MVP: 26-25 to 27-01"/);
  const scale = V.sprintStreams(data, { priorityLabels: true });
  assert.match(scale, /title="MVP: the marked columns"/);
  assert.doesNotMatch(scale, /title="MVP: 26-/,
    "a priority scale is not talked about in sprints");
});

test("an MVP title is escaped like every other", () => {
  const V = loadView();
  const data = sample();
  data.sprintItems[0].title = "<b>Decide</b> & go";
  const html = V.sprintItems(data);
  assert.match(html, /&lt;b&gt;Decide&lt;\/b&gt; &amp; go <span class="rmv-sp-mvp-flag">/);
  assert.doesNotMatch(html, /<b>Decide/);
});
