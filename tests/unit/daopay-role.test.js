// ------------------------------------------------------------------
// tests/unit/daopay-role.test.js - Benchmarks for the Daopay scoped
// role (assets/js/pages/daopay-data.js and daopay-app.js). The role is
// the whole point of the prototype, so the control boundary is pinned
// here rather than left to a visual check: what a Daopay user may do,
// what they may not, and that the list is scoped by acquirer.
//
// Also guards the data-hygiene rule. The replica was built from
// screenshots of live production data; every identity in the fixture
// must stay invented.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load(search) {
  const sandbox = {
    URLSearchParams,
    location: { search: search || "" },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/pages/daopay-data.js"), sandbox,
    { filename: "daopay-data.js" });
  return sandbox.window.DaopayDemo;
}

const AS_PXP = "";
const AS_DAOPAY = "?role=daopay";

// Everything a Daopay user must not be able to reach. Sending to CRM,
// sending the onboarding record or documents, generating either
// contract, sending the merchant contract, running a check and
// overriding a screening result all stay with PXP.
const OUT_OF_SCOPE = [
  "sendToCrm", "sendOnboardingRecord", "sendDocuments", "generateContract",
  "sendContract", "generateKyc", "sendKyc", "runCheck", "overrideScreening",
  "removeScreening",
];

// Everything they must keep: read, add documents, and decide.
const IN_SCOPE = [
  "updateStatus", "viewContract", "downloadContract", "viewReport",
  "generatePdf", "uploadDocument", "approveAndSendKyc",
];

test("a Daopay user gets none of the PXP-only controls", () => {
  const demo = load(AS_DAOPAY);
  assert.equal(demo.currentRole().key, "daopay");
  for (const action of OUT_OF_SCOPE) {
    assert.equal(demo.can(action), false,
      `A Daopay user must not get "${action}".`);
  }
});

test("a Daopay user keeps read, upload and the decision controls", () => {
  const demo = load(AS_DAOPAY);
  for (const action of IN_SCOPE) {
    assert.equal(demo.can(action), true,
      `A Daopay user must keep "${action}".`);
  }
});

test("approve is a Daopay-only control; the generic KYC send is PXP-only", () => {
  // Sending the KYC contract is the approval, but the two roles reach
  // it differently: PXP has the generic Send contract it cannot use for
  // KYC approval, Daopay has the one named button.
  const pxp = load(AS_PXP);
  const daopay = load(AS_DAOPAY);
  assert.equal(pxp.can("approveAndSendKyc"), false);
  assert.equal(daopay.can("approveAndSendKyc"), true);
  assert.equal(pxp.can("sendKyc"), true);
  assert.equal(daopay.can("sendKyc"), false);
});

test("a PXP user gets the page exactly as it is today", () => {
  const demo = load(AS_PXP);
  assert.equal(demo.currentRole().key, "pxp");
  for (const action of OUT_OF_SCOPE) {
    assert.equal(demo.can(action), true,
      `A PXP user must keep "${action}".`);
  }
});

test("an unknown role falls back to the PXP view, never a wider one", () => {
  const demo = load("?role=admin");
  assert.equal(demo.currentRole().key, "pxp");
  assert.equal(demo.can("approveAndSendKyc"), false);
});

test("ACQUIRER is the scoping key and it narrows the list", () => {
  const demo = load(AS_DAOPAY);
  const all = demo.applications;
  const scoped = all.filter((a) => a.acquirer === "DaoPay");
  assert.ok(scoped.length > 0, "Fixture must contain DaoPay applications.");
  assert.ok(scoped.length < all.length,
    "Fixture must contain non-DaoPay applications too, or the scoping " +
    "demonstrates nothing.");
  for (const row of all) {
    assert.ok(["PXP", "DaoPay", "-"].includes(row.acquirer),
      `Unexpected acquirer "${row.acquirer}".`);
  }
});

test("a Daopay user is offered only the two statuses they can set", () => {
  // Cancelled, Approved and the rest are not theirs. The application's
  // current value rides along disabled so the control still reads as a
  // status field rather than a two-item menu.
  const demo = load(AS_DAOPAY);
  const opts = Array.from(demo.statusOptions("In Progress"));
  assert.deepEqual(opts.map((o) => o.value),
    ["In Progress", "Rejected", "Pending Further Information"]);
  assert.equal(opts[0].disabled, true);
  assert.deepEqual(opts.slice(1).map((o) => o.disabled), [false, false]);
});

test("the Daopay status list never repeats the current value", () => {
  const demo = load(AS_DAOPAY);
  const opts = Array.from(demo.statusOptions("Rejected"));
  assert.deepEqual(opts.map((o) => o.value),
    ["Rejected", "Pending Further Information"]);
});

test("a PXP user still gets the portal's full status list", () => {
  const demo = load(AS_PXP);
  assert.equal(Array.from(demo.statusOptions("In Progress")).length, 8);
});

test("the fixture holds one contract of each kind", () => {
  // Two rows of the same contract made the tables look like a history
  // log rather than the live document.
  const demo = load(AS_PXP);
  assert.equal(demo.application.contracts.length, 1);
  assert.equal(demo.application.kycContracts.length, 1);
});

test("screening is the two checks that matter to this flow", () => {
  const demo = load(AS_PXP);
  assert.deepEqual(Array.from(demo.application.checks, (c) => c.name),
    ["Mastercard MATCH", "Webshield"]);
});

test("the decision statuses match the portal, with the first four disabled", () => {
  // Array.from re-homes the sandbox's arrays into this realm, so
  // deepStrictEqual compares contents rather than prototypes.
  const demo = load(AS_PXP);
  assert.deepEqual(Array.from(demo.statuses, (s) => s.value), [
    "Draft", "In Progress", "Submitted", "Pending Manual Review",
    "Approved", "Rejected", "Pending Further Information", "Cancelled",
  ]);
  const selectable = Array.from(demo.statuses).filter((s) => !s.disabled);
  assert.deepEqual(selectable.map((s) => s.value),
    ["Approved", "Rejected", "Pending Further Information", "Cancelled"]);
});

test("Pending Further Information keeps the portal's title casing", () => {
  // The brief and the notification template both write it lower case;
  // the portal does not. UI copy follows the portal.
  const demo = load(AS_PXP);
  assert.ok(demo.statuses.some((s) => s.value === "Pending Further Information"));
});

test("the application page branches on capability, never on the role name", () => {
  // The boundary is one list in daopay-data.js. A role-name comparison
  // in the rendering modules would put a second, drifting copy of it
  // there - which is exactly how a control ends up visible to the
  // wrong role.
  for (const file of ["assets/js/pages/daopay-app.js",
    "assets/js/pages/daopay-sections.js"]) {
    assert.doesNotMatch(read(file), /role\s*[=!]==?\s*["']daopay["']/,
      `${file} must ask DaopayDemo.can(), not compare role names.`);
  }
});

test("no real identities survived from the source screenshots", () => {
  const source = read("assets/js/pages/daopay-data.js");
  for (const banned of [/pxpfinancial/i, /partner\.pxp/i, /revolut/i, /altopay/i]) {
    assert.doesNotMatch(source, banned,
      `Fixture data must not carry real identities (${banned}).`);
  }
  // Any website in the fixture must sit on a reserved example domain.
  for (const [, host] of source.matchAll(/https?:\/\/([^"'\s/]+)/g)) {
    assert.match(host, /\.example$|(^|\.)example\.(com|org|net)$/,
      `Fixture website "${host}" must use a reserved example domain.`);
  }
});
