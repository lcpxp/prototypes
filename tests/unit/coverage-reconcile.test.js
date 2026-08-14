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

// ------------------------------------------------------------------
// The consumer dimension: does anything actually call this route?
//
// Documented and called are different questions, and the second one
// decides what a reader is shown as current. It is derived on every
// run for that reason - a "not called" flag typed onto a row is wrong
// the day someone wires up a controller, and nothing would fail.
// ------------------------------------------------------------------

test("without a call inventory the artefact keeps its previous shape", () => {
  // The failure mode that would matter is reporting every route as
  // uncalled because nobody passed --consumer.
  const r = reconcile(["GET /api/v1/things"], ["GET /api/v1/things"]);
  assert.equal(r.called, undefined);
  assert.equal(r.uncalled, undefined);
  assert.equal(r.matched, 1, "the rest of the reconciliation is unaffected");
});

test("called and uncalled split the routes, and nothing else", () => {
  const r = reconcile(
    ["GET /api/v1/a", "GET /api/v1/b", "GET /api/v1/c"],
    ["GET /api/v1/a"],
    ["GET /api/v1/a", "GET /api/v1/b"]);
  assert.equal(r.called, 2);
  assert.equal(r.uncalled, 1);
  assert.equal(r.called + r.uncalled, r.routes);
  assert.equal(r.called_pct, 66.7);
});

test("the gap is called AND undocumented - the only figure to drive to zero", () => {
  const r = reconcile(
    ["GET /api/v1/a", "GET /api/v1/b", "GET /api/v1/c", "GET /api/v1/d"],
    ["GET /api/v1/a", "GET /api/v1/c"],
    ["GET /api/v1/a", "GET /api/v1/b"]);
  assert.equal(r.gap, 1, "b is called and undocumented");
  assert.equal(r.stale_docs, 1, "c is documented but nothing calls it");
  assert.equal(r.absent, 2, "absent counts b and d alike; the gap separates them");
});

test("a route documented through a collapse counts as documented", () => {
  // One row standing for the same operation under several prefixes.
  // Judging callability against the raw key alone would report the
  // partner arm of every mirror as an undocumented gap.
  const r = reconcile(
    ["GET /api/v1/partner/merchant/{}/sites"],
    ["GET /api/v1/merchants/{}/sites"],
    ["GET /api/v1/partner/merchant/{}/sites"]);
  assert.equal(r.called, 1);
  assert.equal(r.gap, 0, "the documented twin covers it");
  assert.equal(r.undeclared_mirrors, 1, "still reported as an undeclared collapse");
});

test("a call passing a variable where the code has a literal reaches them all", () => {
  // `service-fees/${type}` against /service-fees/ecom, /pos and four
  // more: that one call site genuinely reaches every one of them.
  const r = reconcile(
    ["GET /api/v1/service-fees/ecom", "GET /api/v1/service-fees/pos",
      "GET /api/v1/service-fees/ecom/questions"],
    [],
    ["GET /api/v1/service-fees/{}"]);
  assert.equal(r.called, 2, "both single-segment forms, not the deeper one");
  assert.equal(r.uncalled, 1);
});

test("a literal in the call does not match a placeholder in the code", () => {
  // The relation is one-way. A call to /things/mine must not mark
  // /things/{id} as called, or every id route would look live.
  const r = reconcile(["GET /api/v1/things/{}"], [], ["GET /api/v1/things/mine"]);
  assert.equal(r.called, 0);
  assert.equal(r.uncalled, 1);
});

test("segment count and method both have to agree", () => {
  const r = reconcile(
    ["GET /api/v1/a/{}/b", "POST /api/v1/a/{}"],
    [],
    ["GET /api/v1/a/{}"]);
  assert.equal(r.called, 0, "neither a longer path nor a different verb matches");
});

test("the artefact records the consumer inventory, still without a path", () => {
  const artefact = build([{
    title: "Portal API", version: "2.0", status: "live", family: "launchpad",
    endpoints: 1, tags: 1, topics: 1, keys: ["GET /api/v1/things"], badges: {},
  }], {
    digest: "a".repeat(64), total: 2, controllers: 1, byVersion: { v1: 2 },
    routes: [{ method: "GET", path: "/api/v1/things" },
      { method: "GET", path: "/api/v1/unused" }],
  }, {
    digest: "b".repeat(64), sites: 1, resolved: 1, unresolved: 0, files: 1,
    distinct: 1, keys: ["GET /api/v1/things"],
    callers: { "GET /api/v1/things": ["src/app/thing.service.ts"] },
  });
  const text = JSON.stringify(artefact);
  assert.ok(!/\/api\//.test(text), "no route path may reach the committed artefact");
  assert.ok(!/service\.ts/.test(text), "and no caller filename either");
  assert.equal(artefact.consumer.call_digest, "b".repeat(64));
  assert.equal(artefact.consumer.call_sites, 1);
  assert.equal(artefact.specs["Portal API"].called, 1);
  assert.equal(artefact.specs["Portal API"].uncalled, 1);
});

test("a collapsed row is stale only when nothing under it is called", () => {
  // The row `POST /api/v2/merchant-applications/{}/x` stands for the
  // unscoped route and both scoped ones. The portal calls the unscoped
  // one and neither scoped one. Counted per route that row looks
  // two-thirds dead; badged on that basis it would tell a reader a
  // route the portal calls today is abandoned.
  const r = reconcile(
    ["POST /api/v2/x", "POST /api/v2/partners/{}/x", "POST /api/v2/sales-teams/{}/x"],
    ["POST /api/v2/x"],
    ["POST /api/v2/x"]);
  assert.equal(r.called, 1);
  assert.equal(r.uncalled, 2);
  assert.equal(r.stale_docs, 0, "one live route under the row keeps the row live");
});

test("a row with no live route under it is stale", () => {
  const r = reconcile(
    ["GET /api/v2/y", "GET /api/v2/partners/{}/y"],
    ["GET /api/v2/y"],
    ["GET /api/v2/other"]);
  assert.equal(r.stale_docs, 1, "neither the row nor its scope variant is called");
});

test("a phantom row is not also counted as stale", () => {
  // It documents no route at all, so it is already counted - and more
  // sharply - as phantom.
  const r = reconcile(["GET /api/v1/real"], ["GET /api/v1/ghost"], ["GET /api/v1/real"]);
  assert.equal(r.phantom, 1);
  assert.equal(r.stale_docs, 0);
});
