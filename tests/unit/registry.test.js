// ------------------------------------------------------------------
// tests/unit/registry.test.js - Benchmarks for the module registry,
// the single source of truth for navigation, dashboard cards and
// access-control keys. Pins the invariants other modules rely on.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadApp() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/registry.js"), sandbox,
    { filename: "registry.js" });
  return sandbox.App;
}

test("module keys are unique and lowercase", () => {
  const App = loadApp();
  const keys = App.registry.modules.map((m) => m.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate module keys");
  for (const key of keys) assert.match(key, /^[a-z][a-z0-9-]*$/);
});

test("module paths are root-relative directories", () => {
  const App = loadApp();
  for (const mod of App.registry.modules) {
    assert.ok(!mod.path.startsWith("/") && !mod.path.startsWith("."),
      `${mod.key}: path must be relative to the repo root`);
    assert.ok(mod.path.endsWith("/"),
      `${mod.key}: path must be a directory ending in /`);
  }
});

test("stat modules name their table and label", () => {
  const App = loadApp();
  for (const mod of App.registry.modules.filter((m) => m.statTable)) {
    assert.ok(Object.values(App.registry.tables).includes(mod.statTable),
      `${mod.key}: statTable ${mod.statTable} missing from registry.tables`);
    assert.ok(mod.statLabel, `${mod.key}: statTable without statLabel`);
  }
});

test("spec families are unique, labelled and include the fallback", () => {
  const App = loadApp();
  const families = App.registry.specFamilies;
  assert.ok(Array.isArray(families) && families.length > 0,
    "registry must define specFamilies for the reference module");
  const keys = families.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate family keys");
  for (const f of families) {
    assert.match(f.key, /^[a-z][a-z0-9-]*$/);
    assert.ok(f.label, `${f.key}: family without a label`);
  }
  assert.ok(keys.includes("other"),
    "specFamilies must keep the 'other' fallback used for unset rows");
});

test("App.moduleHref prefixes the page root", () => {
  const App = loadApp();
  const mod = App.registry.modules[0];
  App.root = "../..";
  assert.equal(App.moduleHref(mod), "../../" + mod.path);
  delete App.root;
  assert.equal(App.moduleHref(mod), "./" + mod.path);
});
