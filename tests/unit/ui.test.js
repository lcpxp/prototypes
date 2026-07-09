// ------------------------------------------------------------------
// tests/unit/ui.test.js - Functioning benchmarks for assets/js/ui.js.
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
  vm.runInContext(read("assets/js/ui.js"), sandbox, { filename: "ui.js" });
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
