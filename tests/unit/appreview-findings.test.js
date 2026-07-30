// ------------------------------------------------------------------
// tests/unit/appreview-findings.test.js - Benchmarks for the
// cross-record half of the review model (App.appReviewFindings in
// appreview-findings.js): duplicates, the partner rollup, and the
// findings that fire when a record's state disagrees with its
// evidence.
//
// The single-row derivations - groups, age, triggers, ordering - are
// benchmarked in appreview-model.test.js. Split to match the source.
//
// Findings must derive from typed evidence signals, never from words
// in a summary, so these cases pass signals rather than prose.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadFindings() {
  const sandbox = { document: { addEventListener() {} }, setTimeout };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const file = "assets/js/pages/appreview-findings.js";
  vm.runInContext(read(file), sandbox, { filename: file });
  return sandbox.App.appReviewFindings;
}

// Values built inside the vm carry its prototypes, not this realm's,
// and strict deep-equality compares prototypes.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function app(fields) {
  return Object.assign({
    id: "a", merchant_name: "M", partner_name: "P", display_order: 0,
    launchpad_status: "awaiting_contract_send", triage_category: "act",
    is_draft: false, manual_pipeline: false, confirmed_at: null,
    evidence_confidence: "inferred", blocker_scope: null,
  }, fields);
}

test("a Cancelled record holding an approval is a red flag, not a closed item", () => {
  const M = loadFindings();
  const found = M.findings(
    app({ launchpad_status: "cancelled", triage_category: "cancelled" }),
    [{ signal: "approval", summary: "Approved by the acquirer" }], {});
  assert.equal(found.length, 1);
  assert.equal(found[0].kind, "danger");
  assert.match(found[0].text, /approval/i);
});

test("a Cancelled record whose evidence shows a decline belongs in Rejected", () => {
  const M = loadFindings();
  const found = M.findings(
    app({ launchpad_status: "cancelled" }),
    [{ signal: "decline", summary: "Declined" }], {});
  assert.equal(found[0].kind, "danger");
  // Naming the reporting consequence is the point: filed wrongly, it
  // skews the decline rate against the acquirer.
  assert.match(found[0].text, /decline-rate/i);
});

test("a bounced submission keeps its 35MB context", () => {
  const M = loadFindings();
  const found = M.findings(app({}),
    [{ signal: "delivery_failure", summary: "Undeliverable" }], {});
  assert.match(found[0].text, /35MB/);
});

test("a manual-pipeline record warns against sending digitally", () => {
  const M = loadFindings();
  const found = M.findings(app({ manual_pipeline: true }), [], {});
  assert.match(found[0].text, /do not send digitally/i);
  assert.match(found[0].text, /duplicate/i);
});

test("blocker scope is reported as recurring, not as a one-off", () => {
  const M = loadFindings();
  const partner = M.findings(
    app({ blocker_scope: "partner", partner_name: "Northgate" }), [], {});
  assert.match(partner[0].text, /every application under Northgate/);

  const merchant = M.findings(app({ blocker_scope: "merchant" }), [], {});
  assert.match(merchant[0].text, /another partner/);
});

test("a duplicate already Cancelled is not proposed for retirement again", () => {
  const M = loadFindings();
  const rows = [
    app({ id: "live", launchpad_status: "awaiting_contract_send" }),
    app({ id: "dead", launchpad_status: "cancelled" }),
  ];
  const dupes = M.duplicateKeys(rows);
  assert.equal(Object.keys(dupes).length, 1);

  const live = M.findings(rows[0], [], dupes);
  assert.match(live[live.length - 1].text, /which is live/i);

  const dead = M.findings(rows[1], [], dupes);
  assert.match(dead[dead.length - 1].text, /already Cancelled/);
  assert.doesNotMatch(dead[dead.length - 1].text, /which is live/i);
});

test("truncated evidence is marked rather than presented as settled fact", () => {
  const M = loadFindings();
  const fromFlag = M.findings(app({ evidence_confidence: "truncated" }), [], {});
  assert.match(fromFlag[0].text, /truncated/i);
  // A truncated evidence row raises it even when the record's own
  // confidence was set higher.
  const fromEvidence = M.findings(
    app({ evidence_confidence: "corroborated" }),
    [{ is_truncated: true, summary: "We can confirm that the" }], {});
  assert.match(fromEvidence[0].text, /partial/i);
});

test("a clean record produces no findings", () => {
  const M = loadFindings();
  assert.deepEqual(plain(M.findings(app({}), [{ signal: "request" }], {})), []);
});

test("partner-scope blockers roll up to the partner, sorted", () => {
  const M = loadFindings();
  const rows = [
    app({ id: "1", partner_name: "Northgate", blocker_scope: "partner" }),
    app({ id: "2", partner_name: "Coastway", blocker_scope: "partner" }),
    app({ id: "3", partner_name: "Northgate", blocker_scope: "partner" }),
    app({ id: "4", partner_name: "Northgate", blocker_scope: "merchant" }),
    app({ id: "5", partner_name: "Halcyon" }),
  ];
  const rolled = M.partnerBlockers(rows);
  assert.deepEqual(plain(rolled.map((p) => p.partner)), ["Coastway", "Northgate"]);
  assert.deepEqual(plain(rolled[1].applications.map((a) => a.id)), ["1", "3"]);
});
