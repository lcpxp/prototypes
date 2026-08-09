// ------------------------------------------------------------------
// tests/checks/roadmap-intake.test.js - Contextualisation gates.
// The 2026-07-27 batch landed 5 duplicates, 1 unlinked umbrella and 3
// unrecorded relationships because intake never looked up what already
// existed. These checks keep the documented protocol from quietly
// regressing to "write what you are given": the search surface must be
// declared with its policies, the capture commands must keep the lookup
// unconditional, and every concept must have exactly ONE home.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { read } = require("../lib/repo.js");

const PLAYBOOK = "docs/ROADMAP-PLAYBOOK.md";
const INTAKE = "docs/ROADMAP-INTAKE.md";
const REVIEW = "docs/ROADMAP-REVIEW.md";
const SCHEMA = "supabase/schema/31_roadmap_search.sql";
const POLICIES = "supabase/policies.sql";
const ADD_CMD = ".claude/commands/roadmap-add.md";
const REVIEW_CMD = ".claude/commands/roadmap.md";
const WORKFLOW = "docs/WORKFLOW.md";

// The confidence bands from docs/ROADMAP-INTAKE.md.
const BANDS = ["0.65", "0.40", "0.22"];

// Documents that must CITE the intake protocol rather than restate its
// numbers. Everything here is read by a session that could otherwise act
// on a remembered threshold.
const CITERS = [PLAYBOOK, REVIEW, ADD_CMD, REVIEW_CMD];

test("the search surface is declared in schema with its grants", () => {
  const schema = read(SCHEMA);
  assert.match(schema, /create view public\.roadmap_searchable/);
  assert.match(schema, /security_invoker = on/,
    "roadmap_searchable must be security_invoker so work_items RLS applies");
  assert.match(schema, /create or replace function public\.roadmap_find/);
  assert.match(schema, /is_hollow/,
    "the hollow-row signal is what makes ENRICH detectable");
  assert.match(schema, /revoke execute on function public\.roadmap_find[\s\S]*?anon/,
    "roadmap_find exposes details and resolution; anon must never execute it");
});

test("the search surface has policies recorded alongside the schema", () => {
  const policies = read(POLICIES);
  assert.match(policies, /roadmap_searchable/,
    "CLAUDE.md rule 5: a new read surface gets its access recorded in policies.sql");
  assert.match(policies, /roadmap_find/);
  assert.match(policies, /revoke all on public\.roadmap_searchable from public, anon/);
});

test("roadmap_current is left alone - the board depends on its shape", () => {
  const schema = read(SCHEMA);
  assert.doesNotMatch(schema, /(drop|create)\s+(or replace\s+)?view public\.roadmap_current/,
    "31_roadmap_search.sql must not redefine or drop roadmap_current");
});

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

test("the protocol keeps restraint explicit", () => {
  const text = read(PLAYBOOK) + read(INTAKE) + read(ADD_CMD);
  assert.match(text, /low-band match (must )?never generates? a question/i,
    "a system that questions every adjacent match gets switched off");
});

test("the capture command looks up unconditionally and never bands on roadmap_current", () => {
  const cmd = read(ADD_CMD);
  assert.match(cmd, /ALWAYS,\s+whether the request is phrased as an\s+add or an update/,
    "RC1: the lookup must not be conditional on the request being framed as an update");
  assert.match(cmd, /roadmap_find/);
  assert.doesNotMatch(cmd, /Read `roadmap_current` \(and, for an update/,
    "the old conditional-lookup step must stay gone");
  assert.doesNotMatch(cmd, /Otherwise apply silently/,
    "RC3: blanket silent apply is replaced by the band table");
});

test("every outcome in the protocol has somewhere to be applied from", () => {
  const intake = read(INTAKE);
  for (const outcome of ["NEW", "ENRICH", "MERGE", "PROMOTE", "REVIVE",
    "ASSOCIATE", "SPLIT", "UMBRELLA", "UNRELATED"]) {
    assert.ok(intake.includes(`\`${outcome}\``),
      `${INTAKE} must define the ${outcome} outcome`);
  }
  assert.match(intake, /work_notes[\s\S]*?'decision'/,
    "any outcome other than NEW records its reasoning as a work_notes decision");
});

test("batch intake is a concept on every path that can carry one", () => {
  for (const file of [INTAKE, REVIEW_CMD, WORKFLOW]) {
    assert.match(read(file), /against (itself|each other|history AND against)/i,
      `${file} must compare a batch against itself, not just against history`);
  }
});

test("relates_to_id is presented as the general association mechanism", () => {
  const text = read(PLAYBOOK) + read(INTAKE);
  assert.match(text,
    /`relates_to_id` is the general "related but distinct" mechanism/,
    "RC5: relates_to_id must not read as a bug-tracking special case");
  assert.doesNotMatch(text, /pattern for the MAINTENANCE track only/,
    "the MAINTENANCE framing is now one example, not the only framing");
});
