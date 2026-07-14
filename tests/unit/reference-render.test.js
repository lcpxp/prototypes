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
  vm.runInContext(read("assets/js/pages/reference-topics.js"), sandbox,
    { filename: "reference-topics.js" });
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

test("badgeList renders typed badges, escapes labels, defaults the tone", () => {
  const R = loadApp().refRender;
  assert.equal(R.badgeList([]), "");
  const html = R.badgeList([
    { label: "Step 1", tone: "info" },
    { label: "<b>PROD</b>", tone: "not-a-tone" },
  ]);
  assert.ok(html.includes('class="badge tone-info"'));
  assert.ok(html.includes('class="badge tone-neutral"'));
  assert.ok(!html.includes("<b>"));
});

test("a lean endpoint renders a placeholder body; hydrated renders detail", () => {
  const R = loadApp().refRender;
  const lean = R.endpointBody({ _lean: true, id: "1" });
  assert.ok(lean.includes("Loading detail"));
  const full = R.endpointBody({
    id: "1", method: "get", path: "/a",
    description: "Body text", responses: [{ status: 200 }],
  });
  assert.ok(full.includes("Body text"));
  assert.ok(full.includes("status-2"));
});

test("curlExample uses the first environment, auth and request body", () => {
  const R = loadApp().refRender;
  const servers = [{ base_url: "https://api.example.com" }];
  assert.equal(R.curlExample({ method: "get", path: "/a" }, []), "");
  assert.equal(R.curlExample({ method: "query", path: "GetThings" }, servers), "");
  const html = R.curlExample({
    method: "post", path: "/v1/things",
    request_example: { name: "x" },
  }, servers);
  assert.ok(html.includes("curl -X POST"));
  assert.ok(html.includes("https://api.example.com/v1/things"));
  assert.ok(html.includes("Authorization: Bearer"));
  assert.ok(html.includes("Content-Type: application/json"));
  const publicGet = R.curlExample({
    method: "get", path: "/v1/open", auth_required: false,
  }, servers);
  assert.ok(!publicGet.includes("Authorization"));
  assert.ok(!/\\\\\s*$/.test(publicGet));
});

test("groupByTag orders and describes tags from the catalogue", () => {
  const R = loadApp().refRender;
  const endpoints = [
    { id: "1", method: "get", path: "/b", tag: "Beta" },
    { id: "2", method: "get", path: "/a", tag: "Alpha" },
    { id: "3", method: "get", path: "/c", tag: "Stray" },
  ];
  const grouped = R.groupByTag(endpoints, [
    { name: "Alpha", description: "First area", sort_order: 10 },
    { name: "Beta", sort_order: 20 },
  ]);
  assert.equal(grouped.order.join(","), "Alpha,Beta,Stray");
  assert.equal(grouped.descriptions.Alpha, "First area");
  const bare = R.groupByTag(endpoints);
  assert.equal(bare.order.join(","), "Beta,Alpha,Stray");
});

test("topic blocks render each kind, escape content, skip unknown kinds", () => {
  const T = loadApp().refTopics;
  assert.equal(T.blockHtml({ kind: "mystery", text: "x" }), "");
  assert.ok(T.blockHtml({ kind: "p", text: "<i>hi</i>" }).includes("&lt;i&gt;"));
  assert.ok(T.blockHtml({ kind: "note", tone: "warn", text: "careful" })
    .includes("notice tone-warn"));
  assert.ok(T.blockHtml({ kind: "code", json: { a: 1 } }).includes("&quot;a&quot;: 1"));
  const table = T.blockHtml({
    kind: "table", columns: ["Col<"], rows: [["cell>"]],
  });
  assert.ok(table.includes("Col&lt;"));
  assert.ok(table.includes("cell&gt;"));
  assert.ok(T.blockHtml({ kind: "kv", items: [{ label: "K", value: "V" }] })
    .includes("<th>K</th><td>V</td>"));
  const values = T.blockHtml({
    kind: "values", name: "State", field: "state",
    values: ["Active", "Inactive"], source: "form dropdown",
  });
  assert.ok(values.includes("value-set"));
  assert.ok(values.includes("<code>Active</code>"));
  assert.ok(values.includes("Source: form dropdown"));
});

test("topicBlock wraps title, intro and blocks in a collapsible section", () => {
  const T = loadApp().refTopics;
  const html = T.topicBlock({
    id: "t1", title: "Conventions <", intro: "How it works.",
    blocks: [{ kind: "p", text: "Detail." }],
  });
  assert.ok(html.includes('id="topic-t1"'));
  assert.ok(html.includes("Conventions &lt;"));
  assert.ok(html.includes("How it works."));
  assert.ok(html.includes("Detail."));
});
