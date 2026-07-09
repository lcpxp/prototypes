// ------------------------------------------------------------------
// ui.js - Shared UI: top navigation, HTML escaping, badges, copy.
// Renders navigation into <header id="app-nav"></header>.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  App.escape = function (value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  App.methodBadge = function (method) {
    var m = String(method || "").toUpperCase();
    var cls = m.toLowerCase();
    var known = ["get", "post", "put", "patch", "delete"];
    if (known.indexOf(cls) === -1) cls = "";
    return '<span class="badge ' + cls + '">' + App.escape(m) + "</span>";
  };

  App.statusBadge = function (status) {
    var s = String(status || "").toLowerCase();
    return '<span class="badge ' + App.escape(s) + '">' + App.escape(s) + "</span>";
  };

  App.copyText = function (text, button) {
    navigator.clipboard.writeText(text).then(function () {
      if (!button) return;
      var previous = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(function () {
        button.textContent = previous;
      }, 1200);
    });
  };

  function renderNav() {
    var host = document.getElementById("app-nav");
    if (!host) return;

    var root = App.root || ".";
    var links = [
      { href: root + "/dashboard.html", label: "Dashboard" },
      { href: root + "/silos/", label: "Project silos" },
      { href: root + "/reference.html", label: "Developer material" },
      { href: root + "/prototypes/index.html", label: "Prototypes" },
      { href: root + "/users.html", label: "Users" },
    ];

    var current = window.location.pathname.split("/").slice(-2).join("/");

    var html = '<nav class="nav">';
    html +=
      '<a class="nav-brand" href="' + root + '/dashboard.html">' +
      'LPio <span style="color: var(--accent)">/</span> LaunchPad IO</a>';
    html += '<div class="nav-links">';
    links.forEach(function (link) {
      var target = link.href.split("/").slice(-2).join("/");
      var isCurrent = current === target;
      html +=
        '<a href="' + link.href + '"' +
        (isCurrent ? ' aria-current="page"' : "") + ">" +
        App.escape(link.label) + "</a>";
    });
    html += "</div>";
    html += '<span class="nav-user" id="nav-user"></span>';
    html += '<button class="button quiet" id="nav-signout" type="button">Sign out</button>';
    html += "</nav>";
    host.innerHTML = html;

    document.getElementById("nav-signout").addEventListener("click", function () {
      if (App.db) App.db.auth.signOut();
    });

    if (App.onAuthed) {
      App.onAuthed(function (session) {
        var el = document.getElementById("nav-user");
        if (el && session.user) el.textContent = session.user.email || "";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", renderNav);
})();
