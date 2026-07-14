// ------------------------------------------------------------------
// tests/checks/perf.test.js - Performance gates.
// Locks in the load-speed and scalability practices:
//   * the CDN client is pinned to an exact version, so browsers get
//     immutable long-lived caching instead of a redirect to whatever
//     @2 resolves to today;
//   * every page that talks to Supabase preconnects to both origins,
//     so TLS setup overlaps with HTML parsing;
//   * RLS policies never re-evaluate auth functions per row and never
//     use "for all" (which duplicates permissive policies per query).
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read } = require("../lib/repo.js");

function cdnPages() {
  return trackedFiles()
    .filter((f) => f.endsWith(".html"))
    .filter((f) => /@supabase\/supabase-js/.test(read(f)));
}
function sqlWithoutComments(file) {
  return read(file).replace(/--[^\n]*/g, "");
}

test("the supabase-js CDN script is pinned to an exact version", () => {
  const pages = cdnPages();
  assert.ok(pages.length > 0, "No pages load the supabase-js CDN client.");
  const versions = new Set();
  for (const page of pages) {
    const m = read(page).match(/@supabase\/supabase-js@(\d+\.\d+\.\d+)"/);
    assert.ok(m,
      `${page}: pin the CDN client to an exact version ` +
      "(@supabase/supabase-js@x.y.z), not a floating tag like @2.");
    versions.add(m[1]);
  }
  assert.equal(versions.size, 1,
    `All pages must pin the same version; found ${[...versions].join(", ")}.`);
});

test("pages that load the client preconnect to both origins", () => {
  const supabaseJs = read("assets/js/core/supabase.js");
  const host = supabaseJs.match(/SUPABASE_URL: "(https:\/\/[^"]+)"/);
  assert.ok(host, "Could not find SUPABASE_URL in assets/js/core/supabase.js.");
  for (const page of cdnPages()) {
    const content = read(page);
    assert.match(content,
      /<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net">/,
      `${page}: missing preconnect to cdn.jsdelivr.net.`);
    assert.ok(
      content.includes(`<link rel="preconnect" href="${host[1]}" crossorigin>`),
      `${page}: missing crossorigin preconnect to ${host[1]} ` +
      "(the Supabase project URL in assets/js/core/supabase.js).");
  }
});

test("RLS policies evaluate auth functions once per query, not per row", () => {
  // (select auth.uid()) runs as an initplan; bare auth.uid() runs for
  // every row. See the Supabase advisor lint auth_rls_initplan.
  const policies = sqlWithoutComments("supabase/policies.sql");
  const bare = policies.replace(/\(select auth\.uid\(\)\)/g, "");
  assert.ok(!/auth\.uid\(\)/.test(bare),
    "supabase/policies.sql: wrap every auth.uid() as (select auth.uid()).");
});

test("RLS policies never use \"for all\"", () => {
  // A "for all" policy overlaps the select policy, so every read
  // evaluates two permissive policies. Split writes into insert/
  // update/delete. See the advisor lint multiple_permissive_policies.
  const schemaFiles = trackedFiles()
    .filter((f) => f.startsWith("supabase/schema/") && f.endsWith(".sql"));
  for (const file of ["supabase/policies.sql", ...schemaFiles]) {
    assert.ok(!/for all\b/i.test(sqlWithoutComments(file)),
      `${file}: replace "for all" policies with separate insert/update/delete.`);
  }
});
