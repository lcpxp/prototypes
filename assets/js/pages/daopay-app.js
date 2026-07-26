// ------------------------------------------------------------------
// daopay-app.js - The application summary page in the Daopay replica:
// composition, state and behaviour. The section markup lives in
// daopay-sections.js; this module renders it, then wires the row
// action menus, the decision status control and the copyable
// onboarding record.
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
  var sections = demo.sections;
  var decision = demo.application.status;

  // What each control would do against a real system. The prototype
  // states the outcome rather than faking a network call.
  var MESSAGES = {
    sendToCrm: "Sent to CRM. In the live flow this fires automatically once " +
      "the contract is fully signed.",
    sendOnboardingRecord: "Onboarding record sent to DaoPay. In the live flow " +
      "this fires automatically on full signature.",
    sendDocuments: "Documents sent to DaoPay. In the live flow this fires " +
      "automatically on full signature.",
    generateContract: "Merchant contract generated.",
    sendContract: "Merchant contract sent to the merchant for signature.",
    generateKyc: "DaoPay KYC contract generated. Only Daopay can send it.",
    sendKyc: "DaoPay KYC contract sent for signature.",
    viewContract: "Opening the contract.",
    downloadContract: "Downloading the contract.",
    viewReport: "Opening the screening report.",
    generatePdf: "Generating a PDF of the screening report.",
    overrideScreening: "Screening overridden.",
    removeScreening: "Screening removed.",
    runCheck: "Check queued.",
    uploadDocument: "Choose a file to upload.",
  };

  function closeMenus() {
    mount.querySelectorAll(".pxp-actionmenu").forEach(function (menu) {
      menu.classList.add("hidden");
    });
  }

  // Reject and Pend both run through the status select. Pend also
  // carries a note, and that note is what reaches the accounts team,
  // so an empty one is refused rather than silently sent.
  function applyStatus() {
    var select = document.getElementById("pxp-status");
    var note = document.getElementById("pxp-note");
    decision = select.value;
    if (decision === "Pending Further Information" && note) {
      if (!document.getElementById("pxp-note-text").value.trim()) {
        demo.toast("Add a note saying what is needed, then update the status.");
        return;
      }
      demo.toast("Status set to Pending Further Information. The note has been " +
        "sent to the PXP accounts team.");
    } else {
      demo.toast("Status set to " + decision + ".");
    }
    render();
  }

  function wireStatus() {
    var select = document.getElementById("pxp-status");
    var note = document.getElementById("pxp-note");
    if (!select || !note) return;
    function sync() { note.hidden = select.value !== "Pending Further Information"; }
    select.addEventListener("change", sync);
    sync();
  }

  function wireMenus() {
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
  }

  function wireActions() {
    mount.querySelectorAll("[data-action]").forEach(function (control) {
      control.addEventListener("click", function () {
        var action = control.getAttribute("data-action");
        closeMenus();
        if (action === "updateStatus") { applyStatus(); return; }
        if (action === "approveAndSendKyc") {
          decision = "Approved";
          demo.toast("Approved. The KYC contract has been sent to the merchant " +
            "for signature.");
          render();
          return;
        }
        demo.toast(MESSAGES[action] || "Done.");
      });
    });
  }

  function wireRecord() {
    mount.querySelectorAll("[data-copy]").forEach(function (row) {
      row.addEventListener("click", function () {
        var value = row.getAttribute("data-copy");
        if (navigator.clipboard) navigator.clipboard.writeText(value);
        demo.toast("Copied: " + value);
      });
    });
  }

  function render() {
    mount.innerHTML = sections.statusBar() +
      '<div class="pxp-panel">' + sections.all(decision) + "</div>";
    wireStatus();
    wireMenus();
    wireActions();
    wireRecord();
  }

  document.addEventListener("click", closeMenus);
  render();
})();
