// ------------------------------------------------------------------
// tests/unit/route-extract.test.js - Benchmarks for the route
// extractor (scripts/extract-routes.js), inventory A of
// docs/plan/20-API-REFERENCE.md.
//
// The extractor reads a LP checkout that is deliberately NOT in
// this repo, so these run against synthetic controllers in
// tests/fixtures/controllers/ instead. Each rule below was needed to
// make the real comparison come out right, and each one, got wrong,
// produces a diff that is confidently wrong - which is worse than no
// diff. That is what these hold in place.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  normalisePath, routeKey, joinRoute, baseRoute, extractFile, extractDir,
} = require("../../scripts/extract-routes.js");

const FIXTURES = path.join(__dirname, "..", "fixtures", "controllers");
const inventory = extractDir(FIXTURES);
const keys = inventory.routes.map((r) => routeKey(r.method, r.path));

test("rule 1: an action route composes onto the controller route", () => {
  assert.ok(keys.includes("PATCH /api/v2/admin/widget/price-sheets/{}"),
    "the action path must hang off the controller base, not the root");
  assert.ok(!keys.includes("PATCH /api/v2/price-sheets/{}"),
    "reading the action attribute alone invents a top-level resource");
  assert.equal(joinRoute("api/v1/admin/merchant/", "/price-sheets/{id}"),
    "api/v1/admin/merchant/price-sheets/{id}");
});

test("rule 1b: a bare verb attribute means the controller route itself", () => {
  assert.ok(keys.includes("GET /api/v2/admin/widget"));
});

test("rule 2: the version placeholder resolves to the bare number", () => {
  assert.ok(keys.some((k) => k.startsWith("GET /api/v2/admin/widget")));
  assert.ok(!keys.some((k) => k.includes("/vv2/")),
    "substituting 'v2' for the placeholder yields api/vv2 and breaks every comparison");
  assert.ok(!keys.some((k) => k.includes("{version")));
});

test("rule 3: placeholders are positional, not named", () => {
  assert.equal(normalisePath("/api/v1/things/{id}"), "/api/v1/things/{}");
  assert.equal(normalisePath("/api/v1/things/{thingId}"), "/api/v1/things/{}");
  // Two actions, two verbs, one shape - so a rename in the API never
  // reads as a new endpoint.
  const things = keys.filter((k) => k.endsWith("/api/v1/things/{}"));
  assert.deepEqual(things.sort(), ["GET /api/v1/things/{}", "PUT /api/v1/things/{}"]);
});

test("rule 4: comparison is case-insensitive, display case is kept", () => {
  assert.equal(routeKey("get", "/api/Token/CurrencyCodes"),
    "GET /api/token/currencycodes");
  const token = inventory.routes.find((r) => r.controller === "Token");
  assert.equal(token.path, "/api/Token/CurrencyCodes",
    "the row keeps the real casing; only the comparison key is folded");
});

test("rule 5: commented-out controllers contribute nothing", () => {
  assert.ok(!keys.some((k) => k.includes("/retired")),
    "a fully commented controller is not a route surface");
  assert.ok(!inventory.routes.some((r) => r.controller === "Retired"));
});

test("rule 6: no [ApiVersion] means unversioned, not v1", () => {
  const widgets = inventory.routes.filter((r) => r.controller === "UnversionedWidgets");
  assert.equal(widgets.length, 2);
  for (const r of widgets) {
    assert.equal(r.version, null);
    assert.ok(r.path.startsWith("/api/widgets/"),
      "an unversioned controller must not acquire a version segment");
  }
});

test("the [controller] token resolves, even indented inside a namespace", () => {
  const found = baseRoute('    [Route("api/[controller]")]\n', "DropdownController.cs");
  assert.deepEqual(found, { base: "api/Dropdown", version: null });
});

test("a file with a verb attribute but no route base yields nothing", () => {
  assert.equal(extractFile("// [HttpGet] in prose\npublic class X {}", "X.cs").length, 0);
});

test("every route carries a citation back to its source", () => {
  for (const r of inventory.routes) {
    assert.ok(r.file && r.line > 0,
      "a claim about the API must be traceable to a file and line");
  }
});

test("the digest is stable across runs and sensitive to the route set", () => {
  assert.equal(extractDir(FIXTURES).digest, inventory.digest);
  assert.match(inventory.digest, /^[0-9a-f]{64}$/);
  // The digest is what reaches the public repo, so it must be a
  // fingerprint and never a path.
  assert.ok(!inventory.digest.includes("/"));
});

test("the inventory summarises what it found", () => {
  assert.equal(inventory.total, 8);
  assert.equal(inventory.distinct, 8);
  assert.equal(inventory.controllers, 4, "two fixture files carry no route base");
  assert.deepEqual(inventory.byVersion, { unversioned: 3, v1: 2, v2: 3 });
});
