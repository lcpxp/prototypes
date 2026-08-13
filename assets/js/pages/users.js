// ------------------------------------------------------------------
// users.js - User and access management for modules/users/.
// Admins get a role select and one toggle per module for every
// user, backed by the profiles and module_access tables. Everyone
// else sees a read-only register. Enforcement lives in the database
// policies (supabase/policies.sql); this page is only the
// management surface.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var host, session;

  function notice(text, isError) {
    var el = document.getElementById("users-notice");
    if (!el) return;
    el.innerHTML = text
      ? '<p class="notice' + (isError ? " error" : "") + '">' +
        App.escape(text) + "</p>"
      : "";
  }

  // Renders whatever role the row carries, rather than admin-or-member.
  // The old binary printed "member" for ANY value that was not admin, so
  // a third role added to the profiles.role constraint would have been
  // silently mislabelled on every row - stored, shown, and wrong.
  function roleBadge(role) {
    var value = String(role == null ? "" : role);
    return '<span class="badge ' + App.escape(value) + '">' +
      App.escape(value) + "</span>";
  }

  function roleCell(profile) {
    if (profile.id === session.user.id) {
      // Never let an admin demote themselves from the UI.
      return roleBadge(profile.role) + ' <span class="card-meta">(you)</span>';
    }
    var options = [App.registry.roles.member, App.registry.roles.admin]
      .map(function (role) {
        return '<option value="' + role + '"' +
          (profile.role === role ? " selected" : "") + ">" + role + "</option>";
      })
      .join("");
    return '<select data-user="' + App.escape(profile.id) +
      '" aria-label="Role for ' + App.escape(profile.email || "") + '">' +
      options + "</select>";
  }

  function toggleCell(profile, mod, deniedMap) {
    var isAdmin = profile.role === App.registry.roles.admin;
    var allowed = isAdmin || !deniedMap[profile.id + ":" + mod.key];
    return '<label class="toggle"><input type="checkbox"' +
      (allowed ? " checked" : "") + (isAdmin ? " disabled" : "") +
      ' data-user="' + App.escape(profile.id) +
      '" data-module="' + App.escape(mod.key) +
      '" aria-label="' + App.escape(mod.title + " access for " + (profile.email || "")) +
      '"><span class="track" aria-hidden="true"></span></label>';
  }

  function render(profiles, deniedMap) {
    var admin = App.access.admin;
    var modules = App.registry.modules;

    var head = "<th>Name</th><th>Email</th><th>Role</th>";
    if (admin) {
      modules.forEach(function (mod) {
        head += "<th>" + App.escape(mod.title) + "</th>";
      });
    }
    head += "<th>Added</th>";

    var body = "";
    profiles.forEach(function (profile) {
      var added = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString()
        : "";
      body += '<tr id="user-' + App.escape(profile.id) + '"><td>' +
        App.escape(profile.display_name || "") + "</td>" +
        '<td class="mono">' + App.escape(profile.email || "") + "</td>" +
        "<td>" + (admin ? roleCell(profile) : roleBadge(profile.role)) + "</td>";
      if (admin) {
        modules.forEach(function (mod) {
          body += "<td>" + toggleCell(profile, mod, deniedMap) + "</td>";
        });
      }
      body += "<td>" + App.escape(added) + "</td></tr>";
    });

    host.innerHTML = '<div class="table-wrap"><table><thead><tr>' +
      head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  }

  async function load() {
    var profileQuery = App.db
      .from(App.registry.tables.profiles)
      .select("id, email, display_name, role, created_at")
      .order("created_at", { ascending: true });

    var results = App.access.admin
      ? await Promise.all([
          profileQuery,
          App.db.from(App.registry.tables.moduleAccess)
            .select("user_id, module_key, allowed"),
        ])
      : [await profileQuery, { data: [] }];

    if (results[0].error) {
      notice("Could not load users: " + results[0].error.message, true);
      return;
    }
    if (!results[0].data || results[0].data.length === 0) {
      host.innerHTML =
        '<p class="notice">No profiles found. Profiles are created ' +
        "automatically when a user is added in Supabase " +
        "(Authentication, then Users, then Add user).</p>";
      return;
    }

    var deniedMap = {};
    (results[1].data || []).forEach(function (row) {
      if (!row.allowed) deniedMap[row.user_id + ":" + row.module_key] = true;
    });

    render(results[0].data, deniedMap);
    App.deepLinkScroll();
  }

  async function saveToggle(input) {
    var result = await App.db
      .from(App.registry.tables.moduleAccess)
      .upsert(
        {
          user_id: input.dataset.user,
          module_key: input.dataset.module,
          allowed: input.checked,
        },
        { onConflict: "user_id,module_key" }
      );
    if (result.error) {
      input.checked = !input.checked;
      notice("Could not save access change: " + result.error.message, true);
      return;
    }
    notice("");
  }

  async function saveRole(select) {
    var result = await App.db
      .from(App.registry.tables.profiles)
      .update({ role: select.value })
      .eq("id", select.dataset.user);
    if (result.error) {
      notice("Could not save role change: " + result.error.message, true);
    } else {
      notice("");
    }
    // Re-render either way: a role change moves toggles into or out
    // of the always-on admin state, and a failure needs a reset.
    load();
  }

  // Pure builder, exported so tests/unit/render-fallbacks.test.js can
  // hold the role rendering without a DOM or a session.
  App.usersView = { roleBadge: roleBadge };

  App.onAuthed(function (authedSession) {
    session = authedSession;
    host = document.getElementById("user-table");

    host.addEventListener("change", function (event) {
      var target = event.target;
      if (target.matches(".toggle input")) saveToggle(target);
      if (target.matches("select[data-user]")) saveRole(target);
    });

    load();
  });
})();
