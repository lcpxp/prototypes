// ------------------------------------------------------------------
// tests/checks/sprint-contract.test.js - The Sprint Roadmap's view
// reads a set of column names. The database decides what those are.
//
// This exists because of a bug the unit tests could not see. The metric
// rollup took parent_id as the workstream, so a metric written against
// a WORKSTREAM rolled up to null and never reached the board - and the
// fixture in views-sprint.test.js happened to carry only item-level
// metrics, so every assertion passed. It was found by reading the real
// rows, which is not a thing a zero-dependency suite can do.
//
// What it CAN do is hold the contract: every field the builders read
// must exist on the view they read it from, per the committed
// schema-snapshot. A column renamed in a migration, or a field invented
// in JavaScript, fails here rather than rendering as undefined on every
// row with nothing going wrong.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { read } = require("../lib/repo.js");

const snapshot = JSON.parse(read("supabase/schema-snapshot.json"));
// The board and its cards are two modules over one contract: the board
// reads the coordinate fields, the cards read the value fields. Both are
// scanned, because a field is "read by the Sprint Roadmap" wherever the
// Sprint Roadmap reads it.
const SOURCES = [
  "assets/js/pages/roadmap/views-sprint.js",
  "assets/js/pages/roadmap/views-sprint-cards.js",
];

// What each rendering genuinely depends on. Listed rather than parsed
// out of the source, because the claim being made is "the board needs
// these", which is a decision, not a measurement.
const CONTRACT = {
  v_sprint_plan_items: [
    "work_item_id", "title", "workstream_id", "workstream_title",
    "category_key", "priority", "progress",
    "effective_slot", "effective_end_slot", "span", "sequence_position",
    "overlap", "is_external", "external_party", "external_status",
    "start_code", "end_code", "anchored",
  ],
  v_sprint_plan_streams: [
    "workstream_id", "workstream_title", "priority",
    "first_slot", "last_slot", "item_count", "externally_gated",
    "business_benefit", "summary", "pxp_staff_value",
    // The snapshot was regenerated on 21 Sep 2026, so the four fields
    // the cards had always read but could not claim - summary and
    // pxp_staff_value - are now claimable, along with the two added
    // with them: what shape a stream is, and which ceilings it lifts.
    "scope", "scale_notes",
  ],
  v_work_item_metric_rollup: [
    "workstream_id", "metric_kind", "unit", "basis", "total",
    "weakest_confidence",
  ],
};

test("every field the sprint views read exists on the view it reads from", () => {
  const missing = [];
  for (const [view, fields] of Object.entries(CONTRACT)) {
    const columns = snapshot.views[view];
    assert.ok(columns, `${view} is absent from the snapshot - regenerate it`);
    for (const field of fields) {
      if (!columns.includes(field)) missing.push(`${view}.${field}`);
    }
  }
  assert.deepEqual(missing, [],
    "The Sprint Roadmap reads fields that do not exist:\n  " +
    missing.join("\n  ") +
    "\nEither the view changed and the builder did not, or the builder " +
    "invented a field. A missing field renders as undefined on every row " +
    "with nothing failing.");
});

test("the builders actually read every field the contract claims", () => {
  // The other direction: a contract that over-claims is a contract
  // nobody maintains. If a field is listed here it should be in the
  // source, or the list has outlived what the board does.
  const src = SOURCES.map(read).join("\n");
  const unused = [];
  for (const [view, fields] of Object.entries(CONTRACT)) {
    for (const field of fields) {
      if (!new RegExp("\\b" + field + "\\b").test(src)) {
        unused.push(`${view}.${field}`);
      }
    }
  }
  assert.deepEqual(unused, [],
    "Declared as needed but never read:\n  " + unused.join("\n  ") +
    "\nDrop it from the contract, or use it.");
});

test("a metric on a workstream rolls up to that workstream", () => {
  // The bug itself, held as a claim about the SQL rather than the data:
  // the rollup must special-case a workstream, because a workstream has
  // no parent and parent_id alone silently loses every stream-level
  // figure - which are the most quotable ones there are.
  const sql = read("supabase/schema/36_value.sql");
  assert.match(sql, /case when w\.level = 'workstream' then w\.id else w\.parent_id end/,
    "v_work_item_metric_rollup must attribute a workstream's own metrics " +
    "to itself, not to its (non-existent) parent");
});

test("the conveyor-belt rule is stated in SQL, not in the page", () => {
  // An item is on the Sprint Roadmap if it has a live allocation AND
  // sits at Now. If the page filtered instead, the rule would have two
  // homes and an export could disagree with the board.
  const sql = read("supabase/schema/35_sprints.sql");
  assert.match(sql, /w\.horizon = 'now'/,
    "v_sprint_plan_items must carry the horizon filter");
  assert.match(sql, /a\.retired_at is null/,
    "v_sprint_plan_items must exclude retired allocations");
  // Checked as a FILTER, not as a word: the builder's header comment
  // describes the horizon model in prose, which is documentation, not a
  // second home for the rule.
  const src = SOURCES.map(read).join("\n")
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  assert.doesNotMatch(src, /\.horizon\b/,
    "the page must not read horizon; that filter lives in the view");
  assert.doesNotMatch(src, /["']now["']/,
    "the page must not compare against a horizon value");
});

test("a bar's address comes from the registry, not from this page", () => {
  // App.itemHref takes a MODULE ROW and a WORK ITEM ROW; App.linkHref
  // takes an entity TYPE, an id and a root. Calling itemHref with the
  // module KEY matched no case, built no URL, and sent every bar on the
  // sprint board to /undefined. Both are in registry.js and only one of
  // them answers "where does this work item live".
  const page = read("assets/js/pages/sprints/sprints.js");
  assert.match(page, /App\.linkHref\("work_item",/,
    "the sprint page must resolve a bar through App.linkHref('work_item', id, root)");
  assert.doesNotMatch(page.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""),
    /App\.itemHref\s*\(\s*["']/,
    "App.itemHref takes a module row, never a module key string");
});
