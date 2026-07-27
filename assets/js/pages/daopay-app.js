// ------------------------------------------------------------------
// daopay-app.js - The application summary page in the Daopay replica:
// composition, state and behaviour. The section markup lives in
// daopay-sections.js; the modals, toasts and stepped progress live in
// daopay-sim.js. This module owns what the application currently is,
// and drives the transitions between those states.
//
// Both roles run this same code path. Which controls exist is decided
// by DaopayDemo.can() inside the section builders, never by a role
// comparison here.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var mount = document.querySelector("[data-pxp-page][data-page='application']");
  if (!mount) return;

  var demo = window.DaopayDemo;
  var app = demo.application;
  var sections = demo.sections;

  var state = { decision: app.status, noteSent: "" };
  var busy = false;

  function stamp() {
    var d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  // ---------------- The merchant contract ----------------
  // Sent to the merchant, who signs first; the two Daopay countersigners
  // follow on their own. The delays are what make the order legible.
  function sendContract() {
    return demo.askEmail("Send contract for signature",
      "The merchant signs first, then the Daopay CEO and CTO countersign.",
      "Merchant email address").then(function (email) {
      if (!email) return;
      app.stage = "Awaiting Contract Signature";
      render();
      demo.toast("Contract sent", "Sent to " + email + " for signature.");
      return demo.runSteps("Adobe Sign - Merchant Agreement",
        "Nordwind Digital GmbH", [
          { label: "Envelope created in Adobe Sign", note: "Merchant Agreement, 3 signature fields", wait: 900 },
          { label: "Email delivered to the merchant", note: email, wait: 1000 },
          { label: "Signed by the merchant", note: "Nordwind Digital GmbH", wait: 1600,
            toast: ["Signed by the merchant", "1 of 3 signatures received."] },
          { label: "Countersigned by the Daopay CEO", note: "Oliver", wait: 1500,
            toast: ["Countersigned by Oliver", "2 of 3 signatures received."] },
          { label: "Countersigned by the Daopay CTO", note: "Michael", wait: 1500,
            toast: ["Countersigned by Michael", "3 of 3 - the contract is fully signed."] },
          { label: "Executed copy generated", note: "Merchant Agreement (signed).pdf", wait: 900 },
        ], "Continue").then(function () {
        app.contracts[0].type = "Signed";
        app.contracts[0].updated = stamp();
        render();
        return handoff();
      });
    });
  }

  // ---------------- The automated handoff ----------------
  // Nobody presses anything for this in the real flow, so it runs on
  // its own and reports itself through the toast stack.
  function handoff() {
    demo.toast("Full signature received", "The automated handoff to Daopay has started.");
    return demo.runBackground([
      { wait: 1100, toast: ["Merchant record sent to CRM", "All merchant and application data, via the CRM integration."] },
      { wait: 1300, toast: ["Files transferred by SFTP", "Signed contract and 2 screening report PDFs."] },
      { wait: 1200, toast: ["Daopay compliance notified", "The application is now waiting on a Daopay decision."] },
    ]).then(function () {
      app.stage = "Awaiting Acquirer Decision";
      render();
    });
  }

  // ---------------- Approve: send the KYC ----------------
  function approveAndSendKyc() {
    return demo.askEmail("Send KYC and approve merchant",
      "Sending the KYC contract for signature is the approval. There is no " +
      "separate confirmation step.",
      "Merchant email address").then(function (email) {
      if (!email) return;
      state.decision = "Approved";
      app.stage = "Approved";
      render();
      demo.toast("Merchant approved", "The KYC contract is on its way to " + email + ".");
      return demo.runSteps("Adobe Sign - DaoPay KYC", "Nordwind Digital GmbH", [
        { label: "Envelope created in Adobe Sign", note: "DaoPay KYC, 1 signature field", wait: 900 },
        { label: "Email delivered to the merchant", note: email, wait: 1000 },
        { label: "Signed by the merchant", note: "No countersignature required", wait: 1700,
          toast: ["KYC signed by the merchant", "Onboarding is complete."] },
      ], "Close").then(function () {
        app.kycContracts[0].type = "Signed";
        app.kycContracts[0].updated = stamp();
        render();
      });
    });
  }

  // ---------------- Reject and pend ----------------
  function applyStatus() {
    var select = document.getElementById("pxp-status");
    var note = document.getElementById("pxp-note");
    var next = select.value;

    if (next === "Pending Further Information") {
      var field = document.getElementById("pxp-note-text");
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
      render();
      demo.toast("Status updated", "Set to Pending Further Information.");
      demo.runBackground([
        { wait: 900, toast: ["Notification sent to PXP accounts", "Your note has been passed on to the merchant's account manager."] },
      ]);
      return;
    }

    state.decision = next;
    state.noteSent = "";
    app.stage = next;
    render();
    demo.toast("Status updated", "Set to " + next + ".");
  }

  // ---------------- Everything else ----------------
  var SIMPLE = {
    sendToCrm: ["Sent to CRM", "Manual re-send. In the live flow this fires on full signature."],
    sendOnboardingRecord: ["Onboarding record sent", "Manual re-send to DaoPay."],
    sendDocuments: ["Documents sent", "Manual re-send to DaoPay by SFTP."],
    generateContract: ["Merchant contract generated", "Ready to send for signature."],
    generateKyc: ["KYC contract generated", "Ready for Daopay to send."],
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
    mount.querySelectorAll(".pxp-actionmenu").forEach(function (menu) {
      menu.classList.add("hidden");
    });
  }

  function wire() {
    var select = document.getElementById("pxp-status");
    var note = document.getElementById("pxp-note");
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
        if (action === "sendContract") { run(sendContract); return; }
        if (action === "approveAndSendKyc") { run(approveAndSendKyc); return; }
        // The KYC send exists on the page for PXP but is not theirs to
        // use: that send is the acquirer's approval. Saying so is more
        // useful than pretending it went.
        if (action === "sendKyc") {
          demo.toast("Not yours to send",
            "Only Daopay can send the KYC contract - that send is the approval.",
            "warn");
          return;
        }
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
      '<div class="pxp-panel">' + sections.all(state) + "</div>";
    wire();
  }

  document.addEventListener("click", closeMenus);
  render();
})();
