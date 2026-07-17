// ------------------------------------------------------------------
// tests/unit/roadmap-detail.test.js - Benchmarks for the item detail
// drawer and the AI-optimised JSON export (App.roadmapDetail). Loaded in
// a Node vm alongside ui.js, sprints.js and roadmap-views.js. Sandbox
// objects are JSON round-tripped into this realm before comparison.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = {
    navigator: {}, setTimeout, Date,
    location: { pathname: "/modules/roadmap/index.html", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/ui.js",
    "assets/js/core/sprints.js",
    "assets/js/pages/roadmap-views.js",
    "assets/js/pages/roadmap-detail.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App;
}

function sample() {
  return {
    categories: [{ id: "c2", key: "unity", label: "Unity", description: "Unity work", sort_order: 20 }],
    areas: [
      { id: "a3", key: "unity-area", scope: "product", category_id: "c2", sort_order: 30 },
      { id: "a2", key: "portal", scope: "portal", category_id: null, sort_order: 20 },
    ],
    items: [
      { id: "i2", area_id: "a3", category_id: "c2", title: "Unity integration", summary: "Focus",
        status: "in_progress", horizon: "now", end_horizon: "next", presentation: "current",
        priority: 20, sort_order: 20, progress: 45, prd_status: "approved", project_status: "in_progress",
        starts_on: "2026-07-20", ends_on: "2026-09-01", start_sprint: "26-16", end_sprint: "26-18",
        updated_at: "2026-07-15T09:00:00Z",
        attributes: { pnl_vertical: "Payments", team: "Core", region: ["EU", "UK"], customer: "Strategic",
          merchant_value: "Value", pxp_value: "PXP", blockers: "None", prd_link: "https://example.com/prd" },
        phases: [
          { work_item_id: "i2", phase: "build", quarter: "Q3 2026", starts_on: "2026-07-20", ends_on: null, start_tbc: false, end_tbc: true, sort_order: 20 },
          { work_item_id: "i2", phase: "discovery", quarter: "Q2 2026", starts_on: "2026-04-06", ends_on: "2026-05-01", start_tbc: false, end_tbc: false, sort_order: 10 },
        ] },
      { id: "i6", area_id: "a2", category_id: null, title: "Portal tooling", status: "planned",
        horizon: "now", end_horizon: null, presentation: "sequenced", priority: 10, sort_order: 10, attributes: {} },
    ],
  };
}

function ctxOf(App, data) { return App.roadmapView.context(data); }
function plain(o) { return JSON.parse(JSON.stringify(o)); }

test("toKpiItem resolves theme, band and statuses into a lean object", () => {
  const App = load();
  const data = sample();
  const item = plain(App.roadmapDetail.toKpiItem(data.items[0], ctxOf(App, data)));
  assert.equal(item.theme, "Unity");
  assert.equal(item.band, "Now to Next");
  assert.equal(item.status, "In progress");
  assert.equal(item.prd_status, "Approved");
  assert.equal(item.project_status, "In progress");
  assert.equal(item.progress, 45);
  assert.equal(item.progress_label, "Halfway");
  assert.equal(item.start_sprint, "26-16");
  assert.equal(item.end_sprint, "26-18");
  assert.equal(item.team, "Core");
  assert.deepEqual(item.region, ["EU", "UK"]);
  assert.equal(item.prd_link, "https://example.com/prd");
});

test("toKpiItem sorts phases and omits null fields", () => {
  const App = load();
  const data = sample();
  const item = plain(App.roadmapDetail.toKpiItem(data.items[0], ctxOf(App, data)));
  assert.equal(item.phases.length, 2);
  assert.equal(item.phases[0].phase, "Discovery"); // sorted before Build
  assert.equal(item.phases[1].phase, "Build");
  assert.equal(item.phases[1].end_tbc, true);
  assert.ok(!("end" in item.phases[1]), "a null phase end is omitted");
});

test("toKpiItem on a bare item carries no empty keys", () => {
  const App = load();
  const data = sample();
  const item = plain(App.roadmapDetail.toKpiItem(data.items[1], ctxOf(App, data)));
  assert.equal(item.title, "Portal tooling");
  assert.ok(!("team" in item), "unset attributes are omitted");
  assert.ok(!("phases" in item), "no phases key when there are none");
  assert.ok(!("start_sprint" in item));
});

test("toKpiRoadmap excludes portal scope and carries sprint context", () => {
  const App = load();
  const data = sample();
  const out = plain(App.roadmapDetail.toKpiRoadmap(data.items, ctxOf(App, data), "2026-07-17"));
  assert.equal(out.count, 1);
  assert.equal(out.items[0].id, "i2");
  assert.equal(out.sprint_context.anchor, "2025-12-22");
  assert.equal(out.sprint_context.current_sprint, "26-15");
});

test("drawerHtml renders the facts, phases and an export button", () => {
  const App = load();
  const data = sample();
  const html = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  assert.match(html, /Unity integration/);
  assert.match(html, /Approved/);
  assert.match(html, /Discovery/);
  assert.match(html, /Build/);
  assert.match(html, /TBC/);
  assert.match(html, /id="rmd-export"[^>]*>Export JSON</);
});

test("drawerHtml escapes hostile content", () => {
  const App = load();
  const data = sample();
  data.items[0].title = '<img src=x onerror=alert(1)>';
  const html = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
});
