// ------------------------------------------------------------------
// portalreview-board.js - modules/portal-review/wave.html. One wave:
// the coverage rail, the walker, and every area with its findings.
//
// The board reads and never writes. The walker is the only interactive
// thing on the page and it moves the reader, not the data - it was
// what made a thirty-nine-area sweep finishable.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var state = { areas: [], walked: {}, at: null };

  function el(id) { return document.getElementById(id); }
  function esc(v) { return App.escape(v == null ? "" : v); }

  function waveId() {
    return new URLSearchParams(window.location.search).get("wave");
  }

  function workItemHref(id) {
    var mod = App.registry.modules.find(function (m) { return m.key === "roadmap"; });
    return mod ? App.itemHref(mod, { id: id }) : "#";
  }

  // Move the reader to the next area this wave has not walked, and
  // remember where they got to so a second press continues rather than
  // returning to the first one.
  function walkNext() {
    var next = App.portalReview.nextArea(state.areas, state.walked, state.at);
    var button = el("pr-next");
    if (!next) {
      state.at = null;
      if (button) button.textContent = "Every area walked";
      return;
    }
    state.at = next.id;
    if (button) button.textContent = "Next area";
    var target = document.getElementById("area-" + next.id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function load() {
    var id = waveId();
    if (!id) {
      App.notice(el("page-notice"), "error",
        "No wave named in the address. Open one from the portal review list.");
      return;
    }

    var results = await Promise.all([
      App.db.from(App.registry.tables.reviewWaves)
        .select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
      App.db.from(App.registry.tables.reviewAreas)
        .select("*").order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.reviewAreaPasses).select("*").eq("wave_id", id),
      App.db.from(App.registry.tables.reviewFindings)
        .select("*").eq("wave_id", id).is("deleted_at", null)
        .order("created_at", { ascending: true }),
    ]);

    var failed = results.find(function (r) { return r.error; });
    if (failed) {
      App.notice(el("page-notice"), "error",
        "Could not load this wave: " + failed.error.message);
      return;
    }
    var wave = results[0].data;
    if (!wave) {
      App.notice(el("page-notice"), "error",
        "That wave does not exist, or you do not have access to it.");
      return;
    }

    var areas = results[1].data || [];
    var passes = results[2].data || [];
    var findings = results[3].data || [];

    state.areas = areas;
    state.walked = App.portalReview.walkedIn(passes, wave.id);

    var summary = App.portalReview.waveSummary(areas, passes, findings, wave.id);
    var openBy = App.portalReview.openByArea(findings);
    var parts = App.portalReview.parts(areas, state.walked, openBy);

    document.title = wave.name + " - Portal review - LPio / LaunchPad IO";
    el("pr-wave-kind").textContent = App.portalReviewRender.labelOf(
      App.portalReviewRender.WAVE_KIND, wave.kind);
    el("pr-wave-name").textContent = wave.name;
    el("pr-wave-action").textContent = App.portalReview.nextAction(summary);
    el("pr-coverage").innerHTML = esc(summary.walked) + " of " + esc(summary.areas) +
      " areas walked &middot; " + esc(summary.open) + " open &middot; " +
      esc(summary.awaiting_verification) + " awaiting verification";

    if (wave.notes) {
      var brief = el("pr-brief");
      brief.hidden = false;
      el("pr-brief-body").innerHTML = "<p>" + esc(wave.notes).replace(/\n/g, "<br>") + "</p>";
    }

    el("pr-rail").innerHTML = App.portalReviewRender.railHtml(parts);

    var byArea = {};
    findings.forEach(function (f) {
      (byArea[f.area_id || ""] = byArea[f.area_id || ""] || []).push(f);
    });
    var ctx = { workItemHref: workItemHref };

    var html = parts.map(function (part) {
      return '<section class="pr-part"><h2>' + esc(part.part) + "</h2>" +
        '<p class="pr-figure">' + esc(part.walked) + " of " + esc(part.total) +
        " walked" + (part.open ? " &middot; " + esc(part.open) + " open" : "") + "</p>" +
        part.areas.map(function (entry) {
          return App.portalReviewRender.areaHtml(entry, byArea[entry.area.id] || [], ctx);
        }).join("") + "</section>";
    }).join("");

    // A finding raised against no area still has to be readable, so it
    // gets its own section rather than being dropped off the board.
    var orphans = byArea[""] || [];
    if (orphans.length) {
      html += '<section class="pr-part"><h2>Not filed against an area</h2>' +
        App.portalReviewRender.areaHtml(
          { area: { id: "none", code: "-", title: "No area recorded" }, walked: false },
          orphans, ctx) + "</section>";
    }

    el("pr-areas").innerHTML = html ||
      '<p class="notice">No areas recorded. The area map is rows in the ' +
      "review_areas table.</p>";

    App.deepLinkScroll();
  }

  App.onAuthed(function () {
    var button = el("pr-next");
    if (button) button.addEventListener("click", walkNext);
    load();
  });
})();
