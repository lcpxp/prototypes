// ------------------------------------------------------------------
// eu-acquirer/shell.js - Shared chrome for the EU Acquirer replica pages: the
// black portal header, the navigation sider, and the role switch that
// flips between the Acquirer and EU Acquirer views of the same page.
// Renders into [data-ps-shell]; the page modules fill .ps-content.
//
// The role switch sits in the header rather than in a banner over the
// content, so the page below it is the portal and nothing else.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var host = document.querySelector("[data-ps-shell]");
  if (!host) return;

  var esc = App.escape;
  var demo = window.EuAcquirerDemo;
  var role = demo.currentRole();

  var LOGO = '<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">' +
    '<circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<circle cx="24" cy="9" r="3" class="ps-logo-dot"/></svg>';

  var AVATAR = '<svg viewBox="64 64 896 896" width="15" height="15" fill="currentColor">' +
    '<path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.63 375.63 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"/></svg>';

  // Sider items. Only Applications is wired up; the rest are present
  // because the real sider has them, and render as inert labels.
  var NAV = [
    { label: "Dashboard" },
    { label: "Applications", href: "applications.html" },
    { label: "Partners" },
    { label: "Users" },
    { label: "System Management" },
  ];

  function navItems() {
    var active = host.getAttribute("data-ps-nav") || "Applications";
    return NAV.map(function (item) {
      var cls = "ps-menu-item" + (item.label === active ? " ps-menu-item--active" : "");
      var inner = esc(item.label);
      var link = item.href
        ? '<a href="' + esc(withRole(item.href)) + '">' + inner + "</a>"
        : "<a>" + inner + "</a>";
      return '<li class="' + cls + '">' + link + "</li>";
    }).join("");
  }

  // Keep the demo role across navigation, so a EU Acquirer user stays one.
  function withRole(href) {
    return role.key === "euacquirer" ? href + "?role=euacquirer" : href;
  }

  // The one control that is not in the real portal. It lives in the
  // header chrome, styled to belong there.
  function roleSwitch() {
    return '<span class="ps-roleswitch" role="group" aria-label="View as">' +
      '<button type="button" class="ps-roletab" data-role="acquirer" aria-pressed="' +
      (role.key === "acquirer") + '">Acquirer</button>' +
      '<button type="button" class="ps-roletab" data-role="euacquirer" aria-pressed="' +
      (role.key === "euacquirer") + '">EU Acquirer</button></span>';
  }

  function header() {
    return '<header class="ps-header"><div class="ps-header-inner">' +
      '<div class="ps-header-left"><span class="ps-logo">' + LOGO +
      "<strong>Acquirer</strong></span>" + roleSwitch() + "</div>" +
      '<div class="ps-header-right">' +
      (role.key === "acquirer"
        ? '<button type="button" class="ps-quote-trigger">Quote Tool</button>'
        : "") +
      '<span class="ps-user">Welcome, ' + esc(role.user) + "</span>" +
      '<span class="ps-avatar" aria-hidden="true">' + AVATAR + "</span>" +
      "</div></div></header>";
  }

  host.innerHTML = header() +
    '<div class="ps-body">' +
    '<aside class="ps-sider"><div class="ps-sider-title"><span>Navigation</span></div>' +
    '<ul class="ps-menu">' + navItems() + "</ul>" +
    '<div class="ps-sider-footer">Acquirer &copy; 2026</div></aside>' +
    '<main class="ps-content">' +
    '<div class="ps-sheet" data-ps-page data-page="' +
    esc(host.getAttribute("data-ps-page-kind") || "") + '"></div></main></div>';

  host.querySelectorAll(".ps-roletab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = new URL(window.location.href);
      if (btn.getAttribute("data-role") === "euacquirer") url.searchParams.set("role", "euacquirer");
      else url.searchParams.delete("role");
      window.location.href = url.toString();
    });
  });
})();
