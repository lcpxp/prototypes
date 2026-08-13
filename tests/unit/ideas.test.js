// ------------------------------------------------------------------
// tests/unit/ideas.test.js - The prototype ideas board
// (docs/plan/70-PROTOTYPE-IDEAS.md).
//
// The list existed as three columns - name, note, sort_order - with no
// way to say how important an idea is, what it would prove, or what
// happened to it. These benchmarks hold the parts that turn it into
// something reviewable: an order a reader can act on, a plan that
// renders without a code change, and a close that keeps the row.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array, String, Math, parseInt, isNaN,
    location: { pathname: "/modules/prototypes/ideas.html", search: "", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/ui.js",
    "assets/js/core/registry.js",
    "assets/js/core/blocks.js",
    "assets/js/core/detail.js",
    "assets/js/pages/ideas-render.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App.ideasView;
}
const V = load();

function idea(extra) {
  return Object.assign({
    id: "i1", name: "Pricing Quote Tool", status: "idea", priority: 100,
    sort_order: 10,
  }, extra || {});
}

test("the bands read the same way they do on the roadmap", () => {
  assert.equal(V.band(10), "P1");
  assert.equal(V.band(25), "P2");
  assert.equal(V.band(100), "P10");
  assert.equal(V.band(0), "P1", "there is no P0");
  assert.equal(V.band(null), "");
});

test("actionable statuses lead; the inbox follows; closed comes last", () => {
  // The order is the point: a reader opening this wants what they can
  // act on, not fourteen unsorted names.
  assert.deepEqual(Array.from(V.STATUSES, (s) => s.key),
    ["planned", "shortlisted", "building", "idea", "promoted", "dropped"]);
});

test("every status the database allows has a group", () => {
  const schema = read("supabase/schema/20_portal.sql");
  const declared = [...schema.matchAll(/'(idea|shortlisted|planned|building|promoted|dropped)'/g)]
    .map((m) => m[1]);
  const keys = Array.from(V.STATUSES, (s) => s.key);
  for (const value of new Set(declared)) {
    assert.ok(keys.includes(value), `${value} has no group on the board`);
  }
});

test("grouping sorts by priority, then order, then name", () => {
  const groups = V.byStatus([
    idea({ id: "a", name: "Zebra", priority: 10 }),
    idea({ id: "b", name: "Apple", priority: 10, sort_order: 5 }),
    idea({ id: "c", name: "Later", priority: 50 }),
    idea({ id: "d", name: "Planned one", status: "planned", priority: 90 }),
  ]);
  const ideas = groups.find((g) => g.key === "idea");
  assert.deepEqual(Array.from(ideas.rows, (r) => r.name), ["Apple", "Zebra", "Later"]);
  assert.equal(groups[0].key, "planned");
  assert.equal(groups[0].rows.length, 1);
});

test("an idea with no status is in the inbox, not dropped from the board", () => {
  const groups = V.byStatus([{ id: "x", name: "Legacy row" }]);
  const ideas = groups.find((g) => g.key === "idea");
  assert.equal(ideas.rows.length, 1,
    "the fourteen rows that predate the status column must still appear");
});

test("a value no map has seen reads as itself", () => {
  assert.equal(V.labelOf(V.EFFORT, "enormous"), "enormous");
  assert.equal(V.labelOf(V.EFFORT, "small"), "Small");
  assert.equal(V.labelOf(V.EFFORT, null), "");
});

test("an idea shows what it would prove, which is the field that matters", () => {
  const html = V.ideaHtml(idea({
    summary: "Quote a price without touching LaunchPad",
    value_note: "Proves the pricing engine can answer before an application exists",
    effort: "medium", area_id: "a1", requested_by: "Sales",
  }), { areaTitle: { a1: "Product and Pricing" } });
  assert.match(html, /What it would prove/);
  assert.match(html, /Proves the pricing engine/);
  assert.match(html, /Medium effort &middot; Product and Pricing &middot; Asked for by Sales/);
  assert.equal((html.match(/P10/g) || []).length, 1,
    "the band is in the head; the meta line must not say it again");
});

test("the plan renders through the shared block renderer", () => {
  const html = V.ideaHtml(idea({
    status: "planned",
    blocks: [
      { kind: "p", text: "Two screens: a quote form and a result." },
      { kind: "kv", items: [{ label: "Built from", value: "style-tables, style-buttons" }] },
    ],
  }));
  assert.match(html, /Two screens/);
  assert.match(html, /<th>Built from<\/th><td>style-tables, style-buttons<\/td>/,
    "a new kind of plan content needs no change to this file");
});

test("an unknown block kind still renders, rather than the plan losing it", () => {
  const html = V.ideaHtml(idea({
    blocks: [{ kind: "storyboard", frames: "six" }],
  }));
  assert.match(html, /block-unknown/);
  assert.match(html, /storyboard/);
});

test("a closed idea keeps its row, its reason and its back-link", () => {
  const promoted = V.ideaHtml(
    idea({ status: "promoted", promoted_prototype_id: "p1",
      resolution: "Built as the PCI walkthrough", resolved_at: "2026-08-13T00:00:00Z" }),
    { prototypeHref: (id) => "modules/prototypes/pci/?p=" + id,
      prototypeTitle: { p1: "PCI walkthrough" } });
  assert.match(promoted, /Built as: PCI walkthrough/);
  assert.match(promoted, /href="modules\/prototypes\/pci\/\?p=p1"/);
  assert.match(promoted, /Resolution &middot; 2026-08-13/);
  assert.match(promoted, /Built as the PCI walkthrough/);
});

test("a column no field list knows about still reaches the idea", () => {
  // The completeness contract, on this surface too.
  const html = V.ideaHtml(idea({ confidence: "high", sponsor: "COO" }));
  assert.match(html, /Also recorded against this idea/);
  assert.match(html, /<dt>Confidence<\/dt><dd>high<\/dd>/);
  assert.match(html, /<dt>Sponsor<\/dt><dd>COO<\/dd>/);
});

test("an empty board names the table to write to", () => {
  assert.match(V.boardHtml([]), /future_prototypes/);
  assert.match(V.boardHtml([]), /\/prototype-idea/);
});

test("a group with no rows is left out rather than shown empty", () => {
  const html = V.boardHtml([idea()]);
  assert.match(html, /<h2>Ideas <span class="idea-count">1<\/span><\/h2>/);
  assert.doesNotMatch(html, /Promoted/);
});

test("everything is escaped", () => {
  const html = V.ideaHtml(idea({
    name: "<script>a</script>", summary: "<img src=x>", value_note: "<b>x</b>",
  }));
  assert.doesNotMatch(html, /<script>|<img|<b>x<\/b>/);
  assert.match(html, /&lt;script&gt;/);
});
