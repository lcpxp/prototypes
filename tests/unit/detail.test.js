// ------------------------------------------------------------------
// tests/unit/detail.test.js - The completeness contract.
//
// A hand-written detail view lists the fields that existed the day it
// was written. A column added later is stored, fetched and invisible,
// with no error to notice - which is the whole failure this programme
// is clearing out of the portal.
//
// So the default here is that a value APPEARS, and the exception has
// to be written down. The benchmark that matters most is the one that
// gives the builder a key no spec has ever heard of and requires it in
// the output.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/detail.js"), sandbox, { filename: "detail.js" });
  return sandbox.App;
}
const App = load();

test("a key no spec knows about still renders", () => {
  // The contract, in one assertion. This is the ask: "no matter what
  // new information is added it will always be showing".
  const html = App.detail.facts(
    { name: "Adobe Sign", invented_later: "a value nobody planned for" },
    { fields: [{ key: "name", label: "Name" }] });
  assert.match(html, /Invented later/, "the key becomes a readable label");
  assert.match(html, /a value nobody planned for/);
  assert.match(html, /Also recorded against this/,
    "and it is grouped so the reader knows it was not curated");
});

test("known fields come first, in the order the caller named them", () => {
  const html = App.detail.facts(
    { c: "third", a: "first", b: "second" },
    { fields: [{ key: "a" }, { key: "b" }, { key: "c" }] });
  assert.ok(html.indexOf("first") < html.indexOf("second"));
  assert.ok(html.indexOf("second") < html.indexOf("third"));
  assert.doesNotMatch(html, /Also recorded/,
    "nothing overflows when the spec covers the row");
});

test("hidden keys are the only way to omit something", () => {
  const html = App.detail.facts(
    { id: "uuid-1", sort_order: 10, name: "Kept" },
    { fields: [{ key: "name" }], hidden: ["id", "sort_order"] });
  assert.doesNotMatch(html, /uuid-1/);
  assert.doesNotMatch(html, /sort order/i);
  assert.match(html, /Kept/);
});

test("empty values are omitted rather than rendered blank", () => {
  const html = App.detail.facts(
    { a: "", b: null, c: undefined, d: [], e: {}, f: "shown" },
    { fields: [{ key: "a" }, { key: "b" }] });
  assert.match(html, /shown/);
  for (const label of ["A", "B", "C", "D", "E"]) {
    assert.doesNotMatch(html, new RegExp("<dt>" + label + "</dt>"));
  }
});

test("false and zero are values, not absences", () => {
  const html = App.detail.facts({ verified: false, count: 0 }, {});
  assert.match(html, /<dt>Verified<\/dt><dd>No<\/dd>/,
    "a boolean reads as Yes or No, and false is a fact");
  assert.match(html, /<dt>Count<\/dt><dd>0<\/dd>/);
});

test("a flattened bag reads as rows, not as one nested lump", () => {
  const html = App.detail.facts(
    { name: "X", detail: { "Auth model": "OAuth 2", "Rate limit": "60/min" } },
    { fields: [{ key: "name" }], flatten: ["detail"] });
  assert.match(html, /<dt>Auth model<\/dt><dd>OAuth 2<\/dd>/);
  assert.match(html, /<dt>Rate limit<\/dt><dd>60\/min<\/dd>/);
  assert.doesNotMatch(html, /Also recorded/, "a flattened key is accounted for");
});

test("a nested object that was not flattened still shows its contents", () => {
  const html = App.detail.facts({ config: { region: "eu", retries: 3 } }, {});
  assert.match(html, /region/i);
  assert.match(html, /eu/);
  assert.match(html, /3/);
  assert.doesNotMatch(html, /\[object Object\]/,
    "stringifying an object is how a value becomes unreadable");
});

test("an array joins rather than showing its commas as markup", () => {
  const html = App.detail.facts({ tags: ["alpha", "beta"] }, {});
  assert.match(html, /alpha, beta/);
});

test("a custom builder wins, and may suppress its own row", () => {
  const html = App.detail.facts(
    { status: "live", other: "x" },
    { fields: [
      { key: "status", label: "Status", html: (v) => "<b>" + v + "</b>" },
      { key: "other", html: () => "" },
    ] });
  assert.match(html, /<dt>Status<\/dt><dd><b>live<\/b><\/dd>/);
  assert.doesNotMatch(html, /<dt>Other<\/dt>/,
    "a builder returning nothing means the caller decided not to show it");
  assert.doesNotMatch(html, /Also recorded/, "a named field never overflows");
});

test("every value is escaped, including overflow and nested ones", () => {
  const html = App.detail.facts({
    named: "<script>a</script>",
    surprise: "<img src=x>",
    bag: { "<b>k</b>": "<i>v</i>" },
  }, { fields: [{ key: "named" }] });
  assert.doesNotMatch(html, /<script>|<img|<i>v<\/i>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
});

test("a label is derived from the key when none is given", () => {
  assert.equal(App.detail.labelOf("created_at"), "Created at");
  assert.equal(App.detail.labelOf("docs_url"), "Docs url");
  assert.equal(App.detail.labelOf(""), "");
});

test("an empty row renders nothing at all, not an empty shell", () => {
  assert.equal(App.detail.facts({}, {}), "");
  assert.equal(App.detail.facts(null, null), "");
  assert.equal(App.detail.facts({ a: "" }, {}), "");
});

test("`also` accounts for the columns one row already speaks for", () => {
  // "Dates" renders starts_on AND ends_on. Without `also`, ends_on is a
  // key nothing named, so it would turn up a second time under the
  // overflow heading - the contract working against the reader.
  const html = App.detail.facts(
    { starts_on: "2026-01-01", ends_on: "2026-03-01", spare: "kept" },
    { fields: [{ key: "starts_on", label: "Dates", also: ["ends_on"],
      html: (v, r) => v + " to " + r.ends_on }] });
  assert.match(html, /<dt>Dates<\/dt><dd>2026-01-01 to 2026-03-01<\/dd>/);
  assert.doesNotMatch(html, /<dt>Ends on<\/dt>/, "the folded column is accounted for");
  assert.match(html, /<dt>Spare<\/dt>/, "and everything else still overflows");
});

test("a `multi` field returns rows itself, rather than one row", () => {
  // Typed relationships are zero or many rows depending on the graph,
  // so the builder emits them whole. Wrapping that in another row would
  // put a definition list inside a definition term.
  const html = App.detail.facts(
    { id: "x" },
    { fields: [
      { key: "_links", multi: true, html: () => "<dt>Part of</dt><dd>A</dd><dt>Blocks</dt><dd>B</dd>" },
      { key: "_none", multi: true, html: () => "" },
    ], hidden: ["id"] });
  assert.match(html, /<dt>Part of<\/dt><dd>A<\/dd><dt>Blocks<\/dt><dd>B<\/dd>/);
  assert.doesNotMatch(html, /<dt>_links<\/dt>|<dt>Links<\/dt>/,
    "the field key never becomes a label of its own");
  assert.doesNotMatch(html, /<dt>None<\/dt>/, "a multi field that emits nothing adds nothing");
});

test("a caller may bring its own markup and still get the guarantee", () => {
  // The roadmap drawer has its own row layout. Without this it could
  // only have the completeness guarantee by being restyled, which is a
  // reason to decline the guarantee.
  const html = App.detail.facts(
    { name: "X", surprise: "kept" },
    { fields: [{ key: "name" }], overflowLabel: "Also here", markup: {
      row: (label, inner) => '<div class="r"><dt>' + label + "</dt><dd>" + inner + "</dd></div>",
      head: (label) => '<div class="h">' + label + "</div>",
      wrap: (inner) => '<dl class="mine">' + inner + "</dl>",
    } });
  assert.match(html, /^<dl class="mine">/);
  assert.match(html, /<div class="r"><dt>Name<\/dt><dd>X<\/dd><\/div>/);
  assert.match(html, /<div class="h">Also here<\/div>/);
  assert.match(html, /<div class="r"><dt>Surprise<\/dt><dd>kept<\/dd><\/div>/,
    "the overflow uses the caller's row too, not the default one");
  assert.doesNotMatch(html, /detail-facts|detail-overflow-head/);
});

test("a partial markup falls back to the default for what it omits", () => {
  const html = App.detail.facts({ a: "1" },
    { fields: [{ key: "a" }], markup: { wrap: (i) => "<x>" + i + "</x>" } });
  assert.equal(html, "<x><dt>A</dt><dd>1</dd></x>");
});

test("overflow is sorted, so the same row reads the same twice", () => {
  const html = App.detail.facts({ zebra: "z", apple: "a", mango: "m" }, {});
  assert.ok(html.indexOf("Apple") < html.indexOf("Mango"));
  assert.ok(html.indexOf("Mango") < html.indexOf("Zebra"));
});
