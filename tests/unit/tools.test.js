// ------------------------------------------------------------------
// tests/unit/tools.test.js - Benchmarks for assets/js/core/tools.js.
// Loads ui.js (App.escape), registry.js and tools.js in a Node vm.
// Covers the URL builder and the button markup: the search rows carry
// nothing this repo may hold, so the gate here is that a row becomes
// the exact URL the tool expects, and that an unusable row renders
// nothing rather than a link to nowhere.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load(dom) {
  const sandbox = {
    location: { pathname: "/dashboard.html", href: "http://t/", search: "", hash: "" },
    navigator: {},
    setTimeout: (fn) => { fn(); return 0; },
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
  vm.runInContext(read("assets/js/core/tools.js"), sandbox, { filename: "tools.js" });
  return sandbox.App;
}

const BASE = "https://logs.example.com/en-GB/app/search/search";

test("href puts the search in q= and appends the row's params", () => {
  const T = load().tools;
  const href = T.href({
    base_url: BASE,
    query: "index=x | stats count",
    params: { earliest: "-24h@h", latest: "now" },
  });
  const url = new URL(href);
  assert.equal(url.origin + url.pathname, BASE);
  assert.equal(url.searchParams.get("q"), "search index=x | stats count");
  assert.equal(url.searchParams.get("earliest"), "-24h@h");
  assert.equal(url.searchParams.get("latest"), "now");
});

test("href adds the implied search command only when one is missing", () => {
  const T = load().tools;
  const q = (query) =>
    new URL(T.href({ base_url: BASE, query })).searchParams.get("q");
  // A bare term is only valid in the search bar; ?q= needs the command.
  assert.equal(q("index=crm-prod source=app"), "search index=crm-prod source=app");
  // Already a command, or a generating pipe: left exactly as stored.
  assert.equal(q("search index=x"), "search index=x");
  assert.equal(q("| makeresults count=1"), "| makeresults count=1");
  // Leading whitespace must not defeat the check.
  assert.equal(q("  search index=x"), "search index=x");
});

test("href encodes characters that would otherwise break the URL", () => {
  const T = load().tools;
  const query = 'index=x | where a=="b&c" | rex "(?<n>\\d+)#" | eval p=50%';
  const href = T.href({ base_url: BASE, query });
  assert.ok(!href.includes("#"), "a raw # would truncate the URL at the fragment");
  assert.equal(href.split("&").length, 1, "a raw & would split into two params");
  assert.equal(new URL(href).searchParams.get("q"), "search " + query);
});

test("href joins with & when base_url already carries a query string", () => {
  const T = load().tools;
  const href = T.href({ base_url: BASE + "?app=search", query: "index=x" });
  const url = new URL(href);
  assert.equal(url.searchParams.get("app"), "search");
  assert.equal(url.searchParams.get("q"), "search index=x");
});

test("href returns the base alone when the row carries no search", () => {
  const T = load().tools;
  assert.equal(T.href({ base_url: BASE }), BASE);
  assert.equal(T.href({}), "");
  assert.equal(T.href(null), "");
});

test("render opens the link in a new tab, severed from this one", () => {
  const T = load().tools;
  const html = T.render([
    { key: "k", label: "Splunk error sweep", icon: "bug", base_url: BASE, query: "index=x" },
  ]);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /class="nav-icon-btn"/);
  assert.match(html, /<svg /);
  // Icon-only, so the name has to reach assistive tech another way.
  assert.match(html, /aria-label="Splunk error sweep"/);
  assert.match(html, /title="Splunk error sweep"/);
});

test("render escapes the label and the href", () => {
  const T = load().tools;
  const html = T.render([
    {
      label: '"><script>x</script>',
      icon: "bug",
      base_url: BASE,
      query: "index=x",
      params: { latest: "now" },
    },
  ]);
  assert.ok(!html.includes("<script>"), "label must not break out of the attribute");
  assert.match(html, /&quot;&gt;&lt;script&gt;/);
  // The & separating q= from latest= must be an entity inside the
  // href attribute, and the href must still parse back to both.
  assert.match(html, /href="[^"]*&amp;latest=now"/);
  const href = html.match(/href="([^"]*)"/)[1].replace(/&amp;/g, "&");
  assert.equal(new URL(href).searchParams.get("latest"), "now");
});

test("render skips a row it cannot draw rather than emitting a dead control", () => {
  const T = load().tools;
  // An icon this build has no SVG for.
  assert.equal(T.render([{ label: "x", icon: "rocket", base_url: BASE }]), "");
  // A row with no base_url has no target.
  assert.equal(T.render([{ label: "x", icon: "bug" }]), "");
  assert.equal(T.render([]), "");
  assert.equal(T.render(null), "");
});

// A query builder that resolves like the real one: `then` hands the
// result on and returns a real promise, so a caller may chain. The
// earlier fake returned itself, which made a second `.then` re-deliver
// the raw result - fine while nothing chained, wrong the moment
// App.tools.load mapped rows out of it.
function fakeDb(result, calls) {
  calls = calls || {};
  const builder = {
    select(cols) { calls.select = cols; return builder; },
    order(col) { calls.order = col; return builder; },
    then(fn, rej) { return Promise.resolve(result).then(fn, rej); },
  };
  return { from(table) { calls.table = table; return builder; } };
}

test("attach reads portal_links through the registry, ordered", async () => {
  const calls = {};
  const host = { innerHTML: "" };
  const App = load({
    document: {
      addEventListener() {},
      getElementById: (id) => (id === "nav-tools" ? host : null),
    },
    db: fakeDb(
      { data: [{ label: "Tool", icon: "bug", base_url: BASE, query: "index=x" }] },
      calls),
  });
  App.onAuthed = (fn) => fn({});
  App.tools.attach();
  await App.tools.load();
  assert.equal(calls.table, "portal_links");
  assert.equal(calls.table, App.registry.tables.portalLinks);
  assert.equal(calls.order, "sort_order");
  assert.ok(!/\*/.test(calls.select), "select named columns, never *");
  assert.match(calls.select, /description/,
    "the dashboard's tools grid renders the sentence, so the shared read fetches it");
  assert.match(host.innerHTML, /nav-icon-btn/);
});

test("attach leaves the nav untouched when the read fails", async () => {
  const host = { innerHTML: "" };
  const App = load({
    document: {
      addEventListener() {},
      getElementById: (id) => (id === "nav-tools" ? host : null),
    },
    db: fakeDb({ error: { message: "denied" } }),
  });
  App.onAuthed = (fn) => fn({});
  App.tools.attach();
  await App.tools.load();
  assert.equal(host.innerHTML, "");
});

test("the rows are read once, however many consumers ask for them", async () => {
  // The nav needs them on every page and the dashboard's tools grid
  // needs the same rows. Two fetches of one small table on one page is
  // waste, and a second copy is a second thing to keep in step.
  let reads = 0;
  const calls = {};
  const db = fakeDb({ data: [{ label: "Tool", icon: "bug", base_url: BASE }] }, calls);
  const from = db.from;
  db.from = function (table) { reads++; return from(table); };
  const App = load({
    document: { addEventListener() {}, getElementById: () => ({ innerHTML: "" }) },
    db: db,
  });
  App.onAuthed = (fn) => fn({});
  App.tools.attach();
  const a = await App.tools.load();
  const b = await App.tools.load();
  assert.equal(reads, 1);
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
});

test("a failed read resolves to no rows rather than rejecting", async () => {
  // Every consumer treats the result as a list. A rejection here would
  // have to be handled at each of them, and one forgotten handler is an
  // unhandled rejection in the console on a page that otherwise works.
  const App = load({
    document: { addEventListener() {}, getElementById: () => null },
    db: fakeDb({ error: { message: "denied" } }),
  });
  assert.deepEqual(Array.from(await App.tools.load()), []);
});
