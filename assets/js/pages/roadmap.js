// ------------------------------------------------------------------
// roadmap.js - Roadmap view for modules/roadmap/.
// Renders roadmap_areas as sections with their roadmap_items grouped
// by horizon (now, next, later, someday) and ordered by priority.
// This is the skeleton view: richer renderings (timeline, swimlanes,
// waterfall, exports) will read the same tables, so content work
// done now carries straight over.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var HORIZONS = [
    { key: "now", label: "Now" },
    { key: "next", label: "Next" },
    { key: "later", label: "Later" },
    { key: "someday", label: "Someday" },
  ];

  function itemHtml(item) {
    var facts = [App.statusBadge(item.status)];
    if (item.effort) facts.push('<span class="badge">' + App.escape(item.effort) + "</span>");
    if (item.impact) facts.push('<span class="badge">' + App.escape(item.impact) + " impact</span>");
    (item.tags || []).forEach(function (tag) {
      facts.push('<span class="badge">' + App.escape(tag) + "</span>");
    });
    return (
      '<div class="card">' +
      "<h2>" + App.escape(item.title) + "</h2>" +
      (item.summary ? "<p>" + App.escape(item.summary) + "</p>" : "") +
      '<p class="card-meta">' + facts.join(" ") + "</p>" +
      "</div>"
    );
  }

  function horizonHtml(items) {
    var html = "";
    HORIZONS.forEach(function (horizon) {
      var group = items.filter(function (i) { return i.horizon === horizon.key; });
      if (group.length === 0) return;
      html +=
        '<h3 class="eyebrow">' + App.escape(horizon.label) + "</h3>" +
        '<div class="card-grid">' + group.map(itemHtml).join("") + "</div>";
    });
    return html;
  }

  // Areas without items are skipped: the shared work_areas taxonomy
  // is wider than what is currently on the roadmap.
  function areaHtml(area, items) {
    return (
      "<section>" +
      "<h2>" + App.escape(area.title) + "</h2>" +
      (area.description ? '<p class="card-meta">' + App.escape(area.description) + "</p>" : "") +
      horizonHtml(items) +
      "</section>"
    );
  }

  App.onAuthed(async function () {
    var host = document.getElementById("roadmap-content");

    // Areas and items are independent, so fetch them in parallel.
    var results = await Promise.all([
      App.db
        .from(App.registry.tables.workAreas)
        .select("id, key, title, description, sort_order")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true }),
      App.db
        .from(App.registry.tables.roadmapItems)
        .select("area_id, title, summary, status, horizon, priority, effort, impact, tags, sort_order")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);
    var areasResult = results[0];
    var itemsResult = results[1];

    if (areasResult.error) {
      host.innerHTML =
        '<p class="notice error">Could not load roadmap areas: ' +
        App.escape(areasResult.error.message) + "</p>";
      return;
    }

    var areas = areasResult.data || [];
    if (areas.length === 0) {
      host.innerHTML =
        '<p class="notice">No roadmap areas yet. Insert rows into the ' +
        "roadmap_areas and roadmap_items tables in Supabase and they " +
        "will appear here.</p>";
      return;
    }

    if (itemsResult.error) {
      host.innerHTML =
        '<p class="notice error">Could not load roadmap items: ' +
        App.escape(itemsResult.error.message) + "</p>";
      return;
    }

    var items = itemsResult.data || [];
    var sections = areas
      .map(function (area) {
        var own = items.filter(function (i) { return i.area_id === area.id; });
        return own.length ? areaHtml(area, own) : "";
      })
      .join("");
    host.innerHTML = sections ||
      '<p class="notice">No roadmap items yet. Insert rows into the ' +
      "roadmap_items table in Supabase and they will appear here.</p>";
  });
})();
