// ------------------------------------------------------------------
// tests/checks/roadmap-intake.test.js - Contextualisation gates.
// The 2026-07-27 batch landed 5 duplicates, 1 unlinked umbrella and 3
// unrecorded relationships because intake never looked up what already
// existed. These checks keep the documented protocol from quietly
// regressing to "write what you are given": the search surface must be
// declared with its policies, the confidence bands must stay consistent
// across every document that states them, and the capture commands must
// keep the lookup unconditional.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { read } = require("../lib/repo.js");

const PLAYBOOK = "docs/ROADMAP-PLAYBOOK.md";
const PROTOCOL = "docs/ROADMAP-CONTEXT.md";
const SCHEMA = "supabase/schema/31_roadmap_search.sql";
const POLICIES = "supabase/policies.sql";
const ADD_CMD = ".claude/commands/roadmap-add.md";
const REVIEW_CMD = ".claude/commands/roadmap.md";
const WORKFLOW = "docs/WORKFLOW.md";

// The calibration from docs/ROADMAP-CONTEXT.md. Changing a threshold is a
// real decision: it has to be changed in every document at once, and the
// reasoning re-recorded, not drifted into one file.
const BANDS = ["0.65", "0.40", "0.22"];

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

test("the confidence bands are stated identically wherever they appear", () => {
  for (const file of [PLAYBOOK, PROTOCOL, ADD_CMD]) {
    const text = read(file);
    for (const band of BANDS) {
      assert.ok(text.includes(band),
        `${file} must state the ${band} band threshold; bands may not drift between documents`);
    }
  }
});

test("the protocol keeps restraint explicit", () => {
  const text = read(PLAYBOOK) + read(PROTOCOL) + read(ADD_CMD);
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
  const protocol = read(PROTOCOL);
  for (const outcome of ["NEW", "ENRICH", "MERGE", "PROMOTE", "REVIVE",
    "ASSOCIATE", "SPLIT", "UMBRELLA", "UNRELATED"]) {
    assert.ok(protocol.includes(`\`${outcome}\``),
      `docs/ROADMAP-CONTEXT.md must define the ${outcome} outcome`);
  }
  assert.match(protocol, /work_notes[\s\S]*?'decision'/,
    "any outcome other than NEW records its reasoning as a work_notes decision");
});

test("batch intake is a concept on every path that can carry one", () => {
  for (const file of [PROTOCOL, REVIEW_CMD, WORKFLOW]) {
    assert.match(read(file), /against (itself|each other|history AND against)/i,
      `${file} must compare a batch against itself, not just against history`);
  }
});

test("relates_to_id is presented as the general association mechanism", () => {
  const playbook = read(PLAYBOOK);
  assert.match(playbook,
    /`relates_to_id` is the general "related but distinct" mechanism/,
    "RC5: relates_to_id must not read as a bug-tracking special case");
  const maintenanceOnly = /pattern for the MAINTENANCE track only/;
  assert.doesNotMatch(playbook, maintenanceOnly,
    "the MAINTENANCE framing is now one example, not the only framing");
});
