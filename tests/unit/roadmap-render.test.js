// ------------------------------------------------------------------
// tests/unit/roadmap-render.test.js - Benchmarks for the roadmap
// board's pure builders (App.roadmapView in assets/js/pages/
// roadmap.js). The builders are data-in / string-out, so they load in
// a Node vm alongside ui.js (which supplies App.escape). A no-op
// App.onAuthed stub keeps the module's boot call inert.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadView() {
  const sandbox = {
    location: { pathname: "/modules/roadmap/index.html" },
    navigator: {},
    setTimeout,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  // Stub the guard hook so the module's boot call does nothing here.
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/roadmap.js"), sandbox,
    { filename: "roadmap.js" });
  return sandbox.App.roadmapView;
}

function sampleData() {
  return {
    categories: [{ id: "c1", key: "unity", label: "Unity", sort_order: 10 }],
    areas: [
      { id: "a1", key: "core", scope: "product", sort_order: 10 },
      { id: "a2", key: "portal-core", scope: "portal", sort_order: 20 },
    ],
    items: [
      { id: "i1", area_id: "a1", category_id: "c1", title: "Unity integration",
        summary: "Focus item", status: "in_progress", horizon: "now",
        presentation: "current", priority: 10, sort_order: 10 },
      { id: "i2", area_id: "a1", category_id: null, title: "Acquirer enablement",
        summary: "Shipped", status: "done", horizon: "now",
        presentation: "sequenced", priority: 20, sort_order: 20 },
      { id: "i3", area_id: "a1", category_id: null, title: "US market",
        summary: "Later", status: "idea", horizon: "someday",
        presentation: "sequenced", priority: 30, sort_order: 30 },
      { id: "i4", area_id: "a2", category_id: null, title: "Portal tooling",
        summary: "Portal scope", status: "planned", horizon: "next",
        presentation: "sequenced", priority: 10, sort_order: 10 },
    ],
  };
}

test("zoneOf derives the three board zones from item fields", () => {
  const V = loadView();
  assert.equal(V.zoneOf({ status: "done", horizon: "now" }), "delivered");
  assert.equal(V.zoneOf({ status: "idea", horizon: "someday" }), "horizon");
  assert.equal(V.zoneOf({ status: "in_progress", horizon: "now" }), "active");
  // Delivered wins even if the horizon says someday.
  assert.equal(V.zoneOf({ status: "done", horizon: "someday" }), "delivered");
});

test("cascade spreads bars left to right and lets ongoing run wide", () => {
  const V = loadView();
  const geo = V.cascade([
    { presentation: "current" },
    { presentation: "sequenced" },
    { presentation: "ongoing" },
  ]);
  assert.equal(geo[0].start, 0);
  assert.ok(geo[2].start > geo[0].start, "later items start further right");
  assert.ok(geo[2].width > 24, "ongoing items are wider than a plain bar");
  geo.forEach((g) => assert.ok(g.start + g.width <= 100, "bars stay within the field"));
});

test("scopeItems filters by the owning area's scope", () => {
  const V = loadView();
  const data = sampleData();
  const scopeByArea = { a1: "product", a2: "portal" };
  assert.equal(V.scopeItems(data.items, "product", scopeByArea).length, 3);
  assert.equal(V.scopeItems(data.items, "portal", scopeByArea).length, 1);
  assert.equal(V.scopeItems(data.items, "all", scopeByArea).length, 4);
});

test("boardHtml renders each zone and the category lane class", () => {
  const V = loadView();
  const html = V.boardHtml(sampleData(), "product");
  assert.match(html, /Delivered/);
  assert.match(html, /In focus and prioritised/);
  assert.match(html, /Horizon/);
  assert.match(html, /rm-cat-unity/, "category key drives the lane class");
  assert.match(html, /Current focus/, "presentation label renders");
  // Portal-scoped item is excluded from the product view.
  assert.doesNotMatch(html, /Portal tooling/);
});

test("boardHtml escapes hostile item content", () => {
  const V = loadView();
  const data = sampleData();
  data.items[0].title = '<img src=x onerror=alert(1)>';
  const html = V.boardHtml(data, "product");
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
});

test("boardHtml shows a table-naming empty state when a scope is bare", () => {
  const V = loadView();
  const html = V.boardHtml({ categories: [], areas: [], items: [] }, "product");
  assert.match(html, /roadmap_items/);
});
