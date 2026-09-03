// ------------------------------------------------------------------
// tests/unit/dashboard/strip.test.js - The dashboard's headline strip
// (docs/plan/50-DASHBOARD.md).
//
// The strip answers one question - what is being worked on now, and
// what is next - and the rules that keep it an answer rather than a
// second roadmap are the ones benchmarked here: workstreams only,
// finished ones drop out, blocked ones sort first, Next caps.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array, String, Math,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/pages/dashboard/strip.js"), sandbox,
    { filename: "dashboard-strip.js" });
  return sandbox.App.dashboardStrip;
}
const strip = load();

function ws(extra) {
  return Object.assign({
    id: "w1", title: "Merchant Portal integration", horizon: "now", status: "in_progress",
    progress: 45, assignee: "Xavier", theme: "unity", theme_label: "Merchant Portal",
    open_children: 3,
  }, extra || {});
}

const href = (row) => "roadmap/index.html?item=" + row.id;

test("the two bands split by horizon and nothing else appears", () => {
  const bands = strip.bands([
    ws({ id: "a", horizon: "now" }),
    ws({ id: "b", horizon: "next" }),
  ]);
  assert.equal(bands.now.length, 1);
  assert.equal(bands.next.length, 1);
  assert.equal(bands.now[0].id, "a");
});

test("a finished workstream drops out; a done one with open work does not", () => {
  // Done with nothing open belongs in Delivered on the roadmap. Done
  // with children still open is a claim the strip should not repeat.
  const bands = strip.bands([
    ws({ id: "finished", status: "done", open_children: 0 }),
    ws({ id: "claims-done", status: "done", open_children: 2 }),
  ]);
  const ids = Array.from(bands.now, (r) => r.id);
  assert.deepEqual(ids, ["claims-done"]);
});

test("blocked sorts first within its band", () => {
  const bands = strip.bands([
    ws({ id: "a" }), ws({ id: "b", status: "blocked" }), ws({ id: "c" }),
  ]);
  assert.deepEqual(Array.from(bands.now, (r) => r.id), ["b", "a", "c"],
    "one blocked workstream is easy to miss and expensive to miss");
});

test("Next caps at six and says how many it hid; Now never caps", () => {
  const many = [];
  for (let i = 0; i < 10; i++) many.push(ws({ id: "n" + i, horizon: "next" }));
  for (let i = 0; i < 9; i++) many.push(ws({ id: "w" + i, horizon: "now" }));
  const bands = strip.bands(many);
  assert.equal(bands.next.length, 6);
  assert.equal(bands.nextHidden, 4);
  assert.equal(bands.now.length, 9,
    "if nine things are in flight, hiding three is the problem, not the display");
});

test("the strip renders both bands, and the overflow link when it caps", () => {
  const many = [];
  for (let i = 0; i < 8; i++) many.push(ws({ id: "n" + i, horizon: "next" }));
  const html = strip.html(many.concat([ws()]), { href, moreHref: "roadmap/#next" });
  assert.match(html, /<h3 class="eyebrow">Now<\/h3>/);
  assert.match(html, /<h3 class="eyebrow">Next<\/h3>/);
  assert.match(html, /and 2 more at next/);
  assert.match(html, /href="roadmap\/#next"/);
});

test("no overflow link when nothing was hidden", () => {
  const html = strip.html([ws(), ws({ id: "b", horizon: "next" })], { href });
  assert.doesNotMatch(html, /more at next/);
});

test("an empty band says what to do, naming where to do it", () => {
  const html = strip.html([ws({ horizon: "next" })], { href });
  assert.match(html, /Nothing at now\. Move a workstream here from the roadmap\./);
});

test("nothing live renders nothing at all, not an empty frame", () => {
  assert.equal(strip.html([], { href }), "");
  assert.equal(strip.html(null, { href }), "");
  assert.equal(strip.html([ws({ status: "done", open_children: 0 })], { href }), "",
    "a band of only finished work is not a band");
});

test("a row carries its theme class, its link and its progress width", () => {
  const html = strip.rowHtml(ws(), "roadmap/index.html?item=w1");
  assert.match(html, /class="ds-row rm-cat-unity"/,
    "the theme class is how a colour means a theme that exists");
  assert.match(html, /href="roadmap\/index\.html\?item=w1"/);
  assert.match(html, /style="width:45%"/);
  assert.match(html, /aria-label="45 percent complete"/);
  assert.match(html, /Xavier &middot; 3 open items/);
});

test("a delivered workstream reads complete whatever its stored number", () => {
  const html = strip.rowHtml(ws({ status: "done", progress: 20, open_children: 1 }), "#");
  assert.match(html, /style="width:100%"/);
  assert.match(html, /<span class="ds-status">Delivered<\/span>/);
});

test("progress outside 0-100 is clamped rather than drawn as a bar off the end", () => {
  assert.match(strip.rowHtml(ws({ progress: 140 }), "#"), /style="width:100%"/);
  assert.match(strip.rowHtml(ws({ progress: -5 }), "#"), /style="width:0%"/);
  assert.match(strip.rowHtml(ws({ progress: null }), "#"), /style="width:0%"/);
});

test("one open item reads as one item, not one items", () => {
  assert.match(strip.rowHtml(ws({ open_children: 1 }), "#"), /1 open item</);
  assert.match(strip.rowHtml(ws({ open_children: 2 }), "#"), /2 open items</);
  assert.doesNotMatch(strip.rowHtml(ws({ open_children: 0 }), "#"), /open item/);
});

test("a row with no theme, assignee or children still renders", () => {
  const html = strip.rowHtml(
    { id: "x", title: "Bare", status: "planned", horizon: "now" }, "#");
  assert.match(html, /class="ds-row"/, "no theme means no theme class, not 'rm-cat-undefined'");
  assert.doesNotMatch(html, /ds-meta/);
  assert.match(html, /Bare/);
});

test("a blocked row is marked, so the CSS can say so without colour alone", () => {
  assert.match(strip.rowHtml(ws({ status: "blocked" }), "#"), /ds-row--blocked/);
});

test("every value is escaped, including the theme key and the link", () => {
  const html = strip.rowHtml(
    ws({ title: "<script>a</script>", theme: '"><img src=x>', assignee: "<b>X</b>" }),
    '"><img src=y>');
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /&lt;script&gt;/);
});

test("the delivery line is a state, not a score", () => {
  assert.equal(
    strip.deliveryLine({ total: 267, delivered: 68, active: 134, blocked: 1, parked: 65 }),
    "68 of 267 delivered &middot; 134 in progress &middot; 1 blocked &middot; 65 parked");
  assert.equal(strip.deliveryLine({ total: 10, delivered: 0 }), "0 of 10 delivered",
    "a figure that is zero is omitted rather than stated as zero");
  assert.equal(strip.deliveryLine(null), "");
  assert.equal(strip.deliveryLine({ total: 0 }), "");
});
