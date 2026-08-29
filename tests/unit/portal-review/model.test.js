// ------------------------------------------------------------------
// tests/unit/portal-review/model.test.js - The portal review board's model
// and its renderer (docs/plan/60-PORTAL-REVIEW.md).
//
// Two things carry most of the weight here. First, that nothing
// derivable is stored - coverage, counts, grouping and the walker are
// all computed, so every one of them has to be right from the rows
// alone. Second, that `state` and `disposition` are different
// questions: a finding can be closed AND promoted, and collapsing them
// is the mistake application review already learned not to make.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array, String, Math,
    location: { pathname: "/modules/portal-review/wave.html", search: "", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/ui.js",
    "assets/js/core/registry.js",
    "assets/js/core/blocks.js",
    "assets/js/pages/portal-review/model.js",
    "assets/js/pages/portal-review/render.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App;
}
const App = load();
const M = App.portalReview;
const R = App.portalReviewRender;

const AREAS = [
  { id: "a1", part: "Where you land", code: "01", title: "Dashboard", sort_order: 10 },
  { id: "a2", part: "Where you land", code: "03", title: "Summary", sort_order: 20 },
  { id: "a3", part: "Onboarding", code: "10", title: "Prescreen", sort_order: 30 },
  { id: "a4", part: "Onboarding", code: "11", title: "Sites", sort_order: 40,
    retired_at: "2026-01-01T00:00:00Z" },
];

function f(extra) {
  return Object.assign({
    id: "f1", wave_id: "w1", area_id: "a1", title: "Something is wrong",
    kind: "issue", state: "open", visibility: "full", raised_count: 1,
  }, extra || {});
}

// --- coverage and grouping ------------------------------------------

test("a retired area is off the map but its findings are not deleted", () => {
  const parts = M.parts(AREAS, {}, { a4: 3 });
  const codes = parts.flatMap((p) => p.areas.map((a) => a.area.code));
  assert.deepEqual(Array.from(codes), ["01", "03", "10"]);
  assert.equal(parts.length, 2, "two live parts");
});

test("coverage counts what this wave walked, not what any wave did", () => {
  const walked = M.walkedIn([
    { wave_id: "w1", area_id: "a1" },
    { wave_id: "w2", area_id: "a3" },
  ], "w1");
  assert.deepEqual(Object.keys(walked), ["a1"]);
  const parts = M.parts(AREAS, walked, {});
  assert.equal(parts[0].walked, 1);
  assert.equal(parts[0].total, 2);
  assert.equal(parts[1].walked, 0, "a2's pass belongs to another wave");
});

test("open counts come from the findings, and only the open ones", () => {
  const open = M.openByArea([
    f({ id: "1", area_id: "a1" }),
    f({ id: "2", area_id: "a1", state: "answered" }),
    f({ id: "3", area_id: "a1", state: "closed" }),
    f({ id: "4", area_id: "a3", kind: "works" }),
    f({ id: "5", area_id: "a1", deleted_at: "2026-01-01" }),
  ]);
  assert.equal(open.a1, 1, "answered, closed and deleted are not open");
  assert.equal(open.a3, undefined, "a 'works' entry is not an open issue");
});

test("a finding with no area is counted, not dropped", () => {
  // Otherwise the per-area total and the wave total disagree, and the
  // finding is invisible on a board organised by area.
  const open = M.openByArea([f({ area_id: null })]);
  assert.equal(open[""], 1);
});

test("the four groups split by state and kind, and 'works' is its own", () => {
  const groups = M.groupsFor([
    f({ id: "1", state: "open" }),
    f({ id: "2", state: "answered" }),
    f({ id: "3", state: "verified" }),
    f({ id: "4", state: "closed" }),
    f({ id: "5", kind: "works", state: "open" }),
  ]);
  assert.equal(groups.open.length, 1);
  assert.equal(groups.verify.length, 1, "answered is awaiting verification");
  assert.equal(groups.settled.length, 2, "verified and closed both settle");
  assert.equal(groups.works.length, 1,
    "a review that records only faults reads as a worse system than it is");
});

// --- the walker -------------------------------------------------------

test("the walker steps to the next unwalked area in order", () => {
  assert.equal(M.nextArea(AREAS, {}).code, "01");
  assert.equal(M.nextArea(AREAS, { a1: true }).code, "03");
  assert.equal(M.nextArea(AREAS, {}, "a1").code, "03", "continues from where you were");
});

test("the walker wraps rather than claiming the sweep is finished", () => {
  // From the last area, with an earlier one still unwalked, "next"
  // must find it. Reporting "done" there is how a sweep gets called
  // complete while an area was never opened.
  const next = M.nextArea(AREAS, { a3: true }, "a3");
  assert.equal(next.code, "01");
});

test("the walker returns nothing only when every live area is walked", () => {
  assert.equal(M.nextArea(AREAS, { a1: true, a2: true, a3: true }), null);
  assert.equal(M.nextArea(AREAS, { a1: true, a2: true, a3: true, a4: false }), null,
    "a retired area is not an unwalked one");
});

// --- the wave summary and its next action -----------------------------

test("the summary is derived, and the next action says one thing to do", () => {
  const passes = [{ wave_id: "w1", area_id: "a1" }];
  const findings = [
    f({ id: "1" }),
    f({ id: "2", state: "answered" }),
    f({ id: "3", standing: true }),
    f({ id: "4", emphasis: "blocker" }),
  ];
  const s = M.waveSummary(AREAS, passes, findings, "w1");
  assert.equal(s.areas, 3);
  assert.equal(s.walked, 1);
  assert.equal(s.open, 3);
  assert.equal(s.awaiting_verification, 1);
  assert.equal(s.standing, 1);
  assert.equal(s.blockers, 1);
  assert.equal(M.nextAction(s), "2 areas still to walk",
    "walking comes before verifying: an unwalked area may hold the blocker");
});

test("the next action moves down the list as each thing is finished", () => {
  const base = { areas: 3, walked: 3, open: 0, awaiting_verification: 0,
    owner_action: 0, standing: 0, blockers: 0 };
  assert.equal(M.nextAction(Object.assign({}, base, { awaiting_verification: 1 })),
    "1 answer waiting on your verification");
  assert.equal(M.nextAction(Object.assign({}, base, { owner_action: 2 })),
    "2 findings waiting on you");
  assert.equal(M.nextAction(Object.assign({}, base, { open: 1 })),
    "1 finding open with the developers");
  assert.equal(M.nextAction(base), "Nothing outstanding. The wave is ready to triage.");
  assert.equal(M.nextAction(Object.assign({}, base, { walked: 2 })),
    "1 area still to walk");
});

// --- triage ------------------------------------------------------------

test("triage leads with the undecided, then the four dispositions", () => {
  const groups = M.triageGroups([
    f({ id: "1" }),
    f({ id: "2", disposition: "archived" }),
    f({ id: "3", disposition: "promoted" }),
  ]);
  assert.deepEqual(Array.from(groups, (g) => g.key),
    ["", "promoted", "merged", "parked", "archived"]);
  assert.equal(groups[0].findings.length, 1, "undecided leads: that is the pass");
  assert.equal(groups[2].findings.length, 0, "an empty group is still present, to say 0");
});

test("state and disposition are separate: closed and promoted at once", () => {
  const row = f({ state: "closed", disposition: "promoted",
    promoted_work_item_id: "wi1" });
  assert.equal(M.groupOf(row), "settled", "state decides the board group");
  assert.equal(M.triageGroups([row])[1].key, "promoted",
    "disposition decides the triage group");
});

// --- the renderer ------------------------------------------------------

test("every value the database allows has a label", () => {
  // The gate in render-coverage checks this file mentions each value;
  // this checks the label is actually reachable through the map.
  for (const v of ["issue", "question", "works", "note"]) assert.ok(R.KIND[v]);
  for (const v of ["open", "answered", "verified", "closed"]) assert.ok(R.STATE[v]);
  for (const v of ["lead", "bug", "blocker"]) assert.ok(R.EMPHASIS[v]);
  for (const v of ["promoted", "merged", "archived", "parked"]) assert.ok(R.DISPOSITION[v]);
  for (const v of ["application", "portal", "code"]) assert.ok(R.WAVE_KIND[v]);
  assert.equal(R.VISIBILITY.full, "", "the default says nothing, deliberately");
});

test("a value no map has ever seen reads as itself, not as blank", () => {
  assert.equal(R.labelOf(R.STATE, "invented"), "invented");
  assert.equal(R.labelOf(R.STATE, ""), "");
  assert.equal(R.labelOf(R.STATE, null), "");
});

test("a restricted finding says so on its face", () => {
  // The whole point of the flag is that somebody is about to paste
  // this into a developer conversation.
  const internal = R.findingHtml(f({ visibility: "internal" }));
  assert.match(internal, /does not leave the review/);
  const roadmap = R.findingHtml(f({ visibility: "roadmap_only" }));
  assert.match(roadmap, /not for the developer conversation/);
  assert.doesNotMatch(R.findingHtml(f()), /notice tone-warn/,
    "the default visibility adds no warning");
});

test("a re-raise is visible, because it is a deliberate signal", () => {
  assert.match(R.findingHtml(f({ raised_count: 3 })), /Raised 3 times/);
  assert.doesNotMatch(R.findingHtml(f()), /Raised/);
});

test("an answer, a verification and a resolution are three statements", () => {
  const html = R.findingHtml(f({
    state: "verified", response: "Fixed in 4.2", response_by: "Dev",
    responded_at: "2026-08-01T00:00:00Z",
    verified_at: "2026-08-05T00:00:00Z", verification_note: "Checked on staging",
    resolution: "Closed as delivered", resolved_at: "2026-08-06T00:00:00Z",
  }));
  assert.match(html, /Answered by Dev &middot; 2026-08-01/);
  assert.match(html, /Verified 2026-08-05/);
  assert.match(html, /Checked on staging/);
  assert.match(html, /Resolution &middot; 2026-08-06/);
});

test("a promoted finding links to the item it became", () => {
  const html = R.findingHtml(
    f({ disposition: "promoted", promoted_work_item_id: "wi1" }),
    { workItemHref: (id) => "roadmap/index.html?item=" + id,
      workItemTitle: { wi1: "Sortable table columns" } });
  assert.match(html, /href="roadmap\/index\.html\?item=wi1"/);
  assert.match(html, /Promoted: Sortable table columns/);
});

test("a finding's typed blocks render through the shared renderer", () => {
  const html = R.findingHtml(f({
    blocks: [{ kind: "kv", items: [{ label: "Step", value: "3" }] }],
  }));
  assert.match(html, /<th>Step<\/th><td>3<\/td>/,
    "a finding can carry a table without a schema change here");
});

test("open findings lead and the other groups collapse with their count", () => {
  const html = R.areaHtml(
    { area: AREAS[0], walked: true },
    [f({ id: "1" }), f({ id: "2", state: "answered" }), f({ id: "3", state: "closed" })]);
  assert.match(html, /<summary>Awaiting verification \(1\)<\/summary>/,
    "a collapsed section always shows its count");
  assert.match(html, /<summary>Settled \(1\)<\/summary>/);
  assert.ok(html.indexOf("finding-1") < html.indexOf("<details"),
    "open leads, before anything collapsed");
});

test("an area with nothing recorded says so rather than rendering empty", () => {
  const html = R.areaHtml({ area: AREAS[0], walked: false }, []);
  assert.match(html, /Nothing recorded against this area yet/);
  assert.match(html, /Not walked this wave/);
});

test("the rail says its coverage in words, not only in dots", () => {
  const parts = M.parts(AREAS, { a1: true }, { a1: 2 });
  const html = R.railHtml(parts);
  assert.match(html, /1 of 2 walked &middot; 2 open/);
  assert.match(html, /pr-dot--walked/);
  assert.match(html, /title="01 Dashboard - walked, 2 open"/,
    "colour never carries the meaning alone");
});

test("everything rendered is escaped", () => {
  const html = R.findingHtml(f({
    title: "<script>a</script>", body: "<img src=x>", environment: "<b>prod</b>",
  }));
  assert.doesNotMatch(html, /<script>|<img|<b>prod<\/b>/);
  assert.match(html, /&lt;script&gt;/);
});
