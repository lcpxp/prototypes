// ------------------------------------------------------------------
// tests/unit/pci-ixopay.test.js - Benchmarks for the PCI prototype's
// mock IXOPAY client (assets/js/pages/pci-ixopay.js). Loads the IIFE
// in a Node vm with a synchronous setTimeout so the invitation.sent
// event fires inline. Covers the enrolment, the status lifecycle
// (invited -> chased -> in_progress -> compliant | overdue), polling,
// verification and the reporting totals. This is the prototype's own
// mock, not Supabase, so exercising it does not break the no-mock rule.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = {
    setTimeout: (fn) => { fn(); return 0; },
    clearTimeout() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/pages/pci-ixopay.js"), sandbox,
    { filename: "pci-ixopay.js" });
  return sandbox.App.pciIxopay;
}

test("createEnrolment returns an invited reference and emits invitation.sent", () => {
  const ix = load();
  const events = [];
  ix.onEvent((e) => events.push(e));
  const res = ix.createEnrolment({ businessName: "X" });
  assert.equal(res.status, "invited");
  assert.match(res.referenceId, /^IXP-/);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "invitation.sent");
  assert.equal(events[0].referenceId, res.referenceId);
});

test("status lifecycle advances via webhooks and getStatus reflects it", () => {
  const ix = load();
  const hooks = [];
  ix.onWebhook((h) => hooks.push(h));
  const { referenceId } = ix.createEnrolment({ businessName: "X" });
  assert.equal(ix.getStatus(referenceId).status, "invited");
  ix._chase(referenceId);
  ix._start(referenceId);
  ix._complete(referenceId);
  assert.deepEqual(hooks.map((h) => h.status),
    ["chased", "in_progress", "compliant"]);
  assert.equal(ix.getStatus(referenceId).status, "compliant");
  assert.ok(ix.getStatus(referenceId).expiryDate, "compliant sets an expiry");
});

test("overdue is a terminal webhook state", () => {
  const ix = load();
  const { referenceId } = ix.createEnrolment({ businessName: "X" });
  ix._overdue(referenceId);
  assert.equal(ix.getStatus(referenceId).status, "overdue");
});

test("getStatus is unknown for an unseen reference", () => {
  const ix = load();
  assert.equal(ix.getStatus("nope").status, "unknown");
});

test("verifyCompliance finds a known merchant and misses others", () => {
  const ix = load();
  assert.equal(ix.verifyCompliance({ businessName: "Northwind Retail Ltd" }).found, true);
  assert.equal(ix.verifyCompliance({ businessName: "Acme Ltd" }).found, false);
});

test("getReport layers the live merchant onto the portfolio totals", () => {
  const ix = load();
  const before = ix.getReport();
  assert.equal(before.enrolled, 128);
  const { referenceId } = ix.createEnrolment({ businessName: "X" });
  ix._complete(referenceId);
  const after = ix.getReport();
  assert.equal(after.enrolled, 129);
  assert.equal(after.compliant, 97);
  assert.equal(after.merchants.length, 1);
  assert.equal(after.merchants[0].status, "compliant");
});
