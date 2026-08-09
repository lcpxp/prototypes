// ------------------------------------------------------------------
// tests/unit/platform-knowledge.test.js - The stores the capability
// catalogue could not show.
//
// modules/platform/ rendered product_capabilities and nothing else. On
// 2026-08-09 that meant 18 rows visible while 63 sat invisible - 16
// glossary terms, 13 lifecycle stages, 29 facts, 5 source documents -
// and three capability kinds added that week matched no filter at all,
// so they rendered nowhere. These benchmarks pin each store's output
// and, most importantly, pin the backstop that stops a NEW kind
// disappearing the same way.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

// Same sandbox shape as platform-render.test.js: ui.js supplies
// App.escape and App.statusBadge, and a no-op onAuthed keeps the page
// module's boot call inert.
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
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/platform-knowledge.js"), sandbox,
    { filename: "platform-knowledge.js" });
  vm.runInContext(read("assets/js/pages/platform.js"), sandbox,
    { filename: "platform.js" });
  return sandbox.App;
}

function sample() {
  return {
    areas: [
      { id: "a1", title: "Onboarding", description: "Lead to live", sort_order: 10 },
      { id: "a2", title: "Pricing", sort_order: 20 },
      { id: "a3", title: "Reporting", sort_order: 30 },
    ],
    capabilities: [
      { id: "c1", area_id: "a1", kind: "capability", title: "Application intake",
        summary: "Captures a lead", maturity: "live", verified: true,
        blocks: [{ kind: "p", text: "Detail" }], sort_order: 10,
        source_document_id: "d1" },
      { id: "c2", area_id: "a2", kind: "capability", title: "Rate cards",
        maturity: "partial", verified: true, blocks: [], sort_order: 20 },
      { id: "c3", kind: "overview", title: "What LaunchPad is",
        maturity: "live", verified: true, blocks: [], summary: "The hub",
        sort_order: 1, source_document_id: "d1" },
    ],
    stages: [
      { id: "s2", stage_no: 2, key: "related-entities", title: "Related entities",
        actor: "Partner", description: "Shareholders and UBOs" },
      { id: "s1", stage_no: 1, key: "ivr-screening", title: "IVR screening",
        actor: "Agent", description: "Initial pre-screen" },
    ],
    terms: [
      { id: "t1", term: "ATV", expansion: "Average Transaction Value",
        definition: "Average value per transaction", verified: true },
      { id: "t2", term: "Decisioned", definition: "Reached a decision", verified: false },
    ],
    facts: [
      { id: "f1", body: "Screening runs before contracting", area_id: "a1", status: "active" },
      { id: "f2", body: "Rates are per acquirer", area_id: null, status: "active" },
    ],
    documents: [
      { id: "d1", title: "Capability overview", summary: "What it does",
        status: "active", captured_on: "2026-07-15", kind: "platform" },
    ],
  };
}

test("gaps names every hole an owner could fill", () => {
  const App = load();
  const g = App.platformKnowledge.gaps(sample());
  assert.deepEqual(g.areasWithoutCapability.map((a) => a.title), ["Reporting"],
    "an area with no capability is the clearest prompt to write one");
  assert.deepEqual(g.hollowCapabilities.map((c) => c.title), ["Rate cards"],
    "no summary and no blocks means the row exists but says nothing");
  assert.deepEqual(g.unverifiedTerms.map((t) => t.term), ["Decisioned"]);
  assert.deepEqual(g.unsourcedCapabilities.map((c) => c.title), ["Rate cards"]);
});

test("coverageHtml states the counts and lists the gaps", () => {
  const App = load();
  const html = App.platformKnowledge.coverageHtml(sample());
  assert.match(html, /pk-stat-n">3<\/span><span class="pk-stat-l">capabilities/);
  assert.match(html, /pk-stat-n">2<\/span><span class="pk-stat-l">lifecycle stages/);
  assert.match(html, /1 product areas have no capability recorded/);
  assert.match(html, /Reporting/);
  assert.match(html, /1 glossary terms are unverified/);
});

test("coverageHtml says so plainly when there is nothing missing", () => {
  const App = load();
  const clean = sample();
  clean.areas = [clean.areas[0]];
  clean.capabilities = [clean.capabilities[0]];
  clean.terms = [clean.terms[0]];
  const html = App.platformKnowledge.coverageHtml(clean);
  assert.match(html, /No gaps/);
  assert.doesNotMatch(html, /pk-gaps/);
});

test("lifecycleHtml renders stages in stage_no order with their actor", () => {
  const App = load();
  const html = App.platformKnowledge.lifecycleHtml(sample());
  assert.ok(html.indexOf("IVR screening") < html.indexOf("Related entities"),
    "stage 1 must render before stage 2 whatever order the rows arrive in");
  assert.match(html, /pk-stage-actor">Agent/);
  assert.match(html, /id="stage-ivr-screening"/, "deep-linkable");
});

test("glossaryHtml sorts alphabetically and flags unverified terms", () => {
  const App = load();
  const html = App.platformKnowledge.glossaryHtml(sample());
  assert.ok(html.indexOf("ATV") < html.indexOf("Decisioned"));
  assert.match(html, /Average Transaction Value/);
  assert.match(html, /Decisioned[\s\S]{0,60}?tone-warn">unverified/,
    "an unverified term must say so where it is read, not only in coverage");
});

test("factsHtml groups by area and falls back to General", () => {
  const App = load();
  const html = App.platformKnowledge.factsHtml(sample());
  assert.match(html, /<h3>Onboarding<\/h3>[\s\S]*?Screening runs before contracting/);
  assert.match(html, /<h3>General<\/h3>[\s\S]*?Rates are per acquirer/);
});

test("sourcesHtml shows the document, its date and its summary", () => {
  const App = load();
  const html = App.platformKnowledge.sourcesHtml(sample());
  assert.match(html, /Capability overview/);
  assert.match(html, /2026-07-15/);
  assert.match(html, /What it does/);
});

test("empty stores render nothing rather than an empty heading", () => {
  const App = load();
  const K = App.platformKnowledge;
  const bare = { areas: [], capabilities: [] };
  for (const fn of ["lifecycleHtml", "glossaryHtml", "factsHtml", "sourcesHtml"]) {
    assert.equal(K[fn](bare), "", `${fn} must return "" when its store is empty`);
  }
});

test("every store reaches the page, and an unplaced kind still renders", () => {
  const App = load();
  const data = sample();
  // A kind the database allows but this page has no layout for. Before
  // the kind registry, three such kinds rendered nowhere at all.
  data.capabilities.push({ id: "c9", kind: "future_kind", title: "Not laid out yet",
    maturity: "live", verified: true, blocks: [], sort_order: 99 });
  const html = App.platformView.pageHtml(data, { docById: {}, linksByCapability: {} });
  for (const [label, needle] of [
    ["lead", "What LaunchPad is"], ["coverage", "pk-stats"],
    ["lifecycle", "IVR screening"], ["capabilities", "Application intake"],
    ["glossary", "Average Transaction Value"], ["facts", "Screening runs before"],
    ["sources", "Capability overview"], ["unplaced kind", "Not laid out yet"],
  ]) {
    assert.ok(html.includes(needle), `${label} must reach the page (missing: ${needle})`);
  }
});

test("a capability card carries its links and its provenance", () => {
  const App = load();
  const data = sample();
  const ctx = {
    docById: { d1: { id: "d1", title: "Capability overview" } },
    linksByCapability: {
      c1: [{ kind: "affects", reads: "Affected by", otherTitle: "Rate cards", note: "" }],
    },
  };
  const html = App.platformView.capabilityCard(data.capabilities[0], ctx);
  assert.match(html, /cap-link-kind">Affected by<\/span> Rate cards/,
    "a capability must show what the roadmap is doing to it");
  assert.match(html, /cap-source">Source: Capability overview/);
});

test("all seven stored kinds have a place on the page", () => {
  // The constraint in supabase/schema/40_platform.sql is the authority.
  const schema = read("supabase/schema/40_platform.sql");
  const allowed = (schema.match(/check \(kind in \(([^)]+)\)\)/) || [])[1] || "";
  const kinds = [...allowed.matchAll(/'(\w+)'/g)].map((m) => m[1]);
  const page = read("assets/js/pages/platform.js");
  const registry = (page.match(/var KINDS = \[([\s\S]*?)\];/) || [])[1] || "";
  for (const kind of kinds) {
    assert.match(registry, new RegExp(`key: "${kind}"`),
      `product_capabilities allows kind '${kind}' but platform.js places it nowhere. ` +
      "Add it to KINDS, or it renders only under the unplaced-kind backstop.");
  }
});
