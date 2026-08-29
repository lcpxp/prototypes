// ------------------------------------------------------------------
// tests/lib/roadmap.js - Shared loader and dataset for the roadmap
// view benchmarks (roadmap-views.test.js, roadmap-views-custom.test.js).
// loadView runs the pure builders in a Node vm alongside registry.js
// (departments) and ui.js (App.escape); sampleData is the one dataset
// that drives every level. Field semantics: docs/ROADMAP-PLAYBOOK.md.
// ------------------------------------------------------------------
"use strict";
const vm = require("node:vm");
const { read } = require("./repo.js");

function loadView() {
  const sandbox = {
    location: { pathname: "/modules/roadmap/index.html", hash: "" },
    navigator: {}, setTimeout,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/registry.js",
    "assets/js/core/ui.js",
    "assets/js/pages/roadmap/views.js",
    "assets/js/pages/roadmap/views-timeline.js",
    "assets/js/pages/roadmap/views-breakdown.js",
    "assets/js/pages/roadmap/views-exec.js",
    "assets/js/pages/roadmap/views-cascade.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App.roadmapView;
}

// Themes: Core, Unity, Growth. Areas carry a title and map to themes; a2
// is portal scope: excluded from the product Exec/Team views but present
// in the Backlog master list. Items exercise every band, carry
// departments, and i2 owns two sub-steps.
function sampleData() {
  return {
    categories: [
      { id: "c1", key: "core", label: "Core", description: "Base", sort_order: 10 },
      { id: "c2", key: "unity", label: "Unity", description: "Unity work", sort_order: 20 },
      { id: "c3", key: "growth", label: "Growth", description: "Growth bets", sort_order: 30 },
    ],
    areas: [
      { id: "a1", key: "core-area", title: "Core service", scope: "product", category_id: "c1", sort_order: 10 },
      { id: "a2", key: "portal", title: "Portal", scope: "portal", category_id: null, sort_order: 20 },
      { id: "a3", key: "unity-area", title: "Unity area", scope: "product", category_id: "c2", sort_order: 30 },
      { id: "a4", key: "growth-area", title: "Growth area", scope: "product", category_id: "c3", sort_order: 40 },
    ],
    items: [
      { id: "i1", area_id: "a1", category_id: "c1", title: "Core onboarding", summary: "Shipped",
        status: "done", horizon: "now", end_horizon: null, presentation: "sequenced",
        department: "product_technology", priority: 10, sort_order: 10, updated_at: "2026-07-14T09:00:00Z" },
      { id: "i2", area_id: "a3", category_id: "c2", title: "Unity integration", summary: "Focus",
        status: "in_progress", horizon: "now", end_horizon: null, presentation: "current",
        department: "product_technology", priority: 20, sort_order: 20, updated_at: "2026-07-15T09:00:00Z" },
      { id: "i3", area_id: "a1", category_id: "c1", title: "Portal overhaul", summary: "Spans",
        status: "in_progress", horizon: "now", end_horizon: "next", presentation: "ongoing",
        department: "product_technology", priority: 30, sort_order: 30, updated_at: "2026-07-10T09:00:00Z" },
      { id: "i4", area_id: "a1", category_id: null, title: "US market", summary: "Bet",
        status: "idea", horizon: "someday", end_horizon: null, presentation: "sequenced",
        department: "sales_commercial", priority: 40, sort_order: 40, updated_at: "2026-07-01T09:00:00Z" },
      { id: "i5", area_id: "a3", category_id: "c2", title: "Whitelist blacklist", summary: "Gone",
        status: "dropped", horizon: "later", end_horizon: null, resolution: "Not needed",
        department: "product_technology", priority: 50, sort_order: 50, updated_at: "2026-07-02T09:00:00Z" },
      { id: "i6", area_id: "a2", category_id: null, title: "Portal tooling", summary: "Portal",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        priority: 10, sort_order: 10, updated_at: "2026-07-16T09:00:00Z" },
      { id: "i7", area_id: "a4", category_id: "c3", title: "Growth bet", summary: "Later",
        status: "planned", horizon: "later", end_horizon: null, presentation: "sequenced",
        department: "sales_commercial", priority: 60, sort_order: 60, updated_at: "2026-07-03T09:00:00Z" },
      // Children of i2 (Unity integration, a top-level work item): by
      // position both are drawer-only deliverables, whatever their stored
      // level. i2a is explicitly a deliverable; i2b is stored level='item'
      // so that when a test promotes i2 to a workstream, i2b becomes a
      // nested work-item bar while i2a stays a deliverable.
      { id: "i2a", parent_id: "i2", area_id: "a3", category_id: "c2", title: "Merchant Group",
        level: "deliverable", status: "done", horizon: "now", presentation: "sequenced",
        department: "product_technology", priority: 10, sort_order: 10, updated_at: "2026-07-15T09:00:00Z" },
      { id: "i2b", parent_id: "i2", area_id: "a3", category_id: "c2", title: "Settlement",
        level: "item", status: "planned", horizon: "now", presentation: "sequenced",
        department: "product_technology", priority: 20, sort_order: 20, updated_at: "2026-07-15T09:00:00Z" },
    ],
  };
}

module.exports = { loadView, sampleData };
