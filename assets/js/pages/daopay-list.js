// ------------------------------------------------------------------
// daopay-list.js - The Applications list in the Daopay replica.
// Reproduces the portal's list: search by merchant name, filters,
// striped table, pagination footer.
//
// The point of the page is the ACQUIRER column. A Daopay user's list
// is this same table scoped to the rows where they are the acquirer,
// which is how "only their applications" is actually enforced.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var mount = document.querySelector("[data-pxp-page][data-page='list']");
  if (!mount) return;

  var esc = App.escape;
  var demo = window.DaopayDemo;
  var role = demo.currentRole();
  var scoped = role.key === "daopay";
  var query = "";

  function rows() {
    return demo.applications.filter(function (a) {
      if (scoped && a.acquirer !== "DaoPay") return false;
      return a.merchant.toLowerCase().indexOf(query.toLowerCase()) !== -1;
    });
  }

  function chip(value) {
    return '<span class="pxp-chip pxp-chip--' + demo.tone(value) + '">' +
      esc(value) + "</span>";
  }

  function merchantCell(a) {
    if (!a.id) return esc(a.merchant);
    var href = "application.html" + (scoped ? "?role=daopay" : "");
    return '<a href="' + esc(href) + '">' + esc(a.merchant) + "</a>";
  }

  // Deleting an application is a PXP action; a Daopay user gets an
  // empty cell rather than a disabled control.
  function actionsCell(a) {
    if (scoped) return "";
    return '<button type="button" class="pxp-btn pxp-btn--quiet" data-delete="' +
      esc(a.merchant) + '">Remove</button>';
  }

  function body(list) {
    if (!list.length) {
      return '<tr><td colspan="7"><p class="pxp-empty">No applications match ' +
        "that search.</p></td></tr>";
    }
    return list.map(function (a) {
      return "<tr>" +
        '<td><span class="pxp-partner"><span class="pxp-initial">' +
        esc(a.partner.charAt(0)) + "</span>" + esc(a.partner) + "</span></td>" +
        "<td>" + merchantCell(a) + "</td>" +
        "<td>" + chip(a.risk) + "</td>" +
        "<td>" + esc(a.by) + '<span class="pxp-grid-sub">' + esc(a.at) + "</span></td>" +
        "<td>" + esc(a.acquirer) + "</td>" +
        "<td>" + chip(a.status) + "</td>" +
        "<td>" + actionsCell(a) + "</td>" +
        "</tr>";
    }).join("");
  }

  function render() {
    var list = rows();
    mount.innerHTML =
      '<div class="pxp-page-header"><h2>Applications</h2>' +
      "<p>" + (scoped
        ? "Scoped to applications where DaoPay is the acquirer."
        : "All applications across every acquirer.") + "</p></div>" +
      '<div class="pxp-toolbar">' +
      '<input class="pxp-input" type="search" id="pxp-search" ' +
      'placeholder="Search by merchant name" aria-label="Search by merchant name" ' +
      'value="' + esc(query) + '">' +
      '<button type="button" class="pxp-btn pxp-btn--ghost">Filters</button></div>' +
      '<div class="pxp-grid-wrap"><table class="pxp-grid">' +
      "<thead><tr><th>Partner</th><th>Merchant name</th><th>Risk</th>" +
      "<th>Created</th><th>Acquirer</th><th>Status</th><th>Actions</th></tr></thead>" +
      "<tbody>" + body(list) + "</tbody></table></div>" +
      '<div class="pxp-pager"><span>' + list.length + " item" +
      (list.length === 1 ? "" : "s") + " &middot; Page 1 of 1</span>" +
      '<span class="pxp-pager-pages">' +
      '<button type="button" aria-current="page">1</button></span></div>';

    var search = document.getElementById("pxp-search");
    search.addEventListener("input", function () {
      query = search.value;
      render();
      var again = document.getElementById("pxp-search");
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    });

    mount.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        demo.toast("Removing an application is out of scope for this prototype.");
      });
    });
  }

  render();
})();
