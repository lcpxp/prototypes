// ------------------------------------------------------------------
// tests/unit/call-extract.test.js - Benchmarks for the call-site
// extractor (scripts/extract-calls.js), inventory C of
// docs/plan/20-API-REFERENCE.md.
//
// The extractor reads a LaunchPad front-end checkout that is
// deliberately NOT in this repo, so these run against synthetic
// services in tests/fixtures/services/ instead.
//
// What is riding on them: the reference decides what to show a reader
// as current from whether the portal calls a route. Get a rule wrong
// here and the answer is not "no data" but a confident lie - a live
// route filed as abandoned, or 24 routes nothing has touched in years
// presented as today's surface. Every rule below was needed to make
// the real comparison come out right.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  relativeKey, firstArg, toJs, stripParamTypes, extractDir, digestOf,
} = require("../../scripts/extract-calls.js");

const FIXTURES = path.join(__dirname, "..", "fixtures", "services");
const inventory = extractDir(FIXTURES);
const keys = inventory.keys;

test("rule 1: only an expression that reached the API root is a route", () => {
  // DownloadService fetches a pre-signed URL the API handed back. It
  // is an http call, it is not an API route, and counting it as one
  // would invent a route no controller serves.
  assert.equal(inventory.unresolved, 1);
  assert.ok(keys.includes("GET /api/v1/assets/{}/download-url"),
    "the call that fetches the link IS a route and must be kept");
  assert.ok(!keys.some((k) => k.includes("downloadLink")));
});

test("rule 2: an unknown identifier is a placeholder, not an empty string", () => {
  assert.ok(keys.includes("GET /api/v1/widgets/{}"));
  assert.ok(!keys.includes("GET /api/v1/widgets/"),
    "dropping the id collapses a resource route onto its collection");
});

test("rule 3: a call split across lines is still a call site", () => {
  // The portal keeps `.http.get` on one line today, so a strict
  // pattern scores the same. A reformat would silently drop sites and
  // report live routes as uncalled, with nothing failing.
  const split = keys.includes("GET /api/v1/assets/{}/download-url");
  assert.ok(split, "this.http\\n  .get(...) must resolve like any other");
});

test("rule 4: the root is found in every spelling the portal uses", () => {
  // A plain assignment (config.msalConfig.apis[0].uri), a property
  // initialiser reading this.config, and a private #field.
  assert.ok(keys.includes("GET /api/v1/widgets/{}"), "plain assignment");
  assert.ok(keys.includes("GET /api/v1/widgets"), "property initialiser");
  assert.ok(keys.includes("GET /api/v1/things/{}/sites"), "#private field");
});

test("rule 4b: a base with no version segment stays unversioned", () => {
  assert.ok(keys.includes("GET /api/gadgets"));
  assert.ok(!keys.some((k) => k.includes("/v1/gadgets")),
    "assuming v1 is the single largest source of wrong documented paths");
});

test("rule 5: TypeScript that JavaScript will not run is rewritten", () => {
  assert.match(toJs("this.#apiUrl"), /_p_apiUrl/);
  assert.equal(toJs("a!.b"), "a.b");
  assert.equal(stripParamTypes("ownerId: string, flowId?: string"), "ownerId, flowId");
  assert.equal(stripParamTypes("recordId: string, tail = ''"), "recordId, tail = ''");
});

test("rule 6: a helper's own parameters are not shadowed by the scope", () => {
  // flowUrl(ownerId) returns the collection; flowUrl(ownerId, flowId)
  // returns the resource. If `with` answers for flowId before the
  // closure does, the one-argument call grows a trailing id and
  // invents a route the API does not serve. Two wrong routes came
  // from exactly this.
  assert.ok(keys.includes("POST /api/v1/owners/{}/flows"),
    "createFlow passes one argument and must not gain a second segment");
  assert.ok(keys.includes("GET /api/v1/owners/{}/flows"));
  assert.ok(keys.includes("GET /api/v1/owners/{}/flows/{}"));
  assert.ok(keys.includes("GET /api/v1/owners/{}/flows/{}/steps"));
});

test("rule 6b: a defaulted parameter takes its default when omitted", () => {
  assert.ok(keys.includes("GET /api/v2/records/{}"),
    "v2(recordId) with tail defaulting to '' must not append a segment");
  assert.ok(keys.includes("GET /api/v2/records/{}/screenings"));
  assert.ok(keys.includes("POST /api/v2/records/{}/contract/send"),
    "a literal tail with its own slash composes, it does not escape");
});

test("rule 7: a suffix that is not its own segment is a query string", () => {
  assert.ok(keys.includes("POST /api/v1/people"));
  assert.ok(!keys.some((k) => k === "POST /api/v1/people/{}"),
    "`people${query}` is /people with a query, not /people/{id}");
  assert.equal(relativeKey("GET", "v1/admin/users${query}"), "GET /api/v1/admin/users");
  assert.equal(relativeKey("GET", "v1/admin/users/${id}"), "GET /api/v1/admin/users/{}");
});

test("rule 7b: a URL built into a local first is the same route", () => {
  assert.ok(keys.includes("GET /api/v1/people"),
    "`let url = this.listUrl` then get(url, {params}) must resolve");
});

test("rule 8: an injection token with two providers means two routes", () => {
  // The mirror convention, in the source: one call site, two live
  // routes. Emitting one reports half the surface as uncalled.
  assert.ok(keys.includes("GET /api/v1/things/{}/sites"), "the factory default");
  assert.ok(keys.includes("GET /api/v1/partner/thing/{}/sites"), "the route provider");
});

test("rule 9: a field that never reached the root cannot shadow a base", () => {
  // InitialiserService also declares `pageSize = 50`. If that were
  // kept as a base, an unrelated number would sit where a URL goes.
  assert.ok(!keys.some((k) => k.includes("50")));
});

test("a call site is counted once however many routes it reaches", () => {
  // TokenBaseService has one call site and yields two keys.
  assert.equal(inventory.sites, 15);
  assert.equal(inventory.resolved, 14);
  assert.equal(inventory.distinct, 15);
});

test("keys compare against code routes, placeholders and all", () => {
  const { routeKey } = require("../../scripts/extract-routes.js");
  // The two inventories must normalise identically or nothing matches.
  assert.equal(relativeKey("get", "v1/owners/${ownerId}/flows"),
    routeKey("GET", "/api/v1/owners/{ownerId}/flows"));
  assert.equal(relativeKey("DELETE", "/api/v2/things/${id}"),
    routeKey("delete", "api/v2/things/{thingId}"));
});

test("the digest fingerprints the key set, not the order it was read in", () => {
  assert.equal(digestOf(["B", "A"]), digestOf(["A", "B"]));
  assert.notEqual(digestOf(["A"]), digestOf(["A", "B"]));
  assert.match(inventory.digest, /^[0-9a-f]{64}$/);
});

test("callers name the file, so a route can be traced back", () => {
  const via = inventory.callers["GET /api/v1/things/{}/sites"];
  assert.ok(via && via.length, "a called route records where it is called from");
  assert.ok(via.every((f) => !path.isAbsolute(f)),
    "paths are relative - the checkout location never enters the repo");
});

test("firstArg reads a whole template literal, brackets and all", () => {
  const src = "this.http.get(`${a}/x/${b(1, 2)}`, { params })";
  assert.equal(firstArg(src, src.indexOf("(")), "`${a}/x/${b(1, 2)}`");
  const nested = "this.http.get(this.v2(id, 'screenings'))";
  assert.equal(firstArg(nested, nested.indexOf("(")), "this.v2(id, 'screenings')");
});
