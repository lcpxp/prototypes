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
        presentation: "current", priority: 10, sort_order: 10,
        updated_at: "2026-07-10T09:00:00Z" },
      { id: "i2", area_id: "a1", category_id: null, title: "Acquirer enablement",
        summary: "Shipped", status: "done", horizon: "now",
        presentation: "sequenced", priority: 20, sort_order: 20,
        updated_at: "2026-07-14T09:00:00Z" },
      { id: "i3", area_id: "a1", category_id: null, title: "US market",
        summary: "Later", status: "idea", horizon: "someday",
        presentation: "sequenced", priority: 30, sort_order: 30,
        updated_at: "2026-07-01T09:00:00Z" },
      // Portal-scoped: kept in the fixture on purpose to prove the
      // roadmap always filters it out.
      { id: "i4", area_id: "a2", category_id: null, title: "Portal tooling",
        summary: "Portal scope", status: "planned", horizon: "next",
        presentation: "sequenced", priority: 10, sort_order: 10,
        updated_at: "2026-07-16T09:00:00Z" },
    ],
  };
}

test("columnOf maps item fields to the grid column", () => {
  const V = loadView();
  assert.equal(V.columnOf({ status: "done", horizon: "now" }), "delivered");
  assert.equal(V.columnOf({ status: "idea", horizon: "someday" }), "later");
  assert.equal(V.columnOf({ status: "planned", horizon: "later" }), "later");
  assert.equal(V.columnOf({ status: "planned", horizon: "next" }), "next");
  assert.equal(V.columnOf({ status: "in_progress", horizon: "now" }), "now");
  // Delivered wins even if the horizon says next.
  assert.equal(V.columnOf({ status: "done", horizon: "next" }), "delivered");
});

test("productItems keeps only items owned by a product-scoped area", () => {
  const V = loadView();
  const data = sampleData();
  const scopeByArea = { a1: "product", a2: "portal" };
  const kept = V.productItems(data.items, scopeByArea);
  assert.equal(kept.length, 3);
  assert.ok(kept.every((i) => i.area_id === "a1"));
});

test("boardHtml excludes portal items and keeps the category lane class", () => {
  const V = loadView();
  const html = V.boardHtml(sampleData());
  assert.match(html, /rm-cat-unity/, "category key drives the lane class");
  assert.match(html, /Current focus/, "presentation label renders on Now cards");
  // Portal-scoped item is always excluded from the roadmap.
  assert.doesNotMatch(html, /Portal tooling/);
  // No proportional-bar gradients survive the redesign.
  assert.doesNotMatch(html, /gradient/);
});

test("boardHtml renders Later as chips and Now as cards", () => {
  const V = loadView();
  const html = V.boardHtml(sampleData());
  assert.match(html, /rm-card--now/, "Now items render as cards");
  assert.match(html, /rm-chip[^-]/, "Later items render as chips");
});

test("boardHtml uses accessible grid semantics", () => {
  const V = loadView();
  const html = V.boardHtml(sampleData());
  // Lane labels are real headings.
  assert.match(html, /<h2 class="rm-lane-label"/);
  // Cells are lists carrying a lane + column aria-label.
  assert.match(html, /<ul class="rm-cell[^"]*" aria-label="Unity - Now"/);
  // Delivered is a native disclosure with the count in its summary.
  assert.match(html, /<details class="rm-delivered"/);
  assert.match(html, /<summary>Delivered - 1<\/summary>/);
});

test("freshnessHtml renders the max updated_at, or nothing when absent", () => {
  const V = loadView();
  const html = V.freshnessHtml([
    { updated_at: "2026-07-01T09:00:00Z" },
    { updated_at: "2026-07-14T09:00:00Z" },
    { updated_at: "2026-07-10T09:00:00Z" },
  ]);
  assert.match(html, /Data as of 2026-07-14/);
  assert.equal(V.freshnessHtml([{ title: "no timestamp" }]), "");
});

test("boardHtml escapes hostile item content", () => {
  const V = loadView();
  const data = sampleData();
  data.items[0].title = '<img src=x onerror=alert(1)>';
  const html = V.boardHtml(data);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
});

test("boardHtml shows a table-naming empty state when there are no items", () => {
  const V = loadView();
  const html = V.boardHtml({ categories: [], areas: [], items: [] });
  assert.match(html, /roadmap_items/);
});
