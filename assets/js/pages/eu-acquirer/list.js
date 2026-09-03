// ------------------------------------------------------------------
// eu-acquirer/list.js - The Applications list in the EU Acquirer replica.
// Reproduces the portal's list: search by merchant name, filters,
// striped table, pagination footer.
//
// The point of the page is the ACQUIRER column. A EU Acquirer user's list
// is this same table scoped to the rows where they are the acquirer,
// which is how "only their applications" is actually enforced.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var mount = document.querySelector("[data-ps-page][data-page='list']");
  if (!mount) return;

  var esc = App.escape;
  var demo = window.EuAcquirerDemo;

  // The list is where an onboarding begins, so it is also the natural
  // place to start over: opening it clears any run in progress, and the
  // application opens fresh with empty contract tables.
  demo.resetState();

  var role = demo.currentRole();
  var scoped = role.key === "euacquirer";
  var query = "";

  function rows() {
    return demo.applications.filter(function (a) {
      if (scoped && a.acquirer !== "EU Acquirer") return false;
      return a.merchant.toLowerCase().indexOf(query.toLowerCase()) !== -1;
    });
  }

  function chip(value) {
    return '<span class="ps-chip ps-chip--' + demo.tone(value) + '">' +
      esc(value) + "</span>";
  }

  function merchantCell(a) {
    if (!a.id) return esc(a.merchant);
    var href = "application.html" + (scoped ? "?role=euacquirer" : "");
    return '<a href="' + esc(href) + '">' + esc(a.merchant) + "</a>";
  }

  // Deleting an application is a Acquirer action; a EU Acquirer user gets an
  // empty cell rather than a disabled control.
  function actionsCell(a) {
    if (scoped) return "";
    return '<button type="button" class="ps-btn ps-btn--quiet" data-delete="' +
      esc(a.merchant) + '">Remove</button>';
  }

  function body(list) {
    if (!list.length) {
      return '<tr><td colspan="7"><p class="ps-empty">No applications match ' +
        "that search.</p></td></tr>";
    }
    return list.map(function (a) {
      return "<tr>" +
        '<td><span class="ps-partner"><span class="ps-initial">' +
        esc(a.partner.charAt(0)) + "</span>" + esc(a.partner) + "</span></td>" +
        "<td>" + merchantCell(a) + "</td>" +
        "<td>" + chip(a.risk) + "</td>" +
        "<td>" + esc(a.by) + '<span class="ps-grid-sub">' + esc(a.at) + "</span></td>" +
        "<td>" + esc(a.acquirer) + "</td>" +
        "<td>" + chip(a.status) + "</td>" +
        "<td>" + actionsCell(a) + "</td>" +
        "</tr>";
    }).join("");
  }

  function render() {
    var list = rows();
    mount.innerHTML =
      '<div class="ps-page-header"><h2>Applications</h2>' +
      "<p>" + (scoped
        ? "Scoped to applications where EU Acquirer is the acquirer."
        : "All applications across every acquirer.") + "</p></div>" +
      '<div class="ps-toolbar">' +
      '<input class="ps-input" type="search" id="ps-search" ' +
      'placeholder="Search by merchant name" aria-label="Search by merchant name" ' +
      'value="' + esc(query) + '">' +
      '<button type="button" class="ps-btn ps-btn--ghost">Filters</button></div>' +
      '<div class="ps-grid-wrap"><table class="ps-grid">' +
      "<thead><tr><th>Partner</th><th>Merchant name</th><th>Risk</th>" +
      "<th>Created</th><th>Acquirer</th><th>Status</th><th>Actions</th></tr></thead>" +
      "<tbody>" + body(list) + "</tbody></table></div>" +
      '<div class="ps-pager"><span>' + list.length + " item" +
      (list.length === 1 ? "" : "s") + " &middot; Page 1 of 1</span>" +
      '<span class="ps-pager-pages">' +
      '<button type="button" aria-current="page">1</button></span></div>';

    var search = document.getElementById("ps-search");
    search.addEventListener("input", function () {
      query = search.value;
      render();
      var again = document.getElementById("ps-search");
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    });

    mount.querySelectorAll("[data-delete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        demo.toast("Not in this prototype",
          "Removing an application is out of scope for the demo.", "warn");
      });
    });
  }

  render();
})();
