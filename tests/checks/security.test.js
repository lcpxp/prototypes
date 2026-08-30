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

test("every table in the schema has RLS enabled and at least one policy", () => {
  const schemaFiles = trackedFiles()
    .filter((f) => f.startsWith("supabase/schema/") && f.endsWith(".sql"));
  assert.ok(schemaFiles.length > 0, "No schema files under supabase/schema/");
  const schema = schemaFiles.map(read).join("\n");
  const policies = read("supabase/policies.sql");
  const tables = [...schema.matchAll(/create table if not exists public\.(\w+)/gi)]
    .map((m) => m[1]);
  assert.ok(tables.length > 0, "No tables found in supabase/schema/");
  for (const t of tables) {
    assert.match(policies,
      new RegExp(`alter table public\\.${t}\\s+enable row level security`, "i"),
      `Table "${t}" has no RLS enable statement in policies.sql. ` +
      "A table without RLS is publicly readable via the anon key.");
    // A table's policies are either written out explicitly or created
    // by the content-table loop, whose values list names each table.
    const explicit =
      new RegExp(`create policy[\\s\\S]{0,200}?on public\\.${t}`, "i");
    const viaLoop = new RegExp(`\\('${t}',`);
    assert.ok(explicit.test(policies) || viaLoop.test(policies),
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

// ------------------------------------------------------------------
// Every function pins its search_path.
//
// A function with a role-mutable search_path can be made to resolve an
// unqualified name against a schema the caller controls. Supabase's
// linter reports it as function_search_path_mutable.
//
// This was remediated once by hand on 2026-07-13 and regressed twice
// afterwards - roadmap_move_workstream and work_item_embed_text both
// shipped without it - because the convention was carried by habit and
// nothing checked. Twenty-one functions follow it; the two that did not
// were found by reading the live advisors, not the repo.
// ------------------------------------------------------------------

test("every SQL function sets search_path", () => {
  const sqlFiles = trackedFiles().filter((f) =>
    (f.startsWith("supabase/schema/") || f === "supabase/policies.sql") &&
    f.endsWith(".sql"));
  const missing = [];
  let checked = 0;
  for (const file of sqlFiles) {
    const src = read(file);
    // Each definition runs from `create ... function` to its body marker.
    const re = /create (?:or replace )?function\s+public\.(\w+)\s*\(([\s\S]*?)\)\s*\n?returns[\s\S]*?\bas\s+\$\$/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      checked += 1;
      const head = m[0];
      if (!/set\s+search_path\s*=/.test(head)) {
        missing.push(`${file}: public.${m[1]} does not set search_path`);
      }
    }
  }
  assert.ok(checked >= 20,
    `Expected to find the project's functions; matched only ${checked}. ` +
    "The definition pattern may have changed - fix this check rather than " +
    "letting it pass by matching nothing.");
  assert.deepEqual(missing, [],
    "Functions with a mutable search_path:\n" + missing.join("\n") +
    "\nAdd `set search_path = public` above the `as $$` body, and apply it " +
    "as a migration - the live database has to change too.");
});

test("every SECURITY DEFINER function is revoked, or is an accepted helper", () => {
  // SECURITY DEFINER runs as the function's owner, bypassing RLS, and
  // Postgres grants EXECUTE to PUBLIC by default - so a new one lands on
  // PostgREST at /rest/v1/rpc/<name> unless it is revoked.
  //
  // Three are deliberately callable: the RLS policies call them, and each
  // returns only the CALLER's own access (own_role() is literally
  // `where id = auth.uid()`). Supabase's advisor flags those three, and
  // that warning is expected and accepted.
  //
  // Everything else must be revoked IN THIS REPO. On 2026-08-30 the three
  // embed functions were revoked in the live database and merely
  // described as revoked here, with no REVOKE behind the paragraph - so a
  // rebuild would have published all three. A comment is not a grant.
  const CALLABLE = ["has_module_access", "is_admin", "own_role"];
  const sqlFiles = trackedFiles().filter((f) =>
    (f.startsWith("supabase/schema/") || f === "supabase/policies.sql") && f.endsWith(".sql"));
  const all = sqlFiles.map(read).join("\n");
  const definers = [];
  for (const file of sqlFiles) {
    const re = /create (?:or replace )?function\s+public\.(\w+)[\s\S]*?\bas\s+\$\$/g;
    let m;
    while ((m = re.exec(read(file))) !== null) {
      if (/security\s+definer/i.test(m[0])) definers.push(m[1]);
    }
  }
  assert.ok(definers.length >= 5,
    `Matched only ${definers.length} SECURITY DEFINER functions; the ` +
    "definition pattern may have changed. Fix this check rather than " +
    "letting it pass by matching nothing.");
  const exposed = [];
  for (const fn of definers) {
    if (CALLABLE.includes(fn)) continue;
    const revoked = new RegExp(
      `revoke execute on function public\\.${fn}\\s*\\([^)]*\\)[^;]*from[^;]*authenticated`, "i");
    if (!revoked.test(all)) {
      exposed.push(`public.${fn} is SECURITY DEFINER and never revoked from authenticated`);
    }
  }
  assert.deepEqual(exposed, [],
    "SECURITY DEFINER functions reachable over PostgREST:\n" + exposed.join("\n") +
    "\nAdd `revoke execute on function public.<name>(<args>) from public, anon, " +
    "authenticated;` to policies.sql and apply it as a migration - or, if it " +
    `must be callable, add it to CALLABLE here with the reason.`);
});
