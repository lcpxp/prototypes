// ------------------------------------------------------------------
// tests/unit/pci-ixopay.test.js - Benchmarks for the PCI prototype's
// mock IXOPAY client (assets/js/pages/pci-ixopay.js). Loads the IIFE in
// a Node vm with a synchronous setTimeout so invitation.sent fires
// inline. Covers the compliance check, the full-payload enrolment, the
// status lifecycle (invited -> chased -> in_progress -> compliant |
// overdue), polling, and the reporting shape (webhooks outstanding,
// chases). This is the prototype's own mock, not Supabase.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = { setTimeout: (fn) => { fn(); return 0; }, clearTimeout() {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/pages/pci-ixopay.js"), sandbox, { filename: "pci-ixopay.js" });
  return sandbox.App.pciIxopay;
}

test("createEnrolment takes the full payload, returns invited, emits invitation.sent", () => {
  const ix = load();
  const events = [];
  ix.onEvent((e) => events.push(e));
  const res = ix.createEnrolment({ merchant: { businessName: "X" }, products: [{ name: "P" }], email: "a@b.com" });
  assert.equal(res.status, "invited");
  assert.match(res.referenceId, /^IXP-/);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "invitation.sent");
  assert.equal(events[0].email, "a@b.com");
});

test("status lifecycle advances via webhooks and getStatus reflects it", () => {
  const ix = load();
  const hooks = [];
  ix.onWebhook((h) => hooks.push(h));
  const { referenceId } = ix.createEnrolment({ merchant: { businessName: "X" } });
  ix._chase(referenceId);
  ix._start(referenceId);
  ix._complete(referenceId);
  assert.deepEqual(hooks.map((h) => h.status), ["chased", "in_progress", "compliant"]);
  assert.equal(ix.getStatus(referenceId).status, "compliant");
  assert.ok(ix.getStatus(referenceId).expiryDate);
});

test("overdue is a terminal webhook state", () => {
  const ix = load();
  const { referenceId } = ix.createEnrolment({ merchant: { businessName: "X" } });
  ix._overdue(referenceId);
  assert.equal(ix.getStatus(referenceId).status, "overdue");
});

test("getStatus is unknown for an unseen reference", () => {
  const ix = load();
  assert.equal(ix.getStatus("nope").status, "unknown");
});

test("complianceCheck and the verifyCompliance alias find a known merchant", () => {
  const ix = load();
  assert.equal(ix.complianceCheck({ businessName: "Northwind Retail Ltd" }).found, true);
  assert.equal(ix.verifyCompliance({ businessName: "Northwind Retail Ltd" }).found, true);
  assert.equal(ix.complianceCheck({ businessName: "Acme Ltd" }).found, false);
});

test("getReport exposes totals, webhooks outstanding and chases, layering the live merchant", () => {
  const ix = load();
  const before = ix.getReport();
  assert.equal(before.enrolled, 128);
  assert.ok(before.webhooksOutstanding > 0);
  assert.ok(Array.isArray(before.chases) && before.chases.length >= 3);
  const { referenceId } = ix.createEnrolment({ merchant: { businessName: "X" } });
  ix._chase(referenceId);
  const after = ix.getReport();
  assert.equal(after.enrolled, 129);
  assert.equal(after.merchants.length, 1);
  assert.ok(after.chases.length >= 4);
});
