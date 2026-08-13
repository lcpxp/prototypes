// ------------------------------------------------------------------
// tests/unit/coverage-reconcile.test.js - Benchmarks for the coverage
// arithmetic in scripts/gen-coverage.js.
//
// The reconciliation decides a number the drift gate then enforces, so
// it has to be right about the one thing that is easy to get wrong: a
// route that is undocumented because nobody wrote it, versus one that
// is undocumented because a documented row already stands for it under
// another prefix. Conflating the two flatters the coverage figure,
// which is the failure mode this file exists to prevent.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { reconcile, collapsedKeys, build } = require("../../scripts/gen-coverage.js");

test("a documented route that exists in code is matched", () => {
  const r = reconcile(["GET /api/v1/things"], ["GET /api/v1/things"]);
  assert.equal(r.matched, 1);
  assert.equal(r.phantom, 0);
  assert.equal(r.absent, 0);
});

test("a documented route with no code behind it is phantom", () => {
  const r = reconcile([], ["GET /api/v1/ghost"]);
  assert.equal(r.phantom, 1);
  assert.equal(r.matched, 0);
});

test("a route nobody documented is absent", () => {
  const r = reconcile(["GET /api/v1/orphan"], []);
  assert.equal(r.absent, 1);
  assert.equal(r.scope_variants, 0);
});

test("a declared scope variant is covered, not absent", () => {
  // The v2 convention: one documented unscoped row stands for the same
  // operation under /partners/{} and /sales-teams/{}.
  const r = reconcile(
    ["GET /api/v2/merchant-applications/{}",
     "GET /api/v2/partners/{}/merchant-applications/{}",
     "GET /api/v2/sales-teams/{}/merchant-applications/{}"],
    ["GET /api/v2/merchant-applications/{}"]);
  assert.equal(r.matched, 1);
  assert.equal(r.scope_variants, 2);
  assert.equal(r.absent, 0);
});

test("an undeclared mirror is counted apart from a declared variant", () => {
  // The same collapse exists in v1 but the reference never says so, so
  // it must not be silently folded into the coverage figure.
  const r = reconcile(
    ["GET /api/v1/merchants/{}/order",
     "GET /api/v1/partner/merchant/{}/order"],
    ["GET /api/v1/merchants/{}/order"]);
  assert.equal(r.matched, 1);
  assert.equal(r.undeclared_mirrors, 1);
  assert.equal(r.scope_variants, 0, "an undeclared collapse is not a declared one");
  assert.equal(r.accounted, 1, "only declared collapses count toward coverage");
});

test("a scope-prefixed route with no documented twin is absent", () => {
  const r = reconcile(["GET /api/v2/partners/{}/widgets"], []);
  assert.equal(r.absent, 1);
  assert.equal(r.scope_variants, 0);
});

test("collapsedKeys reports what a route could stand under", () => {
  const twins = collapsedKeys("GET /api/v2/partners/{}/cart", false);
  assert.deepEqual(twins, [{ key: "GET /api/v2/cart", declared: true }]);
  assert.deepEqual(collapsedKeys("GET /api/v1/nothing", false), []);
});

test("coverage percentage counts declared collapses only", () => {
  const r = reconcile(
    ["GET /a", "GET /b", "GET /api/v2/partners/{}/c", "GET /api/v2/c"],
    ["GET /a", "GET /api/v2/c"]);
  assert.equal(r.routes, 4);
  assert.equal(r.accounted, 3, "2 matched plus 1 declared variant");
  assert.equal(r.accounted_pct, 75);
});

test("a spec with no source to compare against abstains", () => {
  const artefact = build([{
    title: "Some API", version: "1.0", status: "live", family: "unity",
    endpoints: 151, tags: 24, topics: 6, keys: [], badges: {},
  }], { digest: "x", total: 0, controllers: 0, byVersion: {}, routes: [] });
  const spec = artefact.specs["Some API"];
  assert.equal(spec.comparable, false);
  assert.equal(spec.documented, 151, "it reports its size rather than zero");
  assert.equal(spec.accounted_pct, undefined,
    "no coverage figure, because a figure would read as verified");
});

test("the artefact carries counts and a digest, never a path", () => {
  const artefact = build([{
    title: "Portal API", version: "2.0", status: "live", family: "launchpad",
    endpoints: 1, tags: 1, topics: 1, keys: ["GET /api/v1/things"],
    badges: { unverified: 2, gap: 1 },
  }], {
    digest: "a".repeat(64), total: 1, controllers: 1, byVersion: { v1: 1 },
    routes: [{ method: "GET", path: "/api/v1/things" }],
  });
  const text = JSON.stringify(artefact);
  assert.ok(!/\/api\//.test(text), "no route path may reach the committed artefact");
  assert.equal(artefact.source.route_digest, "a".repeat(64));
  assert.equal(artefact.specs["Portal API"].matched, 1);
  assert.equal(artefact.specs["Portal API"].unverified_badges, 2);
  assert.equal(artefact.specs["Portal API"].gap_badges, 1);
});
