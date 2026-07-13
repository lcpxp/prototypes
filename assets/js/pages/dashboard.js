// ------------------------------------------------------------------
// dashboard.js - Renders module cards, counts and recent activity
// for dashboard.html. Cards come from App.registry.modules so the
// dashboard and navigation can never disagree about what exists.
// ------------------------------------------------------------------

(function () {
  "use strict";

  async function countRows(table) {
    var result = await App.db
      .from(table)
      .select("*", { count: "exact", head: true });
    return result.error ? "-" : result.count;
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

  async function renderCards() {
    var host = document.getElementById("module-cards");
    if (!host) return;

    var modules = visibleModules();
    host.innerHTML = modules.map(cardHtml).join("");

    modules
      .filter(function (mod) { return mod.statTable; })
      .forEach(async function (mod) {
        var el = document.getElementById("stat-" + mod.key);
        if (el) el.textContent = await countRows(mod.statTable);
      });
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

  App.onAuthed(function () {
    renderCards();
    loadRecent();
  });
})();
