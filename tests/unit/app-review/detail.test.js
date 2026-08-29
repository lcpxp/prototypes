// ------------------------------------------------------------------
// tests/unit/app-review/detail.test.js - The application drawer's Record
// block, on the completeness contract (docs/plan/40-SURFACING.md).
//
// It was nine hand-written pairs against a table with twenty-eight
// columns. Four of them - carried_from_application_id, resolved_at,
// created_at, updated_at - were stored, fetched (the board selects *)
// and rendered nowhere, with no error to notice.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, Array, String, Date, isNaN,
    location: { pathname: "/modules/app-review/index.html", search: "", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    "assets/js/core/ui.js",
    "assets/js/core/registry.js",
    "assets/js/core/detail.js",
    "assets/js/pages/app-review/model.js",
    "assets/js/pages/app-review/findings.js",
    "assets/js/pages/app-review/detail.js",
  ]) vm.runInContext(read(f), sandbox, { filename: f });
  return sandbox.App.appReviewDetail;
}
const drawer = load();

const STATUSES = {
  awaiting_merchant: { key: "awaiting_merchant", label: "Awaiting merchant",
    age_meaningful: true },
};
const CTX = {
  categories: { chase: { key: "chase", label: "Chase" } },
  // now is milliseconds, as appreview-board.js passes it (Date.now()).
  statuses: STATUSES, evidence: [], dupes: {}, now: Date.parse("2026-08-13T00:00:00Z"),
};

function app(extra) {
  return Object.assign({
    id: "ap1", wave_id: "w1", display_order: 3,
    merchant_name: "Northwind Trading", partner_name: "Acme Partners",
    acquirer: "Bank A", launchpad_application_id: "LP-4821",
    launchpad_status: "awaiting_merchant", risk_level: "medium",
    raised_by: "Operations", triage_category: "chase",
    action_text: "Chase the merchant", rationale_text: "No reply in 14 days",
    evidence_confidence: "inferred",
    created_in_launchpad_at: "2026-07-01T00:00:00Z",
    launchpad_last_updated_at: "2026-07-20T00:00:00Z",
    launchpad_last_updated_by: "K. Patel",
  }, extra || {});
}

test("the drawer keeps the record rows it always had", () => {
  const html = drawer(app(), CTX);
  assert.match(html, /<dt>LaunchPad status<\/dt><dd>Awaiting merchant<\/dd>/,
    "the status key resolves to its label");
  assert.match(html, /<dt>Application id<\/dt><dd>LP-4821<\/dd>/);
  assert.match(html, /<dt>Partner<\/dt><dd>Acme Partners<\/dd>/);
  assert.match(html, /<dt>Acquirer<\/dt><dd>Bank A<\/dd>/);
  assert.match(html, /<dt>Risk level<\/dt><dd>medium<\/dd>/);
  assert.match(html, /<dt>Raised by<\/dt><dd>Operations<\/dd>/);
  assert.match(html, /<dt>Created in LaunchPad<\/dt><dd>2026-07-01<\/dd>/);
  assert.match(html, /<dt>Last updated by<\/dt><dd>K\. Patel<\/dd>/);
});

test("four columns that were fetched and shown nowhere now render", () => {
  const html = drawer(app({
    carried_from_application_id: "ap0",
    resolved_at: "2026-08-05T00:00:00Z",
    created_at: "2026-06-30T00:00:00Z",
    updated_at: "2026-08-06T00:00:00Z",
  }), CTX);
  assert.match(html, /<dt>Carried forward<\/dt><dd>Carried from an earlier wave<\/dd>/,
    "the fact is what can be told truthfully - the earlier wave is not loaded");
  assert.doesNotMatch(html, /ap0/, "so the raw id never reaches the reader");
  assert.match(html, /<dt>Resolved<\/dt><dd>2026-08-05<\/dd>/);
  assert.match(html, /<dt>Recorded<\/dt><dd>2026-06-30<\/dd>/);
  assert.match(html, /<dt>Updated<\/dt><dd>2026-08-06<\/dd>/);
});

test("a column no field list knows about still reaches the drawer", () => {
  const html = drawer(app({ sanctions_hit: "none", reviewer_note: "watch this" }), CTX);
  assert.match(html, /Also recorded against this application/);
  assert.match(html, /<dt>Sanctions hit<\/dt><dd>none<\/dd>/);
  assert.match(html, /<dt>Reviewer note<\/dt><dd>watch this<\/dd>/);
});

test("what the drawer shows elsewhere is not repeated in the record block", () => {
  const html = drawer(app({
    is_draft: true, manual_pipeline: true, blocker_scope: "record",
    launchpad_status_note: "Portal shows submitted",
    confirmed_at: "2026-08-01T00:00:00Z",
  }), CTX);
  assert.doesNotMatch(html, /Also recorded against this application/,
    "every column is either named, rendered elsewhere, or new");
  for (const label of ["Is draft", "Manual pipeline", "Blocker scope",
    "Action text", "Rationale text", "Wave id", "Display order", "Id"]) {
    assert.doesNotMatch(html, new RegExp("<dt>" + label + "</dt>"),
      `${label} renders elsewhere on this drawer or on the board`);
  }
});

test("a soft-deleted marker never renders, because such a row is never shown", () => {
  const html = drawer(app({ deleted_at: "2026-08-01T00:00:00Z" }), CTX);
  assert.doesNotMatch(html, /<dt>Deleted at<\/dt>/,
    "every query filters deleted rows out; a visible row has nothing to say here");
});

test("the age row says what the number means", () => {
  const meaningful = drawer(app(), CTX);
  assert.match(meaningful, /<dt>Age<\/dt><dd>\d+ days/);
  const draft = drawer(app({ is_draft: true }), CTX);
  assert.match(draft, /not a staleness signal at this status/,
    "on a dormant draft the number is real but carries no signal");
});

test("every value in the record block is escaped", () => {
  const html = drawer(app({ acquirer: "<img src=x>", surprise: "<script>a</script>" }), CTX);
  assert.doesNotMatch(html, /<img src=x>|<script>a<\/script>/);
  assert.match(html, /&lt;img/);
});
