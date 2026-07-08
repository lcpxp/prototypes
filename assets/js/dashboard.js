// ------------------------------------------------------------------
// dashboard.js - Loads counts and recent activity for dashboard.html.
// ------------------------------------------------------------------

(function () {
  "use strict";

  async function countRows(table) {
    var result = await App.db
      .from(table)
      .select("*", { count: "exact", head: true });
    return result.error ? "-" : result.count;
  }

  function setStat(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  async function loadRecent() {
    var host = document.getElementById("recent-specs");
    if (!host) return;

    var result = await App.db
      .from("api_specs")
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
      html +=
        "<tr>" +
        '<td><a href="reference.html?spec=' + App.escape(spec.id) + '">' +
        App.escape(spec.title) + "</a></td>" +
        '<td class="mono">' + App.escape(spec.version) + "</td>" +
        "<td>" + App.statusBadge(spec.status) + "</td>" +
        "<td>" + App.escape(updated) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table></div>";
    host.innerHTML = html;
  }

  App.onAuthed(async function () {
    var counts = await Promise.all([
      countRows("api_specs"),
      countRows("api_endpoints"),
      countRows("prototypes"),
      countRows("profiles"),
    ]);
    setStat("stat-specs", counts[0]);
    setStat("stat-endpoints", counts[1]);
    setStat("stat-prototypes", counts[2]);
    setStat("stat-users", counts[3]);
    loadRecent();
  });
})();
