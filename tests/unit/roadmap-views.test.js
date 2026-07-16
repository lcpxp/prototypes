// ------------------------------------------------------------------
// tests/unit/roadmap-views.test.js - Benchmarks for the roadmap home's
// pure builders (App.roadmapView in assets/js/pages/roadmap-views.js).
// The builders are data-in / string-out, so they load in a Node vm
// alongside ui.js (which supplies App.escape and App.statusBadge).
// roadmap-views.js registers no boot hook, so it loads inert.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadView() {
  const sandbox = {
    location: { pathname: "/modules/roadmap/index.html", hash: "" },
    navigator: {},
    setTimeout,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/pages/roadmap-views.js"), sandbox,
    { filename: "roadmap-views.js" });
  return sandbox.App.roadmapView;
}

function sampleData() {
  return {
    categories: [
      { id: "c1", key: "core", label: "Core LaunchPad", description: "Base platform", sort_order: 10 },
      { id: "c2", key: "unity", label: "Unity", description: "Unity integration", sort_order: 20 },
    ],
    areas: [
      { id: "a1", key: "core-area", scope: "product", category_id: "c1", sort_order: 10 },
      { id: "a2", key: "portal", scope: "portal", category_id: null, sort_order: 20 },
    ],
    items: [
      { id: "i1", area_id: "a1", category_id: "c1", title: "Core onboarding",
        summary: "Shipped", status: "done", horizon: "now", presentation: "sequenced",
        audience: "exec", priority: 10, sort_order: 10, updated_at: "2026-07-14T09:00:00Z" },
      { id: "i2", area_id: "a1", category_id: "c2", title: "Unity integration",
        summary: "Current focus", status: "in_progress", horizon: "now",
        presentation: "current", audience: "exec", priority: 10, sort_order: 10,
        updated_at: "2026-07-15T09:00:00Z" },
      { id: "i3", area_id: "a1", category_id: "c1", title: "Onboarding API",
        summary: "Validated problem", status: "planned", horizon: "next",
        presentation: "sequenced", audience: "team", priority: 20, sort_order: 20,
        updated_at: "2026-07-10T09:00:00Z" },
      { id: "i4", area_id: "a1", category_id: null, title: "US market",
        summary: "Longer bet", status: "idea", horizon: "someday",
        presentation: "sequenced", audience: "exec", priority: 30, sort_order: 30,
        updated_at: "2026-07-01T09:00:00Z" },
      // Portal-scoped: kept in the fixture to prove it is always filtered out.
      { id: "i5", area_id: "a2", category_id: null, title: "Portal tooling",
        summary: "Portal scope", status: "planned", horizon: "now",
        presentation: "sequenced", audience: "team", priority: 10, sort_order: 10,
        updated_at: "2026-07-16T09:00:00Z" },
    ],
    backlog: [
      { id: "b1", area_id: "a1", type: "feature", title: "Legal contract management",
        summary: "Open feeder item", status: "open", priority: 10, sort_order: 10, tags: [] },
      { id: "b2", area_id: "a1", type: "consideration", title: "Whitelist / blacklist",
        summary: "De-scoped", status: "dropped", resolution: "Not needed for now",
        priority: 20, sort_order: 20, tags: [] },
    ],
  };
}

test("columnOf maps item fields to the stage band", () => {
  const V = loadView();
  assert.equal(V.columnOf({ status: "done", horizon: "now" }), "delivered");
  assert.equal(V.columnOf({ status: "idea", horizon: "someday" }), "later");
  assert.equal(V.columnOf({ status: "planned", horizon: "later" }), "later");
  assert.equal(V.columnOf({ status: "planned", horizon: "next" }), "next");
  assert.equal(V.columnOf({ status: "in_progress", horizon: "now" }), "now");
  assert.equal(V.columnOf({ status: "done", horizon: "next" }), "delivered");
});

test("productItems keeps only items owned by a product-scoped area", () => {
  const V = loadView();
  const scopeByArea = { a1: "product", a2: "portal" };
  const kept = V.productItems(sampleData().items, scopeByArea);
  assert.equal(kept.length, 4);
  assert.ok(kept.every((i) => i.area_id === "a1"));
});

test("execHtml shows delivered buckets, exec items and standalone bets only", () => {
  const V = loadView();
  const html = V.execHtml(sampleData());
  assert.match(html, /Delivered/, "delivered band heading present");
  assert.match(html, /rmv-bucket/, "delivered items render as buckets");
  assert.match(html, /Core onboarding/, "shipped bucket shown");
  assert.match(html, /Unity integration/, "exec live item shown");
  assert.match(html, /US market/, "standalone exec bet shown");
  assert.match(html, /Core LaunchPad/, "theme label shown");
  // A team-only item never reaches the Executive view.
  assert.doesNotMatch(html, /Onboarding API/);
  // Portal-scoped work is always excluded.
  assert.doesNotMatch(html, /Portal tooling/);
});

test("cascadeHtml reveals every item across the four stage bands", () => {
  const V = loadView();
  const html = V.cascadeHtml(sampleData());
  assert.match(html, /rmv-band-head--delivered/, "delivered band");
  assert.match(html, /rmv-band-head--now/, "now band");
  assert.match(html, /rmv-band-head--next/, "next band");
  assert.match(html, /rmv-band-head--later/, "later band");
  // The team-only item hidden from Executive is visible here.
  assert.match(html, /Onboarding API/);
  assert.match(html, /Unity integration/);
  // Standalone item (no theme) falls into a General block.
  assert.match(html, /General/);
  // Portal scope is still excluded.
  assert.doesNotMatch(html, /Portal tooling/);
});

test("timelineHtml ranks live items as bars and excludes delivered", () => {
  const V = loadView();
  const html = V.timelineHtml(sampleData());
  assert.match(html, /rmv-tl-bar/, "items render as bars");
  assert.match(html, /Now<\/span>.*Next<\/span>.*Later<\/span>/s, "the three columns head the axis");
  assert.match(html, /Unity integration/);
  assert.match(html, /Onboarding API/);
  // Delivered work is not on the timeline (it is upcoming/live only).
  assert.doesNotMatch(html, /Core onboarding/);
  // Portal scope is excluded.
  assert.doesNotMatch(html, /Portal tooling/);
});

test("timelineHtml places a bar in its horizon column", () => {
  const V = loadView();
  const html = V.timelineHtml(sampleData());
  // Unity integration is 'now' (column 1 -> grid columns 2/3).
  assert.match(html, /grid-column:2 \/ 3">[^<]*Unity integration/);
});

test("timelineHtml shows an empty state when nothing is live", () => {
  const V = loadView();
  const data = sampleData();
  data.items = data.items.filter((i) => i.status === "done");
  assert.match(V.timelineHtml(data), /No live roadmap items/);
});

test("backlogHtml groups open items by theme and hides parked ones", () => {
  const V = loadView();
  const html = V.backlogHtml(sampleData());
  assert.match(html, /Legal contract management/, "open item shown");
  assert.match(html, /Core LaunchPad/, "grouped under its theme");
  assert.doesNotMatch(html, /Whitelist/, "dropped item is not in the backlog view");
});

test("backlogHtml shows a table-naming empty state when nothing is open", () => {
  const V = loadView();
  const html = V.backlogHtml({ categories: [], areas: [], items: [], backlog: [] });
  assert.match(html, /backlog_items/);
});

test("parkedHtml shows de-scoped items with the reasoning kept", () => {
  const V = loadView();
  const html = V.parkedHtml(sampleData());
  assert.match(html, /Whitelist/);
  assert.match(html, /Not needed for now/, "resolution rationale is shown");
  // An open feeder item is not parked.
  assert.doesNotMatch(html, /Legal contract management/);
});

test("parkedHtml shows an empty state when nothing is parked", () => {
  const V = loadView();
  const html = V.parkedHtml({ categories: [], areas: [], items: [], backlog: [] });
  assert.match(html, /Nothing parked/);
});

test("freshnessHtml renders the max updated_at, or nothing when absent", () => {
  const V = loadView();
  assert.match(V.freshnessHtml([
    { updated_at: "2026-07-01T09:00:00Z" },
    { updated_at: "2026-07-15T09:00:00Z" },
  ]), /Data as of 2026-07-15/);
  assert.equal(V.freshnessHtml([{ title: "no timestamp" }]), "");
});

test("builders escape hostile item content", () => {
  const V = loadView();
  const data = sampleData();
  data.items[1].title = '<img src=x onerror=alert(1)>';
  assert.doesNotMatch(V.execHtml(data), /<img src=x/);
  assert.match(V.execHtml(data), /&lt;img/);
  assert.doesNotMatch(V.cascadeHtml(data), /<img src=x/);
});

test("empty roadmap renders a table-naming notice", () => {
  const V = loadView();
  const html = V.execHtml({ categories: [], areas: [], items: [], backlog: [] });
  assert.match(html, /roadmap_items/);
});
