// ------------------------------------------------------------------
// tests/unit/glossary.test.js - The Glossary page, modules/glossary/.
//
// Pins the three things the page must not lose: a duplicate row stays
// off the page, every word of a search must match somewhere in the
// term, and an unverified term says so where it is read.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = {
    location: { pathname: "/modules/glossary/index.html", search: "", hash: "" },
    navigator: {},
    setTimeout,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/registry.js"), sandbox, { filename: "registry.js" });
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/glossary/glossary.js"), sandbox, { filename: "glossary.js" });
  return sandbox.App;
}

const rows = [
  { id: "1", term: "Rolling reserve", definition: "A percentage of takings held back.", tags: ["glossary:industry"], verified: true },
  { id: "2", term: "MID", expansion: "Merchant ID", definition: "The identifier an acquirer gives a merchant.", tags: ["glossary:industry"], verified: true },
  { id: "3", term: "PSA", definition: "The Payment Service admin screen.", tags: ["glossary:pxp"], verified: false },
  { id: "4", term: "Agent (selling agent)", definition: "Duplicate of Agent.", tags: ["glossary:product", "glossary:duplicate"], verified: true },
  { id: "5", term: "Hangfire", definition: "The background job runner.", tags: [], verified: true },
];

test("prepare drops duplicates, sorts by name and files untagged rows in the last section", () => {
  const App = load();
  const out = App.glossary.prepare(rows);
  assert.deepEqual(out.map((r) => r.term), ["Hangfire", "MID", "PSA", "Rolling reserve"]);
  assert.equal(out.find((r) => r.term === "Hangfire").section, "build");
  assert.equal(out.find((r) => r.term === "PSA").section, "pxp");
});

test("filter matches every word anywhere in the name, expansion or definition", () => {
  const App = load();
  const out = App.glossary.prepare(rows);
  assert.deepEqual(App.glossary.filter(out, "merchant id", "").map((r) => r.term), ["MID"]);
  assert.deepEqual(App.glossary.filter(out, "held takings", "").map((r) => r.term), ["Rolling reserve"]);
  assert.deepEqual(App.glossary.filter(out, "", "pxp").map((r) => r.term), ["PSA"]);
  assert.equal(App.glossary.filter(out, "nothing like this", "").length, 0);
});

test("a term is addressable by id and an unverified one says so", () => {
  const App = load();
  const out = App.glossary.prepare(rows);
  const psa = App.glossary.termHtml(out.find((r) => r.term === "PSA"));
  assert.match(psa, /id="term-3"/);
  assert.match(psa, /tone-warn">unverified/);
  const mid = App.glossary.termHtml(out.find((r) => r.term === "MID"));
  assert.match(mid, /Merchant ID/);
  assert.doesNotMatch(mid, /unverified/);
});
