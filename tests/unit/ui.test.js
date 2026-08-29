// ------------------------------------------------------------------
// tests/unit/ui.test.js - Benchmarks for assets/js/core/ui.js.
// Pins the exact behaviour of the shared UI helpers, especially
// App.escape, which every dynamic render depends on for XSS safety.
// Loads the browser IIFE in a Node vm with a minimal window shim.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadApp() {
  const sandbox = {
    location: { pathname: "/dashboard.html" },
    navigator: {},
    setTimeout,
    document: {
      addEventListener() {},
      getElementById() { return null; },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  return sandbox.App;
}

test("App.escape neutralises every HTML-significant character", () => {
  const App = loadApp();
  assert.equal(
    App.escape(`<script>alert("x&y")</script>'`),
    "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;&#39;"
  );
});

test("App.escape handles null, undefined and non-strings", () => {
  const App = loadApp();
  assert.equal(App.escape(null), "");
  assert.equal(App.escape(undefined), "");
  assert.equal(App.escape(0), "0");
  assert.equal(App.escape(false), "false");
});

test("App.methodBadge renders known methods and escapes output", () => {
  const App = loadApp();
  assert.equal(App.methodBadge("get"), '<span class="badge get">GET</span>');
  assert.equal(App.methodBadge("DELETE"), '<span class="badge delete">DELETE</span>');
});

test("App.methodBadge gives unknown methods no styling class", () => {
  const App = loadApp();
  assert.equal(App.methodBadge("<img>"), '<span class="badge ">&lt;IMG&gt;</span>');
});

test("App.statusBadge lowercases and escapes", () => {
  const App = loadApp();
  assert.equal(App.statusBadge("Draft"), '<span class="badge draft">draft</span>');
});

// ------------------------------------------------------------------
// App.store - the guarded localStorage helper. It exists because
// storage throws in a private window and in an iframe with third-party
// cookies blocked, and because that guard was written eight times over
// in roadmap.js, each copy slightly different.
// ------------------------------------------------------------------

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

function throwingStorage() {
  const boom = () => { throw new Error("storage is disabled"); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

// ui.js reads window.localStorage at call time, so the shim can be
// swapped per test without reloading the module differently.
function withStorage(localStorage) {
  const sandbox = {
    location: { pathname: "/dashboard.html" },
    navigator: {},
    setTimeout,
    localStorage,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  return sandbox.App.store;
}

test("App.store reads and writes strings, and round-trips JSON", () => {
  const store = withStorage(fakeStorage());
  assert.equal(store.get("absent", "fallback"), "fallback");
  assert.equal(store.get("absent"), null);
  assert.equal(store.set("k", "v"), true);
  assert.equal(store.get("k", "fallback"), "v");
  assert.equal(store.setJSON("j", { a: 1 }), true);
  // Compared as text: a value JSON.parse builds inside the vm carries the
  // sandbox's Object.prototype, so strict deepEqual fails on realm
  // identity rather than on content.
  assert.equal(JSON.stringify(store.getJSON("j", {})), '{"a":1}');
  assert.equal(JSON.stringify(store.getJSON("missing", { d: true })), '{"d":true}');
});

test("App.store returns the fallback when storage throws", () => {
  // A private window rejects both reads and writes. The page must still
  // render; it just does not remember.
  const store = withStorage(throwingStorage());
  assert.equal(store.get("k", "fallback"), "fallback");
  assert.equal(store.get("k"), null);
  assert.equal(store.set("k", "v"), false);
  assert.equal(store.setJSON("k", { a: 1 }), false);
  assert.equal(JSON.stringify(store.getJSON("k", { d: true })), '{"d":true}');
});

test("App.store treats malformed stored JSON as absent", () => {
  // A hand-edited or truncated value must not throw on the next load.
  const storage = fakeStorage();
  storage.setItem("j", "{not json");
  const store = withStorage(storage);
  assert.equal(JSON.stringify(store.getJSON("j", { d: true })), '{"d":true}');
});
