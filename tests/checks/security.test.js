// ------------------------------------------------------------------
// tests/checks/security.test.js - Security gates.
// Enforces CLAUDE.md "Non-negotiable security rules" mechanically:
// no credential-shaped strings in tracked files, config.js never
// tracked, every Supabase table has RLS enabled plus policies.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read, isTextFile, lineOf } = require("../lib/repo.js");

const SECRET_PATTERNS = [
  { name: "JWT-shaped token (Supabase keys are JWTs)",
    re: /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9]+/g },
  { name: "Live Supabase project URL",
    re: /https?:\/\/[a-z0-9]{15,}\.supabase\.co/g },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY/g },
  { name: "GitHub token", re: /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})/g },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/g },
];

test("no gitignored config file is tracked", () => {
  const files = trackedFiles();
  for (const banned of ["assets/js/core/config.js", "assets/js/config.js"]) {
    assert.ok(!files.includes(banned),
      `${banned} is tracked. Run: git rm --cached ${banned} ` +
      "and rotate the Supabase keys immediately (repo is public).");
  }
});

test("no credential-shaped strings in any tracked file", () => {
  const offences = [];
  for (const file of trackedFiles()) {
    if (!isTextFile(file)) continue;
    const content = read(file);
    for (const { name, re } of SECRET_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(content)) !== null) {
        offences.push(`${file}:${lineOf(content, m.index)} matches "${name}"`);
      }
    }
  }
  assert.deepEqual(offences, [],
    "Credential-shaped content found (values not printed):\n" + offences.join("\n"));
});

test("every table in schema.sql has RLS enabled and at least one policy", () => {
  const schema = read("supabase/schema.sql");
  const policies = read("supabase/policies.sql");
  const tables = [...schema.matchAll(/create table if not exists public\.(\w+)/gi)]
    .map((m) => m[1]);
  assert.ok(tables.length > 0, "No tables found in supabase/schema.sql");
  for (const t of tables) {
    assert.match(policies,
      new RegExp(`alter table public\\.${t} enable row level security`, "i"),
      `Table "${t}" has no RLS enable statement in policies.sql. ` +
      "A table without RLS is publicly readable via the anon key.");
    assert.match(policies,
      new RegExp(`create policy[\\s\\S]{0,200}?on public\\.${t}`, "i"),
      `Table "${t}" has RLS but no policy in policies.sql.`);
  }
});

test("seed data uses only generic example addresses", () => {
  const seed = read("supabase/seed.sql");
  const emails = [...seed.matchAll(/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/gi)]
    .map((m) => m[1].toLowerCase())
    .filter((d) => !/(^|\.)example\.(com|org|net)$/.test(d));
  assert.deepEqual(emails, [],
    "seed.sql contains non-example email domains: " + emails.join(", "));
});
