// ------------------------------------------------------------------
// users.js - User list for users.html, read from the profiles table.
// Accounts are created in the Supabase dashboard; this page is a
// read-only register of who has access and at what level.
// ------------------------------------------------------------------

(function () {
  "use strict";

  App.onAuthed(async function () {
    var host = document.getElementById("user-table");

    var result = await App.db
      .from("profiles")
      .select("email, display_name, role, created_at")
      .order("created_at", { ascending: true });

    if (result.error) {
      host.innerHTML =
        '<p class="notice error">Could not load users: ' +
        App.escape(result.error.message) + "</p>";
      return;
    }

    if (!result.data || result.data.length === 0) {
      host.innerHTML =
        '<p class="notice">No profiles found. Profiles are created ' +
        "automatically when a user is added in Supabase " +
        "(Authentication, then Users, then Add user).</p>";
      return;
    }

    var html = '<div class="table-wrap"><table><thead><tr>' +
      "<th>Name</th><th>Email</th><th>Role</th><th>Added</th>" +
      "</tr></thead><tbody>";

    result.data.forEach(function (profile) {
      var added = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString()
        : "";
      html +=
        "<tr>" +
        "<td>" + App.escape(profile.display_name || "") + "</td>" +
        '<td class="mono">' + App.escape(profile.email || "") + "</td>" +
        "<td>" +
        (profile.role === "admin"
          ? '<span class="badge admin">admin</span>'
          : '<span class="badge">member</span>') +
        "</td>" +
        "<td>" + App.escape(added) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table></div>";
    host.innerHTML = html;
  });
})();
