// ------------------------------------------------------------------
// eu-acquirer/app.js - The application summary page in the EU Acquirer replica:
// composition, state and behaviour. The section markup lives in
// eu-acquirer-sections.js; the modals, toasts and stepped progress live in
// eu-acquirer-sim.js. This module owns what the application currently is,
// and drives the transitions between those states.
//
// Both roles run this same code path. Which controls exist is decided
// by EuAcquirerDemo.can() inside the section builders, never by a role
// comparison here.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var mount = document.querySelector("[data-ps-page][data-page='application']");
  if (!mount) return;

  var demo = window.EuAcquirerDemo;
  var app = demo.application;
  var sections = demo.sections;

  // Hydrated from sessionStorage by eu-acquirer-data.js, so a role switch -
  // which reloads the page - resumes where it left off.
  var state = {
    decision: demo.savedState.decision,
    noteSent: demo.savedState.noteSent,
  };
  var busy = false;

  function save() { demo.persist(state); }

  function stamp() {
    var d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  // ---------------- Generate (Acquirer) ----------------
  // The tables begin empty. Generating adds the row and persists it, so
  // the EU Acquirer user finds the contract there to send after the switch.
  function generateContract() {
    if (app.contracts.length) {
      demo.toast("Already generated", "The merchant contract is on the application.");
      return;
    }
    app.contracts.push({
      name: app.generatable.contract.name, type: "Unsigned",
      status: "Active", updated: stamp(),
    });
    save();
    render();
    demo.toast("Merchant contract generated", "Ready for EU Acquirer to send for signature.");
  }

  function generateKyc() {
    if (app.kycContracts.length) {
      demo.toast("Already generated", "The KYC contract is on the application.");
      return;
    }
    app.kycContracts.push({
      name: app.generatable.kyc.name, type: "Unsigned",
      status: "Active", updated: stamp(),
    });
    save();
    render();
    demo.toast("KYC contract generated", "Ready for EU Acquirer to send on approval.");
  }

  // ---------------- The merchant contract ----------------
  // Sent to the merchant, who signs first; the two EU Acquirer countersigners
  // follow on their own. The delays are what make the order legible.
  function sendContract() {
    if (!app.contracts.length) {
      demo.toast("No contract to send",
        "A Acquirer user needs to generate the contract first.", "warn");
      return;
    }
    return demo.askEmail("Send contract for signature",
      "The merchant signs first, then the EU Acquirer CEO and CTO countersign.",
      "Merchant email address").then(function (email) {
      if (!email) return;
      app.stage = "Awaiting Contract Signature";
      save();
      render();
      demo.toast("Contract sent", "Sent to " + email + " for signature.");
      return demo.runSteps("Adobe Sign - Merchant Agreement",
        "Nordwind Digital GmbH", [
          { label: "Envelope created in Adobe Sign", note: "Merchant Agreement, 3 signature fields", wait: 900 },
          { label: "Email delivered to the merchant", note: email, wait: 1000 },
          { label: "Signed by the merchant", note: "Nordwind Digital GmbH", wait: 1600,
            toast: ["Signed by the merchant", "1 of 3 signatures received."] },
          { label: "Countersigned by the EU Acquirer CEO", note: "Oliver", wait: 1500,
            toast: ["Countersigned by Oliver", "2 of 3 signatures received."] },
          { label: "Countersigned by the EU Acquirer CTO", note: "Michael", wait: 1500,
            toast: ["Countersigned by Michael", "3 of 3 - the contract is fully signed."] },
          { label: "Executed copy generated", note: "Merchant Agreement (signed).pdf", wait: 900 },
        ], "Continue").then(function () {
        app.contracts[0].type = "Signed";
        app.contracts[0].updated = stamp();
        save();
        render();
        return handoff();
      });
    });
  }

  // ---------------- The automated handoff ----------------
  // Nobody presses anything for this in the real flow, so it runs on
  // its own and reports itself through the toast stack.
  function handoff() {
    demo.toast("Full signature received", "The automated handoff to EU Acquirer has started.");
    return demo.runBackground([
      { wait: 1100, toast: ["Merchant record sent to CRM", "All merchant and application data, via the CRM integration."] },
      { wait: 1300, toast: ["Files transferred by SFTP", "Signed contract and 2 screening report PDFs."] },
      { wait: 1200, toast: ["EU Acquirer compliance notified", "The application is now waiting on a EU Acquirer decision."] },
    ]).then(function () {
      app.stage = "Application Signed";
      save();
      render();
    });
  }

  // ---------------- Approve: send the KYC ----------------
  function approveAndSendKyc() {
    if (!app.kycContracts.length) {
      demo.toast("No KYC contract",
        "A Acquirer user needs to generate the KYC contract first.", "warn");
      return;
    }
    return demo.askEmail("Send KYC and approve merchant",
      "Sending the KYC contract for signature is the approval. There is no " +
      "separate confirmation step.",
      "Merchant email address").then(function (email) {
      if (!email) return;
      state.decision = "Approved";
      app.stage = "Approved";
      save();
      render();
      demo.toast("Merchant approved", "The KYC contract is on its way to " + email + ".");
      return demo.runSteps("Adobe Sign - EU Acquirer KYC", "Nordwind Digital GmbH", [
        { label: "Envelope created in Adobe Sign", note: "EU Acquirer KYC, 1 signature field", wait: 900 },
        { label: "Email delivered to the merchant", note: email, wait: 1000 },
        { label: "Signed by the merchant", note: "No countersignature required", wait: 1700,
          toast: ["KYC signed by the merchant", "Onboarding is complete."] },
      ], "Close").then(function () {
        app.kycContracts[0].type = "Signed";
        app.kycContracts[0].updated = stamp();
        save();
        render();
      });
    });
  }

  // ---------------- Reject and pend ----------------
  function applyStatus() {
    var select = document.getElementById("ps-status");
    var note = document.getElementById("ps-note");
    var next = select.value;

    if (next === "Pending Further Information") {
      var field = document.getElementById("ps-note-text");
      var text = field ? field.value.trim() : "";
      if (note && !text) {
        demo.toast("Add a note first",
          "The note is the whole message the accounts team receives.", "warn");
        if (field) field.focus();
        return;
      }
      state.decision = next;
      state.noteSent = text;
      app.stage = "Pending Further Information";
      save();
      render();
      demo.toast("Status updated", "Set to Pending Further Information.");
      demo.runBackground([
        { wait: 900, toast: ["Notification sent to Acquirer accounts", "Your note has been passed on to the merchant's account manager."] },
      ]);
      return;
    }

    state.decision = next;
    state.noteSent = "";
    app.stage = next;
    save();
    render();
    demo.toast("Status updated", "Set to " + next + ".");
  }

  // ---------------- Everything else ----------------
  var SIMPLE = {
    sendToCrm: ["Sent to CRM", "Manual re-send. In the live flow this fires on full signature."],
    sendOnboardingRecord: ["Onboarding record sent", "Manual re-send to EU Acquirer."],
    sendDocuments: ["Documents sent", "Manual re-send to EU Acquirer by SFTP."],
    viewContract: ["Opening the contract", "Merchant Agreement.pdf"],
    downloadContract: ["Download started", "Merchant Agreement.pdf"],
    viewReport: ["Opening the screening report", "Full result and evidence."],
    generatePdf: ["PDF generated", "Screening report saved to the application."],
    overrideScreening: ["Screening overridden", "Recorded against your name."],
    removeScreening: ["Screening removed", "The check no longer applies."],
    runCheck: ["Check queued", "The result will appear when it returns."],
    uploadDocument: ["Ready for a file", "Choose a document to attach."],
  };

  function closeMenus() {
    mount.querySelectorAll(".ps-actionmenu").forEach(function (menu) {
      menu.classList.add("hidden");
    });
  }

  function wire() {
    var select = document.getElementById("ps-status");
    var note = document.getElementById("ps-note");
    if (select && note && !state.noteSent) {
      var sync = function () {
        note.hidden = select.value !== "Pending Further Information";
      };
      select.addEventListener("change", sync);
      sync();
    }

    mount.querySelectorAll("[data-menu]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.stopPropagation();
        var menu = mount.querySelector(
          '[data-menu-for="' + trigger.getAttribute("data-menu") + '"]');
        var wasOpen = !menu.classList.contains("hidden");
        closeMenus();
        if (!wasOpen) menu.classList.remove("hidden");
      });
    });

    mount.querySelectorAll("[data-action]").forEach(function (control) {
      control.addEventListener("click", function () {
        var action = control.getAttribute("data-action");
        closeMenus();
        if (busy) return;
        if (action === "updateStatus") { applyStatus(); return; }
        if (action === "generateContract") { generateContract(); return; }
        if (action === "generateKyc") { generateKyc(); return; }
        if (action === "sendContract") { run(sendContract); return; }
        if (action === "approveAndSendKyc") { run(approveAndSendKyc); return; }
        var msg = SIMPLE[action];
        if (msg) demo.toast(msg[0], msg[1]);
      });
    });

    mount.querySelectorAll("[data-copy]").forEach(function (row) {
      row.addEventListener("click", function () {
        var value = row.getAttribute("data-copy");
        if (navigator.clipboard) navigator.clipboard.writeText(value);
        demo.toast("Copied", value);
      });
    });
  }

  // One long-running simulation at a time, so two overlapping runs
  // cannot leave the fixture half-updated.
  function run(fn) {
    busy = true;
    function free() { busy = false; }
    Promise.resolve(fn()).then(free, free);
  }

  function render() {
    mount.innerHTML = sections.statusBar() +
      '<div class="ps-panel">' + sections.all(state) + "</div>";
    wire();
  }

  document.addEventListener("click", closeMenus);
  render();
})();
