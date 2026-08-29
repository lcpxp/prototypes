// ------------------------------------------------------------------
// pci/ixopay.js - In-page mock of the IXOPAY vendor client and its
// webhook/event bus for the PCI prototype. Shaped like a real client so
// the demo can be swapped for the live integration later. Exposed as
// App.pciIxopay; holds no real data and talks to no network. State is
// in memory only (simulation honesty).
//
// CONFIRMED with IXOPAY: a compliance check, one full-payload enrolment
// (merchant + products), a per-merchant status webhook, low-frequency
// polling, and a reporting API (engagement, compliance, webhooks
// outstanding, chases). Every invented request/response shape below is
// an INTEGRATION POINT to confirm with IXOPAY.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var webhookListeners = [];
  var eventListeners = [];
  var store = {};       // referenceId -> { status, expiryDate, name }
  var chaseLog = [];    // { merchant, action, on } - IXOPAY chasing activity

  var knownCompliant = { "northwind retail ltd": true };

  function makeRef() { return "IXP-" + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function isoInMonths(m) { var d = new Date(); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10); }
  function count(list, status) { return list.filter(function (m) { return m.status === status; }).length; }

  function emitWebhook(p) {
    // INTEGRATION POINT (confirm with IXOPAY): webhook payload
    // { referenceId, status, expiryDate? } - schema TBC.
    webhookListeners.forEach(function (cb) { cb(p); });
  }
  function emitEvent(p) {
    // Models the "enrolment invitation sent" lifecycle event.
    // INTEGRATION POINT (confirm with IXOPAY): event names/delivery TBC.
    eventListeners.forEach(function (cb) { cb(p); });
  }
  function advance(referenceId, status, expiryDate) {
    var r = store[referenceId];
    if (!r) return;
    r.status = status;
    if (expiryDate) r.expiryDate = expiryDate;
    emitWebhook({ referenceId: referenceId, status: status, expiryDate: r.expiryDate });
  }

  var ixopay = {
    // CONFIRMED: verification of a merchant's existing compliance.
    complianceCheck: function (query) {
      // INTEGRATION POINT (confirm with IXOPAY): lookup keys and response TBC.
      var key = String((query && query.businessName) || "").trim().toLowerCase();
      if (knownCompliant[key]) {
        return { found: true, status: "compliant", expiryDate: isoInMonths(9) };
      }
      return { found: false };
    },

    // CONFIRMED: single enrolment call with the full merchant + product
    // payload; IXOPAY derives and pre-fills the SAQ.
    createEnrolment: function (payload) {
      // INTEGRATION POINT (confirm with IXOPAY): request body is the full
      // Launchpad payload (merchant, products, contact email); response TBC.
      var referenceId = makeRef();
      var name = (payload && payload.merchant && payload.merchant.businessName) || "Merchant";
      store[referenceId] = { status: "invited", expiryDate: isoInMonths(12), name: name };
      setTimeout(function () {
        emitEvent({ type: "invitation.sent", referenceId: referenceId, email: payload && payload.email });
      }, 400);
      return { referenceId: referenceId, status: "invited", payload: payload };
    },

    onWebhook: function (cb) { webhookListeners.push(cb); },
    onEvent: function (cb) { eventListeners.push(cb); },

    // CONFIRMED: low-frequency polling fallback (every 15-30 days).
    getStatus: function (referenceId) {
      var r = store[referenceId];
      return r ? { status: r.status, expiryDate: r.expiryDate } : { status: "unknown" };
    },

    // CONFIRMED: reporting API - portfolio totals, engagement, webhooks
    // outstanding and the chases IXOPAY has performed.
    getReport: function () {
      // INTEGRATION POINT (confirm with IXOPAY): report shape TBC. The base
      // portfolio is illustrative; the live merchant is layered on.
      var base = { enrolled: 128, invited: 14, chased: 9, inProgress: 22, compliant: 96, overdue: 10 };
      var live = Object.keys(store).map(function (id) {
        return { referenceId: id, name: store[id].name, status: store[id].status, expiryDate: store[id].expiryDate };
      });
      var invited = base.invited + count(live, "invited");
      var chased = base.chased + count(live, "chased");
      var inProgress = base.inProgress + count(live, "in_progress");
      var overdue = base.overdue + count(live, "overdue");
      var baseChases = [
        { merchant: "Blue Harbour Ltd", action: "Reminder email sent", on: isoInMonths(0) },
        { merchant: "Kessler Gaming", action: "Second reminder + call scheduled", on: isoInMonths(0) },
        { merchant: "Vantage Retail", action: "Annual revalidation reminder", on: isoInMonths(0) },
      ];
      return {
        enrolled: base.enrolled + live.length,
        invited: invited,
        chased: chased,
        inProgress: inProgress,
        compliant: base.compliant + count(live, "compliant"),
        overdue: overdue,
        webhooksOutstanding: invited + chased + inProgress,
        chases: chaseLog.concat(baseChases),
        merchants: live,
      };
    },

    // --- Demo drivers (NOT part of the real client) -----------------
    // Stand in for events IXOPAY raises on its own: their chasing engine,
    // the merchant's completion, and the validation window lapsing.
    _chase: function (referenceId) {
      var r = store[referenceId];
      if (r) chaseLog.push({ merchant: r.name, action: "Reminder email sent", on: new Date().toISOString().slice(0, 10) });
      advance(referenceId, "chased");
    },
    _start: function (referenceId) { advance(referenceId, "in_progress"); },
    _complete: function (referenceId) { advance(referenceId, "compliant", isoInMonths(12)); },
    _overdue: function (referenceId) { advance(referenceId, "overdue"); },
  };

  // Back-compat alias for the earlier prototype/test.
  ixopay.verifyCompliance = ixopay.complianceCheck;

  App.pciIxopay = ixopay;
})();
