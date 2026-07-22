// ------------------------------------------------------------------
// tests/unit/gallery-future.test.js - Benchmarks for the prototype
// gallery's future-prototypes table builder (App.futurePrototypesTable
// in assets/js/pages/gallery.js). The builder is data-in / string-out,
// so it loads in a Node vm alongside ui.js (for App.escape). A no-op
// App.onAuthed stub keeps the module's boot call inert.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadBuilder() {
  const sandbox = {
    document: { getElementById() { return null; }, addEventListener() {} },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/gallery.js"), sandbox,
    { filename: "gallery.js" });
  return sandbox.App.futurePrototypesTable;
}

test("empty or missing input yields an empty string, not a table", () => {
  const build = loadBuilder();
  assert.equal(build([]), "");
  assert.equal(build(null), "");
  assert.equal(build(undefined), "");
});

test("rows render as a table with a row per entry", () => {
  const build = loadBuilder();
  const html = build([
    { name: "PCI", note: "" },
    { name: "Self Service", note: "candidate" },
  ]);
  assert.match(html, /<table>/);
  assert.match(html, /<th>Prototype<\/th>/);
  assert.match(html, /PCI/);
  assert.match(html, /Self Service/);
  assert.match(html, /candidate/);
  assert.equal((html.match(/<tr>/g) || []).length, 3); // header + 2 rows
});

test("names and notes are escaped to block DOM injection", () => {
  const build = loadBuilder();
  const html = build([{ name: "<img src=x>", note: "a & b" }]);
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /a &amp; b/);
});
