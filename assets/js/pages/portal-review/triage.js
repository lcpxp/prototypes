// ------------------------------------------------------------------
// portal-review/triage.js - modules/portal-review/triage.html. The
// promotion pass: every finding in the closing wave under the
// disposition proposed for it, undecided first.
//
// THE PAGE NEVER WRITES. That is settled, not a limitation: because it
// is only ever a rendering of state, it can afford to show everything
// at once - every finding, its area, its emphasis, its links and its
// raise count. An editable board would trade that density for
// controls. The owner reads the whole set in one pass and says what
// changes; the session applies it (docs/PORTAL-REVIEW.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }
  var esc = App.escape;

  function workItemHref(id) {
    var mod = App.registry.modules.find(function (m) { return m.key === "roadmap"; });
    return mod ? App.itemHref(mod, { id: id }) : "#";
  }

  // What each disposition means, said once on the page rather than
  // assumed, because the whole pass turns on the difference between
  // "parked" and "archived".
  var MEANING = {
    "": "Still to decide. This is what the pass is for.",
    promoted: "Becomes a work item, linked both ways.",
    merged: "Folded into an existing item as a note. No new row.",
    parked: "Real, not now. Lands at someday with a note saying which review it came from.",
    archived: "An artefact of the review, not future work. Closed with a reason, findable, never surfaced again.",
  };

  function countsHtml(groups) {
    return '<dl class="pr-counts">' + groups.map(function (g) {
      var label = g.key
        ? App.portalReviewRender.labelOf(App.portalReviewRender.DISPOSITION, g.key)
        : g.label;
      return "<div><dt>" + esc(label) + "</dt><dd>" + esc(g.findings.length) + "</dd></div>";
    }).join("") + "</dl>";
  }

  async function load() {
    var id = new URLSearchParams(window.location.search).get("wave");
    if (!id) {
      App.notice(el("page-notice"), "error",
        "No wave named in the address. Open one from the portal review list.");
      return;
    }

    var results = await Promise.all([
      App.db.from(App.registry.tables.reviewWaves)
        .select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
      App.db.from(App.registry.tables.reviewAreas).select("id, code, title"),
      App.db.from(App.registry.tables.reviewFindings)
        .select("*").eq("wave_id", id).is("deleted_at", null)
        .order("created_at", { ascending: true }),
    ]);

    var failed = results.find(function (r) { return r.error; });
    if (failed) {
      App.notice(el("page-notice"), "error",
        "Could not load the triage view: " + failed.error.message);
      return;
    }
    var wave = results[0].data;
    if (!wave) {
      App.notice(el("page-notice"), "error",
        "That wave does not exist, or you do not have access to it.");
      return;
    }

    var areaBy = {};
    (results[1].data || []).forEach(function (a) { areaBy[a.id] = a; });
    var findings = results[2].data || [];
    var groups = App.portalReview.triageGroups(findings);

    document.title = "Triage - " + wave.name + " - LPIO";
    el("pr-triage-name").textContent = "Triage: " + wave.name;
    el("pr-triage-counts").innerHTML = countsHtml(groups);

    var ctx = { workItemHref: workItemHref };
    el("pr-triage-body").innerHTML = groups.map(function (g) {
      var label = g.key
        ? App.portalReviewRender.labelOf(App.portalReviewRender.DISPOSITION, g.key)
        : g.label;
      var body = g.findings.length
        ? g.findings.map(function (f) {
            var area = areaBy[f.area_id];
            return '<div class="pr-triage-row">' +
              '<span class="pr-code">' + esc(area ? area.code : "-") + "</span>" +
              App.portalReviewRender.findingHtml(f, ctx) + "</div>";
          }).join("")
        : '<p class="notice">Nothing in this group.</p>';
      return '<section class="pr-triage-group"><h2>' + esc(label) +
        ' <span class="pr-triage-n">' + esc(g.findings.length) + "</span></h2>" +
        '<p class="pr-figure">' + esc(MEANING[g.key] || "") + "</p>" +
        body + "</section>";
    }).join("");

    App.deepLinkScroll();
  }

  App.onAuthed(function () { load(); });
})();
