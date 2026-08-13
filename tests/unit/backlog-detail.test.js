// ------------------------------------------------------------------
// tests/unit/backlog-detail.test.js - The backlog's two modals, both
// on the completeness contract (docs/plan/40-SURFACING.md).
//
// They were hand-written pair lists: sixteen labels for a work item,
// six for a document. A column added to either table was fetched and
// then silently dropped here, with no error to notice. The benchmark
// that matters is the one that hands a builder a key it has never
// heard of and requires it in the output.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

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
    "assets/js/core/detail.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  // The page module boots on authentication; a no-op keeps it inert.
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/backlog.js"), sandbox,
    { filename: "backlog.js" });
  return sandbox.App.backlogView;
}
const view = load();

const NAMES = {
  areaTitle: { a1: "Onboarding" },
  docTitle: { d1: "Q3 PRD", d0: "Q2 PRD" },
};

function item(extra) {
  return Object.assign({
    id: "i1", title: "Split the onboarding flow", area_id: "a1",
    source_document_id: "d1", type: "feature", department: "product_technology",
    summary: "Break the single step into three", status: "planned",
    horizon: "next", priority: 20, tags: ["q3"], created_at: "2026-07-01T00:00:00Z",
  }, extra || {});
}

function doc(extra) {
  return Object.assign({
    id: "d1", title: "Q3 PRD", kind: "prd", area_id: "a1",
    summary: "The Q3 product requirements", status: "active",
    captured_on: "2026-07-01", tags: ["q3"],
  }, extra || {});
}

test("a column no field list knows about still reaches the item modal", () => {
  const html = view.itemFactsHtml(
    item({ risk_rating: "amber", owner_email: "ops@example.com" }), NAMES);
  assert.match(html, /Also recorded against this item/);
  assert.match(html, /<dt>Risk rating<\/dt><dd>amber<\/dd>/);
  assert.match(html, /<dt>Owner email<\/dt><dd>ops@example\.com<\/dd>/);
});

test("a column no field list knows about still reaches the document modal", () => {
  const html = view.documentFactsHtml(doc({ retention_until: "2027-01-01" }), NAMES);
  assert.match(html, /Also recorded against this document/);
  assert.match(html, /<dt>Retention until<\/dt><dd>2027-01-01<\/dd>/);
});

test("the item modal keeps the labels it always had", () => {
  const html = view.itemFactsHtml(item(), NAMES);
  assert.match(html, /<dt>Band<\/dt>/);
  assert.match(html, /<dt>Horizon<\/dt><dd>next<\/dd>/);
  assert.match(html, /<dt>Type<\/dt><dd>feature<\/dd>/);
  assert.match(html, /<dt>Department<\/dt><dd>Product and Technology<\/dd>/);
  assert.match(html, /<dt>Area<\/dt><dd>Onboarding<\/dd>/, "area_id resolves to its title");
  assert.match(html, /<dt>Source<\/dt><dd>Q3 PRD<\/dd>/, "and the source document to its own");
  assert.match(html, /<dt>Priority<\/dt><dd>20<\/dd>/);
  assert.doesNotMatch(html, /Also recorded/, "a fully-mapped row overflows nothing");
});

test("resolved ids do not also appear raw", () => {
  // area_id renders as "Onboarding"; showing the uuid underneath as
  // well would be the contract making the modal worse, not better.
  const html = view.itemFactsHtml(item(), NAMES);
  for (const key of ["Area id", "Source document id", "Parent id", "Id", "Title"]) {
    assert.doesNotMatch(html, new RegExp("<dt>" + key + "</dt>"));
  }
  assert.doesNotMatch(html, /a1|d1|i1/, "no raw identifier reaches the modal");
});

test("a document names what it supersedes", () => {
  // work_documents.supersedes_id was stored and shown nowhere: a
  // replaced document kept its back-link and the reader could not see
  // it, which is the whole point of never deleting the row.
  const html = view.documentFactsHtml(doc({ supersedes_id: "d0" }), NAMES);
  assert.match(html, /<dt>Supersedes<\/dt><dd>Q2 PRD<\/dd>/);
  assert.doesNotMatch(view.documentFactsHtml(doc(), NAMES), /<dt>Supersedes<\/dt>/,
    "and a document that supersedes nothing says nothing");
});

test("raw document content never reaches the modal", () => {
  // work_documents.content is unbounded pasted material and the page
  // loads every document, so it is deliberately not fetched. If it ever
  // arrives anyway, it must not dump into the modal.
  const html = view.documentFactsHtml(
    doc({ content: "PAGES AND PAGES OF PASTED MATERIAL" }), NAMES);
  assert.doesNotMatch(html, /PAGES AND PAGES/);
  assert.match(html, /full raw content is kept in the work_documents table/,
    "the modal says where it is instead");
});

test("both modals escape everything, including what they were not told about", () => {
  const html = view.itemFactsHtml(
    item({ title: "<script>a</script>", surprise: "<img src=x>" }), NAMES);
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;img/);
});

test("an attributes bag is left to the roadmap drawer", () => {
  // The drawer lays attributes out properly. Flattening the bag into
  // this compact modal would read as noise, so it is hidden with that
  // reason rather than dumped.
  const html = view.itemFactsHtml(item({ attributes: { team: "Core" } }), NAMES);
  assert.doesNotMatch(html, /<dt>Team<\/dt>|<dt>Attributes<\/dt>/);
});
