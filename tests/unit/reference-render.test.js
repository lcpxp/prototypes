// ------------------------------------------------------------------
// tests/unit/reference-render.test.js - Benchmarks for the reference
// viewer's HTML builders (assets/js/pages/reference-render.js).
// The builders are pure (data in, string out), so they load in a
// Node vm alongside ui.js, which supplies App.escape and the badges.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadApp() {
  const sandbox = {
    location: { pathname: "/modules/reference/index.html" },
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
  vm.runInContext(read("assets/js/pages/reference-render.js"), sandbox,
    { filename: "reference-render.js" });
  return sandbox.App;
}

test("endpointBlock escapes hostile content everywhere", () => {
  const R = loadApp().refRender;
  const html = R.endpointBlock({
    id: '"><img>',
    method: "get",
    path: "/v1/<script>",
    summary: "<b>bold</b>",
    notes: "<i>note</i>",
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img>"));
  assert.ok(!html.includes("<b>"));
  assert.ok(!html.includes("<i>note"));
});

test("endpointBlock shows deprecated and public badges only when set", () => {
  const R = loadApp().refRender;
  const plain = R.endpointBlock({ id: "1", method: "get", path: "/a" });
  assert.ok(!plain.includes("deprecated"));
  assert.ok(!plain.includes('badge public'));
  const flagged = R.endpointBlock({
    id: "2", method: "get", path: "/b",
    deprecated: true, auth_required: false,
  });
  assert.ok(flagged.includes('class="badge deprecated"'));
  assert.ok(flagged.includes('class="badge public"'));
});

test("responsesBlock renders the catalogue with status-family badges", () => {
  const R = loadApp().refRender;
  const html = R.responsesBlock([
    { status: 201, description: "Created", example: { id: "x" } },
    { status: 404, description: "Missing" },
    { status: 503, description: "Down" },
  ], null);
  assert.ok(html.includes('class="badge status-2"'));
  assert.ok(html.includes('class="badge status-4"'));
  assert.ok(html.includes('class="badge status-5"'));
  assert.equal((html.match(/codeblock/g) || []).length > 0, true);
});

test("responsesBlock falls back to the legacy single example", () => {
  const R = loadApp().refRender;
  assert.equal(R.responsesBlock([], null), "");
  const html = R.responsesBlock(null, { ok: true });
  assert.ok(html.includes("Response example"));
  assert.ok(html.includes("&quot;ok&quot;: true"));
});

test("specOverview renders environments, auth and contact; empty stays empty", () => {
  const R = loadApp().refRender;
  assert.equal(R.specOverview({ servers: [], auth: {} }), "");
  const html = R.specOverview({
    servers: [{ name: "Sandbox", base_url: "https://sandbox.example.com", note: "test" }],
    auth: { Type: "API key", Header: "Authorization: Bearer <key>" },
    contact: "Platform team",
  });
  assert.ok(html.includes("Environments"));
  assert.ok(html.includes("https://sandbox.example.com"));
  assert.ok(html.includes("Authentication"));
  assert.ok(html.includes("Authorization: Bearer &lt;key&gt;"));
  assert.ok(html.includes("Platform team"));
});

test("matches filters on method, path, tag, summary and description", () => {
  const R = loadApp().refRender;
  const ep = { method: "post", path: "/v1/merchants", tag: "Merchants",
    summary: "Create a merchant", description: "Starts onboarding" };
  assert.ok(R.matches(ep, ""));
  assert.ok(R.matches(ep, "POST"));
  assert.ok(R.matches(ep, "/v1/merch"));
  assert.ok(R.matches(ep, "onboarding"));
  assert.ok(!R.matches(ep, "webhook"));
});

test("endpointsFromOpenApi carries the deprecated flag through", () => {
  const R = loadApp().refRender;
  const endpoints = R.endpointsFromOpenApi({
    paths: { "/old": { get: { deprecated: true, summary: "Old" } } },
  });
  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0].deprecated, true);
});
