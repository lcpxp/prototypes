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
    // Global search: only rendered when search.js is present, so a page
    // without it never shows a dead input.
    if (App.search) {
      html +=
        '<div class="nav-search">' +
        '<input type="search" id="nav-search-input" class="nav-search-input" ' +
        'placeholder="Search" autocomplete="off" aria-label="Search the portal" ' +
        'role="combobox" aria-expanded="false" aria-controls="nav-search-results">' +
        '<div class="nav-search-results" id="nav-search-results" role="listbox" hidden></div>' +
        "</div>";
    }
    // Account menu: the only visible control is the profile icon. It
    // opens a dropdown holding the signed-in email, the dark-mode
    // switch and sign out. The email span keeps id "nav-user" and the
    // toggle keeps id "theme-toggle" so the wiring below is unchanged.
    var dark = App.theme && App.theme.isDark();
    html +=
      '<div class="nav-account">' +
      '<button class="nav-account-trigger" id="nav-account-trigger" type="button" ' +
      'aria-haspopup="true" aria-expanded="false" aria-controls="nav-account-menu" ' +
      'aria-label="Account menu">' +
      '<span class="nav-account-avatar" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="8" r="4"></circle>' +
      '<path d="M4 20c0-3.5 3.6-5.5 8-5.5s8 2 8 5.5"></path>' +
      "</svg></span></button>" +
      '<div class="nav-account-menu" id="nav-account-menu" role="menu" hidden>' +
      '<span class="nav-account-email" id="nav-user"></span>' +
      '<label class="nav-account-theme">' +
      '<span class="nav-theme-text">Dark mode</span>' +
      '<span class="toggle"><input type="checkbox" id="theme-toggle"' +
      (dark ? " checked" : "") + ">" +
      '<span class="track" aria-hidden="true"></span></span></label>' +
      '<button class="button quiet" id="nav-signout" role="menuitem" type="button">Sign out</button>' +
      "</div></div>";
    html += "</nav>";
    host.innerHTML = html;

    if (App.search) App.search.attach();

    // Account dropdown: toggle on the profile icon, close on an outside
    // click or Escape. Clicks inside the menu (the theme switch) keep it
    // open so dark mode can be flipped without dismissing it.
    var accountTrigger = document.getElementById("nav-account-trigger");
    var accountMenu = document.getElementById("nav-account-menu");
    if (accountTrigger && accountMenu) {
      var setAccountOpen = function (open) {
        accountMenu.hidden = !open;
        accountTrigger.setAttribute("aria-expanded", open ? "true" : "false");
      };
      accountTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        setAccountOpen(accountMenu.hidden);
      });
      accountMenu.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      document.addEventListener("click", function () {
        if (!accountMenu.hidden) setAccountOpen(false);
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !accountMenu.hidden) {
          setAccountOpen(false);
          accountTrigger.focus();
        }
      });
    }

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
