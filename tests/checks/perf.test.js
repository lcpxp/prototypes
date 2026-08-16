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

test("neither list page loads the prose or the notes", () => {
  for (const file of ["assets/js/pages/roadmap.js", "assets/js/pages/backlog.js"]) {
    const src = read(file);
    assert.doesNotMatch(src, /tables\.workNotes/,
      `${file} must not read work_notes on page load - nothing in either list ` +
      "shows them. App.workItemsData fetches one item's worth when a drawer opens.");
    assert.doesNotMatch(src, /tables\.workItems\b/,
      `${file} must read tables.workItemsBoard, not the table: the view is ` +
      "work_items without details, which is 102,956 bytes of prose shown one " +
      "drawer at a time. docs/plan/80-LOAD-SPEED.md.");
    assert.match(src, /tables\.workItemsBoard/, `${file} reads the board view`);
  }
});

test("the notes a drawer needs are fetched for one item, not all of them", () => {
  const src = read("assets/js/pages/work-items-data.js");
  assert.match(src, /tables\.workNotes/, "the loader is where the read belongs");
  assert.match(src, /\.eq\("work_item_id"/,
    "scoped to the open item - an unfiltered read here would put the whole " +
    "payload back on the first drawer open instead of on page load");
});

test("a bulk read is filtered to the rows that asked for it", () => {
  // Every read in this file names its rows. An unfiltered one would put
  // the payload back, on an export instead of on page load, and still
  // return the right answer - so nothing else would fail.
  const src = read("assets/js/pages/work-items-data.js");
  for (const [, tail] of src.matchAll(/App\.db\.from\(([\s\S]*?)\.then/g)) {
    assert.ok(/\.(in|eq)\(/.test(tail),
      "every read in work-items-data.js must be filtered to named rows");
  }
  assert.match(src, /\.in\("id", ids\)/, "the export's details read is by id");
  assert.match(src, /\.in\("work_item_id", ids\)/, "and so is its notes read");
});

// ------------------------------------------------------------------
// The exports. A drawer that cannot load an item's prose shows a
// message; an export that cannot load it writes a file with a column
// heading and nothing underneath, and looks exactly like a successful
// export. Both board-wide paths write these fields for EVERY row, so
// both have to fetch before they build.
// ------------------------------------------------------------------

test("both board-wide exports fetch the heavy fields before building", () => {
  const roadmap = read("assets/js/pages/roadmap-export.js");
  assert.match(roadmap, /withHeavy\(s\.rows, \["details", "notes"\]/,
    "the roadmap JSON export writes both fields, so it must fetch both");
  assert.match(roadmap, /withHeavy\(s\.rows, \["details"\]/,
    "the roadmap CSV export writes details");
  const backlog = read("assets/js/pages/backlog-export.js");
  assert.match(backlog, /loadForExport\(s\.rows, \["details"\]\)/,
    "the backlog CSV export writes details");
});

test("a failed export read cancels the download rather than writing a blank column", () => {
  for (const file of ["assets/js/pages/roadmap-export.js",
    "assets/js/pages/backlog-export.js"]) {
    const src = read(file);
    assert.match(src, /App\.flashLabel\([\s\S]*?"Export failed"\)/,
      `${file}: a failed fetch must report, not fall through to App.download`);
  }
});

test("the export builders stay pure, so the fetch cannot hide inside one", () => {
  // Data in, string or object out. The moment a builder does its own
  // fetching it stops being testable without a database, and the
  // "every row carries its details" benchmarks go with it.
  for (const file of ["assets/js/pages/roadmap-detail-export.js",
    "assets/js/pages/backlog-export.js"]) {
    const src = read(file).replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(src, /App\.db\b/, `${file}: builders do not read the database`);
  }
});

test("every lazily loaded region tells the reader which of three states it is in", () => {
  // An empty region reads as "none recorded", which is a lie for the
  // ~50ms it is wrong. Each renderer has to be able to say "not yet".
  // It matters most for details: an item with no write-up is common, so
  // a blank gap reads as a fact about the item rather than a moment in
  // the load.
  const surfaces = [
    ["assets/js/pages/roadmap-detail.js", /function notesHtml\(item, state\)/],
    ["assets/js/pages/roadmap-detail.js", /function detailsHtml\(item, state\)/],
    ["assets/js/pages/backlog.js", /function itemFactsHtml\(item, names, state\)/],
  ];
  for (const [file, signature] of surfaces) {
    const src = read(file);
    assert.match(src, signature, `${file}: the builder must take the state`);
    for (const state of ["waiting", "failed"]) {
      assert.ok(src.includes('=== "' + state + '"'),
        `${file} must handle the ${state} state explicitly`);
    }
  }
});

test("both lazy surfaces go through the one loader", () => {
  // App.lazyDetail owns four rules the wiring would otherwise get wrong
  // per surface: presence not truthiness, no placeholder before 40ms, a
  // placeholder that appeared holds 150ms, and a superseded open never
  // paints. Two hand-rolled copies is how one of them gets dropped.
  for (const file of ["assets/js/pages/roadmap-drawer.js",
    "assets/js/pages/backlog.js"]) {
    assert.match(read(file), /App\.lazyDetail\(/,
      `${file}: lazy loading goes through the shared mechanism`);
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
  // In its own stylesheet rather than a page one: the roadmap drawer
  // and the backlog modal both lazily load the same column, and two
  // copies of one placeholder is how they drift apart.
  const css = read("assets/css/skeleton.css");
  assert.match(css, /\.skeleton\b/);
  assert.match(css, /prefers-reduced-motion/);
  const reduced = css.slice(css.lastIndexOf("prefers-reduced-motion"));
  assert.match(reduced, /animation: none/,
    "the shimmer must stop, not just slow down");
});
