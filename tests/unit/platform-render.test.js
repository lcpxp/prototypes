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

test("blockHtml renders each kind, escapes content, skips unknown kinds", () => {
  const V = loadView();
  assert.equal(V.blockHtml({ kind: "mystery", text: "x" }), "");
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
