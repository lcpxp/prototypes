// ------------------------------------------------------------------
// portalreview-waves.js - modules/portal-review/index.html. The wave
// list, plus the standing asks across every wave - which was the most
// valuable panel on the original board, because a standing ask is one
// that has outlived a wave and is therefore the thing most likely to
// be forgotten.
//
// Reads only. Every write happens in a Claude session
// (docs/PORTAL-REVIEW.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }
  function esc(v) { return App.escape(v == null ? "" : v); }

  function waveHref(wave) {
    return "wave.html?wave=" + encodeURIComponent(wave.id);
  }

  function standingHtml(findings, waveName) {
    var open = findings.filter(function (f) {
      return f.standing && f.state !== "closed" && !f.deleted_at;
    });
    if (!open.length) {
      return '<p class="notice">No standing asks. One is a finding marked ' +
        "standing, carried into every wave until it is delivered or closed.</p>";
    }
    return '<ul class="pr-standing">' + open.map(function (f) {
      return '<li><a href="' + esc(waveHref({ id: f.wave_id })) + "#finding-" +
        esc(f.id) + '">' + esc(f.title) + "</a>" +
        '<span class="pr-standing-meta">' +
        esc(App.portalReviewRender.labelOf(App.portalReviewRender.STATE, f.state)) +
        (f.raised_count > 1 ? " &middot; raised " + esc(f.raised_count) + " times" : "") +
        (waveName[f.wave_id] ? " &middot; " + esc(waveName[f.wave_id]) : "") +
        "</span></li>";
    }).join("") + "</ul>";
  }

  function waveList(waves, areas, passes, byWave) {
    if (!waves.length) {
      return '<p class="notice">No waves here yet. Start one in a Claude ' +
        "session with /portal-review.</p>";
    }
    return '<div class="card-grid">' + waves.map(function (wave) {
      var summary = App.portalReview.waveSummary(
        areas, passes.filter(function (p) { return p.wave_id === wave.id; }),
        byWave[wave.id] || [], wave.id);
      return App.portalReviewRender.waveCardHtml(wave, summary, waveHref(wave));
    }).join("") + "</div>";
  }

  // The durable map, listed outside any wave. Each area carries its
  // anchor, so a knowledge_links row pointing at an area has somewhere
  // to land - an anchor nothing scrolls to is a destination in name
  // only, which is why App.deepLinkScroll is called at the end.
  function mapHtml(areas, findings) {
    var live = areas.filter(function (a) { return !a.retired_at; });
    if (!live.length) {
      return '<p class="notice">No areas recorded. The map is rows in the ' +
        "review_areas table.</p>";
    }
    var openBy = App.portalReview.openByArea(findings);
    var parts = App.portalReview.parts(live, {}, openBy);
    return parts.map(function (part) {
      return '<section class="pr-map-part"><h3>' + esc(part.part) + "</h3>" +
        '<p class="pr-figure">' + esc(part.areas.length) +
        (part.areas.length === 1 ? " area" : " areas") +
        (part.open ? " &middot; " + esc(part.open) + " open across all waves" : "") +
        "</p><ul class=\"pr-map-list\">" + part.areas.map(function (entry) {
          var a = entry.area;
          return '<li id="area-' + esc(a.id) + '"><span class="pr-code">' +
            esc(a.code) + "</span> " + esc(a.title) +
            (entry.open ? ' <span class="badge tone-warn">' + esc(entry.open) +
              " open</span>" : "") +
            (a.note ? '<span class="pr-map-note">' + esc(a.note) + "</span>" : "") +
            "</li>";
        }).join("") + "</ul></section>";
    }).join("");
  }

  async function load() {
    var results = await Promise.all([
      App.db.from(App.registry.tables.reviewWaves)
        .select("*").eq("kind", "portal").is("deleted_at", null)
        .order("opened_at", { ascending: false }),
      App.db.from(App.registry.tables.reviewAreas)
        .select("*").order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.reviewAreaPasses).select("*"),
      App.db.from(App.registry.tables.reviewFindings)
        .select("*").is("deleted_at", null)
        .order("created_at", { ascending: true }),
    ]);

    var failed = results.find(function (r) { return r.error; });
    if (failed) {
      App.notice(el("page-notice"), "error",
        "Could not load portal reviews: " + failed.error.message);
      return;
    }

    var waves = results[0].data || [];
    var areas = results[1].data || [];
    var passes = results[2].data || [];
    var findings = results[3].data || [];

    var byWave = {};
    var waveName = {};
    waves.forEach(function (w) { waveName[w.id] = w.name; });
    findings.forEach(function (f) {
      (byWave[f.wave_id] = byWave[f.wave_id] || []).push(f);
    });

    el("pr-standing-body").innerHTML = standingHtml(findings, waveName);
    el("pr-open-body").innerHTML = waveList(
      waves.filter(function (w) { return w.state !== "closed"; }),
      areas, passes, byWave);
    el("pr-closed-body").innerHTML = waveList(
      waves.filter(function (w) { return w.state === "closed"; }),
      areas, passes, byWave);
    el("pr-map-body").innerHTML = mapHtml(areas, findings);

    App.deepLinkScroll();
  }

  App.onAuthed(function () { load(); });
})();
