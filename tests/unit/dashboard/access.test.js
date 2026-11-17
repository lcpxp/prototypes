// ------------------------------------------------------------------
// tests/unit/dashboard/access.test.js - The dashboard names only what
// its viewer can open.
//
// The lede once read "developer guidance, reference material and
// working prototypes" for everyone, so a restricted account was told
// about prototypes it could never open. These pin the areas list and
// the sentence built from it.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array, String, Math,
    location: { pathname: "/dashboard.html", search: "", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/ui.js",
    "assets/js/core/registry.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  sandbox.App.onAuthed = function () {};
  vm.runInContext(read("assets/js/pages/dashboard/dashboard.js"), sandbox,
    { filename: "dashboard.js" });
  return sandbox.App;
}

test("a restricted viewer's areas are only the modules it can open, in registry order", () => {
  const App = load();
  const open = new Set(["platform", "glossary", "integrations", "reference"]);
  const areas = App.dashboardAreas(App.registry.modules, (key) => open.has(key));
  assert.deepEqual(Array.from(areas, (m) => m.key), ["platform", "glossary", "integrations", "reference"]);
  assert.equal(App.dashboardLede(areas),
    "Your areas: Platform, Glossary, Integrations and API reference.");
  assert.doesNotMatch(App.dashboardLede(areas), /rototype/,
    "a module the viewer cannot open is never named");
});

test("the lede handles one area and none", () => {
  const App = load();
  const one = App.registry.modules.filter((m) => m.key === "glossary");
  assert.equal(App.dashboardLede(one), "Your areas: Glossary.");
  assert.match(App.dashboardLede([]), /Ask an admin for access/);
});
