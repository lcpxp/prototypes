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
    var known = ["get", "post", "put", "patch", "delete", "query"];
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

  // True when href resolves to the page currently open, treating a
  // directory and its index.html as the same page.
  function isCurrentPage(href) {
    var norm = function (p) { return p.replace(/index\.html$/, ""); };
    var target = new URL(href, window.location.href).pathname;
    return norm(target) === norm(window.location.pathname);
  }

  function renderNav() {
    var host = document.getElementById("app-nav");
    if (!host) return;

    var root = App.root || ".";
    var links = [{ href: root + "/dashboard.html", label: "Dashboard" }];
    App.registry.modules.forEach(function (mod) {
      // App.canAccess is defined by guard.js once the signed-in
      // user's module grants have loaded; before that, show all.
      if (App.canAccess && !App.canAccess(mod.key)) return;
      links.push({ href: App.moduleHref(mod), label: mod.title });
    });

    var html = '<nav class="nav">';
    html +=
      '<a class="nav-brand" href="' + root + '/dashboard.html">' +
      'LPio <span style="color: var(--lime)">/</span> LaunchPad IO</a>';
    html += '<div class="nav-links">';
    links.forEach(function (link) {
      html +=
        '<a href="' + link.href + '"' +
        (isCurrentPage(link.href) ? ' aria-current="page"' : "") + ">" +
        App.escape(link.label) + "</a>";
    });
    html += "</div>";
    html += '<span class="nav-user" id="nav-user"></span>';
    // Dark-mode switch: a real checkbox, on when the dark theme is
    // active. The wrapping label names it for assistive tech.
    var dark = App.theme && App.theme.isDark();
    html +=
      '<label class="nav-theme">' +
      '<span class="nav-theme-text">Dark mode</span>' +
      '<span class="toggle"><input type="checkbox" id="theme-toggle"' +
      (dark ? " checked" : "") + ">" +
      '<span class="track" aria-hidden="true"></span></span></label>';
    html += '<button class="button quiet" id="nav-signout" type="button">Sign out</button>';
    html += "</nav>";
    host.innerHTML = html;

    document.getElementById("nav-signout").addEventListener("click", function () {
      if (App.db) App.db.auth.signOut();
    });

    var themeToggle = document.getElementById("theme-toggle");
    if (themeToggle && App.theme) {
      themeToggle.addEventListener("change", function () {
        App.theme.set(themeToggle.checked ? "dark" : "light");
      });
      // Keep the switch in step if the theme changes elsewhere (e.g.
      // the OS flips while no explicit choice has been made).
      App.onThemeChange = function (theme) {
        themeToggle.checked = theme === "dark";
      };
    }

    if (App.onAuthed) {
      App.onAuthed(function (session) {
        var el = document.getElementById("nav-user");
        if (el && session.user) el.textContent = session.user.email || "";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Wait for the grant map so hidden modules never flash into the
    // nav; without a guard (login page) render immediately.
    if (App.accessReady) App.accessReady.then(renderNav);
    else renderNav();
  });
})();
