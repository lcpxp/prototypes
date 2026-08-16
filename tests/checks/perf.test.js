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

// ------------------------------------------------------------------
// The board fetch. docs/plan/80-LOAD-SPEED.md: the roadmap downloaded
// the prose of every item and every note to display one item's worth
// at a time. Notes came off the page load on 2026-08-15, worth 63,098
// bytes of the 772,987 a cold load moved.
//
// This is a source-level guard because the instinct next time someone
// edits that fetch is to add the table back "so the drawer has it" -
// which works, silently costs the saving, and nothing else would fail.
// ------------------------------------------------------------------

test("the roadmap page load does not fetch notes", () => {
  const src = read("assets/js/pages/roadmap.js");
  assert.doesNotMatch(src, /tables\.workNotes/,
    "roadmap.js must not read work_notes on page load - nothing on the board " +
    "shows them. The drawer fetches one item's worth via App.roadmapData.loadNotes.");
});

test("the notes a drawer needs are fetched for one item, not all of them", () => {
  const src = read("assets/js/pages/roadmap-data.js");
  assert.match(src, /tables\.workNotes/, "the loader is where the read belongs");
  assert.match(src, /\.eq\("work_item_id"/,
    "scoped to the open item - an unfiltered read here would put the whole " +
    "payload back on the first drawer open instead of on page load");
});

test("a lazily loaded region tells the reader which of three states it is in", () => {
  // An empty section reads as "none recorded", which is a lie for the
  // ~50ms it is wrong. The renderer has to be able to say "not yet".
  const src = read("assets/js/pages/roadmap-detail.js");
  assert.match(src, /function notesHtml\(item, state\)/);
  for (const state of ["waiting", "failed"]) {
    assert.ok(src.includes('=== "' + state + '"'),
      `notesHtml must handle the ${state} state explicitly`);
  }
});

test("the item export waits for the fetch it depends on", () => {
  // Exporting a drawer opened a moment ago must not write a file with
  // the notes missing. A silently empty field in an export is data loss.
  const src = read("assets/js/pages/roadmap-drawer.js");
  assert.match(src, /inFlight\.then\(function \(\) \{ deps\.download\(item\); \}\)/,
    "the export must be chained onto the in-flight load, not fired beside it");
});

test("the skeleton stands down for anyone who asked for less motion", () => {
  const css = read("assets/css/roadmap-detail.css");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.rmd-skeleton/);
});
