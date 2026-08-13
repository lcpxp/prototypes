// ------------------------------------------------------------------
// gallery.js - Prototype registry for modules/prototypes/.
// Prototypes are registered as rows in the prototypes table, so the
// gallery and dashboard update without navigation code changes.
// ------------------------------------------------------------------

(function () {
  "use strict";

  // Pure builder for the ideas strip: rows in, string out, so it is
  // unit-testable without Supabase or the DOM. Returns "" when there
  // is nothing to show, letting the caller keep the section hidden.
  //
  // It was a two-column table of every row. It is now the top few by
  // priority with a link through to the board (App.ideasView), because
  // the gallery is where somebody lands and a fourteen-row table there
  // was a list nobody read - the burying problem in miniature.
  App.futurePrototypesTable = function (rows) {
    if (!rows || !rows.length) return "";
    return App.ideasView.stripHtml(rows, { href: "ideas.html", limit: 5 });
  };

  App.onAuthed(async function () {
    renderFuture();
    var host = document.getElementById("prototype-list");

    var result = await App.db
      .from(App.registry.tables.prototypes)
      .select("title, description, path, status, tags")
      .order("title", { ascending: true });

    if (result.error) {
      App.notice(host, "error", "Could not load prototypes: " + result.error.message);
      return;
    }

    if (!result.data || result.data.length === 0) {
      host.innerHTML =
        '<p class="notice">No prototypes registered. Add a page under ' +
        "modules/prototypes/ and insert a matching row into the " +
        "prototypes table so it appears here.</p>";
      return;
    }

    // The only fully requested prototype is PCI; it stands alone under
    // "Live". Everything else groups under "Drafts", greyed but clickable.
    function isPci(proto) {
      var path = String(proto.path || "");
      var title = String(proto.title || "");
      return /(^|\/)pci(\/|$)/i.test(path) || /^pci\b/i.test(title.trim());
    }

    function card(proto) {
      var href = proto.path
        ? App.root + "/" + String(proto.path).replace(/^\/+/, "")
        : "#";
      var tags = (proto.tags || [])
        .map(function (tag) {
          return '<span class="badge">' + App.escape(tag) + "</span>";
        })
        .join(" ");
      return (
        '<a class="card" href="' + App.escape(href) + '">' +
        "<h2>" + App.escape(proto.title) + "</h2>" +
        "<p>" + App.escape(proto.description || "") + "</p>" +
        '<p class="card-meta">' + App.statusBadge(proto.status) +
        (tags ? " " + tags : "") + "</p>" +
        "</a>"
      );
    }

    var live = result.data.filter(isPci);
    var drafts = result.data.filter(function (proto) {
      return !isPci(proto);
    });

    var html = "";
    if (live.length) {
      html +=
        '<h2 class="eyebrow eyebrow-heading">Live</h2>' +
        '<div class="card-grid">' +
        live.map(card).join("") +
        "</div>";
    }
    if (drafts.length) {
      html +=
        '<h2 class="eyebrow eyebrow-heading">Drafts</h2>' +
        '<div class="card-grid is-muted">' +
        drafts.map(card).join("") +
        "</div>";
    }
    host.innerHTML = html;
  });

  // Load the pre-draft shortlist and render it as a plain table. A
  // failure or an empty list leaves the section hidden rather than
  // showing an error: it is reference material, not core content.
  async function renderFuture() {
    var section = document.getElementById("future-prototypes");
    var list = document.getElementById("future-prototype-list");
    if (!section || !list) return;

    var result = await App.db
      .from(App.registry.tables.futurePrototypes)
      .select("id, name, summary, status, priority, sort_order")
      .order("priority", { ascending: true })
      .order("sort_order", { ascending: true });

    if (result.error || !result.data || !result.data.length) return;

    list.innerHTML = App.futurePrototypesTable(result.data);
    section.hidden = false;
  }
})();
