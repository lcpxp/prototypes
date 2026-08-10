// ------------------------------------------------------------------
// tests/unit/roadmap-detail.test.js - Benchmarks for the item detail
// drawer and the AI-optimised JSON export (App.roadmapDetail). Loaded in
// a Node vm alongside ui.js, sprints.js and roadmap-views.js. Sandbox
// objects are JSON round-tripped into this realm before comparison.
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
    "assets/js/core/ui.js",
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
function plain(o) { return JSON.parse(JSON.stringify(o)); }

test("toKpiItem resolves theme, band and statuses into a lean object", () => {
  const App = load();
  const data = sample();
  const item = plain(App.roadmapDetail.toKpiItem(data.items[0], ctxOf(App, data)));
  assert.equal(item.theme, "Unity");
  assert.equal(item.department, "Product and Technology");
  assert.equal(item.band, "Now to Next");
  assert.equal(item.status, "In progress");
  assert.equal(item.prd_status, "Approved");
  assert.equal(item.project_status, "In progress");
  assert.equal(item.progress, 45);
  assert.equal(item.progress_label, "Halfway");
  assert.equal(item.start_sprint, "26-16");
  assert.equal(item.end_sprint, "26-18");
  assert.equal(item.team, "Core");
  assert.deepEqual(item.region, ["EU", "UK"]);
  assert.equal(item.prd_link, "https://example.com/prd");
});

test("toKpiItem sorts phases and omits null fields", () => {
  const App = load();
  const data = sample();
  const item = plain(App.roadmapDetail.toKpiItem(data.items[0], ctxOf(App, data)));
  assert.equal(item.phases.length, 2);
  assert.equal(item.phases[0].phase, "Discovery"); // sorted before Build
  assert.equal(item.phases[1].phase, "Build");
  assert.equal(item.phases[1].end_tbc, true);
  assert.ok(!("end" in item.phases[1]), "a null phase end is omitted");
});

test("toKpiItem on a bare item carries no empty keys", () => {
  const App = load();
  const data = sample();
  const item = plain(App.roadmapDetail.toKpiItem(data.items[1], ctxOf(App, data)));
  assert.equal(item.title, "Portal tooling");
  assert.ok(!("team" in item), "unset attributes are omitted");
  assert.ok(!("phases" in item), "no phases key when there are none");
  assert.ok(!("start_sprint" in item));
  assert.ok(!("department" in item), "an unset department is omitted");
});

test("toKpiRoadmap excludes portal scope and carries sprint context", () => {
  const App = load();
  const data = sample();
  const out = plain(App.roadmapDetail.toKpiRoadmap(data.items, ctxOf(App, data), "2026-07-17"));
  assert.equal(out.count, 1);
  assert.equal(out.items[0].id, "i2");
  assert.equal(out.sprint_context.anchor, "2025-12-22");
  assert.equal(out.sprint_context.current_sprint, "26-15");
});

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
  ctx.linksByItem = { [item.id]: [
    { kind: "part_of", reads: "Part of", family: "hierarchy",
      otherId: "ws1", note: "", confidence: "confirmed" },
    { kind: "distinct_from", reads: "Distinct from", family: "association",
      otherId: "ws1", note: "Different platform; no shared code.",
      confidence: "confirmed" },
  ] };
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

test("toKpiItem and toCsvRoadmap carry the extended context", () => {
  const App = load();
  const data = sample();
  const item = data.items[0];
  item.type = "feature";
  item.effort = "large";
  item.impact = "high";
  item.details = "Context";
  item.resolution = "Kept";
  item.requested_by = "COO";
  item.external_ref = "DEVOPS-123";
  item.tags = ["q3"];
  item.attributes.legacy_priority_tags = ["P1"];
  item.notes = [{ kind: "decision", body: "Why", created_at: "2026-07-18T09:00:00Z" }];
  const ctx = ctxOf(App, data);
  const kpi = plain(App.roadmapDetail.toKpiItem(item, ctx));
  assert.equal(kpi.type, "feature");
  assert.equal(kpi.effort, "large");
  assert.equal(kpi.impact, "high");
  assert.equal(kpi.priority, 20);
  assert.equal(kpi.details, "Context");
  assert.equal(kpi.resolution, "Kept");
  assert.equal(kpi.requested_by, "COO");
  assert.deepEqual(kpi.attributes, { legacy_priority_tags: ["P1"] }, "unknown attrs survive in the export");
  assert.deepEqual(kpi.notes, [{ kind: "decision", date: "2026-07-18", body: "Why" }]);
  const csv = App.roadmapDetail.toCsvRoadmap(data.items, ctx);
  const lines = csv.trim().split("\r\n");
  assert.match(lines[0], /,level,type,effort,impact,/, "the CSV names the new columns");
  assert.match(lines[0], /,related_to,requested_by,source_document_id,external_ref,resolution,details,/);
  assert.match(lines[1], /DEVOPS-123/);
});

test("the exports carry previously_completed_at as real delivered state", () => {
  const App = load();
  const data = sample();
  const item = data.items[0];
  item.status = "done";
  item.previously_completed_at = "2026-08-10T00:00:00Z";
  const ctx = ctxOf(App, data);
  const kpi = plain(App.roadmapDetail.toKpiItem(item, ctx));
  assert.equal(kpi.previously_completed_at, "2026-08-10T00:00:00Z",
    "the JSON export carries the latch");
  const csv = App.roadmapDetail.toCsvRoadmap(data.items, ctx);
  const lines = csv.trim().split("\r\n");
  assert.match(lines[0], /,previously_completed_at\b/, "the CSV names the latch column");
  assert.match(lines[1], /2026-08-10T00:00:00Z/, "the CSV row carries the value");
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

test("toCsvRoadmap emits a row per product item with resolved labels and attribute columns", () => {
  const App = load();
  const data = sample();
  const csv = App.roadmapDetail.toCsvRoadmap(data.items, ctxOf(App, data));
  const lines = csv.trim().split("\r\n");
  assert.match(lines[0], /^id,parent_id,parent_title,title,theme,area,department,business_areas,assignee,support_assignee,band,/);
  // Attributes are spread as attr_<key> columns, derived dynamically so a
  // new KPI field would appear with no code change.
  assert.match(lines[0], /attr_team/);
  assert.match(lines[0], /attr_pnl_vertical/);
  // Only i2 is product scope (i6 is portal), so one data row.
  assert.equal(lines.length, 2);
  assert.match(lines[1], /Unity integration/);
  assert.match(lines[1], /Product and Technology/);
  assert.match(lines[1], /Now to Next/);
  assert.equal(csv.endsWith("\r\n"), true);
});

test("toCsvRoadmap includes sub-items as their own rows with parent context and roll-up", () => {
  const App = load();
  const data = sample();
  data.items.push({ id: "i2c", parent_id: "i2", area_id: "a3", category_id: "c2",
    title: "Settlement", status: "planned", horizon: "now", presentation: "sequenced",
    priority: 30, sort_order: 30, attributes: {} });
  const csv = App.roadmapDetail.toCsvRoadmap(data.items, ctxOf(App, data));
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 3, "parent and child are both rows");
  const childLine = lines.find((l) => /Settlement/.test(l));
  assert.match(childLine, /^i2c,i2,Unity integration,Settlement,/);
  // Parent reports the sub-step roll-up: 1 total, 0 done (child is planned).
  const parentLine = lines.find((l) => /,Unity integration,/.test(l));
  assert.match(parentLine, /,Halfway,1,0,/);
});

test("csvFromRows unions keys and escapes RFC-4180 special characters", () => {
  const App = load();
  const csv = App.csvFromRows([
    { a: "plain", b: "has, comma" },
    { a: 'quote "x"', c: "new\nline" },
  ], ["a"]);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "a,b,c", "preferred column leads, union follows alphabetically");
  assert.equal(lines[1], 'plain,"has, comma",');
  assert.equal(lines[2], '"quote ""x""",,"new\nline"');
  assert.equal(csv.endsWith("\r\n"), true);
});
