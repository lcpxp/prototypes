// ------------------------------------------------------------------
// supabase.js - Initialises the Supabase client as App.db.
// Requires: the supabase-js CDN script and config.js loaded first.
// If config.js is missing, renders a setup notice instead of failing
// silently.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var configured =
    window.APP_CONFIG &&
    window.APP_CONFIG.SUPABASE_URL &&
    window.APP_CONFIG.SUPABASE_URL.indexOf("YOUR-PROJECT-REF") === -1 &&
    window.APP_CONFIG.SUPABASE_ANON_KEY &&
    window.APP_CONFIG.SUPABASE_ANON_KEY.indexOf("YOUR-ANON") === -1;

  if (!configured) {
    App.db = null;
    document.addEventListener("DOMContentLoaded", function () {
      document.body.innerHTML =
        '<div class="login-shell"><div class="login-card">' +
        '<div class="wordmark">Setup required</div>' +
        '<p class="lede">No Supabase configuration was found. Copy ' +
        "<code>assets/js/core/config.example.js</code> to " +
        "<code>assets/js/core/config.js</code> and add your project URL " +
        "and anon key. See docs/SETUP.md.</p>" +
        "</div></div>";
    });
    return;
  }

  App.db = window.supabase.createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_ANON_KEY
  );
})();
