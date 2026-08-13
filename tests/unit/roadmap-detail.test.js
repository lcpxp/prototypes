// ------------------------------------------------------------------
// tests/unit/roadmap-detail.test.js - Benchmarks for the item detail
// drawer (App.roadmapDetail.drawerHtml). Loaded in a Node vm alongside
// ui.js, detail.js, sprints.js and roadmap-views.js.
//
// The KPI/CSV export builders share this fixture and are benchmarked in
// roadmap-detail-export.test.js; they came out when this file passed
// its hard line budget.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = {
    navigator: {}, setTimeout, Date,
    location: { pathname: "/modules/roadmap/index.html", hash: "" },
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
    "assets/js/pages/roadmap-views.js",
    "assets/js/pages/roadmap-views-breakdown.js",
    "assets/js/pages/roadmap-detail.js",
    "assets/js/pages/roadmap-detail-export.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App;
}

function sample() {
  return {
    categories: [{ id: "c2", key: "unity", label: "Unity", description: "Unity work", sort_order: 20 }],
    areas: [
      { id: "a3", key: "unity-area", scope: "product", category_id: "c2", sort_order: 30 },
      { id: "a2", key: "portal", scope: "portal", category_id: null, sort_order: 20 },
    ],
    items: [
      { id: "i2", area_id: "a3", category_id: "c2", title: "Unity integration", summary: "Focus",
        status: "in_progress", horizon: "now", end_horizon: "next", presentation: "current",
        department: "product_technology",
        priority: 20, sort_order: 20, progress: 45, prd_status: "approved", project_status: "in_progress",
        starts_on: "2026-07-20", ends_on: "2026-09-01", start_sprint: "26-16", end_sprint: "26-18",
        updated_at: "2026-07-15T09:00:00Z",
        attributes: { pnl_vertical: "Payments", team: "Core", region: ["EU", "UK"], customer: "Strategic",
          merchant_value: "Value", pxp_value: "PXP", blockers: "None", prd_link: "https://example.com/prd" },
        phases: [
          { work_item_id: "i2", phase: "build", quarter: "Q3 2026", starts_on: "2026-07-20", ends_on: null, start_tbc: false, end_tbc: true, sort_order: 20 },
          { work_item_id: "i2", phase: "discovery", quarter: "Q2 2026", starts_on: "2026-04-06", ends_on: "2026-05-01", start_tbc: false, end_tbc: false, sort_order: 10 },
        ] },
      { id: "i6", area_id: "a2", category_id: null, title: "Portal tooling", status: "planned",
        horizon: "now", end_horizon: null, presentation: "sequenced", priority: 10, sort_order: 10, attributes: {} },
    ],
  };
}

function ctxOf(App, data) { return App.roadmapView.context(data); }

test("drawerHtml renders the facts, phases and an export button", () => {
  const App = load();
  const data = sample();
  const html = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  assert.match(html, /Unity integration/);
  assert.match(html, /Product and Technology/);
  assert.match(html, /Approved/);
  assert.match(html, /Discovery/);
  assert.match(html, /Build/);
  assert.match(html, /TBC/);
  assert.match(html, /id="rmd-export"[^>]*>Export JSON</);
});

test("drawerHtml surfaces the previously_completed_at latch only when set", () => {
  const App = load();
  const data = sample();
  const bare = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  assert.doesNotMatch(bare, /Moved to Previously completed/,
    "no latch row when the column is null");
  const latched = Object.assign({}, data.items[0],
    { status: "done", previously_completed_at: "2026-08-10T00:00:00Z" });
  const html = App.roadmapDetail.drawerHtml(latched, ctxOf(App, data));
  assert.match(html, /Moved to Previously completed<\/dt><dd>2026-08-10<\/dd>/,
    "the latch row shows the date the delivery was pinned to Previously");
});

test("drawerHtml surfaces the full stored context: details, classifiers, links, resolution and notes", () => {
  const App = load();
  const data = sample();
  data.items.push({ id: "ws1", area_id: "a3", category_id: "c2", level: "workstream",
    title: "Unity programme", status: "in_progress", horizon: "now", presentation: "current",
    priority: 10, sort_order: 5, attributes: {} });
  const item = data.items[0];
  item.parent_id = "ws1";
  item.type = "feature";
  item.effort = "large";
  item.impact = "high";
  item.details = "Long-form context\nwith a second line.";
  item.tags = ["priority", "q3"];
  item.requested_by = "COO";
  item.external_ref = "DEVOPS-123";
  item.resolution = "Descoped after review";
  item.resolved_at = "2026-07-20T10:00:00Z";
  item.attributes.legacy_priority_tags = ["P1", "board"];
  item.notes = [{ kind: "decision", body: "Promoted on partner deadline", created_at: "2026-07-18T09:00:00Z" }];
  // Typed links as roadmap.js indexes them: the reading that applies
  // from THIS end, so the drawer never has to know which way the row
  // was stored. Two kinds, to prove one row per reading.
  const ctx = ctxOf(App, data);
  ctx.linkIndex = App.links.index([
    { from_type: "work_item", from_id: item.id, to_type: "work_item", to_id: "ws1",
      kind: "part_of", note: "", confidence: "confirmed" },
    { from_type: "work_item", from_id: item.id, to_type: "work_item", to_id: "ws1",
      kind: "distinct_from", note: "Different platform; no shared code.",
      confidence: "confirmed" },
  ]);
  ctx.linkTitles = { "work_item:ws1": "Unity programme" };
  const html = App.roadmapDetail.drawerHtml(item, ctx);
  assert.match(html, /Long-form context/, "details text renders");
  assert.match(html, /<dt>Type<\/dt><dd>Feature/);
  assert.match(html, /<dt>Effort<\/dt><dd>Large/);
  assert.match(html, /<dt>Impact<\/dt><dd>High/);
  assert.match(html, /<dt>Priority<\/dt><dd>P2/);
  assert.match(html, /<dt>Workstream<\/dt><dd>Unity programme/, "parent resolves to its title");
  assert.match(html, /<dt>Part of<\/dt><dd><a class="rmd-link"[^>]*data-item-id="ws1">Unity programme<\/a>/,
    "a typed link renders under its own reading, clickable to the target");
  assert.match(html, /<dt>Distinct from<\/dt><dd><a[^>]*title="Different platform; no shared code\."/,
    "the adjudication note rides along, so the reason is never lost");
  assert.match(html, /<dt>Requested by<\/dt><dd>COO/);
  assert.match(html, /<dt>External ref<\/dt><dd>DEVOPS-123/);
  assert.match(html, /<dt>Tags<\/dt><dd>priority, q3/);
  assert.match(html, /<dt>Legacy priority tags<\/dt><dd>P1, board/,
    "an unhandled attributes key still renders as a fact row");
  assert.match(html, /Resolution \(2026-07-20\)/, "the closing reason and date show");
  assert.match(html, /Descoped after review/);
  assert.match(html, /Notes and decisions/);
  assert.match(html, /Promoted on partner deadline/);
});

test("a work item links out to entity types other than work items", () => {
  // The bug: roadmap.js selected knowledge_links without from_type or
  // to_type and resolved the far end through the work-items map, so a
  // link to a capability, term, stage or document rendered as nothing
  // at all - two of 49 ordered type pairs were visible.
  const App = load();
  const data = sample();
  const item = data.items[0];
  const ctx = ctxOf(App, data);
  ctx.linkIndex = App.links.index([
    { from_type: "work_item", from_id: item.id, to_type: "capability", to_id: "c1",
      kind: "affects", note: "", confidence: "confirmed" },
    { from_type: "work_item", from_id: item.id, to_type: "term", to_id: "t1",
      kind: "about", note: "", confidence: "proposed" },
  ]);
  ctx.linkTitles = { "capability:c1": "Screening", "term:t1": "Rolling reserve" };
  const html = App.roadmapDetail.drawerHtml(item, ctx);
  assert.match(html, /<dt>Affects<\/dt><dd><a class="rmd-link" href="[^"]*capability-c1"/,
    "a capability target renders as a real link to the platform page");
  assert.match(html, /Screening <span class="rmd-link-type">Capability<\/span>/,
    "and says what kind of thing it is");
  assert.match(html, /<dt>About<\/dt><dd><a class="rmd-link" href="[^"]*#term-t1"/,
    "a term now has an anchor on the platform page, so it is a real link");
  assert.match(html, /Rolling reserve <span class="rmd-link-type">Glossary term<\/span>/);
});

test("a proposed link is marked as proposed; a confirmed one is not", () => {
  // knowledge_links.confidence was carried through App.links and shown
  // nowhere, so a reader could not tell an assistant's suggestion from
  // the owner's decision. It was the one declared hole in
  // tests/checks/render-coverage.test.js.
  const App = load();
  const data = sample();
  const item = data.items[0];
  const ctx = ctxOf(App, data);
  ctx.linkIndex = App.links.index([
    { from_type: "work_item", from_id: item.id, to_type: "capability", to_id: "c1",
      kind: "affects", note: "", confidence: "proposed" },
    { from_type: "work_item", from_id: item.id, to_type: "capability", to_id: "c2",
      kind: "relates_to", note: "", confidence: "confirmed" },
  ]);
  ctx.linkTitles = { "capability:c1": "Screening", "capability:c2": "Pricing" };
  const html = App.roadmapDetail.drawerHtml(item, ctx);
  const marks = html.match(/badge tone-warn">proposed/g) || [];
  assert.equal(marks.length, 1, "exactly one of the two links is proposed");
  assert.match(html, /Screening[\s\S]{0,140}?badge tone-warn">proposed/,
    "the proposed one is the Screening link, using the same badge an " +
    "unverified row uses");
  const confirmedRow = (html.match(/<dt>Related to<\/dt><dd>[\s\S]*?<\/dd>/) || [""])[0];
  assert.match(confirmedRow, /Pricing/, "the confirmed link is in the Related to row");
  assert.doesNotMatch(confirmedRow, /proposed/,
    "a confirmed link carries no marker - confirmed is the unremarkable case");
});

test("a link to a type with no page renders flat, not as a dead link", () => {
  // `note` is the only type left without a destination: a note always
  // renders inside the thing it is about, so it has no page of its own.
  const App = load();
  const data = sample();
  const item = data.items[0];
  const ctx = ctxOf(App, data);
  ctx.linkIndex = App.links.index([
    { from_type: "work_item", from_id: item.id, to_type: "note", to_id: "n1",
      kind: "relates_to", note: "", confidence: "confirmed" },
  ]);
  ctx.linkTitles = { "note:n1": "Agreed at the 10 Aug review" };
  const html = App.roadmapDetail.drawerHtml(item, ctx);
  assert.match(html, /<span class="rmd-link rmd-link--flat"/);
  assert.match(html, /Agreed at the 10 Aug review <span class="rmd-link-type">Note<\/span>/,
    "the relationship is a fact even with nowhere to open");
  assert.doesNotMatch(html, /href="[^"]*note-n1"/, "no anchor is invented for it");
});

test("a column no field list knows about still reaches the drawer", () => {
  // The ask, on the surface it was asked about: "no matter what new
  // information is added to a roadmap item in the future, it will
  // always be showing all the information available". Add a column to
  // work_items and it renders here with no edit to roadmap-detail.js.
  const App = load();
  const data = sample();
  const item = data.items[0];
  item.risk_rating = "amber";
  item.owner_email = "ops@example.com";
  const html = App.roadmapDetail.drawerHtml(item, ctxOf(App, data));
  assert.match(html, /Also recorded against this item/,
    "and it is grouped, so a reader can tell it from a curated fact");
  assert.match(html, /<dt>Risk rating<\/dt><dd>amber<\/dd>/);
  assert.match(html, /<dt>Owner email<\/dt><dd>ops@example\.com<\/dd>/);
});

test("a column the drawer already renders is not repeated in the overflow", () => {
  const App = load();
  const data = sample();
  const item = data.items[0];
  const html = App.roadmapDetail.drawerHtml(item, ctxOf(App, data));
  assert.doesNotMatch(html, /Also recorded against this item/,
    "a fully-mapped row overflows nothing");
  // The pairs one row speaks for: an end date belongs to Dates, an end
  // horizon to Band, a support assignee to Assignee. Declaring them as
  // `also` is what stops each turning up twice.
  for (const label of ["Ends on", "End horizon", "End sprint", "Support assignee"]) {
    assert.doesNotMatch(html, new RegExp("<dt>" + label + "</dt>"),
      `${label} is folded into another row, not repeated`);
  }
  assert.match(html, /<dt>Dates<\/dt><dd>2026-07-20 to 2026-09-01<\/dd>/,
    "and the row it folds into still shows both ends");
});

test("the drawer's fact rows keep their declared order", () => {
  const App = load();
  const data = sample();
  const html = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  const order = ["Theme", "Department", "Band", "Status", "Progress", "Dates", "Sprints"];
  let at = -1;
  for (const label of order) {
    const next = html.indexOf("<dt>" + label + "</dt>");
    assert.ok(next > at, `${label} must follow the row before it`);
    at = next;
  }
});

test("a set milestone renders, with its date where it has one", () => {
  // roadmap_milestones holds no rows today and is kept deliberately
  // (docs/plan/00-PROGRAMME.md). Keeping it makes milestone_id a live
  // column, and a live column that no view renders is the exact defect
  // this programme is clearing out: the first milestone anybody set
  // would have been stored, fetched and invisible.
  const App = load();
  const data = sample();
  const item = data.items[0];
  item.milestone_id = "m1";
  const ctx = ctxOf(App, data);
  ctx.milestoneById = {
    m1: { id: "m1", title: "Unity go-live", due_on: "2026-09-30" },
    m2: { id: "m2", title: "Undated checkpoint", due_on: null },
  };
  const html = App.roadmapDetail.drawerHtml(item, ctx);
  assert.match(html, /<dt>Milestone<\/dt><dd>Unity go-live \(2026-09-30\)<\/dd>/);

  item.milestone_id = "m2";
  assert.match(App.roadmapDetail.drawerHtml(item, ctx),
    /<dt>Milestone<\/dt><dd>Undated checkpoint<\/dd>/,
    "a milestone with no due date still names itself");
});

test("an unset or unresolvable milestone adds no row", () => {
  const App = load();
  const data = sample();
  const item = data.items[0];
  const ctx = ctxOf(App, data);
  ctx.milestoneById = { m1: { id: "m1", title: "Unity go-live", due_on: "2026-09-30" } };
  assert.doesNotMatch(App.roadmapDetail.drawerHtml(item, ctx), /<dt>Milestone<\/dt>/,
    "no milestone_id, no row");

  item.milestone_id = "gone";
  assert.doesNotMatch(App.roadmapDetail.drawerHtml(item, ctx), /<dt>Milestone<\/dt>/,
    "an id the viewer cannot read renders nothing rather than a blank row");

  item.milestone_id = "m1";
  assert.doesNotMatch(App.roadmapDetail.drawerHtml(item, ctxOf(App, data)),
    /<dt>Milestone<\/dt>/,
    "and a context that never loaded the map at all is survivable");
});

test("a milestone title is escaped like every other value", () => {
  const App = load();
  const data = sample();
  const item = data.items[0];
  item.milestone_id = "m1";
  const ctx = ctxOf(App, data);
  ctx.milestoneById = { m1: { id: "m1", title: "<img src=x>", due_on: "2026-09-30" } };
  const html = App.roadmapDetail.drawerHtml(item, ctx);
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /&lt;img src=x&gt;/);
});

test("drawerHtml tags a workstream and stays lean on a bare item", () => {
  const App = load();
  const data = sample();
  data.items[1].level = "workstream";
  const ws = App.roadmapDetail.drawerHtml(data.items[1], ctxOf(App, data));
  assert.match(ws, /rmv-ws-tag">Workstream/, "the head carries the workstream tag");
  assert.doesNotMatch(ws, /<dt>Type</, "unset fields add no rows");
  assert.doesNotMatch(ws, /Notes and decisions/, "no notes section without notes");
  assert.doesNotMatch(ws, /Resolution/, "no resolution section without one");
});

test("drawerHtml escapes hostile content", () => {
  const App = load();
  const data = sample();
  data.items[0].title = '<img src=x onerror=alert(1)>';
  const html = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
});

test("drawerHtml lists an item's children as deliverables (drawer only)", () => {
  const App = load();
  const data = sample();
  // A child of a work item is a deliverable by position.
  data.items.push({ id: "i2s", parent_id: "i2", area_id: "a3", category_id: "c2",
    title: "Settlement", status: "planned", horizon: "now", presentation: "sequenced",
    priority: 30, sort_order: 30, attributes: {} });
  const html = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  assert.match(html, /<h3>Deliverables<\/h3>/);
  assert.match(html, /Deliverables: 0 of 1 done/);
  assert.match(html, /rmv-step-title">Settlement/);
  assert.doesNotMatch(html, /<h3>Work items<\/h3>/, "a plain item has no work-items section");
});

test("drawerHtml splits a workstream's work items from its deliverables", () => {
  const App = load();
  const data = sample();
  data.items[0].level = "workstream"; // i2 becomes a workstream
  data.items.push({ id: "wi", parent_id: "i2", area_id: "a3", category_id: "c2",
    title: "Rollout", level: "item", status: "planned", horizon: "now",
    presentation: "sequenced", priority: 10, sort_order: 10, attributes: {} });
  data.items.push({ id: "dv", parent_id: "i2", area_id: "a3", category_id: "c2",
    title: "Spec doc", level: "deliverable", status: "done", horizon: "now",
    presentation: "sequenced", priority: 20, sort_order: 20, attributes: {} });
  const html = App.roadmapDetail.drawerHtml(data.items[0], ctxOf(App, data));
  assert.match(html, /<h3>Work items<\/h3>[\s\S]*?rmv-step-title">Rollout/,
    "the nested work item lists under Work items");
  assert.match(html, /<h3>Deliverables<\/h3>[\s\S]*?rmv-step-title">Spec doc/,
    "the deliverable lists under Deliverables");
  // The work-items list itself carries only the work item, not the deliverable.
  const itemUl = html.match(/rmv-item-list">([\s\S]*?)<\/ul>/)[1];
  assert.match(itemUl, /Rollout/);
  assert.doesNotMatch(itemUl, /Spec doc/, "the deliverable is not in the work-items list");
});

