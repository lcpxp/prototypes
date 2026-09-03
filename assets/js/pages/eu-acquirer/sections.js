// ------------------------------------------------------------------
// eu-acquirer/sections.js - The markup for each section of the application
// summary page, in the portal's own order. Pure string builders: they
// read the fixture and the role's capability list, and never touch the
// DOM or hold state. eu-acquirer-app.js composes and wires them.
//
// Every control goes through btn(), which returns nothing at all when
// the role lacks the capability - so an out-of-scope control is absent
// from the DOM rather than rendered disabled.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var esc = App.escape;
  var demo = window.EuAcquirerDemo;
  var app = demo.application;
  var can = demo.can;

  var TICK = '<svg class="ps-tick" viewBox="0 0 24 24" width="16" height="16" ' +
    'fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">' +
    '<path d="M20 6L9 17l-5-5"/></svg>';
  var CHEVRON = '<svg class="ps-chevron" viewBox="0 0 24 24" width="14" ' +
    'height="14" fill="none" stroke="currentColor" stroke-width="2" ' +
    'aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  function chip(value) {
    return '<span class="ps-chip ps-chip--' + demo.tone(value) + '">' +
      esc(value) + "</span>";
  }

  function btn(action, label, variant) {
    if (!can(action)) return "";
    return '<button type="button" class="ps-btn ps-btn--' + (variant || "ghost") +
      '" data-action="' + esc(action) + '">' + esc(label) + "</button>";
  }

  function statusBar() {
    return '<div class="ps-statusbar"><div><h1>' + esc(app.merchant) + "</h1>" +
      '<p class="ps-statusbar-partner">Partner: ' + esc(app.partner) + "</p></div>" +
      '<p class="ps-statusbar-right">Application status: ' + chip(app.stage) +
      "</p></div>";
  }

  // ---- Application summary, decision status and the send controls ----
  function summary(decision, noteSent) {
    var options = demo.statusOptions(decision).map(function (s) {
      return '<option value="' + esc(s.value) + '"' +
        (s.disabled ? " disabled" : "") +
        (s.value === decision ? " selected" : "") + ">" + esc(s.value) + "</option>";
    }).join("");

    // The note belongs to Pend, and Pend is a EU Acquirer decision, so the
    // panel only exists for the role that can make it. Once sent, the
    // field is replaced by what was sent and to whom - the input has
    // done its job and leaving it editable implies it can be resent.
    var note = "";
    if (can("approveAndSendKyc")) {
      note = noteSent
        ? '<div class="ps-notepanel" id="ps-note">' +
          '<p class="ps-notepanel-head">Pending further information</p>' +
          '<blockquote class="ps-notepanel-quote">' + esc(noteSent) +
          "</blockquote></div>"
        : '<div class="ps-notepanel" id="ps-note" hidden>' +
          '<p class="ps-notepanel-head">This note goes to the Acquirer accounts ' +
          "team</p>" +
          '<label class="ps-notepanel-label" for="ps-note-text">Say what is ' +
          "needed before the application can proceed. It will not send " +
          "without one.</label>" +
          '<textarea id="ps-note-text" placeholder="For example: the bank ' +
          'statement provided is older than three months."></textarea></div>';
    }

    return '<section class="ps-sec"><h2>Application summary</h2>' +
      '<p class="ps-sec-hint">Please review all the information you have ' +
      "provided.</p>" +
      '<div class="ps-controls"><label for="ps-status">Application status:</label>' +
      '<select class="ps-select" id="ps-status">' + options + "</select>" +
      btn("updateStatus", "Update status", "primary") +
      btn("sendToCrm", "Send to CRM") +
      btn("sendOnboardingRecord", "Send EU Acquirer onboarding record") +
      btn("sendDocuments", "Send EU Acquirer documents") +
      "</div>" + note +
      '<p class="ps-sec-meta"><span>Last updated: ' + esc(app.lastUpdated) +
      "</span><span>Application ID: " + esc(app.applicationId) + "</span></p>" +
      "</section>";
  }

  function steps() {
    var rows = app.steps.map(function (name) {
      return '<div class="ps-steprow">' + TICK +
        '<span class="ps-steprow-name">' + esc(name) + "</span>" +
        chip("Complete") + CHEVRON + "</div>";
    }).join("");
    return '<section class="ps-sec"><h2>Application steps</h2>' +
      '<div class="ps-steplist">' + rows + "</div></section>";
  }

  // ---- The two contract tables. Row actions are View and Download. ----
  function contractTable(list, prefix, emptyText) {
    var head = "<thead><tr><th>Contract</th><th>Type</th><th>Status</th>" +
      "<th>Updated on</th><th>Action</th></tr></thead>";
    if (!list.length) {
      return '<div class="ps-grid-wrap"><table class="ps-grid">' + head +
        '<tbody><tr><td colspan="5"><p class="ps-empty">' + esc(emptyText) +
        "</p></td></tr></tbody></table></div>";
    }
    var rows = list.map(function (c, i) {
      return "<tr><td>" + esc(c.name) + "</td><td>" + chip(c.type) + "</td>" +
        "<td>" + chip(c.status) + "</td><td>" + esc(c.updated) + "</td>" +
        '<td><div class="ps-actionwrap">' +
        '<button type="button" class="ps-btn ps-btn--quiet" data-menu="' +
        prefix + i + '">Actions</button>' +
        '<ul class="ps-actionmenu hidden" data-menu-for="' + prefix + i + '">' +
        '<li><button type="button" data-action="viewContract">View</button></li>' +
        '<li><button type="button" data-action="downloadContract">Download' +
        "</button></li></ul></div></td></tr>";
    }).join("");
    return '<div class="ps-grid-wrap"><table class="ps-grid">' + head +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  function contracts() {
    return '<section class="ps-sec"><h2>Contracts</h2>' +
      '<div class="ps-controls">' +
      btn("generateContract", "Generate contract") +
      btn("sendContract", "Send contract", "primary") +
      "</div>" + contractTable(app.contracts, "c",
        "No contract yet. A Acquirer user generates it here.") + "</section>";
  }

  // Approve lives here: sending the KYC contract is the approval, so
  // the EU Acquirer role gets one named button in place of the generic pair.
  function kyc() {
    return '<section class="ps-sec"><h2>EU Acquirer KYC contracts</h2>' +
      '<div class="ps-controls">' +
      btn("generateKyc", "Generate contract") +
      btn("sendKyc", "Send contract", "primary") +
      btn("approveAndSendKyc", "Send KYC and approve merchant", "primary") +
      "</div>" + contractTable(app.kycContracts, "k",
        "No KYC contract yet. A Acquirer user generates it here.") + "</section>";
  }

  function checks() {
    var rows = app.checks.map(function (c, i) {
      var items = '<li><button type="button" data-action="viewReport">' +
        "View report</button></li>" +
        '<li><button type="button" data-action="generatePdf">Generate PDF' +
        "</button></li>";
      if (can("overrideScreening")) {
        items += '<li><button type="button" data-action="overrideScreening">' +
          "Override screening</button></li>" +
          '<li><button type="button" data-action="removeScreening">' +
          "Remove screening</button></li>";
      }
      return "<tr><td>" + esc(c.name) + "</td><td>" + chip(c.status) + "</td>" +
        "<td>" + esc(c.reason || "-") + "</td><td>" + esc(c.by) + "</td>" +
        "<td>" + esc(c.at) + "</td>" +
        '<td><div class="ps-actionwrap">' +
        '<button type="button" class="ps-btn ps-btn--quiet" data-menu="s' + i +
        '">Actions</button>' +
        '<ul class="ps-actionmenu hidden" data-menu-for="s' + i + '">' + items +
        "</ul></div></td></tr>";
    }).join("");

    var controls = can("runCheck")
      ? '<div class="ps-controls">' +
        '<label for="ps-check">Select additional check to run</label>' +
        '<select class="ps-select" id="ps-check"><option>Experian</option>' +
        "<option>Companies House</option><option>ComplyAdvantage</option></select>" +
        btn("runCheck", "Run check", "primary") + "</div>"
      : "";

    return '<section class="ps-sec"><h2>Third-party checks</h2>' + controls +
      '<div class="ps-grid-wrap"><table class="ps-grid">' +
      "<thead><tr><th>Check</th><th>Status</th><th>Reason</th>" +
      "<th>Last run by</th><th>Last run on</th><th>Action</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div></section>";
  }

  function bank() {
    return '<section class="ps-sec"><h2>Bank verification</h2>' +
      '<div class="ps-bank"><dl>' +
      "<dt>Bank</dt><dd>" + esc(app.bank.bank) + "</dd>" +
      "<dt>Account holder</dt><dd>" + esc(app.bank.holder) + "</dd>" +
      "</dl>" + chip(app.bank.verified ? "Verified" : "Not verified") +
      "</div></section>";
  }

  function documents() {
    var groups = app.documentGroups.map(function (group) {
      var rows = group.docs.map(function (doc) {
        return '<div class="ps-docrow"><span class="ps-docname">' +
          esc(doc.name) +
          (doc.files
            ? '<span class="ps-doccount">(' + doc.files + " file" +
              (doc.files === 1 ? "" : "s") + " uploaded)</span>"
            : "") +
          "</span>" + btn("uploadDocument", "Upload document") + "</div>";
      }).join("");
      return '<div class="ps-docgroup"><h3>' + esc(group.title) + "</h3>" +
        '<div class="ps-doclist">' + rows + "</div></div>";
    }).join("");
    return '<section class="ps-sec"><h2>Documents</h2>' + groups + "</section>";
  }

  function fees() {
    var rows = app.fees.map(function (f) {
      return "<tr><td>" + esc(f.category) + "</td><td>" + esc(f.fee) + "</td>" +
        "<td>" + esc(f.frequency) + "</td><td>" + esc(f.amount) + "</td></tr>";
    }).join("");
    return '<section class="ps-sec"><h2>Fees</h2>' +
      '<div class="ps-grid-wrap"><table class="ps-grid">' +
      "<thead><tr><th>Category</th><th>Fee</th><th>Frequency</th>" +
      "<th>Amount</th></tr></thead><tbody>" + rows +
      "</tbody></table></div></section>";
  }

  function record() {
    var rows = app.record.map(function (pair) {
      return '<button type="button" class="ps-recordrow" data-copy="' +
        esc(pair[1]) + '"><span class="ps-recordkey">' + esc(pair[0]) +
        '</span><span class="ps-recordval">' + esc(pair[1]) + "</span></button>";
    }).join("");
    return '<section class="ps-sec"><h2>Merchant onboarding record</h2>' +
      '<p class="ps-sec-hint">Click a row to copy its value.</p>' +
      '<div class="ps-record">' + rows + "</div></section>";
  }

  demo.sections = {
    statusBar: statusBar,
    all: function (state) {
      return summary(state.decision, state.noteSent) + steps() + contracts() +
        kyc() + checks() + bank() + documents() + fees() + record();
    },
  };
})();
