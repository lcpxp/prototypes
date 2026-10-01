// ------------------------------------------------------------------
// tests/unit/roadmap/detail-prose.test.js - Benchmarks for the drawer's
// late-arriving sections (App.roadmapDetailProse): the written detail
// and the notes. Both arrive after the drawer opens, so each must say
// which of three states it is in - waiting, failed or ready - and never
// leave an empty region that reads as "none recorded".
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

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
    "assets/js/pages/roadmap/views.js",
    "assets/js/pages/roadmap/detail-values.js",
    "assets/js/pages/roadmap/detail-prose.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App;
}

test("the late-arriving sections are their own surface", () => {
  const P = load().roadmapDetailProse;
  for (const fn of ["detailsHtml", "storiesHtml", "notesHtml", "parseDetails"]) {
    assert.equal(typeof P[fn], "function", fn + " must be exposed");
  }
});

test("details: waiting and failed are said, not left blank", () => {
  const P = load().roadmapDetailProse;
  assert.match(P.detailsHtml({}, "waiting"), /class="skeleton"/);
  assert.match(P.detailsHtml({}, "waiting"), /Loading the detail/);
  assert.match(P.detailsHtml({}, "failed"), /Couldn't load the detail - try reopening/);
  assert.equal(P.detailsHtml({ details: null }, "ready"), "",
    "an item with no write-up draws nothing rather than a placeholder");
});

test("details: labelled pseudo-fields become titled sections", () => {
  const P = load().roadmapDetailProse;
  const html = P.detailsHtml({ details: "Lead line.\nWhat: the thing.\nAcceptance criteria: it works." });
  assert.match(html, /<p class="rmd-details">Lead line\.<\/p>/);
  assert.match(html, /<h4>What<\/h4><p class="rmd-details">the thing\.<\/p>/);
  assert.match(html, /<h4>Acceptance criteria<\/h4>/, "the longer label wins over its prefix");
});

test("details: everything is escaped", () => {
  const P = load().roadmapDetailProse;
  const html = P.detailsHtml({ details: "What: <script>alert(1)</script>" });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("details: a long write-up folds, a short one does not", () => {
  const P = load().roadmapDetailProse;
  assert.doesNotMatch(P.detailsHtml({ details: "Short." }), /Background and history/);
  const long = P.detailsHtml({ details: "x".repeat(P.DETAIL_FOLD + 1) });
  assert.match(long, /<details class="rmd-fold"><summary>Background and history/);
});

test("notes: three states, and nothing drawn when there are none", () => {
  const P = load().roadmapDetailProse;
  assert.match(P.notesHtml({}, "waiting"), /Loading notes/);
  assert.match(P.notesHtml({}, "failed"), /Couldn't load the notes - try reopening/);
  assert.equal(P.notesHtml({ notes: [] }, "ready"), "");
});

test("notes: each carries its kind, and a closed one says so", () => {
  const P = load().roadmapDetailProse;
  const html = P.notesHtml({ notes: [
    { kind: "risk", body: "Could slip.", status: "active" },
    { kind: "question", body: "Which route?", status: "resolved" },
  ] });
  assert.match(html, /rmd-note-kind--risk">Risk</);
  assert.match(html, /rmd-note-kind--question">Question<\/span><span class="rmd-note-status">Resolved/);
  assert.match(html, /rmd-note-row--muted/, "a resolved note is set back from the live ones");
});

// --- user stories and acceptance criteria ------------------------------

const STORY = { title: "Configure itself", story: "As an agent, I want the merchant set up, so that nobody types it.",
  criteria: ["An approved application reaches a configured merchant.", "No manual step remains."] };

test("stories: owed on the plan, so their three states are said there", () => {
  const P = load().roadmapDetailProse;
  const item = { id: "i1", level: "item" };
  assert.match(P.storiesHtml(item, true, "waiting"), /class="skeleton"/);
  assert.match(P.storiesHtml(item, true, "waiting"), /Loading the stories/);
  assert.match(P.storiesHtml(item, true, "failed"), /Couldn't load the stories - try reopening/);
  assert.equal(P.storiesHtml(item, true, "ready"), "",
    "nothing is claimed before the column has arrived");
  const none = P.storiesHtml({ id: "i1", level: "item", user_stories: null }, true, "ready");
  assert.match(none, /User stories and acceptance criteria/);
  assert.match(none, /Not written yet\. Stories are written for sprint work before its sprint starts\./);
});

test("stories: off the plan, a row without them draws nothing at all", () => {
  const P = load().roadmapDetailProse;
  for (const state of ["waiting", "failed", "ready"]) {
    assert.equal(P.storiesHtml({ id: "x", level: "item", user_stories: null }, false, state), "");
  }
});

test("stories: each one reads title, sentence, then its criteria", () => {
  const P = load().roadmapDetailProse;
  const html = P.storiesHtml({ id: "i1", level: "item", user_stories: [STORY],
    stories_status: "confirmed" }, true, "ready");
  assert.match(html, /<div class="rmd-story"><h4>Configure itself<\/h4><p>As an agent, I want the merchant set up, so that nobody types it\.<\/p><ul class="rmd-points"><li>An approved application reaches a configured merchant\.<\/li><li>No manual step remains\.<\/li><\/ul><\/div>/);
  assert.doesNotMatch(html, /rmd-benefit-draft/, "a confirmed set reads plain");
});

test("stories: a drafted set says so, as a drafted benefit does", () => {
  const P = load().roadmapDetailProse;
  const html = P.storiesHtml({ id: "i1", level: "item", user_stories: [STORY],
    stories_status: "drafted" }, true, "ready");
  assert.match(html, /<h3>User stories and acceptance criteria <span class="rmd-benefit-draft">Draft - not yet confirmed<\/span><\/h3>/);
});

test("stories: a workstream holds its epic and offers both copies", () => {
  const P = load().roadmapDetailProse;
  const ws = P.storiesHtml({ id: "w1", level: "workstream", user_stories: [STORY] }, true, "ready");
  assert.match(ws, /<h3>Epic and acceptance criteria/);
  assert.match(ws, /data-story-pack="devops" data-story-id="w1">Copy for DevOps</);
  assert.match(ws, /data-story-pack="roadmap" data-story-id="w1">Copy for company roadmap</);
  const item = P.storiesHtml({ id: "i1", level: "item", user_stories: [STORY] }, true, "ready");
  assert.match(item, /Copy for DevOps/);
  assert.doesNotMatch(item, /Copy for company roadmap/,
    "the company roadmap is written per workstream");
});

test("stories: a row off the plan shows what it has, with nothing to copy", () => {
  // Stories survive a row leaving Now; the pack only covers the plan, so
  // a copy button there would copy a refusal.
  const P = load().roadmapDetailProse;
  const html = P.storiesHtml({ id: "x", level: "item", user_stories: [STORY] }, false, "ready");
  assert.match(html, /Configure itself/);
  assert.doesNotMatch(html, /data-story-pack/);
});

test("stories: everything is escaped", () => {
  const P = load().roadmapDetailProse;
  const html = P.storiesHtml({ id: "<i>", level: "item", user_stories: [{ title: "<b>t</b>",
    story: "<script>x</script>", criteria: ["<img src=x>"] }] }, true, "ready");
  assert.doesNotMatch(html, /<script>|<img|<b>t|data-story-id="<i>"/);
  assert.match(html, /&lt;script&gt;/);
});
