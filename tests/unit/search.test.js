// ------------------------------------------------------------------
// tests/unit/search.test.js - Benchmarks for assets/js/core/search.js.
// Loads ui.js (App.escape/badges), registry.js (App.itemHref) and
// search.js in a Node vm. Covers the pure helpers plus the stale-
// response guard, which a slow query must never win.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

// Load the three IIFEs into one context. `dom` optionally supplies a
// document/db so attach() can be exercised; by default they are inert.
function load(dom) {
  const sandbox = {
    location: { pathname: "/dashboard.html", href: "http://t/", search: "", hash: "" },
    navigator: {},
    setTimeout: (fn) => { fn(); return 0; },
    clearTimeout() {},
    document: (dom && dom.document) || {
      addEventListener() {}, getElementById() { return null; },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/registry.js"), sandbox, { filename: "registry.js" });
  sandbox.App.root = ".";
  if (dom && dom.db) sandbox.App.db = dom.db;
  vm.runInContext(read("assets/js/core/search.js"), sandbox, { filename: "search.js" });
  return sandbox.App;
}

test("clean strips PostgREST or() grammar and trims", () => {
  const S = load().search;
  assert.equal(S.clean("  ro,ad(map)*  "), "ro ad map");
  assert.equal(S.clean('a"b\'c%d'), "a b c d");
  assert.equal(S.clean(null), "");
});

test("highlight wraps the first match and always escapes", () => {
  const S = load().search;
  assert.equal(S.highlight("Roadmap board", "road"), "<mark>Road</mark>map board");
  // First occurrence only.
  assert.equal(S.highlight("aXaXa", "x"), "a<mark>X</mark>aXa");
  // No query: plain escaped text.
  assert.equal(S.highlight("<b>", ""), "&lt;b&gt;");
});

test("highlight keeps an injection payload escaped", () => {
  const S = load().search;
  const out = S.highlight('<img src=x onerror=alert(1)>', "img");
  assert.ok(!out.includes("<img"));
  assert.ok(out.includes("&lt;"));
  assert.ok(out.includes("<mark>img</mark>"));
});

test("selectFor lists id, display, sub, badge and link extras, deduped", () => {
  const S = load().search;
  // Keyed by table: several sources share a module now that search
  // reaches more than one table per page.
  const by = (table) => S.sources().find((s) => s.table === table);
  assert.equal(S.selectFor(by("api_endpoints")), "id,path,summary,method,spec_id");
  assert.equal(S.selectFor(by("prototypes")), "id,title,description,status,path");
  assert.equal(S.selectFor(by("work_items")), "id,title,summary,status");
  assert.equal(S.selectFor(by("work_notes")), "id,body,kind,work_item_id,document_id",
    "a note needs its parents to know where it lives");
});

test("sources are all gated by keys that exist in the registry", () => {
  const App = load();
  const known = App.registry.modules.map((m) => m.key);
  App.search.sources().forEach((s) => {
    s.keys.forEach((k) => assert.ok(known.includes(k),
      `search source key "${k}" is not a registry module`));
  });
});

test("search reaches every table that holds narrative content", () => {
  // The rule, not a count: the richest content in the system used to
  // be unfindable from the nav - 174 work notes, 16 documents, 34
  // glossary terms, the topics, the ideas and the findings all had no
  // source at all (docs/plan/40-SURFACING.md).
  const App = load();
  const covered = new Set(App.search.sources().map((s) => s.table));
  const t = App.registry.tables;
  for (const table of [
    t.prototypes, t.apiEndpoints, t.apiTopics, t.apiSpecs, t.workItems,
    t.workNotes, t.workDocuments, t.productCapabilities, t.domainTerms,
    t.journeyStages, t.futurePrototypes, t.reviewFindings, t.profiles,
    t.integrations,
  ]) {
    assert.ok(covered.has(table), `${table} is not searchable`);
  }
});

test("every source can build an address for its rows", () => {
  // A result that lands on a module index is a search that found
  // something and then lost it.
  const App = load();
  App.root = ".";
  for (const s of App.search.sources()) {
    const row = { id: "row-1" };
    (s.extra || []).forEach((c) => { row[c] = c + "-1"; });
    const href = s.href ? s.href(row)
      : s.entity ? App.linkHref(s.entity, row.id, App.root)
      : App.itemHref(App.registry.modules.find((m) => m.key === s.mod), row);
    assert.ok(href && href !== "#",
      `${s.table} produces no address for a row`);
  }
});

test("a source with a soft-delete column declares it", () => {
  // Search must not be the one place a deleted row resurfaces.
  const App = load();
  const finding = App.search.sources().find((s) => s.table === "review_findings");
  assert.equal(finding.live, "deleted_at");
});

test("a snippet windows the match, so a note says why it matched", () => {
  const S = load().search;
  const long = "The acquirer flag is the thing to watch here. " +
    "Clearing it commits to a full suite of screening flows, products and pricing, " +
    "and nobody has costed that. " +
    "Everything before this sentence is padding to push the match past the window.";
  const out = S.snippet(long, "padding");
  assert.ok(out.length <= 160, "the window is bounded");
  assert.match(out, /padding/, "the match is inside the window");
  assert.match(out, /^\u2026/, "text cut from the front says so");
});

test("a short value is shown whole, not windowed", () => {
  const S = load().search;
  assert.equal(S.snippet("Rolling reserve", "reserve"), "Rolling reserve");
  assert.equal(S.snippet("", "x"), "");
  assert.equal(S.snippet(null, "x"), "");
});

test("a long value with no match still truncates rather than dumping", () => {
  const S = load().search;
  const out = S.snippet("word ".repeat(80), "nothing-in-here");
  assert.ok(out.length <= 150);
  assert.match(out, /\u2026$/);
});

test("a note links to whatever it is about, not to a page it is not on", () => {
  const App = load();
  App.root = ".";
  const S = App.search;
  const note = S.sources().find((s) => s.table === "work_notes");
  assert.equal(note.href({ id: "n1", work_item_id: "w1" }),
    "./modules/roadmap/index.html?item=w1");
  assert.equal(note.href({ id: "n1", document_id: "d1" }),
    "./modules/backlog/index.html#document-d1");
  assert.equal(note.href({ id: "n1" }), "./modules/backlog/",
    "a note anchored to nothing lands on the backlog rather than lying");
});

test("a finding links into its wave, because it exists nowhere else", () => {
  const App = load();
  App.root = ".";
  const finding = App.search.sources().find((s) => s.table === "review_findings");
  assert.equal(finding.href({ id: "f1", wave_id: "w9" }),
    "./modules/portal-review/wave.html?wave=w9#finding-f1");
});

test("a topic links into its spec, at its own anchor", () => {
  const App = load();
  App.root = ".";
  const topic = App.search.sources().find((s) => s.table === "api_topics");
  assert.equal(topic.href({ id: "t1", spec_id: "s1" }),
    "./modules/reference/index.html?spec=s1#topic-t1");
  const spec = App.search.sources().find((s) => s.table === "api_specs");
  assert.equal(spec.href({ id: "s1" }), "./modules/reference/index.html?spec=s1");
});

test("a typed row routes through the same anchor a knowledge link uses", () => {
  // One home for "where does a row of this type live": the search
  // result and the link in a drawer must open the same place.
  const App = load();
  App.root = ".";
  const term = App.search.sources().find((s) => s.table === "domain_terms");
  assert.equal(App.linkHref(term.entity, "t1", "."),
    "./modules/platform/index.html#term-t1");
  const idea = App.search.sources().find((s) => s.table === "future_prototypes");
  assert.equal(App.linkHref(idea.entity, "i1", "."),
    "./modules/prototypes/ideas.html#idea-i1");
});

test("itemHref deep-links each module and falls back to the index", () => {
  const App = load();
  const mod = (k) => App.registry.modules.find((m) => m.key === k);
  assert.equal(App.itemHref(mod("roadmap"), { id: "a" }), "./modules/roadmap/index.html?item=a");
  assert.equal(App.itemHref(mod("reference"), { id: "e", spec_id: "s" }),
    "./modules/reference/index.html?spec=s#ep-e");
  assert.equal(App.itemHref(mod("prototypes"), { id: "p", path: "modules/prototypes/x/" }),
    "./modules/prototypes/x/");
  assert.equal(App.itemHref(mod("platform"), { id: "c" }), "./modules/platform/index.html#capability-c");
  // Missing link field: fall back to the module index.
  assert.equal(App.itemHref(mod("reference"), { id: "e" }), "./modules/reference/");
});

test("a stale response never overwrites a fresher one", async () => {
  const pending = [];
  const query = {
    select() { return query; },
    or() { return query; },
    // A source with a soft-delete column adds .is(col, null) before
    // limit; the fake has to be chainable the same way the real
    // builder is.
    is() { return query; },
    limit() { return new Promise((res) => { pending.push(res); }); },
  };
  const input = {
    value: "", _a: {}, handlers: {},
    getAttribute(k) { return k in this._a ? this._a[k] : null; },
    setAttribute(k, v) { this._a[k] = v; },
    removeAttribute(k) { delete this._a[k]; },
    addEventListener(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); },
    blur() {},
  };
  const box = { hidden: true, innerHTML: "",
    querySelectorAll() { return []; }, contains() { return false; } };
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (id === "nav-search-input") return input;
      if (id === "nav-search-results") return box;
      return null;
    },
  };
  const App = load({ document, db: { from() { return query; } } });

  App.search.attach();
  const fire = () => input.handlers.input[0]();
  const row = (label) => ({ data: [{
    id: "1", title: label, name: label, display_name: label,
    summary: "", description: "", status: "live", method: "GET",
    email: "", purpose: "", role: "member", path: "", spec_id: "",
  }] });
  const flush = () => new Promise((r) => setTimeout(r, 0));

  input.value = "roadmap";
  fire();
  const stale = pending.splice(0);          // first query's resolvers
  input.value = "backlog";
  fire();
  const fresh = pending.splice(0);          // second query's resolvers

  fresh.forEach((res) => res(row("FRESH")));
  await flush();
  stale.forEach((res) => res(row("STALE")));
  await flush();

  assert.ok(box.innerHTML.includes("FRESH"));
  assert.ok(!box.innerHTML.includes("STALE"));
});
