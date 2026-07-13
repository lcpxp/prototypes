// ------------------------------------------------------------------
// gallery.js - Prototype registry for modules/prototypes/.
// Prototypes are registered as rows in the prototypes table, so the
// gallery and dashboard update without navigation code changes.
// ------------------------------------------------------------------

(function () {
  "use strict";

  App.onAuthed(async function () {
    var host = document.getElementById("prototype-list");

    var result = await App.db
      .from(App.registry.tables.prototypes)
      .select("title, description, path, status, tags")
      .order("title", { ascending: true });

    if (result.error) {
      host.innerHTML =
        '<p class="notice error">Could not load prototypes: ' +
        App.escape(result.error.message) + "</p>";
      return;
    }

    if (!result.data || result.data.length === 0) {
      host.innerHTML =
        '<p class="notice">No prototypes registered. Add a page under ' +
        "modules/prototypes/ and insert a matching row into the " +
        "prototypes table so it appears here.</p>";
      return;
    }

    var html = '<div class="card-grid">';
    result.data.forEach(function (proto) {
      var href = proto.path
        ? App.root + "/" + String(proto.path).replace(/^\/+/, "")
        : "#";
      var tags = (proto.tags || [])
        .map(function (tag) {
          return '<span class="badge">' + App.escape(tag) + "</span>";
        })
        .join(" ");
      html +=
        '<a class="card" href="' + App.escape(href) + '">' +
        "<h2>" + App.escape(proto.title) + "</h2>" +
        "<p>" + App.escape(proto.description || "") + "</p>" +
        '<p class="card-meta">' + App.statusBadge(proto.status) +
        (tags ? " " + tags : "") + "</p>" +
        "</a>";
    });
    html += "</div>";
    host.innerHTML = html;
  });
})();
