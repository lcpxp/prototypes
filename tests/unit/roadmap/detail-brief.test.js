// ------------------------------------------------------------------
// tests/unit/roadmap/detail-brief.test.js - Benchmarks for "Where it
// stands", the current-state brief at the top of the work item drawer
// (assets/js/pages/roadmap/detail-brief.js), and for the drawer's
// reading of the two sprint-card fields it shares: scope and the
// ceilings a stream lifts.
//
// The claim under test is that the brief is composed ONLY from data
// that is current by construction - the live allocation, the stream's
// order, and notes whose status says they are still open - so it can
// never repeat history the record below it already holds.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    navigator: {}, setTimeout, Date,
    location: { pathname: "/modules/sprints/index.html", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/registry.js",
    "assets/js/core/links.js",
    "assets/js/core/ui.js",
    "assets/js/core/detail.js",
    "assets/js/core/sprints.js",
    "assets/js/pages/roadmap/views.js",
    "assets/js/pages/roadmap/detail-values.js",
    "assets/js/pages/roadmap/detail-brief.js",
    "assets/js/pages/roadmap/detail.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App;
}

function al(slot, end, seq, extra) {
  return Object.assign({ effective_slot: slot, effective_end_slot: end, span: end - slot + 1,
    sequence_position: seq, overlap: "overlappable", is_external: false,
    external_party: null, external_status: null, start_code: null, end_code: null }, extra);
}

// One workstream, three planned steps (one built by an outside party,
// deliberately listed out of order) and one programme row further out
// that the sprint plan does not carry.
function sample() {
  const items = [
    { id: "ws", level: "workstream", title: "Payment setup", status: "planned",
      scope: "finite", summary: "Automate setup.", horizon: "now", priority: 10, sort_order: 10,
      scale_notes: ["Manual setup **caps throughput at 8-10 merchants a day**; automating it **removes the ceiling**."],
      attributes: {} },
    { id: "s2", parent_id: "ws", level: "item", title: "Build the endpoints", status: "planned",
      summary: "Extend the V5 API.", horizon: "now", priority: 20, sort_order: 20, attributes: {},
      allocation: al(0, 1, 2, { is_external: true, external_party: "Payment Service", external_status: "requested" }) },
    { id: "s1", parent_id: "ws", level: "item", title: "Map the process", status: "in_progress",
      summary: "Record every step.", horizon: "now", priority: 10, sort_order: 10, attributes: {},
      allocation: al(0, 0, 1) },
    { id: "s3", parent_id: "ws", level: "item", title: "Cut over", status: "planned",
      summary: "Retire the manual route.", horizon: "now", priority: 30, sort_order: 30, attributes: {},
      allocation: al(2, 2, 3) },
    { id: "later", parent_id: "ws", level: "item", title: "Programme row further out", status: "idea",
      summary: "Not on the plan.", horizon: "later", priority: 40, sort_order: 40, attributes: {} },
  ];
  return { categories: [], areas: [], items };
}
function ctxOf(App, data) { return App.roadmapView.context(data); }
function byId(data, id) { return data.items.find((i) => i.id === id); }

test("a workstream's brief is its current plan, in sprint order, with each step's summary", () => {
  const App = load();
  const data = sample();
  const html = App.roadmapDetail.drawerHtml(byId(data, "ws"), ctxOf(App, data), "ready");
  assert.match(html, /<h3 id="rmd-brief-h">Where it stands<\/h3>/);
  assert.match(html, /When<\/dt><dd>Sprints 1 to 3</, "the span in the board's words");
  assert.match(html, /Planned<\/dt><dd>3 steps, 1 built outside the team</);
  assert.match(html, /Shape<\/dt><dd>Finite scope - this one ends</);
  const plan = html.slice(html.indexOf('class="rmd-plan"'));
  const order = ["Map the process", "Build the endpoints", "Cut over"].map((t) => plan.indexOf(t));
  assert.ok(order.every((n, i) => n > -1 && (i === 0 || n > order[i - 1])),
    "steps follow sprint then sequence position, not the order rows arrived in");
  assert.match(plan, /rmd-plan-sum">Extend the V5 API\.</, "each step says what it does");
  assert.match(plan, /rmd-plan-by">Payment Service - requested</, "and who builds it when it is not us");
  assert.doesNotMatch(plan.slice(0, plan.indexOf("</ol>")), /Programme row further out/,
    "a row with no allocation is not part of the current plan");
});

test("an item's brief places it in its stream: step, neighbours, builder", () => {
  const App = load();
  const data = sample();
  const html = App.roadmapDetail.drawerHtml(byId(data, "s2"), ctxOf(App, data), "ready");
  assert.match(html, /When<\/dt><dd>Sprints 1 to 2</);
  assert.match(html, /Step<\/dt><dd>2 of 3 in <a class="rmd-link" href="\?item=ws" data-item-id="ws">Payment setup</);
  assert.match(html, /Follows<\/dt><dd><a [^>]*data-item-id="s1">Map the process</);
  assert.match(html, /Leads into<\/dt><dd><a [^>]*data-item-id="s3">Cut over</);
  assert.match(html, /Built by<\/dt><dd>Payment Service - requested</);
  const first = App.roadmapDetail.drawerHtml(byId(data, "s1"), ctxOf(App, data), "ready");
  assert.doesNotMatch(first, /Follows</, "the first step follows nothing");
});

test("the brief leads the drawer and the fact grid folds beneath it", () => {
  const App = load();
  const data = sample();
  const it = byId(data, "s2");
  it.pxp_staff_value = "An operator stops configuring by hand.";
  const html = App.roadmapDetail.drawerHtml(it, ctxOf(App, data), "ready");
  const at = (s) => html.indexOf(s);
  assert.ok(at("rmd-summary") < at('class="rmd-brief"'), "summary, then where it stands");
  assert.ok(at('class="rmd-brief"') < at('class="rmd-benefit"'), "then what it buys");
  assert.match(html, /<details class="rmd-fold rmd-fold--facts"><summary>All recorded fields<\/summary><dl class="rmd-facts">/,
    "the full field list is one click away, not in the way");
});

test("still open lists live questions, risks and actions - never decisions or closed notes", () => {
  const App = load();
  const data = sample();
  const it = byId(data, "s1");
  it.notes = [
    { kind: "decision", status: "active", body: "Re-mapped on 21 Sep. A history line." },
    { kind: "question", status: "resolved", body: "Answered already." },
    { kind: "action", status: "active", body: "Ask EIT for the status list. Then more reasoning." },
    { kind: "risk", status: "active", body: "Sandbox and production are out of sync." },
    { kind: "question", status: "active", body: "Who pays for pre-screening? The rest explains." },
    { kind: "question", status: "active", inherited: true, body: "An area note." },
  ];
  const html = App.roadmapDetail.drawerHtml(it, ctxOf(App, data), "ready");
  const open = html.slice(html.indexOf('class="rmd-open"'), html.indexOf("</ul>", html.indexOf('class="rmd-open"')));
  assert.match(open, /Open question<\/span> Who pays for pre-screening\?</, "the point, not the reasoning");
  assert.match(open, /Live risk<\/span> Sandbox and production are out of sync\.</);
  assert.match(open, /Open action<\/span> Ask EIT for the status list\.</);
  assert.ok(open.indexOf("Open question") < open.indexOf("Live risk") &&
    open.indexOf("Live risk") < open.indexOf("Open action"), "asks first, then watches, then tasks");
  for (const gone of [/Re-mapped/, /Answered already/, /An area note/]) {
    assert.doesNotMatch(open, gone, "history and closed notes stay in the record below");
  }
  assert.match(html, /Re-mapped on 21 Sep/, "which still carries every note in full");
});

test("a long first sentence is cut at a word, and nothing is left open when nothing is", () => {
  const App = load();
  const line = App.roadmapDetailBrief.firstLine("word ".repeat(80) + "end.");
  assert.ok(line.length <= 184 && /word\.\.\.$/.test(line), line);
  const data = sample();
  const html = App.roadmapDetail.drawerHtml(byId(data, "s3"), ctxOf(App, data), "ready");
  assert.doesNotMatch(html, /Still open/, "no heading over an empty list");
});

test("work that is not on the sprint plan gets no brief", () => {
  const App = load();
  const data = sample();
  const html = App.roadmapDetail.drawerHtml(byId(data, "later"), ctxOf(App, data), "ready");
  assert.doesNotMatch(html, /Where it stands/);
});

test("the brief escapes everything it prints", () => {
  const App = load();
  const data = sample();
  byId(data, "s1").title = "<script>alert(1)</script>";
  byId(data, "s1").notes = [{ kind: "risk", status: "active", body: "<img src=x onerror=alert(1)>." }];
  const html = App.roadmapDetail.drawerHtml(byId(data, "s1"), ctxOf(App, data), "ready") +
    App.roadmapDetail.drawerHtml(byId(data, "ws"), ctxOf(App, data), "ready");
  assert.doesNotMatch(html, /<script>alert|<img src=x/);
});

test("the ceilings a stream lifts read with their cap emphasised, and never leak raw", () => {
  const App = load();
  const data = sample();
  const ws = byId(data, "ws");
  ws._recentDone = false;
  const html = App.roadmapDetail.drawerHtml(ws, ctxOf(App, data), "ready");
  assert.match(html, /What it unlocks<\/h4><ul class="rmd-points rmd-unlocks"><li>Manual setup <strong class="rm-em">caps throughput at 8-10 merchants a day<\/strong>; automating it <strong class="rm-em">removes the ceiling<\/strong>\.<\/li>/);
  assert.doesNotMatch(html, /\*\*/, "the markers never reach the reader");
  assert.doesNotMatch(html, /Scale notes|RecentDone|Recent done/,
    "neither the stored list nor the page's own flag appears as a raw row");
  assert.doesNotMatch(html, /<dd>finite<\/dd>/, "scope is stated in words, never as its key");
});

test("emphasis escapes first, so a marker cannot smuggle markup in", () => {
  const App = load();
  const em = App.roadmapDetailValues.emphasis;
  assert.equal(em("**<b>x</b>**"), '<strong class="rm-em">&lt;b&gt;x&lt;/b&gt;</strong>');
  assert.equal(em("no markers"), "no markers");
  assert.equal(em("**unclosed"), "**unclosed", "an unpaired marker is left as typed");
});

test("a workstream lists its work items again only when the plan does not already", () => {
  // The roadmap page hands the drawer the whole programme, so the full
  // list still earns its place; the sprint page hands it only the plan,
  // and the same titles twice is noise.
  const App = load();
  const data = sample();
  const full = App.roadmapDetail.drawerHtml(byId(data, "ws"), ctxOf(App, data), "ready");
  assert.match(full, /<h3>Work items<\/h3>/, "a programme row outside the plan keeps the list");
  data.items = data.items.filter((i) => i.id !== "later");
  const plan = App.roadmapDetail.drawerHtml(byId(data, "ws"), ctxOf(App, data), "ready");
  assert.doesNotMatch(plan, /<h3>Work items<\/h3>/, "the plan already says it");
});
