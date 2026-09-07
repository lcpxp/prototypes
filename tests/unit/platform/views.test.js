// ------------------------------------------------------------------
// tests/unit/platform/views.test.js - The three top-level views
// (App.platformViews in assets/js/pages/platform/views.js).
//
// This file exists because of a specific failure and guards against
// its repeat. product_capabilities.kind used to answer two questions
// at once - what shape of statement a row is, and what it is ABOUT -
// so 27 rows describing how the Partner Portal is built rendered at
// the bottom of a page about what the product does for merchants.
// `domain` answers the second question on its own and picks the view.
//
// The gate that matters most is the last one: every value the schema
// allows for `domain` must have a view, exactly as every `kind` must
// have a zone. tests/checks/render-coverage.test.js delegates that
// vocabulary here, so a domain added to the constraint fails the build
// rather than rendering nowhere - which is what happened for a week in
// August when three kinds were added and nothing placed them.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    location: { pathname: "/modules/platform/index.html" },
    navigator: {},
    setTimeout,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/blocks.js"), sandbox, { filename: "blocks.js" });
  vm.runInContext(read("assets/js/core/registry.js"), sandbox, { filename: "registry.js" });
  vm.runInContext(read("assets/js/core/links.js"), sandbox, { filename: "links.js" });
  vm.runInContext(read("assets/js/core/detail.js"), sandbox, { filename: "detail.js" });
  vm.runInContext(read("assets/js/pages/platform/knowledge.js"), sandbox,
    { filename: "platform-knowledge.js" });
  vm.runInContext(read("assets/js/pages/platform/cards.js"), sandbox,
    { filename: "platform-cards.js" });
  vm.runInContext(read("assets/js/pages/platform/views.js"), sandbox,
    { filename: "platform-views.js" });
  return sandbox.App;
}

function sample() {
  return {
    areas: [
      { id: "a1", title: "Onboarding", description: "Lead to live",
        scope: "product", sort_order: 10 },
      { id: "b1", title: "Styling", scope: "build", sort_order: 20 },
    ],
    capabilities: [
      { id: "c0", area_id: null, domain: "product", kind: "overview",
        title: "What LP is", summary: "The hub", maturity: "live",
        attestation: "owner", as_of: "2026-09-01", blocks: [], sort_order: 1 },
      { id: "c1", area_id: "a1", domain: "product", kind: "capability",
        title: "Application intake", summary: "Captures a lead",
        maturity: "live", attestation: "owner", as_of: "2026-09-01",
        blocks: [], sort_order: 10 },
      { id: "c2", area_id: "b1", domain: "build", kind: "styling",
        title: "The five layers", summary: "Cascade order",
        maturity: "live", attestation: "owner", as_of: "2026-09-01",
        blocks: [], sort_order: 10 },
      { id: "c3", area_id: "b1", domain: "build", kind: "technical",
        title: "Angular 20", summary: "No state library", maturity: "live",
        attestation: "derived", as_of: "2026-09-01", blocks: [], sort_order: 20 },
    ],
    stages: [
      { id: "s1", stage_no: 1, key: "ivr", title: "IVR screening",
        actor: "Agent", description: "Pre-screen" },
    ],
    terms: [{ id: "t1", term: "ATV", definition: "Average value", verified: true }],
    facts: [{ id: "f1", body: "Screening runs first", area_id: "a1", status: "active" }],
    documents: [{ id: "d1", title: "Overview", summary: "s", kind: "platform" }],
    deliveredByArea: {},
  };
}

test("each view shows its own domain and nothing from the other", () => {
  const App = load();
  const data = sample();

  const product = App.platformViews.viewHtml("product", data, {});
  assert.match(product, /Application intake/);
  assert.doesNotMatch(product, /The five layers/,
    "build material on the product view is the exact mixing this split undid");
  assert.doesNotMatch(product, /Angular 20/);

  const build = App.platformViews.viewHtml("build", data, {});
  assert.match(build, /The five layers/);
  assert.match(build, /Angular 20/);
  assert.doesNotMatch(build, /Application intake/);
});

test("a row written before domain existed still appears, on the product view", () => {
  const App = load();
  const data = sample();
  delete data.capabilities[1].domain;
  assert.match(App.platformViews.viewHtml("product", data, {}), /Application intake/,
    "defaulting is what stops an un-migrated row vanishing from every view");
});

test("the lead is a band, not a stack of full cards", () => {
  const App = load();
  const html = App.platformViews.viewHtml("product", sample(), {});
  assert.match(html, /pk-lead-item/);
  assert.match(html, /What LP is/);
  assert.doesNotMatch(html, /<details class="cap-card" id="capability-c0"/,
    "the overview is the first thing read, so it is never behind a click");
});

test("the lifecycle spine belongs to the product story only", () => {
  const App = load();
  const data = sample();
  assert.match(App.platformViews.viewHtml("product", data, {}), /IVR screening/);
  assert.doesNotMatch(App.platformViews.viewHtml("build", data, {}), /IVR screening/,
    "a journey stage is something a merchant moves through, not a build concern");
});

test("the reference view carries the stores no single subject owns", () => {
  const App = load();
  const html = App.platformViews.viewHtml("reference", sample(), {});
  assert.match(html, /Glossary/);
  assert.match(html, /Recorded facts/);
  assert.match(html, /Where this came from/);
  assert.match(html, /Coverage/);
});

test("area headings carry an id a knowledge link can address", () => {
  const App = load();
  const html = App.platformViews.viewHtml("product", sample(), {});
  assert.match(html, /id="area-a1"/);
});

test("the sidebar indexes the areas of the view it is showing, with counts", () => {
  const App = load();
  const data = sample();
  const product = App.platformViews.sidebarHtml(
    App.platformViews.viewByKey("product"), data);
  assert.match(product, /Onboarding/);
  assert.doesNotMatch(product, /Styling/);

  const build = App.platformViews.sidebarHtml(
    App.platformViews.viewByKey("build"), data);
  assert.match(build, /Styling/);
  assert.match(build, /badge">2</, "two build rows sit under that area");
});

test("the toolbar offers only the values actually present", () => {
  const App = load();
  const rows = App.platformViews.inDomain(sample().capabilities,
    App.platformViews.viewByKey("build"));
  const html = App.platformViews.toolbarHtml(rows);
  assert.match(html, /<option value="live">/);
  assert.doesNotMatch(html, /<option value="planned">/,
    "a filter offering a value that matches nothing is a dead end");
  assert.match(html, /<option value="derived">/);
});

test("the coverage strip is one line, and links to the detail", () => {
  const App = load();
  const html = App.platformViews.coverageStripHtml(sample());
  assert.match(html, /pk-strip/);
  assert.match(html, /capabilities/);
  assert.match(html, /href="#coverage"|pk-strip-ok/,
    "a gap must be reachable from every view without being the page");
});

test("an empty view names the table to write to rather than showing blank", () => {
  const App = load();
  const data = sample();
  data.capabilities = data.capabilities.filter((c) => c.domain !== "build");
  const html = App.platformViews.viewHtml("build", data, {});
  assert.match(html, /product_capabilities/);
  assert.match(html, /domain 'build'/);
});

test("an unplaced kind still renders rather than vanishing", () => {
  const App = load();
  const data = sample();
  data.capabilities.push({ id: "c9", area_id: "a1", domain: "product",
    kind: "invented", title: "Unplaced row", maturity: "live",
    attestation: "owner", blocks: [], sort_order: 99 });
  assert.match(App.platformViews.viewHtml("product", data, {}), /Unplaced row/,
    "the backstop written after three kinds rendered nowhere for a week");
});

test("every stored domain has a view, and every kind a zone", () => {
  // The constraint in supabase/schema/40_platform.sql is the authority
  // for both. render-coverage.test.js delegates product_capabilities.domain
  // here; a value with no view is a row on no page at all.
  const App = load();
  const schema = read("supabase/schema/40_platform.sql");

  const domains = [...(((schema.match(/check \(domain in \(([^)]+)\)\)/) || [])[1] || "")
    .matchAll(/'(\w+)'/g))].map((m) => m[1]);
  assert.ok(domains.length >= 2, "the domain constraint must be readable");
  for (const domain of domains) {
    assert.ok(App.platformViews.VIEWS.some((v) => v.domain === domain),
      `product_capabilities allows domain '${domain}' but views.js gives it ` +
      "no view, so every row carrying it renders nowhere. Add it to VIEWS.");
  }

  const kinds = [...(((schema.match(/check \(kind in \(([^)]+)\)\)/) || [])[1] || "")
    .matchAll(/'(\w+)'/g))].map((m) => m[1]);
  assert.equal(kinds.length, 7, "seven kinds as of 2026-09-07");
  for (const kind of kinds) {
    assert.ok(App.platformViews.KINDS.some((k) => k.key === kind),
      `product_capabilities allows kind '${kind}' but views.js places it ` +
      "nowhere. Add it to KINDS, or it renders only under the backstop.");
  }
});
