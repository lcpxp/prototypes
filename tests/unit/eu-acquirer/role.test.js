// ------------------------------------------------------------------
// tests/unit/eu-acquirer/role.test.js - Benchmarks for the EU Acquirer scoped
// role (assets/js/pages/eu-acquirer/data.js and eu-acquirer-app.js). The role is
// the whole point of the prototype, so the control boundary is pinned
// here rather than left to a visual check: what a EU Acquirer user may do,
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
const { read } = require("../../lib/repo.js");

function load(search) {
  const sandbox = {
    URLSearchParams,
    location: { search: search || "" },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/pages/eu-acquirer/data.js"), sandbox,
    { filename: "eu-acquirer-data.js" });
  return sandbox.window.EuAcquirerDemo;
}

const AS_ACQUIRER = "";
const AS_EUACQUIRER = "?role=euacquirer";

// Everything a EU Acquirer user must not be able to reach. Sending to CRM,
// sending the onboarding record or documents, generating either
// contract, running a check and overriding a screening result all stay
// with Acquirer. "sendContract" is NOT here: the merchant-contract send is a
// EU Acquirer control, so the run can be driven from their view.
const OUT_OF_SCOPE = [
  "sendToCrm", "sendOnboardingRecord", "sendDocuments", "generateContract",
  "generateKyc", "runCheck", "overrideScreening", "removeScreening",
];

// Everything they must keep: read, add documents, send the contract for
// signature, and decide.
const IN_SCOPE = [
  "updateStatus", "sendContract", "viewContract", "downloadContract",
  "viewReport", "generatePdf", "uploadDocument", "approveAndSendKyc",
];

test("a EU Acquirer user gets none of the Acquirer-only controls", () => {
  const demo = load(AS_EUACQUIRER);
  assert.equal(demo.currentRole().key, "euacquirer");
  for (const action of OUT_OF_SCOPE) {
    assert.equal(demo.can(action), false,
      `A EU Acquirer user must not get "${action}".`);
  }
});

test("a EU Acquirer user keeps read, upload and the decision controls", () => {
  const demo = load(AS_EUACQUIRER);
  for (const action of IN_SCOPE) {
    assert.equal(demo.can(action), true,
      `A EU Acquirer user must keep "${action}".`);
  }
});

test("both contract sends are EU Acquirer-only, so the run drives from one view", () => {
  // Sending the merchant contract and sending the KYC (which is the
  // approval) both belong to the acquirer. Acquirer gets neither send: the
  // whole simulation runs from the EU Acquirer view without a role switch.
  const acquirer = load(AS_ACQUIRER);
  const euacquirer = load(AS_EUACQUIRER);
  assert.equal(euacquirer.can("sendContract"), true);
  assert.equal(euacquirer.can("approveAndSendKyc"), true);
  assert.equal(acquirer.can("sendContract"), false);
  assert.equal(acquirer.can("approveAndSendKyc"), false);
  // The generic KYC send belongs to nobody - the named approve replaces it.
  assert.equal(acquirer.can("sendKyc"), false);
  assert.equal(euacquirer.can("sendKyc"), false);
});

test("a Acquirer user keeps every control except the two EU Acquirer sends", () => {
  const demo = load(AS_ACQUIRER);
  assert.equal(demo.currentRole().key, "acquirer");
  for (const action of OUT_OF_SCOPE) {
    assert.equal(demo.can(action), true,
      `A Acquirer user must keep "${action}".`);
  }
  assert.equal(demo.can("sendContract"), false);
});

test("an unknown role falls back to the Acquirer view, never a wider one", () => {
  const demo = load("?role=admin");
  assert.equal(demo.currentRole().key, "acquirer");
  assert.equal(demo.can("approveAndSendKyc"), false);
});

test("ACQUIRER is the scoping key and it narrows the list", () => {
  const demo = load(AS_EUACQUIRER);
  const all = demo.applications;
  const scoped = all.filter((a) => a.acquirer === "EU Acquirer");
  assert.ok(scoped.length > 0, "Fixture must contain EU Acquirer applications.");
  assert.ok(scoped.length < all.length,
    "Fixture must contain non-EU Acquirer applications too, or the scoping " +
    "demonstrates nothing.");
  for (const row of all) {
    assert.ok(["Acquirer", "EU Acquirer", "-"].includes(row.acquirer),
      `Unexpected acquirer "${row.acquirer}".`);
  }
});

test("a EU Acquirer user is offered only the two statuses they can set", () => {
  // Cancelled, Approved and the rest are not theirs. The application's
  // current value rides along disabled so the control still reads as a
  // status field rather than a two-item menu.
  const demo = load(AS_EUACQUIRER);
  const opts = Array.from(demo.statusOptions("In Progress"));
  assert.deepEqual(opts.map((o) => o.value),
    ["In Progress", "Rejected", "Pending Further Information"]);
  assert.equal(opts[0].disabled, true);
  assert.deepEqual(opts.slice(1).map((o) => o.disabled), [false, false]);
});

test("the EU Acquirer status list never repeats the current value", () => {
  const demo = load(AS_EUACQUIRER);
  const opts = Array.from(demo.statusOptions("Rejected"));
  assert.deepEqual(opts.map((o) => o.value),
    ["Rejected", "Pending Further Information"]);
});

test("a Acquirer user still gets the portal's full status list", () => {
  const demo = load(AS_ACQUIRER);
  assert.equal(Array.from(demo.statusOptions("In Progress")).length, 8);
});

test("the contract tables begin empty, generated by the Acquirer user", () => {
  // The tables start with no rows; a Acquirer user's Generate contract adds
  // one. The generatable row for each is carried on the fixture.
  const demo = load(AS_ACQUIRER);
  assert.equal(demo.application.contracts.length, 0);
  assert.equal(demo.application.kycContracts.length, 0);
  assert.match(demo.application.generatable.contract.name, /Merchant Agreement/);
  assert.match(demo.application.generatable.kyc.name, /KYC/);
});

test("generate is a Acquirer control, send is not", () => {
  // The whole point of the empty tables: Acquirer generates, EU Acquirer sends.
  const acquirer = load(AS_ACQUIRER);
  const euacquirer = load(AS_EUACQUIRER);
  assert.equal(acquirer.can("generateContract"), true);
  assert.equal(acquirer.can("generateKyc"), true);
  assert.equal(acquirer.can("sendContract"), false);
  assert.equal(euacquirer.can("generateContract"), false);
  assert.equal(euacquirer.can("sendContract"), true);
});

test("screening is the two checks that matter to this flow", () => {
  const demo = load(AS_ACQUIRER);
  assert.deepEqual(Array.from(demo.application.checks, (c) => c.name),
    ["Mastercard MATCH", "Webshield"]);
});

test("the decision statuses match the portal, with the first four disabled", () => {
  // Array.from re-homes the sandbox's arrays into this realm, so
  // deepStrictEqual compares contents rather than prototypes.
  const demo = load(AS_ACQUIRER);
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
  const demo = load(AS_ACQUIRER);
  assert.ok(demo.statuses.some((s) => s.value === "Pending Further Information"));
});

test("the application page branches on capability, never on the role name", () => {
  // The boundary is one list in eu-acquirer-data.js. A role-name comparison
  // in the rendering modules would put a second, drifting copy of it
  // there - which is exactly how a control ends up visible to the
  // wrong role.
  for (const file of ["assets/js/pages/eu-acquirer/app.js",
    "assets/js/pages/eu-acquirer/sections.js"]) {
    assert.doesNotMatch(read(file), /role\s*[=!]==?\s*["']euacquirer["']/,
      `${file} must ask EuAcquirerDemo.can(), not compare role names.`);
  }
});

test("no real identities survived from the source screenshots", () => {
  const source = read("assets/js/pages/eu-acquirer/data.js");
  for (const banned of [/pxpfinancial/i, /partner\.pxp/i, /\bdaopay\b/i, /revolut/i, /altopay/i]) {
    assert.doesNotMatch(source, banned,
      `Fixture data must not carry real identities (${banned}).`);
  }
  // Any website in the fixture must sit on a reserved example domain.
  for (const [, host] of source.matchAll(/https?:\/\/([^"'\s/]+)/g)) {
    assert.match(host, /\.example$|(^|\.)example\.(com|org|net)$/,
      `Fixture website "${host}" must use a reserved example domain.`);
  }
});
