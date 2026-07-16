// ------------------------------------------------------------------
// tests/unit/roadmap-views.test.js - Benchmarks for the roadmap home's
// pure builders (App.roadmapView in assets/js/pages/roadmap-views.js).
// Data-in / string-out, loaded in a Node vm alongside ui.js (App.escape
// and App.statusBadge). One dataset (work_items) drives three levels:
//   Executive - a theme rollup of active work (no item titles), always
//               complete, so it cannot drift.
//   Team      - active work at item level (no Parked column).
//   Backlog   - every item: active + parked + delivered (Parked column).
// Placement derives from an item's own fields (done = Delivered;
// someday or dropped = Parked; the rest = Active by horizon).
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadView() {
  const sandbox = {
    location: { pathname: "/modules/roadmap/index.html", hash: "" },
    navigator: {}, setTimeout,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/pages/roadmap-views.js"), sandbox, { filename: "roadmap-views.js" });
  return sandbox.App.roadmapView;
}

function count(html, re) { return (html.match(re) || []).length; }

// Themes: Core, Unity, Growth. Areas map to themes; a2 is portal scope
// and must never reach the product roadmap. Items exercise every band.
function sampleData() {
  return {
    categories: [
      { id: "c1", key: "core", label: "Core", description: "Base", sort_order: 10 },
      { id: "c2", key: "unity", label: "Unity", description: "Unity work", sort_order: 20 },
      { id: "c3", key: "growth", label: "Growth", description: "Growth bets", sort_order: 30 },
    ],
    areas: [
      { id: "a1", key: "core-area", scope: "product", category_id: "c1", sort_order: 10 },
      { id: "a2", key: "portal", scope: "portal", category_id: null, sort_order: 20 },
      { id: "a3", key: "unity-area", scope: "product", category_id: "c2", sort_order: 30 },
      { id: "a4", key: "growth-area", scope: "product", category_id: "c3", sort_order: 40 },
    ],
    items: [
      // Delivered, would have vanished from the old audience-filtered
      // Executive timeline; now it feeds its theme's lane.
      { id: "i1", area_id: "a1", category_id: "c1", title: "Core onboarding", summary: "Shipped",
        status: "done", horizon: "now", end_horizon: null, presentation: "sequenced",
        priority: 10, sort_order: 10, updated_at: "2026-07-14T09:00:00Z" },
      // Active focus item.
      { id: "i2", area_id: "a3", category_id: "c2", title: "Unity integration", summary: "Focus",
        status: "in_progress", horizon: "now", end_horizon: null, presentation: "current",
        priority: 20, sort_order: 20, updated_at: "2026-07-15T09:00:00Z" },
      // Active, spans Now -> Next.
      { id: "i3", area_id: "a1", category_id: "c1", title: "Portal overhaul", summary: "Spans",
        status: "in_progress", horizon: "now", end_horizon: "next", presentation: "ongoing",
        priority: 30, sort_order: 30, updated_at: "2026-07-10T09:00:00Z" },
      // Parked: someday, themed via its area (no category_id).
      { id: "i4", area_id: "a1", category_id: null, title: "US market", summary: "Bet",
        status: "idea", horizon: "someday", end_horizon: null, presentation: "sequenced",
        priority: 40, sort_order: 40, updated_at: "2026-07-01T09:00:00Z" },
      // Dropped: treated as parked (far-future), reasoning kept.
      { id: "i5", area_id: "a3", category_id: "c2", title: "Whitelist blacklist", summary: "Gone",
        status: "dropped", horizon: "later", end_horizon: null, resolution: "Not needed",
        priority: 50, sort_order: 50, updated_at: "2026-07-02T09:00:00Z" },
      // Portal scope: excluded from the product roadmap.
      { id: "i6", area_id: "a2", category_id: null, title: "Portal tooling", summary: "Portal",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        priority: 10, sort_order: 10, updated_at: "2026-07-16T09:00:00Z" },
      // Active in the Later band, third active theme.
      { id: "i7", area_id: "a4", category_id: "c3", title: "Growth bet", summary: "Later",
        status: "planned", horizon: "later", end_horizon: null, presentation: "sequenced",
        priority: 60, sort_order: 60, updated_at: "2026-07-03T09:00:00Z" },
    ],
  };
}

test("colStart/colEnd map horizon, span, done and dropped to the axis", () => {
  const V = loadView();
  assert.deepEqual([V.colStart({ status: "done", horizon: "now" }), V.colEnd({ status: "done", horizon: "now" })], [0, 0]);
  assert.deepEqual([V.colStart({ status: "in_progress", horizon: "now" }), V.colEnd({ status: "in_progress", horizon: "now" })], [1, 1]);
  assert.deepEqual([V.colStart({ status: "in_progress", horizon: "now", end_horizon: "next" }), V.colEnd({ status: "in_progress", horizon: "now", end_horizon: "next" })], [1, 2]);
  // someday folds into the Parked band (4).
  assert.deepEqual([V.colStart({ status: "idea", horizon: "someday" }), V.colEnd({ status: "idea", horizon: "someday" })], [4, 4]);
  // dropped is parked wherever its horizon sits.
  assert.deepEqual([V.colStart({ status: "dropped", horizon: "later" }), V.colEnd({ status: "dropped", horizon: "later" })], [4, 4]);
  // A backwards span is clamped so the end never precedes the start.
  assert.equal(V.colEnd({ status: "planned", horizon: "next", end_horizon: "now" }), 2);
});

test("isActive and isParked classify by the item's own fields", () => {
  const V = loadView();
  assert.equal(V.isActive({ status: "in_progress", horizon: "now" }), true);
  assert.equal(V.isActive({ status: "done", horizon: "now" }), false);
  assert.equal(V.isActive({ status: "idea", horizon: "someday" }), false);
  assert.equal(V.isParked({ status: "idea", horizon: "someday" }), true);
  assert.equal(V.isParked({ status: "dropped", horizon: "later" }), true);
  assert.equal(V.isParked({ status: "done", horizon: "now" }), false);
});

test("productItems keeps only product-scoped items", () => {
  const V = loadView();
  const kept = V.productItems(sampleData().items, { a1: "product", a2: "portal", a3: "product", a4: "product" });
  assert.equal(kept.length, 6);
  assert.ok(kept.every((i) => i.area_id !== "a2"));
});

test("timeline (team) spans active bars across Delivered..Later, hides parked and portal", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "team");
  assert.match(html, /Delivered<\/span>.*Now<\/span>.*Next<\/span>.*Later<\/span>/s);
  assert.doesNotMatch(html, />Parked</, "Team has no Parked column");
  // Delivered item sits in the Delivered column (grid 2/3) with the done style.
  assert.match(html, /rmv-tl-bar--done[^"]*"[^>]*grid-column:2 \/ 3/);
  // Now->Next spanning item covers grid columns 3 to 5.
  assert.match(html, /grid-column:3 \/ 5">[^<]*Portal overhaul/);
  assert.doesNotMatch(html, /US market/, "parked item hidden from Team");
  assert.doesNotMatch(html, /Whitelist blacklist/, "dropped item hidden from Team");
  assert.doesNotMatch(html, /Portal tooling/, "portal item hidden from Team");
});

test("timeline (team) orders by start band, then span length, then priority", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "team");
  const order = ["Core onboarding", "Unity integration", "Portal overhaul", "Growth bet"];
  const positions = order.map((t) => html.indexOf(t));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "rows are in band+span order");
});

test("timeline (exec) rolls active work up to themes, never item titles", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "exec");
  // One lane per active theme: Core, Unity, Growth (all three).
  assert.equal(count(html, /rmv-tl-row/g), 3, "one lane per active theme");
  assert.match(html, /Core<\/span>/);
  assert.match(html, /Unity<\/span>/);
  assert.match(html, /Growth<\/span>/);
  // No individual item titles leak into the executive rollup.
  assert.doesNotMatch(html, /Unity integration/);
  assert.doesNotMatch(html, /Portal overhaul/);
  assert.doesNotMatch(html, /US market/, "parked theme member not surfaced");
});

test("regression: a delivered item is not dropped - it feeds its exec theme and shows in Team", () => {
  const V = loadView();
  const data = sampleData();
  // Only the delivered item and one active item share the Core theme;
  // both keep Core present in Executive, and Team still lists the item.
  assert.match(V.timeline(data, "team"), /Core onboarding/);
  assert.match(V.timeline(data, "exec"), /Core<\/span>/);
});

test("timeline (backlog) shows every product item and the Parked column", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "backlog");
  assert.match(html, />Parked</, "Backlog carries the Parked column");
  ["Core onboarding", "Unity integration", "Portal overhaul", "US market", "Whitelist blacklist", "Growth bet"]
    .forEach((t) => assert.match(html, new RegExp(t), `${t} present in Backlog`));
  assert.doesNotMatch(html, /Portal tooling/, "portal item still excluded");
  // Parked item sits in the Parked column (grid 6/7) with the parked style.
  assert.match(html, /rmv-tl-bar--parked[^"]*"[^>]*grid-column:6 \/ 7/);
});

test("cascade (team) repeats a spanning item under each band it covers", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "team");
  assert.match(html, /rmv-band-head--now/);
  assert.match(html, /rmv-band-head--next/);
  assert.doesNotMatch(html, /rmv-band-head--parked/, "Team has no Parked band");
  // Portal overhaul spans Now->Next, so it appears in both bands.
  assert.equal(count(html, /Portal overhaul/g), 2);
  // A single-band item appears once.
  assert.equal(count(html, /Unity integration/g), 1);
});

test("cascade (exec) shows theme blocks by band, no item titles", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "exec");
  assert.match(html, /rmv-band-head--now/);
  assert.match(html, /rm-lane-label">Core/);
  assert.doesNotMatch(html, /Unity integration/, "no item titles in the exec rollup");
});

test("cascade (backlog) surfaces parked items under the Parked band with reasoning kept", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "backlog");
  assert.match(html, /rmv-band-head--parked/);
  assert.match(html, /US market/);
  assert.match(html, /Whitelist blacklist/);
});

test("showDelivered=false hides delivered work across timeline and cascade", () => {
  const V = loadView();
  const data = sampleData();
  const tl = V.timeline(data, "team", { showDelivered: false });
  assert.doesNotMatch(tl, /Core onboarding/, "delivered item hidden on the timeline");
  assert.match(tl, /rmv-tl--nodelivered/, "the Delivered column drops off");
  assert.doesNotMatch(tl, /Delivered<\/span>/, "no Delivered column header");
  assert.match(tl, /Unity integration/, "live work still shows");
  const cas = V.cascade(data, "team", { showDelivered: false });
  assert.doesNotMatch(cas, /rmv-band-head--delivered/);
  assert.match(cas, /rmv-band-head--now/);
  // Executive still lists its active themes with delivered hidden.
  assert.match(V.timeline(data, "exec", { showDelivered: false }), /Core<\/span>/);
  // Default keeps delivered visible.
  assert.match(V.timeline(data, "team"), /Core onboarding/);
});

test("empty states name the work_items table", () => {
  const V = loadView();
  const empty = { categories: [], areas: [], items: [] };
  assert.match(V.timeline(empty, "team"), /work_items/);
  assert.match(V.cascade(empty, "backlog"), /work_items/);
});

test("builders escape hostile content", () => {
  const V = loadView();
  const data = sampleData();
  data.items[2].title = '<img src=x onerror=alert(1)>';
  assert.doesNotMatch(V.timeline(data, "team"), /<img src=x/);
  assert.match(V.timeline(data, "team"), /&lt;img/);
  assert.doesNotMatch(V.cascade(data, "team"), /<img src=x/);
});
