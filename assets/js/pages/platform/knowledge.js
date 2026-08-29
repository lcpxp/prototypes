// ------------------------------------------------------------------
// platform/knowledge.js - The parts of the platform knowledge base the
// capability catalogue alone cannot show (App.platformKnowledge).
//
// modules/platform/ used to render product_capabilities and nothing
// else. Measured against the live project on 2026-08-09 that meant 18
// rows on screen while 63 more sat invisible: 16 glossary terms, 13
// lifecycle stages, 29 recorded facts and 5 source documents - plus
// every typed link between them. Three capability kinds added the same
// week (technical, styling, positioning) rendered nowhere at all,
// because the catalogue filtered for kind='capability'.
//
// These builders are pure (data in, HTML string out) so they unit-test
// without a DOM, the same shape as App.platformView. Every value goes
// through App.escape.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var esc = App.escape;
  function byOrder(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }

  function section(id, title, lede, body) {
    if (!body) return "";
    return '<section class="pk-section" id="' + esc(id) + '">' +
      '<h2 class="eyebrow eyebrow-heading">' + esc(title) + "</h2>" +
      (lede ? '<p class="tag-description">' + esc(lede) + "</p>" : "") +
      body + "</section>";
  }

  // --- Coverage -----------------------------------------------------
  // What is recorded, and - the part that matters - what is missing.
  // The owner's problem was not only that knowledge was hidden but that
  // nothing said where the holes were, so nothing prompted filling them.
  function gaps(data) {
    var caps = data.capabilities || [];
    var areas = (data.areas || []);
    var withCaps = {};
    caps.forEach(function (c) { if (c.area_id) withCaps[c.area_id] = true; });
    return {
      areasWithoutCapability: areas.filter(function (a) { return !withCaps[a.id]; }),
      hollowCapabilities: caps.filter(function (c) {
        return !(c.blocks || []).length && !c.summary;
      }),
      unverifiedTerms: (data.terms || []).filter(function (t) { return !t.verified; }),
      capabilitiesWithoutArea: caps.filter(function (c) {
        return !c.area_id && c.kind === "capability";
      }),
      unsourcedCapabilities: caps.filter(function (c) { return !c.source_document_id; }),
    };
  }

  function stat(n, label) {
    return '<div class="pk-stat"><span class="pk-stat-n">' + esc(String(n)) +
      '</span><span class="pk-stat-l">' + esc(label) + "</span></div>";
  }

  function coverageHtml(data) {
    var g = gaps(data);
    var counts = '<div class="pk-stats">' +
      stat((data.capabilities || []).length, "capabilities") +
      stat((data.areas || []).length, "product areas") +
      stat((data.stages || []).length, "lifecycle stages") +
      stat((data.terms || []).length, "glossary terms") +
      stat((data.facts || []).length, "recorded facts") +
      stat((data.documents || []).length, "source documents") +
      "</div>";

    // Each gap names the table to write to, so the next step is obvious
    // rather than something to work out.
    var open = [];
    if (g.areasWithoutCapability.length) {
      open.push([g.areasWithoutCapability.length +
        " product areas have no capability recorded",
        g.areasWithoutCapability.map(function (a) { return a.title; }).join(", ")]);
    }
    if (g.hollowCapabilities.length) {
      open.push([g.hollowCapabilities.length +
        " capabilities have neither a summary nor any detail blocks",
        g.hollowCapabilities.map(function (c) { return c.title; }).join(", ")]);
    }
    if (g.capabilitiesWithoutArea.length) {
      open.push([g.capabilitiesWithoutArea.length +
        " capabilities are unfiled, so they miss their area grouping",
        g.capabilitiesWithoutArea.map(function (c) { return c.title; }).join(", ")]);
    }
    if (g.unverifiedTerms.length) {
      open.push([g.unverifiedTerms.length + " glossary terms are unverified",
        g.unverifiedTerms.map(function (t) { return t.term; }).join(", ")]);
    }
    if (g.unsourcedCapabilities.length) {
      open.push([g.unsourcedCapabilities.length +
        " capabilities cite no source document",
        g.unsourcedCapabilities.map(function (c) { return c.title; }).join(", ")]);
    }

    var body = counts;
    if (open.length) {
      body += '<ul class="pk-gaps">' + open.map(function (row) {
        return "<li><strong>" + esc(row[0]) + "</strong><span>" + esc(row[1]) + "</span></li>";
      }).join("") + "</ul>";
    } else {
      body += '<p class="notice tone-ok">No gaps: every area has a capability, ' +
        "every capability has substance and a source, and every term is verified.</p>";
    }
    return section("coverage", "Coverage", "What is recorded, and what is not yet.", body);
  }

  // --- Lifecycle ----------------------------------------------------
  // The lead-to-live journey, in order. This is the spine of the product
  // story and the thing a newcomer needs first, so it renders above the
  // capability detail rather than as an appendix.
  function lifecycleHtml(data) {
    var stages = (data.stages || []).slice().sort(function (a, b) {
      return (a.stage_no || 0) - (b.stage_no || 0);
    });
    if (!stages.length) return "";
    var body = '<ol class="pk-stages">' + stages.map(function (s) {
      // Anchored by row id, not by key: knowledge_links carries ids,
      // and an anchor a link cannot address is not a destination.
      return '<li class="pk-stage" id="stage-' + esc(s.id) + '">' +
        '<span class="pk-stage-no">' + esc(String(s.stage_no)) + "</span>" +
        '<div class="pk-stage-body"><h3>' + esc(s.title) + "</h3>" +
        (s.actor ? '<p class="pk-stage-actor">' + esc(s.actor) + "</p>" : "") +
        (s.description ? "<p>" + esc(s.description) + "</p>" : "") +
        "</div></li>";
    }).join("") + "</ol>";
    return section("lifecycle", "The lead-to-live journey",
      "The canonical onboarding lifecycle, stage by stage.", body);
  }

  // --- Glossary -----------------------------------------------------
  function glossaryHtml(data) {
    var terms = (data.terms || []).slice().sort(function (a, b) {
      return String(a.term).localeCompare(String(b.term));
    });
    if (!terms.length) return "";
    var body = '<dl class="pk-glossary">' + terms.map(function (t) {
      return '<div class="pk-term" id="term-' + esc(t.id) + '">' +
        "<dt>" + esc(t.term) +
        (t.expansion ? ' <span class="pk-expansion">' + esc(t.expansion) + "</span>" : "") +
        (t.verified ? "" : ' <span class="badge tone-warn">unverified</span>') +
        "</dt><dd>" + esc(t.definition) + "</dd></div>";
    }).join("") + "</dl>";
    return section("glossary", "Glossary",
      "The LaunchPad and Unity terminology this material assumes.", body);
  }

  // --- Facts --------------------------------------------------------
  // work_notes of kind 'fact' are platform truths captured in passing.
  // They were the largest invisible store: 29 rows, none on screen.
  function factsHtml(data) {
    var facts = data.facts || [];
    if (!facts.length) return "";
    var areaById = {};
    (data.areas || []).forEach(function (a) { areaById[a.id] = a.title; });
    var grouped = {};
    facts.forEach(function (f) {
      var key = areaById[f.area_id] || "General";
      (grouped[key] = grouped[key] || []).push(f);
    });
    var body = Object.keys(grouped).sort().map(function (area) {
      return '<div class="pk-fact-group"><h3>' + esc(area) + "</h3><ul>" +
        grouped[area].map(function (f) {
          return "<li>" + esc(f.body) +
            (f.status && f.status !== "active"
              ? ' <span class="badge tone-warn">' + esc(f.status) + "</span>" : "") +
            "</li>";
        }).join("") + "</ul></div>";
    }).join("");
    return section("facts", "Recorded facts",
      "Platform truths captured during working sessions.", body);
  }

  // --- Sources ------------------------------------------------------
  function sourcesHtml(data) {
    var docs = data.documents || [];
    if (!docs.length) return "";
    var body = '<ul class="pk-sources">' + docs.map(function (d) {
      return '<li id="document-' + esc(d.id) + '"><strong>' + esc(d.title) + "</strong>" +
        (d.captured_on ? ' <span class="pk-date">' + esc(String(d.captured_on).slice(0, 10)) + "</span>" : "") +
        (d.status && d.status !== "active"
          ? ' <span class="badge tone-warn">' + esc(d.status) + "</span>" : "") +
        (d.summary ? "<p>" + esc(d.summary) + "</p>" : "") + "</li>";
    }).join("") + "</ul>";
    return section("sources", "Where this came from",
      "The supplied material these records were distilled from.", body);
  }

  App.platformKnowledge = {
    gaps: gaps,
    coverageHtml: coverageHtml,
    lifecycleHtml: lifecycleHtml,
    glossaryHtml: glossaryHtml,
    factsHtml: factsHtml,
    sourcesHtml: sourcesHtml,
  };
})();
