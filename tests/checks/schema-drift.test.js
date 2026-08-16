// ------------------------------------------------------------------
// tests/checks/schema-drift.test.js - The repo must describe the
// database.
//
// On 2026-08-09 the live project carried two work_items columns
// (assignee, support_assignee) that appeared in no schema file - while
// supabase/schema/31_roadmap_search.sql SELECTED one of them, so the
// schema directory could not be run against a fresh project. Five
// applied migrations had no file in the repo either. Nothing caught
// any of it: tests/checks/ enforced security, structure, style and
// size, but nothing compared the repo's account of the schema against
// the real one.
//
// The suite has no database access and no credentials, by design. So
// the database describes itself into supabase/schema-snapshot.json
// (scripts/gen-snapshot.js, run by a session with MCP access) and
// these checks assert the repo accounts for everything in it.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, read, trackedFiles } = require("../lib/repo.js");

const SNAPSHOT = "supabase/schema-snapshot.json";
const REGEN = "Regenerate with `npm run snapshot` (needs Supabase MCP access), " +
  "then `node scripts/gen-snapshot.js --write < result.json`.";

const snapshot = JSON.parse(read(SNAPSHOT));

function schemaFiles() {
  return trackedFiles().filter((f) => /^supabase\/schema\/.*\.sql$/.test(f));
}
function schemaText() {
  return schemaFiles().map(read).join("\n");
}
function migrationFiles() {
  const dir = path.join(ROOT, "supabase", "migrations");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".sql")) : [];
}

test("the snapshot is present and shaped as generated", () => {
  for (const key of ["tables", "views", "policies", "functions", "extensions", "migrations"]) {
    assert.ok(snapshot[key], `${SNAPSHOT} is missing "${key}". ${REGEN}`);
  }
  assert.match(snapshot.generated_note || "", /GENERATED/,
    `${SNAPSHOT} must keep its GENERATED marker; it is not hand-edited`);
});

test("every live column is declared somewhere in supabase/schema/", () => {
  const text = schemaText();
  const missing = [];
  for (const [table, columns] of Object.entries(snapshot.tables)) {
    // The table itself must be created by a schema file.
    if (!new RegExp(`create table if not exists public\\.${table}\\b`).test(text)) {
      missing.push(`table ${table}`);
      continue;
    }
    for (const column of columns) {
      // A column counts as declared if the name appears anywhere in the
      // schema directory. Deliberately loose: the point is to catch a
      // column that exists ONLY in the live database, which is what
      // assignee was, not to re-parse DDL.
      if (!new RegExp(`\\b${column}\\b`).test(text)) {
        missing.push(`${table}.${column}`);
      }
    }
  }
  assert.deepEqual(missing, [],
    `Live schema objects that no file in supabase/schema/ declares:\n  ` +
    missing.join("\n  ") + `\nEither declare them, or ${REGEN}`);
});

test("every live view is created by a schema file", () => {
  const text = schemaText();
  for (const view of Object.keys(snapshot.views)) {
    assert.match(text, new RegExp(`create view public\\.${view}\\b`),
      `view ${view} exists live but no schema file creates it`);
  }
});

// A view over a table freezes its column list at creation. So a column
// added to work_items does NOT appear in work_items_board, and the page
// reading the view gets undefined for it - a field that looks empty
// rather than missing, on every row, with nothing failing. The list
// lives in SQL beside the schema so the person adding a column is
// already in the right file; this makes that mechanical rather than
// hopeful.
//
// Each entry names its base table and exactly what it leaves out. A
// deliberate omission is one line here; an accidental one fails.
const NARROWING_VIEWS = {
  work_items_board: {
    base: "work_items",
    omits: ["details"],
    why: "paragraphs of prose, 46.6% of the table by size and shown one " +
      "drawer at a time - fetched lazily (docs/plan/80-LOAD-SPEED.md)",
  },
};

test("a view that narrows a table carries every column it does not omit", () => {
  for (const [view, spec] of Object.entries(NARROWING_VIEWS)) {
    const viewCols = snapshot.views[view];
    const baseCols = snapshot.tables[spec.base];
    assert.ok(viewCols, `view ${view} is not in the snapshot. ${REGEN}`);
    assert.ok(baseCols, `table ${spec.base} is not in the snapshot. ${REGEN}`);
    const expected = baseCols.filter((c) => !spec.omits.includes(c));
    const missing = expected.filter((c) => !viewCols.includes(c));
    assert.deepEqual(missing, [],
      `${spec.base} has columns that ${view} does not carry:\n  ` +
      missing.join("\n  ") +
      `\nAdd them to the view (supabase/schema/) with a migration, or - if ` +
      `the omission is deliberate - name them in NARROWING_VIEWS here with ` +
      `the reason. A page reading ${view} sees an omitted column as an empty ` +
      `field on every row, and nothing fails.`);
    const omitted = spec.omits.filter((c) => viewCols.includes(c));
    assert.deepEqual(omitted, [],
      `${view} carries ${omitted.join(", ")}, which it exists to leave out: ` +
      spec.why);
  }
});

test("every live policy is accounted for in policies.sql", () => {
  // policies.sql generates most policy names in a do-block loop over a
  // values list, so a policy counts as accounted for if EITHER its
  // literal name appears OR its table has a loop entry.
  const policies = read("supabase/policies.sql");
  const unaccounted = [];
  for (const { table, name } of snapshot.policies) {
    const literal = policies.includes(name);
    const loopEntry = new RegExp(`\\('${table}'\\s*,`).test(policies);
    if (!literal && !loopEntry) unaccounted.push(`${name}`);
  }
  assert.deepEqual(unaccounted, [],
    `Policies live on the database but absent from supabase/policies.sql:\n  ` +
    unaccounted.join("\n  ") +
    `\npolicies.sql is the single readable security boundary: every policy ` +
    `belongs in it, and a migration that creates one mirrors it there.`);
});

test("no live table has RLS switched off", () => {
  assert.deepEqual(snapshot.rls_disabled, [],
    "CLAUDE.md rule 5: a table without RLS is publicly readable via the anon key");
});

test("every applied migration has a file in the repo", () => {
  // Joined on NAME, not version: repo filenames carry rounded timestamps
  // (20260713000000_) while the ledger records real apply times
  // (20260713113220), so a version join would report every migration as
  // missing. A file may also declare that it covers a squashed ledger
  // entry, which is how roadmap_find_idf_weighting is handled.
  const files = migrationFiles();
  const covered = files.map((f) => read(`supabase/migrations/${f}`)).join("\n");
  const missing = snapshot.migrations
    .map((m) => m.name)
    .filter((name) => !files.some((f) => f.endsWith(`_${name}.sql`))
      && !covered.includes(`covers ledger entry: ${name}`));
  assert.deepEqual(missing, [],
    `Applied migrations with no file in supabase/migrations/:\n  ` +
    missing.join("\n  ") +
    `\nRecover them from supabase_migrations.schema_migrations, or add ` +
    `"-- covers ledger entry: <name>" to the file that squashed them.`);
});

test("every installed extension is created by a schema file or migration", () => {
  // Supabase installs these itself on every project; they are not the
  // repo's to declare.
  const SUPABASE_BUILTIN = new Set([
    "plpgsql", "pg_stat_statements", "pgcrypto", "uuid-ossp", "supabase_vault",
    "pg_graphql", "pgjwt", "pgsodium",
  ]);
  const text = schemaText() + migrationFiles().map((f) =>
    read(`supabase/migrations/${f}`)).join("\n");
  const undeclared = snapshot.extensions
    .map((e) => e.name)
    .filter((name) => !SUPABASE_BUILTIN.has(name)
      && !new RegExp(`create extension if not exists ${name}\\b`).test(text));
  assert.deepEqual(undeclared, [],
    `Extensions installed live but created by no file:\n  ` + undeclared.join("\n  "));
});

test("the snapshot carries no secret material", () => {
  // scripts/gen-snapshot.js never reads vault contents. This asserts the
  // result, so a hand-edit or a widened query cannot slip one in.
  const raw = read(SNAPSHOT);
  for (const pattern of [/decrypted_secret/i, /"secret"/i, /service_role/i, /sb_secret_/]) {
    assert.doesNotMatch(raw, pattern,
      `${SNAPSHOT} looks like it carries secret material. The snapshot records ` +
      "structure only; secrets never enter this repo (CLAUDE.md rule 3).");
  }
});
