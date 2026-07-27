// ------------------------------------------------------------------
// daopay-data.js - Fixture data and the role switch for the Daopay EU
// onboarding replica (modules/prototypes/daopay/). In-memory only; no
// Supabase table backs any of this.
//
// EVERY name, identifier, website, bank and amount below is invented.
// The replica mirrors the real portal's structure, section order,
// control labels and status vocabulary - never its data.
// ------------------------------------------------------------------

(function () {
  "use strict";

  // Which controls each role gets. The application page reads this
  // rather than branching on the role in a dozen places, so the
  // boundary is stated once and is the thing under demonstration.
  var CONTROLS = {
    // Two send controls are Daopay-only. "sendContract" (the merchant
    // contract) and "approveAndSendKyc" both live with the acquirer, so
    // the whole run - send, sign, hand off, decide - can be demonstrated
    // from the Daopay view without switching roles. The generic "sendKyc"
    // is absent from both lists: the acquirer's named approve button
    // below replaces it, and PXP never gets a send in that section.
    pxp: [
      "updateStatus", "sendToCrm", "sendOnboardingRecord", "sendDocuments",
      "generateContract", "generateKyc",
      "viewContract", "downloadContract", "viewReport", "generatePdf",
      "overrideScreening", "removeScreening", "runCheck", "uploadDocument",
    ],
    daopay: [
      "updateStatus", "sendContract", "viewContract", "downloadContract",
      "viewReport", "generatePdf", "uploadDocument", "approveAndSendKyc",
    ],
  };

  var ROLES = {
    pxp: { key: "pxp", label: "PXP user", user: "Luke" },
    daopay: { key: "daopay", label: "Daopay user", user: "Lindqvist" },
  };

  function currentRole() {
    var q = new URLSearchParams(window.location.search).get("role");
    return q === "daopay" ? ROLES.daopay : ROLES.pxp;
  }

  function can(action) {
    return CONTROLS[currentRole().key].indexOf(action) !== -1;
  }

  // The applications list. ACQUIRER is the scoping key: a Daopay user
  // sees only the rows where it reads DaoPay.
  var applications = [
    { partner: "Meridian Payments", merchant: "Nordwind Digital GmbH", risk: "High", by: "A. Berger", at: "2026/07/14 10:22", acquirer: "DaoPay", status: "Awaiting Contract Send", id: "nordwind" },
    { partner: "Meridian Payments", merchant: "Talgarth Leisure Ltd", risk: "Low", by: "A. Berger", at: "2026/07/11 09:04", acquirer: "PXP", status: "Approved" },
    { partner: "Northgate ISO", merchant: "Kestrel Freight BV", risk: "Pending", by: "R. Nowak", at: "2026/07/10 16:41", acquirer: "DaoPay", status: "Application In Progress" },
    { partner: "Northgate ISO", merchant: "Brightloom Retail Ltd", risk: "Low", by: "R. Nowak", at: "2026/07/09 11:15", acquirer: "PXP", status: "Onboarding: Pending MID" },
    { partner: "Halcyon Partners", merchant: "Steinbach Handel GmbH", risk: "High", by: "C. Duval", at: "2026/07/08 14:52", acquirer: "DaoPay", status: "Awaiting Contract Signature" },
    { partner: "Halcyon Partners", merchant: "Orchard Lane Bakery", risk: "Low", by: "C. Duval", at: "2026/07/07 08:30", acquirer: "PXP", status: "Approved" },
    { partner: "Meridian Payments", merchant: "Vantage Rail Services", risk: "N/A", by: "A. Berger", at: "2026/07/06 13:19", acquirer: "-", status: "Application In Progress" },
    { partner: "Coastway ISO", merchant: "Fjordline Sport AS", risk: "Pending", by: "M. Ito", at: "2026/07/05 10:07", acquirer: "DaoPay", status: "Application In Progress" },
    { partner: "Coastway ISO", merchant: "Marlowe Interiors Ltd", risk: "Low", by: "M. Ito", at: "2026/07/03 15:33", acquirer: "PXP", status: "Approved" },
    { partner: "Halcyon Partners", merchant: "Lindholm Media AB", risk: "High", by: "C. Duval", at: "2026/07/02 09:48", acquirer: "DaoPay", status: "Awaiting Contract Send" },
    { partner: "Northgate ISO", merchant: "Pike and Foster LLP", risk: "N/A", by: "R. Nowak", at: "2026/06/30 12:11", acquirer: "-", status: "Application In Progress" },
    { partner: "Coastway ISO", merchant: "Aurelia Wellness GmbH", risk: "Low", by: "M. Ito", at: "2026/06/28 17:26", acquirer: "PXP", status: "Approved" },
  ];

  // The decision status select. The first four are unreachable from
  // this point in the flow and render disabled, as they do live.
  var statuses = [
    { value: "Draft", disabled: true },
    { value: "In Progress", disabled: true },
    { value: "Submitted", disabled: true },
    { value: "Pending Manual Review", disabled: true },
    { value: "Approved", disabled: false },
    { value: "Rejected", disabled: false },
    { value: "Pending Further Information", disabled: false },
    { value: "Cancelled", disabled: false },
  ];

  var application = {
    merchant: "Nordwind Digital GmbH",
    partner: "Meridian Payments",
    stage: "Awaiting Contract Send",
    status: "In Progress",
    lastUpdated: "2026/07/14 11:09 by A. Berger",
    applicationId: "01JQ7F4M2K8XW5RBTVN3HD6PZC",

    steps: [
      "Business Information", "Processing Information",
      "Chargebacks and Fraud Information", "AML and CTF Information",
      "Contact Information", "Documents",
    ],

    contracts: [
      { name: "Merchant Agreement - Nordwind Digital GmbH", type: "Unsigned", status: "Active", updated: "2026/07/14 10:26" },
    ],

    kycContracts: [
      { name: "DaoPay KYC - Nordwind Digital GmbH", type: "Unsigned", status: "Active", updated: "2026/07/14 10:26" },
    ],

    checks: [
      { name: "Mastercard MATCH", status: "Complete", reason: "No hits", by: "SYSTEM", at: "2026/07/14 10:31" },
      { name: "Webshield", status: "Complete", reason: "No violations", by: "SYSTEM", at: "2026/07/14 10:33" },
    ],

    bank: { bank: "Example Bank SA", holder: "Nordwind Digital GmbH", verified: false },

    documentGroups: [
      {
        title: "Companies house documents",
        docs: [
          { name: "Certificate of incorporation", files: 1 },
          { name: "Memorandum and articles of association", files: 1 },
          { name: "Statement of capital", files: 0 },
          { name: "Register of directors", files: 1 },
        ],
      },
      {
        title: "Personal identity documents",
        docs: [
          { name: "Photo identification", files: 2 },
          { name: "Proof of address", files: 2 },
          { name: "Shareholder identification", files: 1 },
        ],
      },
      {
        title: "Documents",
        docs: [
          { name: "Bank statement", files: 3 },
          { name: "Processing history", files: 1 },
          { name: "Website screenshots", files: 2 },
          { name: "Refund policy", files: 1 },
          { name: "Terms and conditions", files: 1 },
          { name: "Privacy policy", files: 1 },
          { name: "PCI attestation of compliance", files: 0 },
          { name: "Business plan", files: 1 },
          { name: "Supplier agreements", files: 0 },
        ],
      },
    ],

    fees: [
      { category: "Acquiring", fee: "ECOM transaction fee", frequency: "Per transaction", amount: "0.35 EUR" },
      { category: "Acquiring", fee: "Interchange++ markup", frequency: "Per transaction", amount: "0.45 %" },
      { category: "Gateway", fee: "Gateway access", frequency: "Monthly", amount: "25.00 EUR" },
      { category: "Gateway", fee: "Virtual terminal", frequency: "Monthly", amount: "10.00 EUR" },
      { category: "Risk", fee: "Chargeback handling", frequency: "Per chargeback", amount: "20.00 EUR" },
      { category: "Risk", fee: "Rolling reserve", frequency: "Percentage held", amount: "5.00 %" },
      { category: "Onboarding", fee: "Application fee", frequency: "One-off", amount: "150.00 EUR" },
    ],

    record: [
      ["Merchant legal name", "Nordwind Digital GmbH"],
      ["Trading name", "Nordwind Digital"],
      ["Registration number", "HRB 284419"],
      ["Country of incorporation", "Germany"],
      ["MCC", "[5816] Digital Goods - Games"],
      ["Website", "https://www.nordwind-digital.example"],
      ["Base currency", "EUR"],
      ["Estimated annual volume", "2,400,000"],
      ["Average transaction value", "32"],
      ["Acquirer", "DaoPay"],
      ["Partner", "Meridian Payments"],
      ["Sales team", "EU Sales"],
      ["Application ID", "01JQ7F4M2K8XW5RBTVN3HD6PZC"],
      ["Flow name", "Daopay Onboarding"],
      ["Flow ID", "01JQ7F4M2K9YB2CDEHKMNPQRST"],
    ],
  };

  // Chip tone per status word, shared by both pages.
  var TONES = {
    "Complete": "success", "Approved": "success", "Active": "success",
    "Low": "success", "Signed": "success",
    "Unsigned": "warning", "Awaiting Contract Signature": "warning",
    "Rejected": "danger", "High": "flagged", "Flagged": "flagged",
    "Pending": "info", "Awaiting Contract Send": "info",
    "Application In Progress": "info", "Onboarding: Pending MID": "info",
    "Application Signed": "info",
    "Pending Further Information": "warning",
  };

  function tone(value) { return TONES[value] || "inactive"; }

  // The Daopay role only ever sets two of the eight values, so it is
  // shown two - plus the application's current value, disabled, so the
  // select still reads as a status field rather than a two-item menu.
  function statusOptions(current) {
    if (currentRole().key !== "daopay") return statuses;
    var theirs = ["Rejected", "Pending Further Information"];
    var list = theirs.indexOf(current) === -1
      ? [{ value: current, disabled: true }] : [];
    return list.concat(theirs.map(function (v) {
      return { value: v, disabled: false };
    }));
  }

  window.DaopayDemo = {
    applications: applications,
    application: application,
    statuses: statuses,
    statusOptions: statusOptions,
    currentRole: currentRole,
    can: can,
    tone: tone,
  };
})();
