// ------------------------------------------------------------------
// tests/unit/roadmap-child-order.test.js - Benchmarks for how a
// workstream's nested work items stack and colour. Ordering: children
// render in stage order (Now above Next above Later); within the same
// start band a span that finishes sooner sits above one running longer.
// Colouring: a child bar/card inherits its PARENT's theme; a child whose
// own theme disagrees carries a faint .rmv-theme-dot in its own theme.
// Shares the loader and dataset with roadmap-views.test.js.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { loadView, sampleData } = require("../lib/roadmap.js");

const V = loadView();

// A workstream with children across stages and spans, titles chosen to
// never substring-match each other. Stored order deliberately scrambles
// the expected visual order.
function familyData() {
  const data = sampleData();
  const ws = data.items.find((i) => i.id === "i2");
  ws.level = "workstream";
  data.items = data.items.filter((i) => i.id !== "i2a" && i.id !== "i2b");
  const kid = (id, title, horizon, end, priority, category_id) => ({
    id, parent_id: "i2", area_id: "a3", category_id, title, level: "item",
    status: "planned", horizon, end_horizon: end, presentation: "sequenced",
    department: "product_technology", priority, sort_order: priority,
    updated_at: "2026-07-15T09:00:00Z",
  });
  data.items.push(
    kid("k1", "Alpha step", "later", null, 10, "c2"),
    kid("k2", "Bravo step", "now", "later", 20, "c2"),
    kid("k3", "Charlie step", "next", null, 30, "c2"),
    kid("k4", "Delta step", "now", "next", 40, "c3"),
    kid("k5", "Echo step", "now", null, 50, "c2"),
  );
  return data;
}

function order(html, titles) {
  const at = titles.map((t) => html.indexOf(t));
  at.forEach((p, k) => assert.ok(p !== -1, titles[k] + " rendered"));
  return at;
}

test("timeline stacks children in stage order, shorter spans first", () => {
  const html = V.timeline(familyData(), "team");
  // Now-only, then now-to-next, then now-to-later, then next, then later -
  // stage and span outrank the scrambled priorities.
  const at = order(html, ["Echo step", "Delta step", "Bravo step", "Charlie step", "Alpha step"]);
  for (let k = 1; k < at.length; k++) {
    assert.ok(at[k - 1] < at[k], "position " + k + " in stage order");
  }
});

test("cascade orders in-band children by stage and span", () => {
  const html = V.cascade(familyData(), "team");
  // All three now-starters carry a full card in the Now band, stacked
  // shortest span first.
  const at = order(html, ["Echo step", "Delta step", "Bravo step"]);
  assert.ok(at[0] < at[1] && at[1] < at[2], "Now band stacks by span");
});

test("child bars inherit the workstream theme; a mismatch shows a dot", () => {
  const html = V.timeline(familyData(), "team");
  // Delta step's own theme is Growth (c3) but its workstream is Unity
  // (c2): the bar colours Unity and carries a faint Growth dot.
  const delta = html.slice(html.indexOf("Delta step") - 400, html.indexOf("Delta step") + 100);
  assert.match(delta, /rm-cat-unity/, "child bar inherits parent theme");
  assert.doesNotMatch(delta, /rmv-tl-bar[^>]*rm-cat-growth/, "own theme not on the bar");
  assert.match(delta, /rmv-theme-dot rm-cat-growth/, "mismatch dot in own theme");
  // Echo step matches its parent's theme: no dot.
  const echo = html.slice(html.indexOf("Echo step"), html.indexOf("Echo step") + 120);
  assert.doesNotMatch(echo, /rmv-theme-dot/, "no dot when themes agree");
});

test("cascade child cards inherit the parent theme with the same dot", () => {
  const html = V.cascade(familyData(), "team");
  const delta = html.slice(html.indexOf("Delta step") - 400, html.indexOf("Delta step") + 200);
  assert.match(delta, /rm-cat-unity/, "child card inherits parent theme");
  assert.match(html, /rmv-theme-dot rm-cat-growth/, "mismatch dot on the card");
});
