// ------------------------------------------------------------------
// auth.js - Login page logic for index.html.
// Sign-ups are not offered here by design: accounts are created by
// an admin in the Supabase dashboard (Authentication > Users).
// ------------------------------------------------------------------

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", async function () {
    if (!window.App || !App.db) return;

    // Already signed in: go straight to the dashboard.
    var existing = await App.db.auth.getSession();
    if (existing.data && existing.data.session) {
      window.location.replace("dashboard.html");
      return;
    }

    var form = document.getElementById("login-form");
    var email = document.getElementById("login-email");
    var password = document.getElementById("login-password");
    var submit = document.getElementById("login-submit");
    var notice = document.getElementById("login-notice");

    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      notice.classList.add("hidden");
      submit.disabled = true;
      submit.textContent = "Signing in";

      var result = await App.db.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      });

      if (result.error) {
        notice.textContent =
          result.error.message === "Invalid login credentials"
            ? "Email or password not recognised. Check both and try again."
            : result.error.message;
        notice.classList.remove("hidden");
        submit.disabled = false;
        submit.textContent = "Sign in";
        return;
      }

      window.location.replace("dashboard.html");
    });
  });
})();
