// ------------------------------------------------------------------
// tests/checks/one-home.test.js - One concept, one home.
//
// The rule these enforce is the one CLAUDE.md's size budgets are only a
// proxy for: a concept stated in two places is a concept that drifts,
// and line count was never the thing that mattered. Each check below
// exists because a specific pair of copies had already disagreed.
//
// Split out of roadmap-intake.test.js, which now guards intake alone -
// this file grew past that subject the moment it started holding the
// include order and the size numbers as well.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { read } = require("../lib/repo.js");

const PLAYBOOK = "docs/ROADMAP-PLAYBOOK.md";
const INTAKE = "docs/ROADMAP-INTAKE.md";
const REVIEW = "docs/ROADMAP-REVIEW.md";
const ADD_CMD = ".claude/commands/roadmap-add.md";
const REVIEW_CMD = ".claude/commands/roadmap.md";
const PORTAL_REVIEW = "docs/PORTAL-REVIEW.md";
const PORTAL_CMD = ".claude/commands/portal-review.md";
const IDEAS = "docs/PROTOTYPE-IDEAS.md";
const IDEAS_CMD = ".claude/commands/prototype-idea.md";

// The confidence bands from docs/ROADMAP-INTAKE.md.
const BANDS = ["0.65", "0.40", "0.22"];

// Documents that must CITE the intake protocol rather than restate its
// numbers. Each is read by a session that could otherwise act on a
// remembered threshold.
const CITERS = [PLAYBOOK, REVIEW, ADD_CMD, REVIEW_CMD,
  PORTAL_REVIEW, PORTAL_CMD, IDEAS, IDEAS_CMD];

// ------------------------------------------------------------------
// One home per concept. This replaces an earlier gate that asserted the
// bands appeared IDENTICALLY in three documents - which treated the
// symptom. Three copies is how they drifted in the first place, and the
// 200-line doc cap that forced the split is what created the third copy.
// A concept stated twice is the thing that degrades instruction
// adherence; line count was only ever a proxy for it.
// ------------------------------------------------------------------

test("the confidence bands are stated in exactly one document", () => {
  const intake = read(INTAKE);
  for (const band of BANDS) {
    assert.ok(intake.includes(band),
      `${INTAKE} must state the ${band} band threshold - it is their one home`);
  }
  for (const file of CITERS) {
    const text = read(file);
    for (const band of BANDS) {
      assert.ok(!text.includes(band),
        `${file} restates the ${band} threshold. Cite ${INTAKE} instead: ` +
        "a threshold with two homes is one that drifts.");
    }
    assert.match(text, /ROADMAP-INTAKE\.md/,
      `${file} must point at ${INTAKE}, since it no longer carries the bands itself`);
  }
});

test("the review ritual has one home, and the command defers to it", () => {
  assert.match(read(REVIEW), /##\s*Wave 0 - Orient/,
    "docs/ROADMAP-REVIEW.md is where the waves are defined");
  assert.doesNotMatch(read(PLAYBOOK), /##\s*The review ritual/,
    "the playbook must not re-carry the ritual; it moved to docs/ROADMAP-REVIEW.md");
  assert.match(read(REVIEW_CMD), /ROADMAP-REVIEW\.md/,
    "/roadmap must point at the ritual's one home rather than restating it");
});

// ------------------------------------------------------------------
// One home, beyond the confidence bands. Two more concepts had grown
// several homes and drifted in all of them, so they are guarded the
// same way: state them once, cite them everywhere.
// ------------------------------------------------------------------

test("the core include order is stated only in the manifest", () => {
  // It lived in CLAUDE.md prose, in a table in docs/ARCHITECTURE.md and
  // as a five-entry regex in structure.test.js. All three were stale:
  // none named links.js, detail.js, blocks.js, drawer.js, sprints.js or
  // send-tool.js.
  const MANIFEST = "assets/js/core/includes.json";
  const order = require("../../" + MANIFEST).universal.map((e) => e.file);
  assert.ok(order.length >= 8, "the manifest should carry the whole core order");
  for (const doc of ["CLAUDE.md", "docs/ARCHITECTURE.md"]) {
    const text = read(doc);
    assert.ok(text.includes(MANIFEST),
      `${doc} must point at ${MANIFEST} rather than carry the order itself`);
    // Three or more core modules CLOSE TOGETHER is a restated order.
    // Naming one in passing is not - CLAUDE.md names registry.js as the
    // source of truth and supabase.js in the anon-key rule, 150 lines
    // apart and about different things.
    const WINDOW = 400;
    const hits = [];
    for (const file of order) {
      const needle = file.replace("assets/js/", "");
      let at = text.indexOf(needle);
      while (at !== -1) { hits.push({ at, needle }); at = text.indexOf(needle, at + 1); }
    }
    hits.sort((a, b) => a.at - b.at);
    for (let i = 0; i + 2 < hits.length; i++) {
      const run = hits.slice(i, i + 3);
      if (run[2].at - run[0].at > WINDOW) continue;
      const names = [...new Set(run.map((h) => h.needle))];
      assert.ok(names.length < 3,
        `${doc} lists ${names.join(", ")} within ${WINDOW} characters, which ` +
        `reads as a second copy of the include order. Cite ${MANIFEST} instead.`);
    }
  }
});

test("the size numbers are stated only in the budget", () => {
  // docs/HARNESS.md carried its own copy and had them WRONG: md soft 200
  // hard 300, against a JSON that said 300/500.
  const BUDGET = "tests/size-budget.json";
  const budget = require("../size-budget.json");
  const numbers = new Set();
  for (const rule of Object.values(budget.byExtension)) {
    numbers.add(String(rule.soft));
    numbers.add(String(rule.hard));
  }
  for (const doc of ["CLAUDE.md", "docs/HARNESS.md"]) {
    const text = read(doc);
    assert.ok(text.includes(BUDGET),
      `${doc} must point at ${BUDGET}`);
    const restated = [...numbers].filter((n) =>
      new RegExp(`(soft|hard)[^.\\n]{0,20}\\b${n}\\b|\\b${n}\\b[^.\\n]{0,12}(lines?|soft|hard)`, "i").test(text));
    assert.deepEqual(restated, [],
      `${doc} restates the budget number(s) ${restated.join(", ")}. A ` +
      `threshold with two homes is one that drifts - and this pair did. ` +
      `Cite ${BUDGET}.`);
  }
});
