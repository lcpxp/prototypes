// ------------------------------------------------------------------
// tests/unit/roadmap-views.test.js - Benchmarks for the roadmap home's
// pure builders (App.roadmapView in assets/js/pages/roadmap-views.js).
// Data-in / string-out, loaded in a Node vm alongside ui.js (App.escape
// and App.statusBadge). roadmap-views.js registers no boot hook.
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

function sampleData() {
  return {
    categories: [
      { id: "c1", key: "core", label: "Core LaunchPad", description: "Base", sort_order: 10 },
      { id: "c2", key: "unity", label: "Unity", description: "Unity work", sort_order: 20 },
    ],
    areas: [
      { id: "a1", key: "core-area", scope: "product", category_id: "c1", sort_order: 10 },
      { id: "a2", key: "portal", scope: "portal", category_id: null, sort_order: 20 },
    ],
    items: [
      { id: "i1", area_id: "a1", category_id: "c1", title: "Core onboarding", summary: "Shipped",
        status: "done", horizon: "now", end_horizon: null, presentation: "sequenced",
        audience: "exec", priority: 10, sort_order: 10, updated_at: "2026-07-14T09:00:00Z" },
      { id: "i2", area_id: "a1", category_id: "c2", title: "Unity integration", summary: "Focus",
        status: "in_progress", horizon: "now", end_horizon: null, presentation: "current",
        audience: "exec", priority: 20, sort_order: 20, updated_at: "2026-07-15T09:00:00Z" },
      { id: "i3", area_id: "a1", category_id: "c1", title: "Portal overhaul", summary: "Spans",
        status: "in_progress", horizon: "now", end_horizon: "next", presentation: "ongoing",
        audience: "team", priority: 30, sort_order: 30, updated_at: "2026-07-10T09:00:00Z" },
      { id: "i4", area_id: "a1", category_id: null, title: "US market", summary: "Bet",
        status: "idea", horizon: "someday", end_horizon: null, presentation: "sequenced",
        audience: "exec", priority: 40, sort_order: 40, updated_at: "2026-07-01T09:00:00Z" },
      { id: "i5", area_id: "a2", category_id: null, title: "Portal tooling", summary: "Portal",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        audience: "team", priority: 10, sort_order: 10, updated_at: "2026-07-16T09:00:00Z" },
    ],
    backlog: [
      { id: "b1", area_id: "a1", type: "feature", title: "Legal contract management",
        summary: "Feeder", status: "open", horizon: "someday", end_horizon: null, priority: 10, sort_order: 10, tags: [] },
      { id: "b2", area_id: "a1", type: "consideration", title: "Whitelist blacklist",
        summary: "Dropped", status: "dropped", horizon: "later", end_horizon: null,
        resolution: "Not needed", priority: 20, sort_order: 20, tags: [] },
    ],
  };
}

test("colStart/colEnd map horizon and span to the continuous axis", () => {
  const V = loadView();
  assert.deepEqual([V.colStart({ status: "done", horizon: "now" }), V.colEnd({ status: "done", horizon: "now" })], [0, 0]);
  assert.deepEqual([V.colStart({ status: "in_progress", horizon: "now" }), V.colEnd({ status: "in_progress", horizon: "now" })], [1, 1]);
  assert.deepEqual([V.colStart({ status: "in_progress", horizon: "now", end_horizon: "next" }), V.colEnd({ status: "in_progress", horizon: "now", end_horizon: "next" })], [1, 2]);
  assert.equal(V.colStart({ status: "idea", horizon: "someday" }), 3);
  // A backwards span is clamped so the end never precedes the start.
  assert.equal(V.colEnd({ status: "planned", horizon: "next", end_horizon: "now" }), 2);
});

test("productItems keeps only product-scoped items", () => {
  const V = loadView();
  const kept = V.productItems(sampleData().items, { a1: "product", a2: "portal" });
  assert.equal(kept.length, 4);
  assert.ok(kept.every((i) => i.area_id === "a1"));
});

test("timeline (team) spans bars across their columns and heads the four bands", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "team");
  assert.match(html, /Delivered<\/span>.*Now<\/span>.*Next<\/span>.*Later<\/span>/s);
  // Delivered item sits in the Delivered column (grid 2/3) with the done style.
  assert.match(html, /rmv-tl-bar--done[^"]*"[^>]*grid-column:2 \/ 3/);
  // Now->Next spanning item covers grid columns 3 to 5.
  assert.match(html, /grid-column:3 \/ 5">[^<]*Portal overhaul/);
  assert.doesNotMatch(html, /Portal tooling/);
});

test("timeline (team) orders by start band, then span length, then priority", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "team");
  // Delivered first, then single-column Now, then the Now->Next span, then Later.
  const order = ["Core onboarding", "Unity integration", "Portal overhaul", "US market"];
  const positions = order.map((t) => html.indexOf(t));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "rows are in band+span order");
});

test("timeline (exec) shows only audience=exec items", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "exec");
  assert.match(html, /Unity integration/);
  assert.match(html, /Core onboarding/);
  assert.doesNotMatch(html, /Portal overhaul/, "a team item is not on the exec timeline");
});

test("timeline (backlog) places backlog rows by their area's theme", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "backlog");
  assert.match(html, /Legal contract management/);
  assert.match(html, /Core LaunchPad/, "grouped label comes from the area theme");
  assert.doesNotMatch(html, /Whitelist blacklist/, "dropped item is not in the backlog view");
});

test("cascade (team) repeats a spanning item under each band it covers", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "team");
  assert.match(html, /rmv-band-head--now/);
  assert.match(html, /rmv-band-head--next/);
  // Portal overhaul spans Now->Next, so it appears in both bands.
  assert.equal(count(html, /Portal overhaul/g), 2);
  // A single-band item appears once.
  assert.equal(count(html, /Unity integration/g), 1);
});

test("cascade (exec) shows delivered buckets and exec items, hides team items", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "exec");
  assert.match(html, /rmv-bucket/);
  assert.match(html, /Core onboarding/);
  assert.match(html, /Unity integration/);
  assert.match(html, /US market/, "standalone exec bet shown");
  assert.doesNotMatch(html, /Portal overhaul/, "team item hidden from exec");
});

test("cascade (backlog) groups open items; parked shows the reasoning", () => {
  const V = loadView();
  assert.match(V.cascade(sampleData(), "backlog"), /Legal contract management/);
  assert.doesNotMatch(V.cascade(sampleData(), "backlog"), /Whitelist blacklist/);
  const parked = V.cascade(sampleData(), "parked");
  assert.match(parked, /Whitelist blacklist/);
  assert.match(parked, /Not needed/);
});

test("showDelivered=false hides delivered work across timeline and cascade", () => {
  const V = loadView();
  const data = sampleData();
  const tl = V.timeline(data, "team", { showDelivered: false });
  assert.doesNotMatch(tl, /Core onboarding/, "delivered item is hidden on the timeline");
  assert.match(tl, /rmv-tl--nodelivered/, "the Delivered column drops off");
  assert.doesNotMatch(tl, /Delivered<\/span>/, "no Delivered column header");
  assert.match(tl, /Unity integration/, "live work still shows");
  // Cascade drops the Delivered band; exec drops the delivered buckets.
  const cas = V.cascade(data, "team", { showDelivered: false });
  assert.doesNotMatch(cas, /rmv-band-head--delivered/);
  assert.match(cas, /rmv-band-head--now/);
  assert.doesNotMatch(V.cascade(data, "exec", { showDelivered: false }), /rmv-bucket/);
  // Default keeps delivered visible.
  assert.match(V.timeline(data, "team"), /Core onboarding/);
});

test("empty states name their table", () => {
  const V = loadView();
  const empty = { categories: [], areas: [], items: [], backlog: [] };
  assert.match(V.timeline(empty, "team"), /roadmap_items/);
  assert.match(V.cascade(empty, "backlog"), /backlog_items/);
  assert.match(V.timeline(empty, "parked"), /Nothing parked/);
});

test("builders escape hostile content", () => {
  const V = loadView();
  const data = sampleData();
  data.items[2].title = '<img src=x onerror=alert(1)>';
  assert.doesNotMatch(V.timeline(data, "team"), /<img src=x/);
  assert.match(V.timeline(data, "team"), /&lt;img/);
  assert.doesNotMatch(V.cascade(data, "team"), /<img src=x/);
});
