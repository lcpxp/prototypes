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
  const by = (mod) => S.sources().find((s) => s.mod === mod);
  assert.equal(S.selectFor(by("reference")), "id,path,summary,method,spec_id");
  assert.equal(S.selectFor(by("prototypes")), "id,title,description,status,path");
  assert.equal(S.selectFor(by("roadmap")), "id,title,summary,status");
  assert.equal(S.selectFor(by("platform")), "id,title,summary");
});

test("sources are all gated by keys that exist in the registry", () => {
  const App = load();
  const known = App.registry.modules.map((m) => m.key);
  App.search.sources().forEach((s) => {
    s.keys.forEach((k) => assert.ok(known.includes(k),
      `search source key "${k}" is not a registry module`));
  });
  assert.equal(App.search.sources().length, 6);
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
