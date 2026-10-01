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
  for (const fn of ["detailsHtml", "notesHtml", "parseDetails"]) {
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
