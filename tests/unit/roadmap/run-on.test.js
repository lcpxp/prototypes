// ------------------------------------------------------------------
// tests/unit/roadmap/run-on.test.js - The run-on into Next
// (docs/ROADMAP.md, "Run-on into Next"): a Now workstream whose own span
// ends in Now carries a hatched run-on across Next, and a dashed
// "Likely to extend into later sprints" row on the Work Items and
// Backlog levels, whenever a Now workstream ranked above it already runs
// into Next. Derived from priority alone, so re-ordering moves it.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadView } = require("../../lib/roadmap.js");

const LABEL = "Likely to extend into later sprints";

function ws(id, title, priority, end, extra) {
  return Object.assign({ id, title, level: "workstream", status: "planned", horizon: "now",
    end_horizon: end || null, presentation: "sequenced", area_id: "a1", category_id: "c1",
    department: "product_technology", priority, sort_order: priority,
    updated_at: "2026-10-20T09:00:00Z" }, extra || {});
}
function kid(id, parent, priority, horizon) {
  return { id, parent_id: parent, title: "Item " + id, level: "item", status: "planned",
    horizon: horizon || "now", end_horizon: null, presentation: "sequenced", area_id: "a1",
    category_id: "c1", department: "product_technology", priority, sort_order: priority,
    updated_at: "2026-10-20T09:00:00Z" };
}

// The Now column as the owner left it on 22 Oct 2026: three finite streams
// ending in Now, two that run into Next for the work queued under them,
// then two more that end in Now below them.
function board() {
  return {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [
      { id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 },
      { id: "a2", key: "portal", title: "Portal", scope: "portal", category_id: null, sort_order: 20 },
    ],
    items: [
      ws("w1", "Payment", 10), kid("w1a", "w1", 10),
      ws("w2", "Unity", 20), kid("w2a", "w2", 10),
      ws("w3", "EIT", 30), kid("w3a", "w3", 10),
      ws("w4", "Inbound", 40, "next"), kid("w4a", "w4", 10), kid("w4n", "w4", 20, "next"),
      ws("w5", "Risk", 50, "next"), kid("w5a", "w5", 10), kid("w5n", "w5", 20, "next"),
      ws("w6", "Pricing", 60), kid("w6a", "w6", 10), kid("w6b", "w6", 20),
      ws("w7", "Contract", 70), kid("w7a", "w7", 10),
      // A Next workstream ranked numerically first: not in Now, so it
      // neither runs on nor causes a run-on.
      ws("n1", "Later stream", 5, null, { horizon: "next" }),
    ],
  };
}

// The builders run in a vm, so their arrays come from another realm.
function plain(x) { return JSON.parse(JSON.stringify(x)); }

function rows(html) { return html.split('<div class="rmv-tl-row').slice(1); }
function rowFor(html, title) {
  return rows(html).find((r) => r.indexOf(">" + title + "<") !== -1) || "";
}

test("runOn marks only Now streams that end in Now below a stream running into Next", () => {
  const V = loadView();
  const map = plain(V.runOn(board()));
  assert.deepEqual(Object.keys(map).sort(), ["w6", "w7"]);
  assert.deepEqual(map.w6, ["Inbound", "Risk"]);
  assert.deepEqual(map.w7, ["Inbound", "Risk"]);
});

test("moving a stream above every stream that runs on removes its run-on", () => {
  const V = loadView();
  const data = board();
  // Contract Adjustments brought up to second, as the owner described.
  data.items.find((i) => i.id === "w7").priority = 15;
  const map = V.runOn(data);
  assert.equal(map.w7, undefined);
  assert.deepEqual(Object.keys(map), ["w6"]);
});

test("a stream that itself runs into Next is drawn solid, never as a run-on", () => {
  const V = loadView();
  const map = V.runOn(board());
  assert.equal(map.w4, undefined);
  assert.equal(map.w5, undefined);
});

test("nothing runs on when no Now stream runs into Next", () => {
  const V = loadView();
  const data = board();
  data.items.forEach((i) => { if (i.level === "workstream") i.end_horizon = null; });
  assert.deepEqual(plain(V.runOn(data)), {});
});

test("closed and off-board streams neither run on nor cause a run-on", () => {
  const V = loadView();
  const data = board();
  data.items.find((i) => i.id === "w4").status = "done";
  data.items.find((i) => i.id === "w5").area_id = "a2";   // portal scope: off the board
  assert.deepEqual(plain(V.runOn(data)), {});
});

test("Workstreams level: the run-on sits over Next, names itself, and opens the stream", () => {
  const V = loadView();
  const html = V.timeline(board(), "workstreams", { showDelivered: false });
  const pricing = rowFor(html, "Pricing");
  // Delivered hidden: Now is grid line 2, Next is line 3.
  assert.match(pricing, /class="rmv-tl-bar rmv-tl-bar--ws[^"]*" data-item-id="w6"[^>]*style="grid-column:2 \/ 3"/);
  assert.match(pricing, /class="rmv-tl-spill rm-cat-core" data-item-id="w6" title="[^"]+" style="grid-column:3 \/ 4"/);
  assert.ok(pricing.indexOf(LABEL) !== -1, "the run-on names itself where no work items follow");
  // The solid spans are untouched and carry no run-on.
  assert.match(rowFor(html, "Inbound"), /style="grid-column:2 \/ 4"/);
  assert.equal(rowFor(html, "Inbound").indexOf("rmv-tl-spill"), -1);
  assert.equal(rowFor(html, "EIT").indexOf("rmv-tl-spill"), -1);
  assert.equal((html.match(/rmv-tl-spill/g) || []).length, 2);
});

test("the tooltip names the nearest stream above that runs on and counts the rest", () => {
  const V = loadView();
  const html = V.timeline(board(), "workstreams", { showDelivered: false });
  assert.ok(rowFor(html, "Pricing").indexOf(
    'title="' + LABEL + ": Risk, above it in the Now order, already runs into Next " +
    '(as does 1 more stream above it)."') !== -1);
});

test("Work Items level: a dashed row follows the stream's Now work, inside Next", () => {
  const V = loadView();
  const html = V.timeline(board(), "team", { showDelivered: false });
  const r = rows(html);
  const at = (t) => r.findIndex((x) => x.indexOf(">" + t + "<") !== -1);
  const placeholder = r.findIndex((x) => x.indexOf("rmv-tl-bar--runon") !== -1);
  assert.ok(placeholder > at("Item w6b") && placeholder < at("Contract"),
    "the run-on row sits after Pricing's Now work and before the next stream");
  assert.match(r[placeholder], /rmv-tl-row--child/);
  assert.match(r[placeholder], /data-item-id="w6"[^>]*style="grid-column:3 \/ 4"/);
  assert.ok(r[placeholder].indexOf(">" + LABEL + "<") !== -1);
  // The stream row keeps its hatched run-on but leaves the naming to the row.
  const stream = r[at("Pricing")];
  assert.match(stream, /rmv-tl-spill/);
  assert.equal(stream.indexOf(LABEL + "</span>"), -1);
  assert.equal((html.match(/rmv-tl-bar--runon/g) || []).length, 2);
});

test("the run-on row comes ahead of work the stream already has queued in Next", () => {
  const V = loadView();
  const data = board();
  data.items.push(kid("w6n", "w6", 30, "next"));
  const r = rows(V.timeline(data, "team", { showDelivered: false }));
  const placeholder = r.findIndex((x) => x.indexOf("rmv-tl-bar--runon") !== -1 && x.indexOf('"w6"') !== -1);
  const queued = r.findIndex((x) => x.indexOf(">Item w6n<") !== -1);
  assert.ok(placeholder !== -1 && placeholder < queued);
});

test("a custom view gives the run-on row no pick box of its own", () => {
  const V = loadView();
  const html = V.timeline(board(), "team", { showDelivered: false, custom: true, unpicked: {}, excluded: {} });
  const row = rows(html).find((x) => x.indexOf("rmv-tl-bar--runon") !== -1);
  assert.equal(row.indexOf("data-pick-id"), -1);
});

test("collapsing Next takes the run-on with it", () => {
  const V = loadView();
  const html = V.timeline(board(), "team", { showDelivered: false, hiddenBands: { next: true } });
  assert.equal(html.indexOf("rmv-tl-spill"), -1);
  assert.equal(html.indexOf("rmv-tl-bar--runon"), -1);
});

test("a department filter never removes a run-on judged over the whole board", () => {
  const V = loadView();
  const data = board();
  // Inbound and Risk belong to another department, so the slice omits them.
  ["w4", "w5", "w4a", "w4n", "w5a", "w5n"].forEach((id) => {
    data.items.find((i) => i.id === id).department = "sales_commercial";
  });
  const slice = V.byDepartment(data, "product_technology");
  const html = V.timeline(slice, "workstreams", { showDelivered: false, runOn: V.runOn(data) });
  assert.match(rowFor(html, "Pricing"), /rmv-tl-spill/);
});

test("Cascade: the Next band carries the run-on strip and, on Work Items, its card", () => {
  const V = loadView();
  const wsHtml = V.cascade(board(), "workstreams", { showDelivered: false });
  const nextWs = wsHtml.slice(wsHtml.indexOf('data-band="next"'));
  assert.equal((nextWs.match(/rm-card--runon/g) || []).length, 2);
  assert.ok(nextWs.indexOf(LABEL) !== -1);
  const team = V.cascade(board(), "team", { showDelivered: false });
  const nextTeam = team.slice(team.indexOf('data-band="next"'), team.indexOf('data-band="later"'));
  assert.equal((nextTeam.match(/rm-card--runon rm-card--child/g) || []).length, 2);
  assert.equal((nextTeam.match(/rm-card--runon rm-card--ws/g) || []).length, 2);
  // Nothing runs on in Now or Later.
  assert.equal(team.slice(0, team.indexOf('data-band="next"')).indexOf("rm-card--runon"), -1);
});
