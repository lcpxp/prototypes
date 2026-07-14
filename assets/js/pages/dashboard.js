// ------------------------------------------------------------------
// dashboard.js - Renders module cards, counts and recent activity
// for dashboard.html. Cards come from App.registry.modules so the
// dashboard and navigation can never disagree about what exists.
// ------------------------------------------------------------------

(function () {
  "use strict";

  // All card counts arrive in one dashboard_counts() call (see
  // supabase/schema/90_dashboard.sql) instead of one request per
  // module. Counts
  // are capped server-side at 1001 so they stay cheap at any scale.
  async function loadCounts(modules) {
    var result = await App.db.rpc("dashboard_counts");
    modules.forEach(function (mod) {
      if (!mod.statTable) return;
      var el = document.getElementById("stat-" + mod.key);
      if (!el) return;
      var count = result.data ? result.data[mod.statTable] : null;
      if (result.error || count == null) el.textContent = "-";
      else el.textContent = count > 1000 ? "1000+" : count;
    });
  }

  function cardHtml(mod) {
    var html =
      '<a class="card" href="' + App.escape(App.moduleHref(mod)) + '">' +
      '<span class="eyebrow">' + App.escape(mod.title) + "</span>";
    if (mod.statTable) {
      html +=
        '<p class="stat" id="stat-' + App.escape(mod.key) + '">-</p>' +
        '<p class="card-meta">' + App.escape(mod.statLabel) + "</p>";
    } else {
      html +=
        "<h2>" + App.escape(mod.heading || mod.title) + "</h2>" +
        '<p class="card-meta">' + App.escape(mod.description) + "</p>";
    }
    return html + "</a>";
  }

  function visibleModules() {
    return App.registry.modules.filter(function (mod) {
      return !App.canAccess || App.canAccess(mod.key);
    });
  }

  function renderCards() {
    var host = document.getElementById("module-cards");
    if (!host) return;

    var modules = visibleModules();
    host.innerHTML = modules.map(cardHtml).join("");
    loadCounts(modules);
  }

  async function loadRecent() {
    var host = document.getElementById("recent-specs");
    if (!host) return;

    var reference = App.registry.modules.find(function (mod) {
      return mod.key === "reference";
    });

    var result = await App.db
      .from(App.registry.tables.apiSpecs)
      .select("id, title, version, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (result.error || !result.data || result.data.length === 0) {
      host.innerHTML =
        '<p class="notice">No specs yet. Add rows to the api_specs table ' +
        "in Supabase and they will appear here and in the reference viewer.</p>";
      return;
    }

    var html = '<div class="table-wrap"><table><thead><tr>' +
      "<th>Spec</th><th>Version</th><th>Status</th><th>Updated</th>" +
      "</tr></thead><tbody>";

    result.data.forEach(function (spec) {
      var updated = spec.updated_at
        ? new Date(spec.updated_at).toLocaleDateString()
        : "";
      var href = App.moduleHref(reference) + "index.html?spec=" + spec.id;
      html +=
        "<tr>" +
        '<td><a href="' + App.escape(href) + '">' +
        App.escape(spec.title) + "</a></td>" +
        '<td class="mono">' + App.escape(spec.version) + "</td>" +
        "<td>" + App.statusBadge(spec.status) + "</td>" +
        "<td>" + App.escape(updated) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table></div>";
    host.innerHTML = html;
  }

  // Explain a redirect from a module the user has no grant for.
  function showDeniedNotice() {
    var key = new URLSearchParams(window.location.search).get("denied");
    var el = document.getElementById("page-notice");
    if (!key || !el) return;
    var mod = App.registry.modules.find(function (m) { return m.key === key; });
    el.innerHTML =
      '<p class="notice error">You do not have access to ' +
      App.escape(mod ? mod.title : key) +
      ". Ask an admin to enable it for you on the users page.</p>";
  }

  App.onAuthed(function () {
    showDeniedNotice();
    renderCards();
    loadRecent();
  });
})();
