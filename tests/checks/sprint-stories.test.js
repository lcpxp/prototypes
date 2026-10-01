// ------------------------------------------------------------------
// tests/checks/sprint-stories.test.js - The sprint hand-off, held as
// claims about the command and the SQL rather than about any data.
//
// /sprint-stories writes stories that leave this system for Azure DevOps
// and the company roadmap, and a session runs it with no memory of the
// last run. So the things that must not drift are checked here: the
// order is fixed before anything is drafted, only Now work is written
// for, nothing is confirmed on a session's own judgement, and the
// database pieces the command leans on exist with the grants it assumes.
// How much to write lives in docs/SPRINT-DELIVERY.md alone - the
// one-home gate holds that.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { read, trackedFiles } = require("../lib/repo.js");

const CMD = ".claude/commands/sprint-stories.md";
const DOC = "docs/SPRINT-DELIVERY.md";

test("the command exists, says what it does, and defers to the process doc", () => {
  const cmd = read(CMD);
  assert.match(cmd, /^---\ndescription: .+\nargument-hint: .+\n---/,
    "front matter: a description (its CODEMAP row) and an argument hint");
  assert.match(cmd, /docs\/SPRINT-DELIVERY\.md/, "it cites the one home");
  assert.match(cmd, /the definition, not a\s+summary of one/,
    "and says the doc is the definition, as the other commands do");
});

test("the order and the readiness checks run before anything is drafted", () => {
  // Drafting against a plan in the wrong order numbers every Epic and
  // Feature wrongly in the pack, and the Now column disagrees with the
  // board the stories were written for.
  const cmd = read(CMD);
  const draft = cmd.indexOf("**Draft**");
  assert.ok(draft > -1, "the command has a drafting step");
  for (const first of ["v_sprint_plan_checks", "sprint_plan_sync_order()"]) {
    const at = cmd.indexOf(first);
    assert.ok(at > -1 && at < draft, `${first} must come before the drafting step`);
  }
});

test("stories are written for Now work only", () => {
  const cmd = read(CMD);
  assert.match(cmd, /v_sprint_plan_items/);
  assert.match(cmd, /Now work/);
  assert.match(cmd, /Decline anything\s+else/);
});

test("nothing is confirmed on a session's own judgement", () => {
  const cmd = read(CMD);
  assert.match(cmd, /`confirmed` only because the owner chose that option/);
  assert.match(cmd, /owner's\s+explicit words/);
  assert.match(read(DOC), /until the owner confirms them in as many words/,
    "the doc states the same rule the command applies");
});

test("the belt, the order and the pack exist in SQL with the grants assumed", () => {
  const delivery = read("supabase/schema/37_sprint_delivery.sql");
  assert.match(delivery, /create trigger work_items_sprint_intake\s+after insert or update of horizon, status, parent_id, level on public\.work_items/,
    "an item joins and leaves the plan by itself");
  assert.match(delivery, /create view public\.v_sprint_plan_order/,
    "the order is stated once, in a view");
  const handoff = read("supabase/schema/38_sprint_handoff.sql");
  assert.match(handoff, /create view public\.v_sprint_plan_checks/);
  const pack = handoff.slice(handoff.indexOf("function public.sprint_story_pack"));
  assert.match(pack.slice(0, 400), /security invoker/,
    "the pack reads as the caller, so it shows only what they may see");
  const policies = read("supabase/policies.sql");
  for (const fn of ["sprint_plan_sync_order()", "work_items_sprint_intake()"]) {
    assert.match(policies, new RegExp("revoke execute on function public\\." +
      fn.replace(/[()]/g, "\\$&") + " from public, anon, authenticated"),
      `${fn} writes as its owner, so nobody may call it`);
  }
  assert.match(policies, /grant execute on function public\.sprint_story_pack\(uuid, text\) to authenticated/,
    "signed-in users copy the pack from the drawer");
  assert.doesNotMatch(policies, /grant execute on function public\.sprint_story_pack\(uuid, text\) to anon/);
});

test("the paste layout has one home, and it is the SQL", () => {
  // The drawer's buttons and the command both print sprint_story_pack's
  // text. A second builder in the page would be a second layout, and
  // the two would differ the first time either changed.
  const js = trackedFiles().filter((f) => f.startsWith("assets/js/") && f.endsWith(".js"));
  for (const file of js) {
    const src = read(file);
    assert.doesNotMatch(src, /USER STORY|Acceptance Criteria:/,
      `${file} builds pack text; ask sprint_story_pack for it instead`);
  }
  assert.match(read("assets/js/pages/shared/work-items-data.js"),
    /App\.db\.rpc\("sprint_story_pack"/);
});
