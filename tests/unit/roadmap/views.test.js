// ------------------------------------------------------------------
// tests/unit/roadmap/views.test.js - Benchmarks for the roadmap home's
// pure builders (App.roadmapView in roadmap-views.js + the exec board in
// roadmap-views-exec.js + the cascade half in roadmap-views-cascade.js).
// Loaded in a Node vm alongside registry.js (departments) and ui.js
// (App.escape). One dataset drives the levels:
//   Workstreams - the strategic gantt: workstream bars only.
//   Executive   - department-first rollup: each department, the
//                 categories it owns and their item counts.
//   Team        - active work at item level; a parent's nested items
//                 list under its bar/card by default; Detailed adds a
//                 Category -> Area -> item breakdown.
//   Backlog     - the master list: every item, all scopes (mirrors the
//                 backlog module), active + parked + delivered.
// Placement derives from an item's own fields; sub-items (parent_id set)
// are never placed as their own bars.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadView, sampleData } = require("../../lib/roadmap.js");

function count(html, re) { return (html.match(re) || []).length; }

test("colStart/colEnd map horizon, span, done and dropped to the axis", () => {
  const V = loadView();
  // Done work splits by recency: historic lands in Previously (0), recent
  // in Recently (1). An unmarked done item defaults to Previously.
  assert.deepEqual([V.colStart({ status: "done", horizon: "now" }), V.colEnd({ status: "done", horizon: "now" })], [0, 0]);
  assert.deepEqual([V.colStart({ status: "done", _recentDone: true }), V.colEnd({ status: "done", _recentDone: true })], [1, 1]);
  assert.deepEqual([V.colStart({ status: "in_progress", horizon: "now" }), V.colEnd({ status: "in_progress", horizon: "now" })], [2, 2]);
  assert.deepEqual([V.colStart({ status: "in_progress", horizon: "now", end_horizon: "next" }), V.colEnd({ status: "in_progress", horizon: "now", end_horizon: "next" })], [2, 3]);
  assert.deepEqual([V.colStart({ status: "idea", horizon: "someday" }), V.colEnd({ status: "idea", horizon: "someday" })], [5, 5]);
  assert.deepEqual([V.colStart({ status: "dropped", horizon: "later" }), V.colEnd({ status: "dropped", horizon: "later" })], [5, 5]);
  assert.equal(V.colEnd({ status: "planned", horizon: "next", end_horizon: "now" }), 3);
});

test("markRecency splits done work on the 90-day window", () => {
  const V = loadView();
  const now = Date.parse("2026-08-10T00:00:00Z");
  const items = [
    { status: "done", resolved_at: "2026-07-14T00:00:00Z" },      // 27 days: recent
    { status: "done", resolved_at: "2026-04-01T00:00:00Z" },      // >90 days: historic
    { status: "done", updated_at: "2026-08-01T00:00:00Z" },       // no resolved_at, falls back: recent
    { status: "done" },                                           // no timestamp: historic
    { status: "in_progress", updated_at: "2026-08-01T00:00:00Z" },// not done
  ];
  V.markRecency(items, now);
  assert.deepEqual(items.map((i) => i._recentDone), [true, false, true, false, false]);
});

test("markRecency latches a delivery to Previously via previously_completed_at", () => {
  const V = loadView();
  const now = Date.parse("2026-08-10T00:00:00Z");
  const items = [
    // Closed yesterday, so inside the window - but latched to Previously.
    { status: "done", resolved_at: "2026-08-09T00:00:00Z",
      previously_completed_at: "2026-08-10T00:00:00Z" },
    // The same recent close with no latch reads as Recently completed.
    { status: "done", resolved_at: "2026-08-09T00:00:00Z" },
  ];
  V.markRecency(items, now);
  assert.deepEqual(items.map((i) => i._recentDone), [false, true],
    "the latch pins a recent delivery to Previously; clearing it restores Recently");
});

test("isActive and isParked classify by the item's own fields", () => {
  const V = loadView();
  assert.equal(V.isActive({ status: "in_progress", horizon: "now" }), true);
  assert.equal(V.isActive({ status: "done", horizon: "now" }), false);
  assert.equal(V.isParked({ status: "idea", horizon: "someday" }), true);
  assert.equal(V.isParked({ status: "dropped", horizon: "later" }), true);
  assert.equal(V.isParked({ status: "done", horizon: "now" }), false);
});

test("productItems keeps product scope; topLevel drops sub-items", () => {
  const V = loadView();
  const scope = { a1: "product", a2: "portal", a3: "product", a4: "product" };
  const kept = V.productItems(sampleData().items, scope);
  assert.equal(kept.length, 8, "portal item excluded, sub-items still present");
  assert.ok(kept.every((i) => i.area_id !== "a2"));
  const tops = V.topLevel(kept);
  assert.equal(tops.length, 6, "the two sub-items drop out of the placed set");
  assert.ok(!tops.some((i) => i.parent_id), "no sub-item survives topLevel");
});

test("productItems keeps unfiled work (no area / no scope); only portal is hidden", () => {
  const V = loadView();
  const scope = { a1: "product", a2: "portal" };
  const items = [
    { id: "p1", area_id: "a1", title: "Filed product" },
    { id: "p2", area_id: "a2", title: "Portal internal" },
    { id: "p3", area_id: null, title: "Unfiled workstream" },
    { id: "p4", area_id: "unknown", title: "Area with no scope" },
  ];
  const kept = V.productItems(items, scope);
  assert.deepEqual(kept.map((i) => i.id), ["p1", "p3", "p4"],
    "portal excluded; unfiled and unknown-scope work stays visible");
});

test("timeline (workstreams) surfaces a workstream with no filing area under General", () => {
  const V = loadView();
  const data = sampleData();
  data.items.push({ id: "ws0", area_id: null, category_id: null, title: "Hand over",
    level: "workstream", status: "in_progress", horizon: "now", end_horizon: "next",
    presentation: "ongoing", priority: 5, sort_order: 5, updated_at: "2026-07-20T09:00:00Z" });
  const html = V.timeline(data, "workstreams");
  assert.match(html, /Hand over/, "an unfiled workstream still renders on the strategic gantt");
});

test("timeline (team) spans active bars, hides parked/portal, nests sub-items under their parent", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "team");
  // Every band head is a collapse toggle; the labels read in axis order.
  assert.match(html, />Previously completed<.*>Recently completed<.*>Now<.*>Next<.*>Later</s);
  assert.doesNotMatch(html, />Parked</, "Team has no Parked column");
  // i1 is delivered but unmarked here, so it lands in Previously (band 0).
  assert.match(html, /rmv-tl-bar--done[^"]*"[^>]*grid-column:2 \/ 3/);
  assert.match(html, /grid-column:4 \/ 6"><span class="rmv-tl-title">Portal overhaul/);
  assert.doesNotMatch(html, /US market/, "parked item hidden from Team");
  assert.doesNotMatch(html, /Whitelist blacklist/, "dropped item hidden from Team");
  assert.doesNotMatch(html, /Portal tooling/, "portal item hidden from Team");
  // The board is bars only: an item's deliverables never appear (they are
  // drawer-only), and there are no checklists rendered inline.
  assert.doesNotMatch(html, /Merchant Group/, "a deliverable never reaches the board");
  assert.doesNotMatch(html, /Settlement/, "a deliverable never reaches the board");
  assert.doesNotMatch(html, /rmv-tl-steps|rmv-steps/, "no inline checklists on the board");
});

test("timeline (team) renders a workstream's nested work items as indented child bars, not its deliverables", () => {
  const V = loadView();
  const data = sampleData();
  data.items[1].level = "workstream"; // i2 Unity integration becomes a workstream
  const html = V.timeline(data, "team");
  // The nested work item (i2b Settlement, level='item') is its own bar,
  // marked as a child; the deliverable (i2a Merchant Group) is not.
  assert.match(html, /rmv-tl-row--child[\s\S]*?rmv-tl-bar[\s\S]*?Settlement/,
    "the nested work item renders as an indented child bar");
  assert.doesNotMatch(html, /Merchant Group/, "the workstream's deliverable stays off the board");
  assert.match(html, /rmv-tl-bar--ws[\s\S]*?Unity integration/, "the workstream bar is marked");
});

test("timeline (team) orders by start band, then span length, then priority", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "team");
  const order = ["Core onboarding", "Unity integration", "Portal overhaul", "Growth bet"];
  const positions = order.map((t) => html.indexOf(t));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "rows are in band+span order");
});

// The Executive (Categories) board benchmarks live in
// roadmap-views-exec.test.js, split from here per the size-budget exit plan.

test("team detailed adds a Category -> Area breakdown with department tags and deliverables", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "team", { expanded: true });
  assert.match(html, /rmv-td-area-name">Unity area</, "the work area is surfaced");
  assert.match(html, /rmv-td-title">Unity integration/);
  assert.match(html, /rmv-td-dept">Product and Technology/, "the owning department is tagged");
  // i2's children are deliverables (by position): the breakdown lists them
  // as its deliverables, one done.
  assert.match(html, /Deliverables: 1 of 2 done/);
  assert.match(html, /rmv-step-title">Merchant Group/);
  assert.match(html, /rmv-step--done[^>]*>[^<]*<span[^>]*><\/span><span class="rmv-step-title">Merchant Group/);
  assert.match(html, /rmv-step-title">Settlement/);
});

test("timeline (backlog) mirrors the master list: every top-level item, all scopes, not sub-items", () => {
  const V = loadView();
  const html = V.timeline(sampleData(), "backlog");
  assert.match(html, />Parked</, "Backlog carries the Parked column");
  ["Core onboarding", "Unity integration", "Portal overhaul", "US market", "Whitelist blacklist",
    "Growth bet", "Portal tooling"]
    .forEach((t) => assert.match(html, new RegExp(t), `${t} present in Backlog`));
  assert.match(html, /Portal tooling/, "portal-scope item now surfaces in the Backlog master list");
  assert.doesNotMatch(html, /Merchant Group/, "a deliverable is not a backlog bar");
  assert.match(html, /rmv-tl-bar--parked[^"]*"[^>]*grid-column:7 \/ 8/);
});

test("deliverables never render as bars, on any level, whatever their parentage", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "ws", area_id: "a1", category_id: "c1", title: "Big workstream", level: "workstream",
        status: "in_progress", horizon: "now", presentation: "current", priority: 10, sort_order: 10 },
      // A deliverable under the workstream (drawer only).
      { id: "dv", parent_id: "ws", area_id: "a1", category_id: "c1", title: "Deliverable A",
        level: "deliverable", status: "planned", horizon: "now", presentation: "sequenced",
        priority: 20, sort_order: 20 },
      // A child of a WORK ITEM: a deliverable by position, even stored as an item.
      { id: "wi", area_id: "a1", category_id: "c1", title: "Standalone item", level: "item",
        status: "planned", horizon: "now", presentation: "sequenced", priority: 30, sort_order: 30 },
      { id: "wic", parent_id: "wi", area_id: "a1", category_id: "c1", title: "Positional deliverable",
        level: "item", status: "planned", horizon: "now", presentation: "sequenced",
        priority: 40, sort_order: 40 },
      // A parentless deliverable (bad data): still never a bar.
      { id: "orphan", area_id: "a1", category_id: "c1", title: "Orphan deliverable",
        level: "deliverable", status: "planned", horizon: "now", presentation: "sequenced",
        priority: 50, sort_order: 50 },
    ],
  };
  ["team", "backlog"].forEach((level) => {
    const tl = V.timeline(data, level);
    assert.doesNotMatch(tl, /Deliverable A/, `deliverable hidden on ${level} timeline`);
    assert.doesNotMatch(tl, /Positional deliverable/, `item's child hidden on ${level} timeline`);
    assert.doesNotMatch(tl, /Orphan deliverable/, `parentless deliverable hidden on ${level} timeline`);
    assert.match(tl, /Big workstream/);
    assert.match(tl, /Standalone item/);
    const cas = V.cascade(data, level);
    assert.doesNotMatch(cas, /Deliverable A|Positional deliverable|Orphan deliverable/,
      `deliverables hidden on ${level} cascade`);
  });
});

test("loose items interleave by priority; workstreams win ties so they lead by default", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "std", area_id: "a1", category_id: "c1", title: "Standalone piece", level: "item",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        department: "product_technology", priority: 100, sort_order: 10 },
      { id: "ws", area_id: "a1", category_id: "c1", title: "Big workstream", level: "workstream",
        status: "in_progress", horizon: "now", end_horizon: null, presentation: "current",
        department: "product_technology", priority: 100, sort_order: 20 },
    ],
  };
  // At equal (default) priority the workstream naturally leads its band.
  const tied = V.timeline(data, "team");
  assert.ok(tied.indexOf("Big workstream") < tied.indexOf("Standalone piece"),
    "the workstream outranks the loose item on a priority tie");
  // A deliberately promoted loose item rises above the workstream.
  data.items[0].priority = 10;
  const promoted = V.timeline(data, "team");
  assert.ok(promoted.indexOf("Standalone piece") < promoted.indexOf("Big workstream"),
    "an explicitly better priority number lifts the loose item over the workstream");
});

test("a bug sinks below other work in its band, whatever its priority", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "bug", area_id: "a1", category_id: "c1", title: "Urgent-looking bug", level: "item", type: "bug",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        department: "product_technology", priority: 10, sort_order: 10 },
      { id: "feat", area_id: "a1", category_id: "c1", title: "Planned feature", level: "item", type: "feature",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        department: "product_technology", priority: 90, sort_order: 20 },
    ],
  };
  const tl = V.timeline(data, "team");
  assert.ok(tl.indexOf("Planned feature") < tl.indexOf("Urgent-looking bug"),
    "the timeline sinks the bug below the feature despite its better priority number");
  const cas = V.cascade(data, "team");
  assert.ok(cas.indexOf("Planned feature") < cas.indexOf("Urgent-looking bug"),
    "the cascade sinks the bug too");
});

test("parked rows with tied priority cluster by theme lane", () => {
  const V = loadView();
  const data = {
    categories: [
      { id: "c1", key: "core", label: "Core", sort_order: 10 },
      { id: "c2", key: "unity", label: "Unity", sort_order: 20 },
    ],
    areas: [
      { id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 },
      { id: "a2", key: "unity-area", title: "Unity", scope: "product", category_id: "c2", sort_order: 20 },
    ],
    items: [
      { id: "p1", area_id: "a2", category_id: "c2", title: "Unity parked one", level: "item",
        status: "idea", horizon: "someday", priority: 100, sort_order: 10 },
      { id: "p2", area_id: "a1", category_id: "c1", title: "Core parked bet", level: "item",
        status: "idea", horizon: "someday", priority: 100, sort_order: 20 },
      { id: "p3", area_id: "a2", category_id: "c2", title: "Unity parked two", level: "item",
        status: "idea", horizon: "someday", priority: 100, sort_order: 30 },
    ],
  };
  const html = V.timeline(data, "backlog");
  const pos = ["Core parked bet", "Unity parked one", "Unity parked two"].map((t) => html.indexOf(t));
  assert.deepEqual(pos, [...pos].sort((a, b) => a - b),
    "equal-priority parked rows group by theme lane instead of scattering");
});

test("workstreams level shows only workstreams, hiding standalone items", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "std", area_id: "a1", category_id: "c1", title: "Loose fix", level: "item",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        department: "product_technology", priority: 10, sort_order: 10 },
      { id: "ws", area_id: "a1", category_id: "c1", title: "Real workstream", level: "workstream",
        status: "in_progress", horizon: "now", end_horizon: null, presentation: "current",
        department: "product_technology", priority: 20, sort_order: 20 },
    ],
  };
  const tl = V.timeline(data, "workstreams");
  assert.match(tl, /Real workstream/);
  assert.doesNotMatch(tl, /Loose fix/, "standalone item hidden from Workstreams timeline");
  const cas = V.cascade(data, "workstreams");
  assert.match(cas, /Real workstream/);
  assert.doesNotMatch(cas, /Loose fix/, "standalone item hidden from Workstreams cascade");
});

test("workstreams level keeps nested items collapsed until Detailed", () => {
  const V = loadView();
  const compact = V.timeline(sampleData(), "workstreams");
  assert.doesNotMatch(compact, /rmv-step-title/,
    "the strategic gantt stays bars-only by default");
  // sampleData has no workstream parents, so give i2 the level.
  const data = sampleData();
  data.items[1].level = "workstream";
  assert.doesNotMatch(V.timeline(data, "workstreams"), /rmv-step-title/,
    "still collapsed with a real workstream parent");
  assert.match(V.timeline(data, "workstreams", { expanded: true }), /rmv-step-title">Merchant Group/,
    "Detailed surfaces the checklist in the breakdown");
});

test("hideFixes drops standalone fix items but keeps workstreams and features", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "bug", area_id: "a1", category_id: "c1", title: "Loose bug", level: "item", type: "bug",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        department: "product_technology", priority: 10, sort_order: 10 },
      { id: "feat", area_id: "a1", category_id: "c1", title: "Feature item", level: "item", type: "feature",
        status: "planned", horizon: "now", end_horizon: null, presentation: "sequenced",
        department: "product_technology", priority: 20, sort_order: 20 },
    ],
  };
  assert.match(V.timeline(data, "team"), /Loose bug/, "fix shown by default");
  const hidden = V.timeline(data, "team", { hideFixes: true });
  assert.doesNotMatch(hidden, /Loose bug/, "fix hidden when hideFixes is on");
  assert.match(hidden, /Feature item/, "non-fix item still shown when hideFixes is on");
  assert.doesNotMatch(V.cascade(data, "team", { hideFixes: true }), /Loose bug/, "cascade also hides fixes");
});

test("cascade (team) repeats a spanning item under each band it covers", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "team");
  assert.match(html, /rmv-band-head--now/);
  assert.match(html, /rmv-band-head--next/);
  assert.doesNotMatch(html, /rmv-band-head--parked/, "Team has no Parked band");
  // Portal overhaul spans Now->Next: a full card in Now and a slim
  // continuation strip in Next (A4).
  assert.equal(count(html, /Portal overhaul/g), 2, "full card plus a continuation strip");
  assert.match(html, /rm-card--cont[^>]*>[\s\S]*?Portal overhaul/, "the span leaves a strip in Next");
  assert.equal(count(html, /<h3>Unity integration/g), 1);
  // The board is bars/cards only - deliverables never appear on it.
  assert.doesNotMatch(html, /Merchant Group/, "a deliverable is never a cascade card");
  assert.doesNotMatch(html, /rmv-step-title/, "no inline checklists on cascade cards");
});

test("cascade (team) renders a workstream's nested work items as inset child cards", () => {
  const V = loadView();
  const data = sampleData();
  data.items[1].level = "workstream"; // i2 becomes a workstream
  const html = V.cascade(data, "team");
  // The nested work item (Settlement) is an inset child card with a
  // "Part of" eyebrow; the deliverable (Merchant Group) never appears.
  assert.match(html, /rm-card--child[\s\S]*?<h3>Settlement/, "the work item is an inset child card");
  assert.match(html, /Part of Unity integration/, "the child card names its workstream");
  assert.doesNotMatch(html, /Merchant Group/, "the deliverable stays off the board");
});

test("cascade (backlog) surfaces parked items under the Parked band with reasoning kept", () => {
  const V = loadView();
  const html = V.cascade(sampleData(), "backlog");
  assert.match(html, /rmv-band-head--parked/);
  assert.match(html, /US market/);
  assert.match(html, /Whitelist blacklist/);
  assert.match(html, /Portal tooling/, "portal-scope item surfaces in the Backlog master list");
});

test("showDelivered=false hides delivered work across timeline and cascade", () => {
  const V = loadView();
  const data = sampleData();
  const tl = V.timeline(data, "team", { showDelivered: false });
  assert.doesNotMatch(tl, /Core onboarding/, "delivered item hidden on the timeline");
  assert.match(tl, /rmv-tl--nodelivered/, "the delivered columns drop off");
  assert.doesNotMatch(tl, /completed<\/span>/, "no delivered column headers");
  assert.match(tl, /Unity integration/, "live work still shows");
  const cas = V.cascade(data, "team", { showDelivered: false });
  assert.doesNotMatch(cas, /rmv-band-head--(previously|recently)/);
  assert.match(cas, /rmv-band-head--now/);
  // Executive drops delivered too: Core now has only its one active item.
  assert.match(V.timeline(data, "exec", { showDelivered: false }),
    /rmv-exec-cat-name">Core<\/span><span class="rmv-exec-cat-count">1 item</);
});

test("opts.wide widens the Timeline across levels; off by default", () => {
  const V = loadView();
  const data = sampleData();
  data.items[1].level = "workstream"; // give the Workstreams level a bar to render
  ["workstreams", "team", "backlog"].forEach((level) => {
    assert.doesNotMatch(V.timeline(data, level), /rmv-tl--wide/,
      `${level} is not wide by default`);
    assert.doesNotMatch(V.timeline(data, level, { wide: false }), /rmv-tl--wide/,
      `${level} stays narrow when wide is false`);
    assert.match(V.timeline(data, level, { wide: true }), /rmv-tl--wide/,
      `${level} widens when wide is true`);
  });
});

test("a delivered bar/card keeps its theme as a dot; a themeless delivery does not crash", () => {
  const V = loadView();
  const data = sampleData();
  // i1 (Core onboarding) is delivered with the Core theme; unmarked, so it
  // lands in Previously. Its fill is dropped but it keeps a theme dot.
  assert.match(V.timeline(data, "team"), /rmv-tl-bar--done[\s\S]*?rmv-theme-dot rm-cat-core/,
    "the delivered timeline bar carries its theme dot");
  assert.match(V.cascade(data, "team"), /rm-card--previously[\s\S]*?rmv-theme-dot rm-cat-core/,
    "the delivered cascade card carries its theme dot");
  // A delivered item with no theme carries no dot - and must not throw.
  const themeless = {
    categories: [],
    areas: [{ id: "a1", key: "svc", title: "Service", scope: "product", category_id: null, sort_order: 10 }],
    items: [{ id: "d", area_id: "a1", category_id: null, title: "Unthemed delivery",
      status: "done", horizon: "now", presentation: "sequenced", priority: 10, sort_order: 10 }],
  };
  const tl = V.timeline(themeless, "team");
  assert.match(tl, /Unthemed delivery/, "the unthemed delivered item still renders");
  assert.match(tl, /rmv-tl-bar--done/, "and reads as delivered");
  assert.doesNotMatch(tl, /rmv-theme-dot/, "with no theme dot");
  assert.doesNotThrow(() => V.cascade(themeless, "team"), "cascade handles a themeless delivery");
});

test("empty states name the work_items table", () => {
  const V = loadView();
  const empty = { categories: [], areas: [], items: [] };
  assert.match(V.timeline(empty, "team"), /work_items/);
  assert.match(V.cascade(empty, "backlog"), /work_items/);
});

test("builders escape hostile content", () => {
  const V = loadView();
  const data = sampleData();
  data.items[2].title = '<img src=x onerror=alert(1)>';
  assert.doesNotMatch(V.timeline(data, "team"), /<img src=x/);
  assert.match(V.timeline(data, "team"), /&lt;img/);
  assert.doesNotMatch(V.cascade(data, "team"), /<img src=x/);
  assert.doesNotMatch(V.timeline(data, "team", { expanded: true }), /<img src=x/);
});

// The Department filter (byDepartment), Custom view and the Now/Next/Later
// stage toggles live in roadmap-views-custom.test.js, sharing
// tests/lib/roadmap.js.

test("a workstream renders as a container even with no children", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "apis", label: "APIs", sort_order: 10 }],
    areas: [{ id: "a1", key: "svc", title: "Service", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "w", area_id: "a1", category_id: "c1", level: "workstream", title: "Self Service API",
        status: "in_progress", horizon: "now", presentation: "current", priority: 10, sort_order: 10 },
    ],
  };
  const tl = V.timeline(data, "team");
  assert.match(tl, /rmv-tl-bar--ws/, "the timeline bar reads as a workstream");
  assert.match(tl, /Self Service API/);
  const cas = V.cascade(data, "team");
  assert.match(cas, /rm-card--ws/);
  assert.match(cas, /rmv-ws-tag">Workstream/, "the cascade card is tagged a workstream");
});
