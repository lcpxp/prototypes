// ------------------------------------------------------------------
// tests/unit/platform-render.test.js - Benchmarks for the platform
// viewer's pure builders (App.platformView in assets/js/pages/
// platform.js). The builders are data-in / string-out, so they load
// in a Node vm alongside ui.js (which supplies App.escape and
// App.statusBadge). A no-op App.onAuthed stub keeps the module's
// boot call inert.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadView() {
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
  vm.runInContext(read("assets/js/core/detail.js"), sandbox, { filename: "detail.js" });
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/platform.js"), sandbox,
    { filename: "platform.js" });
  return sandbox.App.platformView;
}

function sampleData() {
  return {
    areas: [
      { id: "a1", title: "Dynamic flows", description: "Risk-based routing.", sort_order: 10 },
      { id: "a2", title: "Contracting", sort_order: 20 },
    ],
    capabilities: [
      { id: "c1", area_id: null, kind: "overview", title: "What it is",
        summary: "Overview summary", maturity: "live", verified: false,
        blocks: [], sort_order: 10 },
      { id: "c2", area_id: null, kind: "value", title: "Value proposition",
        summary: "Value summary", maturity: "live", verified: true,
        blocks: [], sort_order: 20 },
      { id: "c3", area_id: "a1", kind: "capability", title: "Risk routing",
        summary: "Routes by risk.", maturity: "partial", verified: false,
        blocks: [{ kind: "p", text: "Detail." }], sort_order: 10 },
      { id: "c4", area_id: "a1", kind: "capability", title: "Pre-screening",
        summary: "IVR pre-screen.", maturity: "planned", verified: false,
        blocks: [], sort_order: 20 },
      { id: "c5", area_id: null, kind: "glance", title: "Fast approvals",
        summary: "Headline.", maturity: "live", verified: true,
        blocks: [], sort_order: 30 },
    ],
  };
}

test("blockHtml renders each kind and escapes content", () => {
  const V = loadView();
  assert.ok(V.blockHtml({ kind: "p", text: "<i>hi</i>" }).includes("&lt;i&gt;"));
  assert.ok(V.blockHtml({ kind: "note", tone: "warn", text: "careful" })
    .includes("notice tone-warn"));
  assert.ok(V.blockHtml({ kind: "code", json: { a: 1 } }).includes("&quot;a&quot;: 1"));
  const table = V.blockHtml({ kind: "table", columns: ["Col<"], rows: [["cell>"]] });
  assert.ok(table.includes("Col&lt;"));
  assert.ok(table.includes("cell&gt;"));
  assert.ok(V.blockHtml({ kind: "kv", items: [{ label: "K", value: "V" }] })
    .includes("<th>K</th><td>V</td>"));
  const values = V.blockHtml({
    kind: "values", name: "State", field: "state",
    values: ["Active", "Inactive"], source: "form dropdown",
  });
  assert.ok(values.includes("value-set"));
  assert.ok(values.includes("<code>Active</code>"));
  assert.ok(values.includes("Source: form dropdown"));
});

test("capabilityCard renders the maturity chip, marks unverified rows, escapes content", () => {
  const V = loadView();
  const unverified = V.capabilityCard({
    title: "<b>Risk routing</b>", summary: "Routes traffic.",
    maturity: "partial", verified: false, blocks: [],
  });
  assert.ok(unverified.includes('class="badge partial"'));
  assert.ok(unverified.includes('class="badge tone-warn"'));
  assert.ok(unverified.includes("unverified"));
  assert.ok(!unverified.includes("<b>"));

  const verified = V.capabilityCard({
    title: "Live thing", maturity: "live", verified: true, blocks: [],
  });
  assert.ok(verified.includes('class="badge live"'));
  assert.ok(!verified.includes("unverified"));
  // No id attribute when the row carries no id.
  assert.ok(!verified.includes("id=\"capability-"));

  // A row with an id gets a stable deep-link anchor.
  const anchored = V.capabilityCard({
    id: "c9", title: "Anchored", maturity: "live", verified: true, blocks: [],
  });
  assert.ok(anchored.includes('id="capability-c9"'));
});

test("a capability card shows everything stored against the row", () => {
  // The completeness contract on the platform card
  // (docs/plan/40-SURFACING.md). `tags` was stored and shown nowhere;
  // more to the point, a column added to product_capabilities tomorrow
  // lands here rather than nowhere.
  const V = loadView();
  const html = V.capabilityCard({
    id: "c1", title: "Risk routing", maturity: "live", verified: true, blocks: [],
    tags: ["screening", "risk"], created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-08-01T09:00:00Z", owner_team: "Risk",
  });
  assert.match(html, /<dt>Tags<\/dt><dd>screening, risk<\/dd>/);
  assert.match(html, /<dt>Recorded<\/dt><dd>2026-06-01<\/dd>/);
  assert.match(html, /<dt>Updated<\/dt><dd>2026-08-01<\/dd>/);
  assert.match(html, /Also recorded against this capability/);
  assert.match(html, /<dt>Owner team<\/dt><dd>Risk<\/dd>/,
    "a column no part of this page was written for still appears");
});

test("a capability card adds no fact list when there is nothing to add", () => {
  const V = loadView();
  const html = V.capabilityCard({
    id: "c1", title: "Risk routing", maturity: "live", verified: true,
    blocks: [], key: "risk-routing", sort_order: 10, area_id: "a1", summary: "S",
  });
  assert.doesNotMatch(html, /detail-facts/,
    "the columns the card lays out by hand must not repeat as fact rows");
  assert.doesNotMatch(html, /risk-routing|<dd>10<\/dd>|a1/,
    "no key, sort order or raw id reaches the card");
});

test("groupByArea groups capability rows by area and sorts by sort_order", () => {
  const V = loadView();
  const data = sampleData();
  const grouped = V.groupByArea(data.capabilities);
  assert.equal(grouped.a1.length, 2);
  assert.equal(grouped.a1[0].title, "Risk routing");
  assert.equal(grouped.a1[1].title, "Pre-screening");
  // Overview, value and glance rows are not capability rows.
  assert.equal(Object.keys(grouped).indexOf("_none"), -1);
});

test("pageHtml renders the overview lead, area sections and a glance section", () => {
  const V = loadView();
  const html = V.pageHtml(sampleData());
  assert.match(html, /What it is/);
  assert.match(html, /Value proposition/);
  assert.match(html, /Dynamic flows/);
  assert.match(html, /Risk-based routing\./);
  assert.match(html, /Risk routing/);
  assert.match(html, /Pre-screening/);
  assert.match(html, /At a glance/);
  assert.match(html, /Fast approvals/);
  // An area with no capability rows is skipped entirely.
  assert.doesNotMatch(html, /Contracting/);
});

test("pageHtml shows a table-naming empty state when there is no content yet", () => {
  const V = loadView();
  const html = V.pageHtml({ areas: [], capabilities: [] });
  assert.match(html, /product_capabilities/);
});
