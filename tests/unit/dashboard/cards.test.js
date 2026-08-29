// ------------------------------------------------------------------
// tests/unit/dashboard/cards.test.js - The dashboard's four card
// sections (docs/plan/50-DASHBOARD.md).
//
// The rule they share: a link is worth more when it carries the state
// of what it links to. The benchmarks that matter are the ones that
// hold the honest half of that - a spec with no source to compare
// against must NOT show a coverage percentage, because a number there
// reads as verified when it is not.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array, String, Math,
    location: { pathname: "/dashboard.html", search: "", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/ui.js",
    "assets/js/core/registry.js",
    "assets/js/core/tools.js",
    "assets/js/pages/dashboard/cards.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App.dashboardCards;
}
const cards = load();

const COVERAGE = {
  specs: {
    "LaunchPad Partner Portal API": {
      comparable: true, routes: 552, accounted_pct: 60.5, phantom: 0,
      absent: 196, undeclared_mirrors: 0, gap_badges: 0, unverified_badges: 2,
    },
    "Unity Acquiring API": {
      comparable: false, documented: 151, gap_badges: 1, unverified_badges: 0,
    },
  },
};

const SPEC = {
  id: "s1", title: "LaunchPad Partner Portal API", version: "2.0",
  status: "live", family: "launchpad", endpoints: 256, tags: 16, topics: 9,
};

// --- API reference -------------------------------------------------

test("a spec with source shows how much of it is accounted for", () => {
  assert.equal(cards.coverageLine(SPEC, COVERAGE),
    "60.5% of 552 routes accounted for");
});

test("the gaps are named, not summed", () => {
  // One number would read as "3 gaps to close" on a spec with 196
  // undocumented routes, because the badge counts are small and the
  // absent count is not. The biggest gap is the one a summary must
  // not hide.
  const line = cards.gapsLine(SPEC, COVERAGE);
  assert.match(line, /196 routes not documented/);
  assert.match(line, /2 rows unverified/);
  assert.doesNotMatch(line, /gap flagged/, "a zero figure is omitted, not stated as zero");
});

test("each gap kind reads as itself, and one of anything is singular", () => {
  const line = cards.gapsLine(SPEC, { specs: { [SPEC.title]: {
    comparable: true, routes: 10, accounted_pct: 50, absent: 1, phantom: 1,
    undeclared_mirrors: 1, gap_badges: 1, unverified_badges: 1 } } });
  assert.equal(line, "1 route not documented &middot; 1 row with no route &middot; " +
    "1 undeclared mirror &middot; 1 gap flagged &middot; 1 row unverified");
});

test("a clean spec has no gaps line at all", () => {
  assert.equal(cards.gapsLine(SPEC, { specs: { [SPEC.title]: {
    comparable: true, routes: 10, accounted_pct: 100, absent: 0, phantom: 0,
    gap_badges: 0, unverified_badges: 0 } } }), "");
  assert.equal(cards.gapsLine({ title: "Unknown" }, COVERAGE), "");
});

test("a spec with no source still reports the gaps recorded against it", () => {
  // It cannot be graded, but its badges are still real work.
  const line = cards.gapsLine({ title: "Unity Acquiring API" }, COVERAGE);
  assert.equal(line, "1 gap flagged");
});

test("a spec with no source abstains rather than showing a figure", () => {
  // The whole point. A percentage next to Unity would read as
  // verified against code nobody has.
  const line = cards.coverageLine(
    { title: "Unity Acquiring API", family: "unity" }, COVERAGE);
  assert.equal(line, "Not verifiable against source");
  assert.doesNotMatch(line, /%/);
});

test("a spec the coverage artefact has never heard of shows no line", () => {
  assert.equal(cards.coverageLine({ title: "Brand new API" }, COVERAGE), "");
  assert.equal(cards.coverageLine(SPEC, null), "");
});

test("one route reads as one route", () => {
  assert.equal(cards.coverageLine(SPEC, { specs: { [SPEC.title]: {
    comparable: true, routes: 1, accounted_pct: 100 } } }),
    "100% of 1 route accounted for");
});

test("a spec card carries its family, size, status and link", () => {
  const html = cards.specCard(SPEC, {
    coverage: COVERAGE, href: (s) => "modules/reference/index.html?spec=" + s.id,
  });
  assert.match(html, /<span class="eyebrow">LaunchPad<\/span>/);
  assert.match(html, /<h3>LaunchPad Partner Portal API<\/h3>/);
  assert.match(html, /256 endpoints &middot; 16 tags &middot; 9 topics/);
  assert.match(html, /href="modules\/reference\/index\.html\?spec=s1"/);
  assert.match(html, /2\.0/);
});

test("the specs section names the table to write to when empty", () => {
  assert.match(cards.specs([]), /rows in the api_specs table/);
});

// --- Reviews -------------------------------------------------------

test("a wave says the single next action in words, not a count", () => {
  assert.equal(cards.waveAction({ needs_action: 12, unconfirmed: 30 }),
    "12 applications need action");
  assert.equal(cards.waveAction({ needs_action: 0, unconfirmed: 7 }),
    "7 classifications still to confirm");
  assert.equal(cards.waveAction({ needs_action: 0, unconfirmed: 0 }),
    "Every application is classified and confirmed");
  assert.equal(cards.waveAction({ needs_action: 1, unconfirmed: 1 }),
    "1 application needs action");
});

test("a portal wave answers its own question, not an application wave's", () => {
  // Borrowing the application ladder would put "0 applications need
  // action" on a card whose whole subject is areas.
  const portal = { kind: "portal", areas: 39, walked: 12,
    findings_open: 5, awaiting_verification: 2 };
  assert.equal(cards.waveAction(portal), "27 areas still to walk");
  assert.equal(cards.waveAction(Object.assign({}, portal, { walked: 39 })),
    "2 answers waiting on your verification");
  assert.equal(cards.waveAction(
    Object.assign({}, portal, { walked: 39, awaiting_verification: 0 })),
    "5 findings open with the developers");
  assert.equal(cards.waveAction(
    { kind: "portal", areas: 39, walked: 39, findings_open: 0, awaiting_verification: 0 }),
    "Nothing outstanding. The wave is ready to triage.");
});

test("a wave is measured in its own units and named by its kind", () => {
  const html = cards.reviews([
    { id: "w1", name: "Wave 5", kind: "portal", areas: 39, walked: 12,
      findings_open: 5, awaiting_verification: 0, opened_at: "2026-08-01T00:00:00Z" },
    { id: "w2", name: "Wave 4", kind: "application", applications: 42,
      needs_action: 3, unconfirmed: 9 },
  ], { href: (w) => "#" + w.id });
  assert.match(html, /<span class="eyebrow">Portal review<\/span>/);
  assert.match(html, /<span class="eyebrow">Application review<\/span>/);
  assert.match(html, /12 of 39 areas walked/);
  assert.match(html, /42 applications/);
  assert.doesNotMatch(html, /0 applications/,
    "a figure that does not apply is absent, not zero");
});

test("no open wave offers to start one, naming the command", () => {
  assert.match(cards.reviews([]), /\/app-review or \/portal-review/);
  assert.match(cards.reviews(null), /No review wave is open/);
});

test("an open wave renders its action, size and open date", () => {
  const html = cards.reviews([{
    id: "w1", name: "Wave 4", state: "active", opened_at: "2026-08-01T09:00:00Z",
    applications: 42, needs_action: 12, unconfirmed: 30,
  }], { href: (w) => "modules/app-review/wave.html?wave=" + w.id });
  assert.match(html, /<h3>Wave 4<\/h3>/);
  assert.match(html, /12 applications need action/);
  assert.match(html, /42 applications &middot; opened 2026-08-01/);
  assert.match(html, /href="modules\/app-review\/wave\.html\?wave=w1"/);
});

// --- Knowledge -----------------------------------------------------

test("knowledge gaps read as work, not as figures", () => {
  const gaps = cards.knowledgeGaps({
    areas_without_capability: 9, capabilities_without_source: 1,
  });
  assert.deepEqual(Array.from(gaps), [
    "9 product areas have no capability recorded",
    "1 capability has no source document",
  ]);
});

test("no gaps says so, rather than leaving the reader to infer it", () => {
  const html = cards.knowledge({
    by_maturity: { live: 8 }, terms: 34, stages: 13, documents: 16,
    areas_without_capability: 0, capabilities_without_source: 0,
  }, { href: "modules/platform/" });
  assert.match(html, /No gaps recorded against the knowledge base/);
  assert.doesNotMatch(html, /ds-gaps"/);
});

test("the knowledge section shows maturity, figures and links its gaps", () => {
  const html = cards.knowledge({
    by_maturity: { live: 8, partial: 4, planned: 2 },
    terms: 34, stages: 13, documents: 16,
    areas_without_capability: 9, capabilities_without_source: 0,
  }, { href: "modules/platform/" });
  assert.match(html, /<span class="badge live">8 live<\/span>/);
  assert.match(html, /34 glossary terms &middot; 13 journey stages &middot; 16 source documents/);
  assert.match(html, /<li><a href="modules\/platform\/">9 product areas have no capability recorded<\/a><\/li>/,
    "a gap is something to fill, so it links to where you fill it");
});

test("a maturity the section has no order for is left out rather than shown twice", () => {
  // MATURITY is the display order; a value outside it must not break
  // the row. The platform page owns rendering every maturity - this is
  // a summary, and the benchmark records that split.
  const html = cards.knowledge({ by_maturity: { live: 2, invented: 5 }, terms: 1 }, {});
  assert.match(html, /2 live/);
  assert.doesNotMatch(html, /invented/);
});

test("an empty knowledge base names where knowledge goes", () => {
  assert.match(cards.knowledge({}, {}), /product_capabilities/);
  assert.equal(cards.knowledge(null, {}), "");
});

// --- Tools ---------------------------------------------------------

const TOOL = {
  key: "splunk-errors", label: "Splunk error sweep", icon: "bug",
  base_url: "https://example.invalid/search", query: "index=x", params: {},
  description: "Every 5xx from the partner API in the last hour.",
};

test("a tool card explains what the tool is for", () => {
  const html = cards.tools([TOOL]);
  assert.match(html, /<h3>Splunk error sweep<\/h3>/);
  assert.match(html, /Every 5xx from the partner API in the last hour\./);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /Opens in a new tab/);
});

test("a tool with no description says so rather than showing a blank card", () => {
  const html = cards.tools([Object.assign({}, TOOL, { description: null })]);
  assert.match(html, /Add one to this portal_links row/);
});

test("a row that cannot make a URL is skipped, not rendered as a dead link", () => {
  const html = cards.tools([Object.assign({}, TOOL, { base_url: "" })]);
  assert.match(html, /No tools linked yet/);
});

test("no tools names the table to write to", () => {
  assert.match(cards.tools([]), /rows? in the portal_links table/);
});

test("every card escapes its content", () => {
  const html = cards.tools([Object.assign({}, TOOL, {
    label: "<script>a</script>", description: "<img src=x>",
  })]);
  assert.doesNotMatch(html, /<script>|<img src=x>/);
  assert.match(html, /&lt;script&gt;/);
});
