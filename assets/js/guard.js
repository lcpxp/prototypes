// ------------------------------------------------------------------
// guard.js - Blocks unauthenticated access to protected pages.
//
// Include on every page except index.html (the login page). Pages
// nested below the repo root must set data-root on <body>, for
// example <body data-root=".."> for prototypes/index.html.
//
// Page scripts should wait for auth before fetching data:
//   App.onAuthed(function (session) { ... });
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

  App.onAuthed = function (fn) {
    App.requireAuth.then(function (session) {
      if (session) fn(session);
    });
  };

  // If the session ends in another tab, drop back to login.
  if (App.db) {
    App.db.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_OUT") {
        window.location.replace(App.root + "/index.html");
      }
    });
  }
})();
