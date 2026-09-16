// ------------------------------------------------------------------
// tests/unit/sprints-drawer.test.js - The sprint page opens the
// ROADMAP's drawer. That is only true if every module the drawer leans
// on is actually on the page, in an order that lets it bind.
//
// The dependency chain is invisible until it breaks at runtime behind a
// login: pages/roadmap/detail.js reads App.roadmapDetailValues at load
// and calls App.detail.facts at render, drawer.js needs App.lazyDetail
// and App.roadmapDetail. Missing one of those is a blank drawer nobody
// sees from a test that only reads the builders directly.
//
// So this loads exactly what modules/sprints/index.html loads, in the
// order the page loads it, and renders a drawer through it.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

const PAGE = "modules/sprints/index.html";

// The page's own script list, read from the page rather than restated
// here - a script added to the page and not to this list would other-
// wise go unchecked, which is exactly the failure being guarded.
function pageScripts() {
  return [...read(PAGE).matchAll(/<script defer src="((?:\.\.\/)+[^"]+)"/g)]
    .map((m) => m[1].replace(/^(\.\.\/)+/, ""))
    .filter((f) => f.startsWith("assets/"));
}

function loadPage() {
  const sandbox = {
    location: { pathname: "/modules/sprints/index.html", hash: "", search: "" },
    navigator: {}, setTimeout, queueMicrotask, Promise, URL,
    document: {
      addEventListener() {}, getElementById() { return null; },
      querySelectorAll() { return []; },
      body: { dataset: { root: "../.." }, classList: { add() {}, remove() {} } },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of pageScripts()) {
    // supabase.js opens a client against a CDN global the vm has not
    // got; the page's own module waits on auth. Neither is what this
    // test is about, and both are exercised in the browser.
    if (/core\/(supabase|guard)\.js$/.test(f)) continue;
    if (/pages\/sprints\/sprints\.js$/.test(f)) continue;
    vm.runInContext(read(f), sandbox, { filename: f });
  }
  return sandbox.App;
}

function item() {
  return {
    id: "w1", title: "Payment Service", level: "workstream", type: "functionality",
    status: "planned", horizon: "now", priority: 10, department: "product_technology",
    summary: "Automate the remaining configuration steps.",
    business_benefit: "Completes the automated path from approval to a configured merchant.",
    benefit_type: "cost_removed", benefit_status: "drafted",
    allocation: { slot: 0, span: 1, overlap: "parallel", external_party: null,
      external_status: null, start_code: null, end_code: null, anchored: false },
  };
}

test("every module the sprint drawer needs is on the sprint page", () => {
  const App = loadPage();
  assert.equal(typeof App.roadmapDetail?.drawerHtml, "function",
    "pages/roadmap/detail.js must be loaded and bound");
  assert.equal(typeof App.roadmapDrawer, "function",
    "pages/roadmap/drawer.js must be loaded");
  assert.equal(typeof App.lazyDetail, "function",
    "shared/lazy-detail.js must be loaded - drawer.js binds it at wire time");
  assert.equal(typeof App.workItemsData?.loadDrawer, "function",
    "shared/work-items-data.js must be loaded - it fetches the heavy fields");
  assert.equal(typeof App.detail?.facts, "function",
    "core/detail.js must be loaded - the drawer's fact grid is built from it");
  assert.equal(typeof App.roadmapView?.context, "function",
    "pages/roadmap/views.js must be loaded - the drawer renders against its context");
});

test("the drawer renders on the sprint page's module set", () => {
  const App = loadPage();
  const ctx = App.roadmapView.context({ items: [item()], categories: [], areas: [] });
  const html = App.roadmapDetail.drawerHtml(item(), ctx, {});
  assert.match(html, /Payment Service/, "the drawer must render the item's title");
  assert.match(html, /Completes the automated path/,
    "the drawer must render the benefit, which comes through detail-values");
});

test("a page that cannot export is not offered an export button", () => {
  // The sprint page carries none of the export machinery. A button that
  // does nothing when pressed is worse than no button.
  const App = loadPage();
  const base = App.roadmapView.context({ items: [item()], categories: [], areas: [] });
  const withExport = App.roadmapDetail.drawerHtml(item(), base, {});
  assert.match(withExport, /id="rmd-export"/,
    "the roadmap still gets its export button");
  const noExport = App.roadmapDetail.drawerHtml(
    item(), Object.assign({}, base, { canExport: false }), {});
  assert.doesNotMatch(noExport, /id="rmd-export"/,
    "canExport:false must drop the button entirely, not disable it");
  assert.match(noExport, /rmd-actions/,
    "the actions row survives - other actions may sit in it");
});
