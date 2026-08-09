// ------------------------------------------------------------------
// tests/checks/knowledge-links.test.js - The link vocabulary gate.
//
// work_items.relates_to_id carried four different meanings in one
// nullable uuid, with no way to record that two rows are deliberately
// NOT the same. The typed vocabulary in supabase/schema/33_links.sql
// replaces it. These checks keep the vocabulary, its documentation and
// its access grants from drifting apart - a kind that exists in the
// schema but nowhere in the docs is a kind nobody will use correctly.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { read } = require("../lib/repo.js");

const SCHEMA = "supabase/schema/33_links.sql";
const INTAKE = "docs/ROADMAP-INTAKE.md";
const POLICIES = "supabase/policies.sql";

// Parsed from the schema seed rather than hard-coded, so adding a kind
// to the vocabulary automatically demands its documentation.
function seededKinds() {
  const block = read(SCHEMA).split("insert into public.link_kinds")[1] || "";
  const rows = block.split("on conflict")[0] || "";
  return [...rows.matchAll(/^\s*\('(\w+)',\s*'([^']+)',\s*'([^']+)'/gm)]
    .map((m) => ({ key: m[1], label: m[2], inverse: m[3] }));
}

test("the vocabulary seeds the eight kinds the protocol expects", () => {
  const keys = seededKinds().map((k) => k.key).sort();
  assert.deepEqual(keys, [
    "about", "affects", "blocks", "distinct_from",
    "duplicate_of", "part_of", "relates_to", "supersedes",
  ].sort(), "the link vocabulary changed; update docs/ROADMAP-INTAKE.md with it");
});

test("every seeded kind is documented with both its readings", () => {
  const intake = read(INTAKE);
  for (const { key, label, inverse } of seededKinds()) {
    assert.ok(intake.includes("`" + key + "`"),
      `${INTAKE} must document the ${key} link kind`);
    assert.ok(intake.includes(label),
      `${INTAKE} must give ${key} its forward reading ("${label}")`);
    assert.ok(intake.includes(inverse),
      `${INTAKE} must give ${key} its reverse reading ("${inverse}"), ` +
      "since the graph is read from both ends");
  }
});

test("distinct_from is presented as suppressing a pair, not just labelling it", () => {
  assert.match(read(INTAKE), /distinct_from[\s\S]{0,600}?suppress/i,
    "distinct_from earns its place by keeping an adjudicated pair out of " +
    "future candidate lists; the protocol has to say so or nobody will use it");
});

test("symmetric kinds are stored once, in canonical order", () => {
  const schema = read(SCHEMA);
  assert.match(schema, /is_symmetric/,
    "the vocabulary must record which kinds are symmetric");
  assert.match(schema, /canonical (endpoint )?order/i,
    "a symmetric pair stored twice facing opposite ways is a duplicate the " +
    "unique index cannot catch");
});

test("the graph reads from both ends, symmetric kinds included", () => {
  const schema = read(SCHEMA);
  const view = schema.split("create view public.knowledge_graph")[1] || "";
  const body = view.split("grant select")[0];
  // The reverse branch must not filter symmetric kinds out. A symmetric
  // link is stored ONCE in canonical endpoint order, so excluding it
  // from the reverse branch means whichever item sorts second never
  // sees its own relationship - which is what happened, and what this
  // check exists to stop happening again.
  assert.doesNotMatch(body, /where l\.valid_to is null and not k\.is_symmetric/,
    "the reverse branch must include symmetric kinds; storing a pair once " +
    "is not the same as reading it from one end only");
  assert.match(body, /case when k\.is_symmetric then k\.label else k\.inverse_label end/,
    "a symmetric kind reads the same from either end; a directional one flips");
});

test("the invariants are constraints, not conventions", () => {
  const schema = read(SCHEMA);
  assert.match(schema, /constraint knowledge_links_not_self/,
    "no self-link");
  assert.match(schema, /create unique index[\s\S]*?knowledge_links_open_uniq[\s\S]*?where valid_to is null/,
    "at most one OPEN link of a kind per ordered pair");
  assert.match(schema, /duplicate_of requires the retired row to be dropped/,
    "the constraint that would have caught a known duplicate sitting live on Next");
  assert.match(schema, /clashes with the existing/,
    "SKOS forbids a pair being both hierarchical and associative");
});

test("links are closed, never deleted", () => {
  const schema = read(SCHEMA);
  for (const column of ["valid_from", "valid_to", "superseded_by_id"]) {
    assert.ok(schema.includes(column),
      `knowledge_links must carry ${column}: a link is closed, not deleted, ` +
      "so the graph can answer what was believed and when");
  }
});

test("the link tables have policies recorded in policies.sql", () => {
  const policies = read(POLICIES);
  for (const table of ["knowledge_links", "link_kinds", "link_entity_types"]) {
    assert.match(policies, new RegExp(`alter table public\\.${table}\\s+enable row level security`),
      `CLAUDE.md rule 5: ${table} must have RLS enabled in policies.sql`);
    assert.match(policies, new RegExp(`\\('${table}'\\s*,`),
      `${table} must have a read grant in the policy loop`);
  }
});

test("the registry's link labels match the schema seed exactly", () => {
  // The board never fetches link_kinds - it renders "Part of" and
  // "Includes" from App.registry.linkKinds, so the two lists have to say
  // the same thing. This is the one place a reading could drift without
  // anything failing, which is why it is checked rather than trusted.
  const registry = read("assets/js/core/registry.js");
  for (const { key, label, inverse } of seededKinds()) {
    const entry = new RegExp(
      key + ":\\s*\\{[^}]*label: \"" + label + "\"[^}]*inverse: \"" + inverse + "\"");
    assert.match(registry, entry,
      `App.registry.linkKinds.${key} must read "${label}" / "${inverse}", ` +
      "matching the link_kinds seed in " + SCHEMA);
  }
  // And nothing extra: a kind the page renders but the database does not
  // know is a label that can never appear.
  const block = registry.split("linkKinds: {")[1].split("},\n")[0];
  const inRegistry = [...block.matchAll(/^\s*(\w+):\s*\{/gm)].map((m) => m[1]);
  const known = new Set(seededKinds().map((k) => k.key));
  for (const key of inRegistry) {
    assert.ok(known.has(key), `App.registry.linkKinds.${key} is not a seeded kind`);
  }
});

test("work_item_dependencies is gone, not left running alongside", () => {
  const work = read("supabase/schema/30_work.sql");
  assert.doesNotMatch(work, /create table if not exists public\.work_item_dependencies/,
    "work_item_dependencies folded into the 'blocks' link kind; two mechanisms " +
    "for one relationship is the ambiguity being removed");
  assert.match(work, /work_item_dependencies was here/,
    "say where it went, so the next session does not go looking for it");
});
