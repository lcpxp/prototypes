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

// The public anon key and its project URL are committed on purpose
// (see assets/js/core/supabase.js and docs/SECURITY.md): the anon key
// only grants what RLS allows. Everything below still fails the suite.
// A service_role JWT is caught by the role check, not exempted.
const PUBLIC_PROJECT_REF = "zlmkofbkobmhnslfnqsf";
const PUBLIC_JWT_ROLES = new Set(["anon", "authenticated"]);

const SECRET_PATTERNS = [
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9]+/g },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY/g },
  { name: "GitHub token", re: /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})/g },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/g },
];

// Decode a JWT payload and return its role, or null if unreadable.
function jwtRole(token) {
  try {
    const seg = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(Buffer.from(seg, "base64").toString("utf8"));
    return typeof claims.role === "string" ? claims.role : null;
  } catch (e) {
    return null;
  }
}

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
  const JWT = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
  const SUPABASE_URL = /https?:\/\/([a-z0-9]{15,})\.supabase\.co/g;
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
    // JWTs: the public anon key is allowed; a service_role JWT, or any
    // token whose role we cannot read, is not.
    JWT.lastIndex = 0;
    let j;
    while ((j = JWT.exec(content)) !== null) {
      const role = jwtRole(j[0]);
      if (!PUBLIC_JWT_ROLES.has(role)) {
        offences.push(`${file}:${lineOf(content, j.index)} JWT with non-public ` +
          `role "${role || "unreadable"}" - only the public anon key may be committed`);
      }
    }
    // Supabase URLs: only the known public project may appear.
    SUPABASE_URL.lastIndex = 0;
    let u;
    while ((u = SUPABASE_URL.exec(content)) !== null) {
      if (u[1] !== PUBLIC_PROJECT_REF) {
        offences.push(`${file}:${lineOf(content, u.index)} unexpected Supabase project URL "${u[1]}"`);
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
