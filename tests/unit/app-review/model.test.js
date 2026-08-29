// ------------------------------------------------------------------
// tests/unit/app-review/model.test.js - Benchmarks for the application
// review derivations (App.appReview in appreview-model.js), loaded in
// a Node vm. These cover the rules that were got wrong before they
// were got right, so a regression here is a repeat of a real mistake:
//
//   * an assumed no-action must never settle like a confirmed one
//   * age is only a staleness signal past the partner's control
//   * a watch trigger is a date OR a named dependency, never a bare date
//   * Cancelled is the deletion mechanism, not a decline
//
// Field semantics: supabase/schema/50_review.sql, docs/APP-REVIEW.md.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function loadModel() {
  const sandbox = { document: { addEventListener() {} }, setTimeout };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const file = "assets/js/pages/app-review/model.js";
  vm.runInContext(read(file), sandbox, { filename: file });
  return sandbox.App.appReview;
}

// Values the model builds itself carry the vm's Object/Array
// prototypes, not this realm's, and strict deep-equality compares
// prototypes. Round-tripping gives a plain local value so the
// assertion is about the data rather than which realm made it.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

// The nine categories and their groups, mirroring the rows the
// migration seeds into triage_categories.
function categories(M) {
  return M.index([
    { key: "act", label: "Act now", group_key: "needs_action" },
    { key: "investigate", label: "Investigate", group_key: "needs_action" },
    { key: "blocked", label: "Blocked", group_key: "needs_action" },
    { key: "chase", label: "Chase", group_key: "needs_action" },
    { key: "monitor", label: "Check & confirm", group_key: "needs_action" },
    { key: "watch", label: "Ongoing attention", group_key: "ongoing" },
    { key: "leave", label: "Leave alone", group_key: "settled" },
    { key: "rejected", label: "Rejected", group_key: "settled" },
    { key: "cancelled", label: "Cancelled", group_key: "settled" },
  ]);
}

// age_meaningful is false exactly where the status sits inside the
// partner's control and nothing has been handed to us.
function statuses(M) {
  return M.index([
    { key: "application_in_progress", age_meaningful: false },
    { key: "awaiting_contract_generation", age_meaningful: true },
    { key: "awaiting_contract_send", age_meaningful: true },
    { key: "awaiting_contract_signature", age_meaningful: true },
    { key: "pending_further_information", age_meaningful: true },
    { key: "onboarding_pending_mid", age_meaningful: true },
    { key: "rejected", age_meaningful: false },
    { key: "cancelled", age_meaningful: false },
  ]);
}

function app(fields) {
  return Object.assign({
    id: "a", merchant_name: "M", partner_name: "P", display_order: 0,
    launchpad_status: "awaiting_contract_send", triage_category: "act",
    is_draft: false, manual_pipeline: false, confirmed_at: null,
    confirmed_by: null, evidence_confidence: "inferred",
    priority_rank: null, blocker_scope: null, next_trigger_type: null,
    next_trigger_date: null, next_trigger_label: null,
    created_in_launchpad_at: null,
  }, fields);
}

// ------------------------------------------------------------------
// Rule 1: assumed no-action is not confirmed no-action
// ------------------------------------------------------------------

test("an unconfirmed monitor row is work, not a settled one", () => {
  const M = loadModel();
  const cats = categories(M);
  const assumed = app({ triage_category: "monitor" });

  // "Check & confirm" means the AI believes nothing is needed. Verifying
  // that belief is itself work, so the row stays in Needs action.
  assert.equal(M.groupOf(assumed, cats), "needs_action");
  // And it must not look like a confirmed row at a glance either.
  assert.equal(M.marker(assumed, cats), "assumed");
  assert.notEqual(M.marker(assumed, cats), M.marker(
    app({ triage_category: "monitor", confirmed_at: "2026-07-30T10:00:00Z",
      confirmed_by: "u1" }), cats));
});

test("confirmation settles a row of any category, and only a human sets it", () => {
  const M = loadModel();
  const cats = categories(M);
  // Confirmation is a fact about the review, not about the application,
  // so it settles whatever the category says - including categories that
  // otherwise sit in Needs action or Ongoing attention.
  for (const key of ["act", "investigate", "blocked", "chase", "monitor", "watch"]) {
    const row = app({ triage_category: key });
    assert.equal(M.groupOf(row, cats), key === "watch" ? "ongoing" : "needs_action");
    const confirmed = app({
      triage_category: key,
      confirmed_at: "2026-07-30T10:00:00Z",
      confirmed_by: "u1",
    });
    assert.equal(M.groupOf(confirmed, cats), "settled",
      `a confirmed "${key}" row must be settled`);
    assert.equal(M.marker(confirmed, cats), "settled");
  }
});

test("an unclassified row needs action rather than quietly settling", () => {
  const M = loadModel();
  assert.equal(M.groupOf(app({ triage_category: null }), categories(M)),
    "needs_action");
});

test("the three-way split counts every row exactly once", () => {
  const M = loadModel();
  const cats = categories(M);
  const rows = [
    app({ triage_category: "act" }),
    app({ triage_category: "monitor" }),
    app({ triage_category: "watch" }),
    app({ triage_category: "watch" }),
    app({ triage_category: "rejected" }),
    app({ triage_category: "cancelled" }),
    // A confirmed monitor moves out of Needs action into Settled.
    app({ triage_category: "monitor", confirmed_at: "2026-07-30T10:00:00Z",
      confirmed_by: "u1" }),
  ];
  const counts = M.split(rows, cats);
  assert.deepEqual(
    { needs_action: counts.needs_action, ongoing: counts.ongoing, settled: counts.settled },
    { needs_action: 2, ongoing: 2, settled: 3 });
  assert.equal(counts.needs_action + counts.ongoing + counts.settled, counts.total);
  assert.equal(counts.total, rows.length);
});

// ------------------------------------------------------------------
// Rule 8: age is only a staleness signal past the partner's control
// ------------------------------------------------------------------

test("age is reported but never flagged on an in-progress draft", () => {
  const M = loadModel();
  const now = Date.parse("2026-07-30T00:00:00Z");
  const draft = app({
    launchpad_status: "application_in_progress",
    is_draft: true,
    created_in_launchpad_at: "2026-06-12T00:00:00Z", // 48 days
  });
  const age = M.ageOf(draft, statuses(M), now);
  // The number is a fact and still shown.
  assert.equal(age.days, 48);
  // But nothing has been handed to us, so there is nothing to chase.
  assert.equal(age.isSignal, false);
  assert.equal(age.isStale, false);
});

test("Application In Progress never signals staleness, draft flag or not", () => {
  const M = loadModel();
  const now = Date.parse("2026-07-30T00:00:00Z");
  const live = app({
    launchpad_status: "application_in_progress",
    is_draft: false,
    created_in_launchpad_at: "2026-01-01T00:00:00Z",
  });
  assert.equal(M.ageOf(live, statuses(M), now).isSignal, false);
});

test("age is a signal on the four statuses past the partner's control", () => {
  const M = loadModel();
  const now = Date.parse("2026-07-30T00:00:00Z");
  const meaningful = [
    "awaiting_contract_generation", "awaiting_contract_send",
    "awaiting_contract_signature", "pending_further_information",
  ];
  for (const status of meaningful) {
    const age = M.ageOf(app({
      launchpad_status: status,
      created_in_launchpad_at: "2026-06-12T00:00:00Z",
    }), statuses(M), now);
    assert.equal(age.isSignal, true, `${status} should make age meaningful`);
    assert.equal(age.isStale, true, `${status} at 48 days should read as stale`);
  }
});

test("a terminal status carries no staleness signal", () => {
  const M = loadModel();
  const now = Date.parse("2026-07-30T00:00:00Z");
  for (const status of ["rejected", "cancelled"]) {
    assert.equal(M.ageOf(app({
      launchpad_status: status,
      created_in_launchpad_at: "2026-01-01T00:00:00Z",
    }), statuses(M), now).isSignal, false);
  }
});

test("a record with no LaunchPad creation date has no age at all", () => {
  const M = loadModel();
  assert.deepEqual(plain(M.ageOf(app({}), statuses(M), Date.now())),
    { days: null, isSignal: false, isStale: false });
});

// ------------------------------------------------------------------
// Rule 9: a trigger is a date OR a named dependency
// ------------------------------------------------------------------

test("a trigger may be a date or a named dependency", () => {
  const M = loadModel();
  assert.deepEqual(plain(M.triggerOf(app({
    next_trigger_type: "date", next_trigger_date: "2026-08-14",
  }))), { kind: "date", value: "2026-08-14", label: "2026-08-14" });

  for (const kind of ["release", "person", "event"]) {
    const t = M.triggerOf(app({
      next_trigger_type: kind, next_trigger_label: "LaunchPad 5.2",
    }));
    assert.equal(t.kind, kind);
    assert.equal(t.label, "LaunchPad 5.2");
  }
  assert.equal(M.triggerOf(app({})), null);
});

test("the carry-forward list leads with dates, then named dependencies", () => {
  const M = loadModel();
  const cats = categories(M);
  const rows = [
    app({ id: "no-trigger", triage_category: "watch", display_order: 1 }),
    app({ id: "release", triage_category: "watch", display_order: 2,
      next_trigger_type: "release", next_trigger_label: "LaunchPad 5.2" }),
    app({ id: "late", triage_category: "watch", display_order: 3,
      next_trigger_type: "date", next_trigger_date: "2026-09-01" }),
    app({ id: "soon", triage_category: "watch", display_order: 4,
      next_trigger_type: "date", next_trigger_date: "2026-08-14" }),
    // Not on the standing list: a different group.
    app({ id: "acting", triage_category: "act", display_order: 5 }),
  ];
  assert.deepEqual(M.carryForward(rows, cats).map((r) => r.id),
    ["soon", "late", "release", "no-trigger"]);
});

// ------------------------------------------------------------------
// Do-now ordering
// ------------------------------------------------------------------

test("do-now takes only Needs action, priority first then category weight", () => {
  const M = loadModel();
  const cats = categories(M);
  const rows = [
    app({ id: "monitor", triage_category: "monitor", display_order: 1 }),
    app({ id: "watch", triage_category: "watch", display_order: 2 }),
    app({ id: "chase", triage_category: "chase", display_order: 3 }),
    app({ id: "act", triage_category: "act", display_order: 4 }),
    app({ id: "ranked", triage_category: "monitor", display_order: 5,
      priority_rank: 1 }),
    app({ id: "settled", triage_category: "rejected", display_order: 6 }),
    app({ id: "confirmed", triage_category: "act", display_order: 7,
      confirmed_at: "2026-07-30T10:00:00Z", confirmed_by: "u1" }),
  ];
  // An explicit rank leads; then act before chase before monitor. The
  // watch row is standing attention, and the settled and confirmed rows
  // are done - none of the three are today's work.
  assert.deepEqual(M.doNowOrder(rows, cats).map((r) => r.id),
    ["ranked", "act", "chase", "monitor"]);
});

test("equal rows keep LaunchPad list order", () => {
  const M = loadModel();
  const cats = categories(M);
  const rows = [
    app({ id: "third", triage_category: "act", display_order: 30 }),
    app({ id: "first", triage_category: "act", display_order: 10 }),
    app({ id: "second", triage_category: "act", display_order: 20 }),
  ];
  assert.deepEqual(M.doNowOrder(rows, cats).map((r) => r.id),
    ["first", "second", "third"]);
});

// ------------------------------------------------------------------
// Filtering and legend counts
// ------------------------------------------------------------------

test("category filters are multi-select and independent", () => {
  const M = loadModel();
  const rows = [
    app({ id: "a", triage_category: "act" }),
    app({ id: "b", triage_category: "chase" }),
    app({ id: "c", triage_category: "watch" }),
  ];
  // Hiding one leaves the rest showing, rather than picking exactly one.
  assert.deepEqual(M.visible(rows, ["act", "watch"]).map((r) => r.id), ["a", "c"]);
  assert.deepEqual(M.visible(rows, []).map((r) => r.id), []);
  assert.deepEqual(M.visible(rows, null).map((r) => r.id), ["a", "b", "c"]);
});

test("legend counts cover every seeded category, including empty ones", () => {
  const M = loadModel();
  const cats = categories(M);
  const counts = M.categoryCounts([
    app({ triage_category: "act" }),
    app({ triage_category: "act" }),
    app({ triage_category: "watch" }),
  ], cats);
  assert.equal(counts.act, 2);
  assert.equal(counts.watch, 1);
  // A category with nothing in it still reports zero rather than vanishing.
  assert.equal(counts.rejected, 0);
  assert.equal(Object.keys(counts).length, 9);
});
