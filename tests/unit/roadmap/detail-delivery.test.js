// ------------------------------------------------------------------
// tests/unit/roadmap/detail-delivery.test.js - Benchmarks for the
// owner's delivery detail: the drawer's estimate, technical notes and
// images (App.roadmapDetailProse.deliveryHtml) and the sprint page's
// points line (App.roadmapView.sprintLoad).
//
// The claims worth defending:
//   1. Points never reach a reader who is not the owner. Everyone else
//      is shown sprints (docs/ESTIMATION.md).
//   2. Technical notes always say which code snapshot they were checked
//      against - undated notes cannot be told from stale ones.
//   3. A registered image that is not in the bucket says so, rather
//      than drawing a broken picture.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");
const { loadView } = require("../../lib/roadmap.js");

function prose() {
  const sandbox = { navigator: {}, setTimeout, Date,
    location: { pathname: "/modules/roadmap/index.html", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ["assets/js/core/registry.js", "assets/js/core/ui.js",
    "assets/js/pages/roadmap/detail-values.js", "assets/js/pages/roadmap/detail-prose.js"]) {
    vm.runInContext(read(f), sandbox, { filename: f });
  }
  return sandbox.App.roadmapDetailProse;
}

function item(extra) {
  return Object.assign({
    id: "i1", title: "Show the fee",
    user_stories: [
      { title: "Print a percentage as a percentage", story: "As a ...", criteria: ["a", "b"], points: 3 },
      { title: "Drop the empty rows", story: "As a ...", criteria: ["a", "b"], points: 5 },
    ],
    estimate_drivers: { low: 8, high: 13, drivers: ["One utility, one read model"] },
    technical_notes: "Current behaviour:\n- The sheet always prints a currency symbol.",
    technical_notes_snapshot: "2026-10-05",
    screenshots: [],
  }, extra || {});
}

test("the delivery detail is drawn for the owner and for nobody else", () => {
  const P = prose();
  assert.equal(P.deliveryHtml(item(), {}, "ready"), "");
  assert.equal(P.deliveryHtml(item(), null, "ready"), "");
  assert.match(P.deliveryHtml(item(), { owner: true }, "ready"), /Delivery detail/);
});

test("nothing is drawn until the lazy columns have arrived", () => {
  const P = prose();
  assert.equal(P.deliveryHtml(item(), { owner: true }, "waiting"), "");
  assert.equal(P.deliveryHtml(item(), { owner: true }, "failed"), "");
});

test("the estimate is the sum of the stories, with its range and drivers", () => {
  const html = prose().deliveryHtml(item(), { owner: true }, "ready");
  assert.match(html, /8 points, from a range of 8 to 13\./);
  assert.match(html, /Print a percentage as a percentage: 3</);
  assert.match(html, /One utility, one read model/);
  const part = prose().deliveryHtml(item({ user_stories: [
    { title: "Sized", story: "s", criteria: ["a"], points: 1 },
    { title: "Not yet", story: "s", criteria: ["a"] }] }), { owner: true }, "ready");
  assert.match(part, /1 point, 1 unsized/);
});

test("technical notes name the code snapshot they were checked against", () => {
  const html = prose().deliveryHtml(item(), { owner: true }, "ready");
  assert.match(html, /Technical notes <span[^>]*>code snapshot /);
  assert.match(html, /always prints a currency symbol/);
});

test("an item with nothing to show draws no empty section", () => {
  const html = prose().deliveryHtml({ id: "i2", user_stories: null }, { owner: true }, "ready");
  assert.equal(html, "");
});

test("an image is shown by its signed address, and a missing one says so", () => {
  const html = prose().deliveryHtml(item({ screenshots: [
    { kind: "mockup-after", environment: "mockup", captured_on: "2026-11-10",
      caption: "Price sheet <after>", url: "https://example.test/signed?x=1&y=2" },
    { kind: "capture", environment: "qa", caption: "Orders tab", url: null },
  ] }), { owner: true }, "ready");
  assert.match(html, /<img src="https:\/\/example\.test\/signed\?x=1&amp;y=2"/);
  assert.match(html, /Price sheet &lt;after&gt;/, "captions are escaped");
  assert.match(html, /Mockup after, mockup/);
  assert.match(html, /not in the bucket/);
});

test("the points line lists each sprint with developer work, and marks one over", () => {
  const V = loadView();
  const line = V.sprintLoad([
    { slot: 0, code: "30-01", build_items: 3, planned_points: 21, capacity_points: 24,
      over_capacity: false, unsized_items: 0 },
    { slot: 1, code: null, build_items: 2, planned_points: 26, capacity_points: 24,
      over_capacity: true, unsized_items: 1 },
    { slot: 2, code: "30-03", build_items: 0, planned_points: 0, capacity_points: 17 },
  ]);
  assert.equal(line, "Points planned: 30-01: 21 of 24; Sprint 2: 26 of 24 (over), 1 unsized.");
  assert.equal(V.sprintLoad([]), "");
});

test("the board itself still carries no points", () => {
  // The line above is drawn by the page for an admin. The two board
  // renderings stay as they were: sprints and nothing else.
  const src = read("assets/js/pages/sprints/sprints.js");
  assert.match(src, /App\.access && App\.access\.admin\) \{\s+App\.db\.from\(App\.registry\.tables\.sprintPlanLoad\)/,
    "the load is fetched for an admin only");
});
