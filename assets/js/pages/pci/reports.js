// ------------------------------------------------------------------
// pci/reports.js - Compliance reporting view for the PCI prototype,
// rendered from the IXOPAY mock's getReport(): portfolio totals,
// compliance status breakdown, webhooks outstanding, and the chases /
// follow-ups IXOPAY has performed. Reads App.pciIxopay; in-memory only.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var host = document.getElementById("pxp-reports");
  if (!host || !App.pciIxopay) return;
  var esc = App.escape;
  var r = App.pciIxopay.getReport();

  function stat(num, label) {
    return '<div class="pxp-stat-card"><div class="pxp-stat-num">' + num +
      '</div><div class="pxp-stat-label">' + esc(label) + "</div></div>";
  }

  var stats = '<div class="pxp-reports-grid">' +
    stat(r.enrolled, "Enrolled") + stat(r.compliant, "Compliant") +
    stat(r.inProgress, "In progress") + stat(r.overdue, "Overdue") +
    stat(r.webhooksOutstanding, "Webhooks outstanding") + stat(r.invited, "Invited") +
    "</div>";

  var lifecycle = [
    ["Invited", r.invited, "invited"], ["Chased", r.chased, "chased"],
    ["In progress", r.inProgress, "in_progress"], ["Compliant", r.compliant, "compliant"],
    ["Overdue", r.overdue, "overdue"],
  ];
  var statusRows = lifecycle.map(function (row) {
    return "<tr><td><span class=\"pxp-status-pill " + row[2] + "\">" + esc(row[0]) +
      "</span></td><td>" + row[1] + "</td></tr>";
  }).join("");
  var engagement = '<div class="pxp-report-section"><h3>Compliance status breakdown</h3>' +
    '<table class="pxp-rtable"><thead><tr><th>Status</th><th>Merchants</th></tr></thead><tbody>' +
    statusRows + "</tbody></table></div>";

  var webhooks = '<div class="pxp-report-section"><h3>Webhooks outstanding</h3>' +
    "<p>" + r.webhooksOutstanding + " merchants have open lifecycle events (invited, chased or in " +
    "progress); we are awaiting a compliant webhook for each. Real-time is not required - IXOPAY " +
    "owns the journey and we poll every 15 to 30 days as a backstop.</p></div>";

  var chaseRows = r.chases.map(function (c) {
    return "<tr><td>" + esc(c.merchant) + "</td><td>" + esc(c.action) + "</td><td>" + esc(c.on) + "</td></tr>";
  }).join("");
  var chases = '<div class="pxp-report-section"><h3>Chases and follow-ups performed by IXOPAY</h3>' +
    '<table class="pxp-rtable"><thead><tr><th>Merchant</th><th>Action</th><th>Date</th></tr></thead><tbody>' +
    (chaseRows || '<tr><td colspan="3">No chases recorded yet.</td></tr>') + "</tbody></table></div>";

  host.innerHTML = stats + engagement + webhooks + chases;
})();
