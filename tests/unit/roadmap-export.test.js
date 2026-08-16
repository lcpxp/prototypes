// ------------------------------------------------------------------
// tests/unit/roadmap-export.test.js - The roadmap's export dropdown
// wiring (App.roadmapExport.wire).
//
// The builders are held elsewhere (roadmap-detail-export.test.js). What
// is held here is the step between the click and the builder: the board
// carries neither notes nor, once the board view lands, details, and
// both board-wide exports write them for every row. So the wiring has
// to fetch what it is about to write, and must not write a file when
// that fetch fails. docs/plan/80-LOAD-SPEED.md.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

// Just enough DOM: named buttons that record their listeners.
function harness(loadForExport) {
  const buttons = {};
  const ids = ["roadmap-export-trigger", "roadmap-export-menu",
    "roadmap-export-json", "roadmap-export-csv", "roadmap-download"];
  for (const id of ids) {
    buttons[id] = {
      id, hidden: true, textContent: id, handlers: {},
      addEventListener(type, fn) { this.handlers[type] = fn; },
      setAttribute() {}, focus() {},
    };
  }
  const sandbox = {
    window: null, setTimeout, Promise, Object, Array, JSON, String, Blob: function () {},
    document: {
      addEventListener() {},
      getElementById(id) { return buttons[id] || null; },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/pages/roadmap-export.js"), sandbox,
    { filename: "roadmap-export.js" });
  const App = sandbox.App;
  const written = [];
  const labels = [];
  App.download = (name, text) => written.push({ name, text });
  App.flashLabel = (button, text) => labels.push({ id: button && button.id, text });
  App.roadmapDetail = {
    // The builders read what the wiring left on the rows, so returning
    // them is enough to prove the order of the two steps.
    toKpiRoadmap: (rows) => ({ items: rows.map((r) => ({ id: r.id, details: r.details, notes: r.notes })) }),
    toCsvRoadmap: (rows) => rows.map((r) => r.id + "," + (r.details || "")).join("\r\n"),
  };
  const asked = [];
  App.workItemsData = {
    loadForExport(rows, keys) {
      asked.push({ keys: keys.slice(), ids: rows.map((r) => r.id) });
      return loadForExport(rows, keys);
    },
  };
  return { App, buttons, written, labels, asked };
}

function hydrate(rows) {
  rows.forEach((r) => {
    r.details = "prose " + r.id;
    r.notes = [{ body: "note " + r.id }];
  });
  return Promise.resolve(rows);
}

function wired(h) {
  h.App.roadmapExport.wire(() => ({
    rows: [{ id: "a" }, { id: "b" }],
    ctx: {},
  }));
  return h;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test("the JSON export fetches details and notes before it builds", async () => {
  const h = wired(harness(hydrate));
  h.buttons["roadmap-export-json"].handlers.click();
  await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(h.asked)),
    [{ keys: ["details", "notes"], ids: ["a", "b"] }]);
  assert.equal(h.written.length, 1);
  const out = JSON.parse(h.written[0].text);
  assert.deepEqual(out.items.map((i) => i.details), ["prose a", "prose b"]);
  assert.deepEqual(out.items.map((i) => i.notes[0].body), ["note a", "note b"]);
});

test("the CSV export fetches details and does not pay for notes", () => {
  // There is no notes column in the CSV, so asking for one would be
  // 63KB of request for a field the file cannot carry.
  const h = wired(harness(hydrate));
  h.buttons["roadmap-export-csv"].handlers.click();
  assert.deepEqual(JSON.parse(JSON.stringify(h.asked[0].keys)), ["details"]);
});

test("the CSV export writes the fetched details, not what the board had", async () => {
  const h = wired(harness(hydrate));
  h.buttons["roadmap-export-csv"].handlers.click();
  await tick();
  assert.equal(h.written[0].text, "a,prose a\r\nb,prose b");
});

test("a failed fetch cancels the download and says so", async () => {
  // The failure this whole path exists to prevent: a file that
  // downloads, has the column heading, and is blank underneath it.
  for (const id of ["roadmap-export-json", "roadmap-export-csv"]) {
    const h = wired(harness(() => Promise.reject(new Error("denied"))));
    h.buttons[id].handlers.click();
    await tick();
    assert.equal(h.written.length, 0, `${id} must write no file`);
    assert.deepEqual(JSON.parse(JSON.stringify(h.labels)),
      [{ id: "roadmap-export-trigger", text: "Export failed" }]);
  }
});
