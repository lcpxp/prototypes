// ------------------------------------------------------------------
// tests/unit/gallery-future.test.js - Benchmarks for the prototype
// gallery's ideas strip (App.futurePrototypesTable in
// assets/js/pages/gallery.js, which now delegates to App.ideasView).
//
// It used to be a two-column table of every idea. The gallery is where
// somebody lands, and a fourteen-row table there was a list nobody
// read - the burying problem in miniature. It is now the top few by
// priority with a link through to the board, and these benchmarks hold
// the part that matters: which few, and that the count is honest about
// what it is hiding.
//
// The board's own builders are benchmarked in tests/unit/ideas/render.test.js.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadBuilder() {
  const sandbox = {
    JSON, Object, Array, String, Math, parseInt,
    document: { getElementById() { return null; }, addEventListener() {} },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/pages/ideas/render.js"), sandbox,
    { filename: "ideas-render.js" });
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/gallery.js"), sandbox,
    { filename: "gallery.js" });
  return sandbox.App.futurePrototypesTable;
}

function idea(extra) {
  return Object.assign({ id: "i1", name: "PCI", status: "idea", priority: 100 },
    extra || {});
}

test("empty or missing input yields an empty string, not a strip", () => {
  const build = loadBuilder();
  assert.equal(build([]), "");
  assert.equal(build(null), "");
  assert.equal(build(undefined), "");
});

test("the strip shows the top few by priority, each linking to the board", () => {
  const build = loadBuilder();
  const html = build([
    idea({ id: "a", name: "Low", priority: 90 }),
    idea({ id: "b", name: "High", priority: 10, summary: "Worth doing first" }),
  ]);
  assert.ok(html.indexOf("High") < html.indexOf("Low"), "priority orders the strip");
  assert.match(html, /href="ideas\.html#idea-b"/);
  assert.match(html, /Worth doing first/);
  assert.match(html, /P1/, "the band reads the same way it does on the roadmap");
});

test("the strip caps and says how many it is not showing", () => {
  const build = loadBuilder();
  const rows = [];
  for (let i = 0; i < 9; i++) rows.push(idea({ id: "i" + i, name: "Idea " + i, priority: i }));
  const html = build(rows);
  assert.equal((html.match(/<li>/g) || []).length, 5);
  assert.match(html, /9 open ideas in all/,
    "a strip that hides four and says nothing is the problem it replaced");
});

test("a promoted or dropped idea is not a candidate for the strip", () => {
  const build = loadBuilder();
  const html = build([
    idea({ id: "a", name: "Built", status: "promoted", priority: 1 }),
    idea({ id: "b", name: "Closed", status: "dropped", priority: 2 }),
    idea({ id: "c", name: "Live one", priority: 50 }),
  ]);
  assert.match(html, /Live one/);
  assert.doesNotMatch(html, /Built|Closed/,
    "the strip answers what is worth building next, not what happened");
  assert.doesNotMatch(html, /in all/, "nothing is hidden, so nothing is claimed");
});

test("names and summaries are escaped to block DOM injection", () => {
  const build = loadBuilder();
  const html = build([idea({ name: "<img src=x>", summary: "a & b" })]);
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.match(html, /a &amp; b/);
});
