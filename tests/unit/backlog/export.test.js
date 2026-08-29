// ------------------------------------------------------------------
// tests/unit/backlog/export.test.js - The backlog CSV export
// (App.backlogExport), split out of backlog.js with the builder.
//
// The benchmark that matters is the details one. That column is no
// longer on the row the list loaded, so the export has to fetch it; if
// it ever stops, the file still downloads, still has the column heading
// and is empty underneath it for every row. Nobody notices until they
// open it. docs/plan/80-LOAD-SPEED.md.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array, String, Date,
    location: { pathname: "/modules/backlog/index.html", search: "", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/ui.js",
    "assets/js/core/registry.js",
    "assets/js/pages/backlog/export.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App;
}
const App = load();

const NAMES = {
  titleById: { i0: "Onboarding rework" },
  areaTitle: { a1: "Onboarding" },
  docTitle: { d1: "Q3 PRD" },
  bandLabel: (item) => (item.status === "done" ? "Delivered" : "Now"),
};

function item(extra) {
  return Object.assign({
    id: "i1", parent_id: "i0", title: "Split the flow", area_id: "a1",
    status: "in_progress", horizon: "now", priority: 20, type: "feature",
    department: "product_technology", source_document_id: "d1",
    summary: "Short line", details: "Paragraphs of prose",
    tags: ["intake"], created_at: "2026-07-01T00:00:00Z",
  }, extra || {});
}

// The CSV is \r\n separated; split into a header and a row map.
function parse(csv) {
  const lines = csv.trim().split("\r\n");
  const head = lines[0].split(",");
  return {
    head,
    rows: lines.slice(1).map((line) => {
      // Enough of a reader for these fixtures: quoted cells may contain
      // commas, and a doubled quote is a literal one.
      const cells = [];
      let cur = "";
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const c = line[i];
        if (quoted && c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
        else if (c === '"') quoted = !quoted;
        else if (c === "," && !quoted) { cells.push(cur); cur = ""; }
        else cur += c;
      }
      cells.push(cur);
      const rec = {};
      head.forEach((k, i) => { rec[k] = cells[i]; });
      return rec;
    }),
  };
}

test("every exported row carries its details", () => {
  // The data-loss benchmark. Two rows with prose, one with none: the
  // first two must be populated and the third must be empty rather than
  // the word "null" or "undefined".
  const out = parse(App.backlogExport.toCsv([
    item({ id: "i1", details: "First write-up" }),
    item({ id: "i2", details: "Second write-up, with a comma" }),
    item({ id: "i3", details: null }),
  ], NAMES));
  assert.ok(out.head.includes("details"));
  assert.deepEqual(out.rows.map((r) => r.details),
    ["First write-up", "Second write-up, with a comma", ""]);
});

test("a record resolves the labels the table shows, not the raw keys", () => {
  const rec = App.backlogExport.toCsvRecord(item(), NAMES);
  assert.equal(rec.band, "Now");
  assert.equal(rec.area, "Onboarding");
  assert.equal(rec.source, "Q3 PRD");
  assert.equal(rec.parent_title, "Onboarding rework");
  assert.equal(rec.department, App.departmentLabel("product_technology"));
});

test("the leading column order is stable and a new field still exports", () => {
  // App.csvFromRows appends any key the record carries beyond the named
  // list, so a column added to work_items reaches the file without an
  // edit here. The named ones must stay in their order regardless.
  const out = parse(App.backlogExport.toCsv([item()], NAMES));
  assert.deepEqual(out.head.slice(0, 5),
    ["id", "parent_id", "parent_title", "title", "band"]);
  assert.equal(out.head.indexOf("details") > -1, true);
});

test("an empty selection still writes a header row", () => {
  const out = parse(App.backlogExport.toCsv([], NAMES));
  assert.deepEqual(out.head, JSON.parse(JSON.stringify(App.backlogExport.COLUMNS)));
  assert.equal(out.rows.length, 0);
});

test("wire cancels the download when the details read fails", async () => {
  // A failed fetch must not write a file. Silence would read as "nothing
  // happened"; the label says which it was.
  let downloaded = 0;
  const labels = [];
  const button = {
    handler: null,
    textContent: "Export as CSV",
    addEventListener(_, fn) { this.handler = fn; },
  };
  App.download = () => { downloaded += 1; };
  App.flashLabel = (btn, text) => { labels.push(text); };
  App.workItemsData = { loadForExport: () => Promise.reject(new Error("denied")) };
  App.backlogExport.wire(button, () => ({ rows: [item()], names: NAMES }));
  button.handler();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(downloaded, 0, "no file may be written from an incomplete set");
  assert.deepEqual(labels, ["Export failed"]);
});

test("wire fetches details before it builds", async () => {
  const asked = [];
  let csv = "";
  const button = { handler: null, addEventListener(_, fn) { this.handler = fn; } };
  App.download = (_name, text) => { csv = text; };
  App.workItemsData = {
    loadForExport(rows, keys) {
      asked.push(keys);
      rows.forEach((r) => { r.details = "fetched " + r.id; });
      return Promise.resolve(rows);
    },
  };
  App.backlogExport.wire(button, () => ({ rows: [item({ details: undefined })], names: NAMES }));
  button.handler();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(JSON.parse(JSON.stringify(asked)), [["details"]]);
  assert.equal(parse(csv).rows[0].details, "fetched i1");
});
