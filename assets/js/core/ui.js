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
    // Capture the label before the async work so both outcomes can
    // restore it; a denied clipboard permission must not fail silently.
    var previous = button ? button.textContent : "";
    navigator.clipboard.writeText(text).then(function () {
      if (!button) return;
      button.textContent = "Copied";
      window.setTimeout(function () { button.textContent = previous; }, 1200);
    }).catch(function () {
      if (!button) return;
      button.textContent = "Copy failed";
      window.setTimeout(function () { button.textContent = previous; }, 1600);
    });
  };

  // Render a standard notice into a host element (or its id). kind
  // "error" adds the error styling; anything else is a plain notice.
  // The message is escaped, so callers pass plain text (including a
  // raw error.message).
  App.notice = function (host, kind, message) {
    var el = typeof host === "string" ? document.getElementById(host) : host;
    if (!el) return;
    el.innerHTML = '<p class="notice' + (kind === "error" ? " error" : "") +
      '">' + App.escape(message) + "</p>";
  };

  // Deep-link support for list pages: when the URL carries a #<id>
  // fragment naming a rendered item (e.g. #capability-<id>), bring it
  // into view and flag it briefly. Pages call this after they render,
  // since their content is fetched asynchronously.
  App.deepLinkScroll = function () {
    var id = (window.location.hash || "").replace(/^#/, "");
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("is-linked");
    window.setTimeout(function () { el.classList.remove("is-linked"); }, 2000);
  };

  // True when href resolves to the page currently open, treating a
  // directory and its index.html as the same page.
  function isCurrentPage(href) {
    var norm = function (p) { return p.replace(/index\.html$/, ""); };
    var target = new URL(href, window.location.href).pathname;
    return norm(target) === norm(window.location.pathname);
  }

  // Moon/sun icon markup for the theme button. Dark mode shows a sun
  // (press to go light); light mode shows a moon (press to go dark).
  function themeIcon(isDark) {
    var attrs =
      'viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round"';
    if (isDark) {
      return "<svg " + attrs + ">" +
        '<circle cx="12" cy="12" r="4"></circle>' +
        '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4' +
        'M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>' +
        "</svg>";
    }
    return "<svg " + attrs + ">" +
      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' +
      "</svg>";
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
      'LPio <span class="nav-brand-mark">/</span> LaunchPad IO</a>';
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
    // Theme switch: a moon/sun icon button seated next to the profile
    // icon. It shows a sun in dark mode (press to go light) and a moon
    // in light mode (press to go dark); keeps id "theme-toggle".
    var dark = App.theme && App.theme.isDark();
    html +=
      '<button class="nav-icon-btn" id="theme-toggle" type="button" aria-label="' +
      (dark ? "Switch to light mode" : "Switch to dark mode") + '">' +
      '<span class="nav-icon" id="nav-theme-icon" aria-hidden="true">' +
      themeIcon(dark) + "</span></button>";

    // Account menu: a profile icon that opens a dropdown holding the
    // signed-in email and sign out. The email span keeps id "nav-user".
    html +=
      '<div class="nav-account">' +
      '<button class="nav-icon-btn nav-account-trigger" id="nav-account-trigger" type="button" ' +
      'aria-haspopup="true" aria-expanded="false" aria-controls="nav-account-menu" ' +
      'aria-label="Account menu">' +
      '<span class="nav-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="8" r="4"></circle>' +
      '<path d="M4 20c0-3.5 3.6-5.5 8-5.5s8 2 8 5.5"></path>' +
      "</svg></span></button>" +
      '<div class="nav-account-menu" id="nav-account-menu" role="menu" hidden>' +
      '<span class="nav-account-email" id="nav-user"></span>' +
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
    var themeIconEl = document.getElementById("nav-theme-icon");
    if (themeToggle && App.theme) {
      themeToggle.addEventListener("click", function () {
        App.theme.toggle();
      });
      // Keep the icon and label in step whenever the theme changes,
      // whether from this button or the OS (with no explicit choice).
      App.onThemeChange = function (theme) {
        var isDark = theme === "dark";
        if (themeIconEl) themeIconEl.innerHTML = themeIcon(isDark);
        themeToggle.setAttribute(
          "aria-label",
          isDark ? "Switch to light mode" : "Switch to dark mode"
        );
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
