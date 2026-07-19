// ------------------------------------------------------------------
// pci-ixopay.js - In-page mock of the IXOPAY vendor client and its
// webhook/event bus, for the PCI compliance prototype. Shaped like a
// real client so the demo can be swapped for the live integration
// later. Exposed as App.pciIxopay; holds no real data and talks to no
// network. State lives in memory only (simulation honesty).
//
// CONFIRMED with IXOPAY (see the prototype overview): one full-payload
// enrolment call, verification of existing compliance, a per-merchant
// status webhook, low-frequency polling, and a reporting API. Every
// invented request/response shape below is an INTEGRATION POINT.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var webhookListeners = [];
  var eventListeners = [];
  var store = {}; // referenceId -> { status, expiryDate }

  // Merchants IXOPAY already holds a compliant record for. The demo
  // merchant is present so the "Yes - verify" path can show a hit.
  var knownCompliant = { "northwind retail ltd": true };

  function makeRef() {
    return "IXP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function isoInMonths(months) {
    var d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  function count(list, status) {
    return list.filter(function (m) { return m.status === status; }).length;
  }

  function emitWebhook(payload) {
    // CONFIRMED: per-merchant webhook fires on status change.
    // INTEGRATION POINT (confirm with IXOPAY): { referenceId, status,
    // expiryDate? } - webhook payload schema TBC.
    webhookListeners.forEach(function (cb) { cb(payload); });
  }

  function emitEvent(payload) {
    // Models the "enrolment invitation sent" lifecycle event that
    // triggers Launchpad's fee-product basket line.
    // INTEGRATION POINT (confirm with IXOPAY): event names/delivery TBC.
    eventListeners.forEach(function (cb) { cb(payload); });
  }

  function advance(referenceId, status, expiryDate) {
    var record = store[referenceId];
    if (!record) return;
    record.status = status;
    if (expiryDate) record.expiryDate = expiryDate;
    emitWebhook({ referenceId: referenceId, status: status, expiryDate: record.expiryDate });
  }

  var ixopay = {
    // CONFIRMED: single enrolment call with the full merchant payload;
    // their system derives the SAQ type and pre-fills it.
    createEnrolment: function (fullPayload) {
      // INTEGRATION POINT (confirm with IXOPAY): request body is the
      // full Launchpad merchant payload; response shape TBC.
      var referenceId = makeRef();
      store[referenceId] = { status: "invited", expiryDate: isoInMonths(12) };
      // IXOPAY emails the invitation link, then tells us it was sent.
      setTimeout(function () {
        emitEvent({ type: "invitation.sent", referenceId: referenceId });
      }, 400);
      return { referenceId: referenceId, status: "invited", payload: fullPayload };
    },

    // CONFIRMED: verification of a merchant's existing compliance.
    verifyCompliance: function (query) {
      // INTEGRATION POINT (confirm with IXOPAY): lookup keys (mid /
      // businessName) and response shape TBC.
      var key = String((query && query.businessName) || "").trim().toLowerCase();
      if (knownCompliant[key]) {
        return { found: true, status: "compliant", expiryDate: isoInMonths(9) };
      }
      return { found: false };
    },

    // CONFIRMED: per-merchant status webhook (completion / compliant).
    onWebhook: function (callback) { webhookListeners.push(callback); },

    // Lifecycle events (invitation.sent). Separate from status webhooks.
    onEvent: function (callback) { eventListeners.push(callback); },

    // CONFIRMED: low-frequency polling fallback (every 15-30 days).
    getStatus: function (referenceId) {
      // INTEGRATION POINT (confirm with IXOPAY): polling endpoint TBC.
      var record = store[referenceId];
      return record
        ? { status: record.status, expiryDate: record.expiryDate }
        : { status: "unknown" };
    },

    // CONFIRMED: reporting API - portfolio totals plus granular rows.
    getReport: function () {
      // INTEGRATION POINT (confirm with IXOPAY): report shape TBC. The
      // base portfolio is illustrative; the live merchant is layered on.
      var base = { enrolled: 128, compliant: 96, inProgress: 22, overdue: 10 };
      var merchants = Object.keys(store).map(function (id) {
        return { referenceId: id, status: store[id].status, expiryDate: store[id].expiryDate };
      });
      return {
        enrolled: base.enrolled + merchants.length,
        compliant: base.compliant + count(merchants, "compliant"),
        inProgress: base.inProgress + count(merchants, "in_progress"),
        overdue: base.overdue + count(merchants, "overdue"),
        merchants: merchants,
      };
    },

    // --- Demo drivers (NOT part of the real client) -----------------
    // These stand in for events IXOPAY's system raises on its own:
    // their chasing engine, the merchant's own completion, and the
    // validation window lapsing. They emit the same webhooks the real
    // integration would.
    _chase: function (referenceId) { advance(referenceId, "chased"); },
    _start: function (referenceId) { advance(referenceId, "in_progress"); },
    _complete: function (referenceId) { advance(referenceId, "compliant", isoInMonths(12)); },
    _overdue: function (referenceId) { advance(referenceId, "overdue"); },
  };

  App.pciIxopay = ixopay;
})();
