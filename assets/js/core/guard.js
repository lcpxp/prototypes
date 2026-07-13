// ------------------------------------------------------------------
// guard.js - Blocks unauthenticated access to protected pages and
// enforces per-module access.
//
// Include on every page except index.html (the login page). Pages
// nested below the repo root must set data-root on <body>, for
// example <body data-root="../.."> for modules/reference/. Module
// pages also set data-module="<registry key>" so users without a
// grant are returned to the dashboard.
//
// Page scripts should wait for auth before fetching data:
//   App.onAuthed(function (session) { ... });
// The callback fires after both the session and the user's module
// grants have loaded, so App.canAccess is always usable inside it.
//
// This guard is a user-experience layer only. The real boundary is
// Row Level Security: the same grants are enforced by the policies
// in supabase/policies.sql, so hiding a page hides nothing that the
// database would ever have handed out.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  App.root = (document.body && document.body.dataset.root) || ".";

  App.requireAuth = (async function () {
    if (!App.db) return null;
    var result = await App.db.auth.getSession();
    var session = result.data ? result.data.session : null;
    if (!session) {
      window.location.replace(App.root + "/index.html");
      return null;
    }
    App.session = session;
    return session;
  })();

  // Load the signed-in user's role and module grants once. A module
  // is allowed unless an explicit module_access row denies it, and
  // admins are allowed everything - mirroring the database rules.
  App.accessReady = App.requireAuth.then(async function (session) {
    App.access = { admin: false, denied: {} };
    if (!session) return App.access;

    var results = await Promise.all([
      App.db.from(App.registry.tables.profiles)
        .select("role")
        .eq("id", session.user.id)
        .single(),
      App.db.from(App.registry.tables.moduleAccess)
        .select("module_key, allowed")
        .eq("user_id", session.user.id),
    ]);

    if (results[0].data) {
      App.access.admin =
        results[0].data.role === App.registry.roles.admin;
    }
    (results[1].data || []).forEach(function (row) {
      if (!row.allowed) App.access.denied[row.module_key] = true;
    });

    App.canAccess = function (key) {
      return App.access.admin || !App.access.denied[key];
    };
    return App.access;
  });

  App.onAuthed = function (fn) {
    App.accessReady.then(function () {
      if (App.session) fn(App.session);
    });
  };

  // Send users without a grant for this page's module back to the
  // dashboard, which explains the denial via the query parameter.
  var moduleKey = (document.body && document.body.dataset.module) || "";
  if (moduleKey) {
    App.accessReady.then(function () {
      if (App.canAccess && !App.canAccess(moduleKey)) {
        window.location.replace(
          App.root + "/dashboard.html?denied=" +
          encodeURIComponent(moduleKey)
        );
      }
    });
  }

  // If the session ends in another tab, drop back to login.
  if (App.db) {
    App.db.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_OUT") {
        window.location.replace(App.root + "/index.html");
      }
    });
  }
})();
