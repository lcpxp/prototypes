// ------------------------------------------------------------------
// platform/views.js - The three top-level views of the platform page
// (App.platformViews), the sidebar index and the filter toolbar.
//
// Until 2026-09-07 this page was one column: the lead cards, then
// coverage, then the lifecycle, then every capability by area, then
// technical, then styling, then the glossary, the facts and the
// sources - 150-odd blocks of prose on a single scroll with no index,
// no filter and nothing collapsed. The material at the bottom was the
// worst of it, and not by accident: `kind` was carrying two questions
// at once, so 27 rows about how the Partner Portal is BUILT (CUBE CSS
// layers, Angular, Entity Framework) sat underneath a page about what
// the product DOES for merchants. Two subjects, two audiences, one
// scroll, and the bottom half unreadable to either.
//
// product_capabilities.domain now answers "what is this about" on its
// own, and it picks the view. VIEWS below is the registry: a domain
// with no view here renders nowhere, which is why
// tests/unit/platform/views.test.js checks this list against the
// schema constraint rather than trusting it.
//
// The shell is the reference viewer's, deliberately: .ref-layout,
// .ref-sidebar and .ref-toolbar have indexed 572 endpoints since July.
// A second layout doing the same job differently would be a second
// thing to maintain and a second thing for a reader to learn.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var esc = App.escape;

  // The top-level views. `domain` names the product_capabilities rows a
  // view owns; the reference view owns none and carries the stores that
  // belong to no single subject.
  var VIEWS = [
    {
      key: "product",
      domain: "product",
      label: "What it does",
      lede: "The platform as the people who buy and run it meet it: what " +
        "it is, the lead-to-live journey, and what each area does today.",
    },
    {
      key: "build",
      domain: "build",
      label: "How it is built",
      lede: "The stack, the conventions and the design system, at enough " +
        "detail to change the product or to build something that matches it.",
    },
    {
      key: "reference",
      domain: null,
      label: "Reference",
      lede: "The terminology this material assumes, the facts recorded " +
        "along the way, where all of it came from, and what is still missing.",
    },
  ];

  function viewByKey(key) {
    return VIEWS.filter(function (v) { return v.key === key; })[0] || VIEWS[0];
  }

  // Statement shapes, and where each renders inside its view. Held as
  // data because the previous version hard-coded three kinds in three
  // separate filters: when technical, styling and positioning were
  // added to the constraint on 2026-08-09 they matched none of them and
  // rendered NOWHERE - stored, readable, and invisible.
  var KINDS = [
    { key: "overview",    zone: "lead",    title: "What LP is" },
    { key: "value",       zone: "lead",    title: "Why it matters" },
    { key: "positioning", zone: "lead",    title: "Positioning" },
    { key: "glance",      zone: "lead",    title: "At a glance" },
    { key: "capability",  zone: "areas",   title: "Capabilities" },
    { key: "technical",   zone: "areas",   title: "How it is built" },
    { key: "styling",     zone: "areas",   title: "Look and feel" },
  ];
  function kindsIn(zone) {
    return KINDS.filter(function (k) { return k.zone === zone; })
      .map(function (k) { return k.key; });
  }

  function byOrder(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }

  // --- The view switch ----------------------------------------------

  function switchHtml(active) {
    return '<nav class="pk-views" aria-label="Platform views">' +
      VIEWS.map(function (v) {
        return '<button type="button" class="pk-view-btn" data-view="' + esc(v.key) + '"' +
          (v.key === active ? ' aria-current="page"' : "") + ">" +
          esc(v.label) + "</button>";
      }).join("") + "</nav>";
  }

  // --- Coverage strip ------------------------------------------------
  // One line, on every view. The full gap list lives in the Reference
  // view; this is the part that must never be more than a glance,
  // because a gap should prompt a reader without becoming the page.

  function coverageStripHtml(data) {
    var caps = data.capabilities || [];
    var g = App.platformKnowledge ? App.platformKnowledge.gaps(data) : null;
    var open = g ? (g.areasWithoutCapability.length + g.hollowCapabilities.length +
      g.capabilitiesWithoutArea.length + g.unsourcedCapabilities.length +
      g.unattestedCapabilities.length + g.staleCapabilities.length) : 0;
    var bits = [
      caps.length + (caps.length === 1 ? " capability" : " capabilities"),
      (data.areas || []).length + " areas",
      (data.terms || []).length + " terms",
      (data.facts || []).length + " facts",
    ];
    return '<p class="pk-strip">' + esc(bits.join(" · ")) +
      (open
        ? ' <a class="pk-strip-gaps" href="#coverage">' + esc(String(open)) +
          (open === 1 ? " gap" : " gaps") + " to fill</a>"
        : ' <span class="pk-strip-ok">no gaps</span>') + "</p>";
  }

  // --- Toolbar -------------------------------------------------------
  // Only on the views that list capabilities. The reference view is
  // three short stores; a filter over it would be furniture.

  function optionsHtml(values, label) {
    return '<option value="">' + esc(label) + "</option>" +
      values.map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(v) + "</option>";
      }).join("");
  }

  function distinct(rows, key) {
    var seen = {};
    rows.forEach(function (r) { if (r[key]) seen[r[key]] = true; });
    return Object.keys(seen).sort();
  }

  function toolbarHtml(rows) {
    return '<div class="ref-toolbar">' +
      '<input id="pk-search" type="search" ' +
      'placeholder="Filter by title, summary or area" aria-label="Filter capabilities">' +
      '<select id="pk-maturity" aria-label="Filter by maturity">' +
      optionsHtml(distinct(rows, "maturity"), "Any maturity") + "</select>" +
      '<select id="pk-attestation" aria-label="Filter by who attests it">' +
      optionsHtml(distinct(rows, "attestation"), "Any attestation") + "</select>" +
      '<button id="pk-expand" class="button quiet" type="button">Expand all</button>' +
      '<button id="pk-collapse" class="button quiet" type="button">Collapse all</button>' +
      "</div>";
  }

  // --- Sidebar -------------------------------------------------------

  function sidebarHtml(view, data) {
    if (view.key === "reference") {
      var stores = [
        ["glossary", "Glossary", (data.terms || []).length],
        ["facts", "Recorded facts", (data.facts || []).length],
        ["sources", "Where this came from", (data.documents || []).length],
        ["coverage", "Coverage", null],
      ];
      return '<div class="group"><p class="eyebrow">On this page</p><ul>' +
        stores.map(function (s) {
          return '<li><a href="#' + esc(s[0]) + '">' + esc(s[1]) +
            (s[2] === null ? "" : ' <span class="badge">' + esc(String(s[2])) + "</span>") +
            "</a></li>";
        }).join("") + "</ul></div>";
    }

    var caps = inDomain(data.capabilities, view).filter(function (c) {
      return kindsIn("areas").indexOf(c.kind) !== -1;
    });
    var counts = {};
    caps.forEach(function (c) {
      var k = c.area_id || "_none";
      counts[k] = (counts[k] || 0) + 1;
    });
    var items = (data.areas || []).slice().sort(byOrder)
      .filter(function (a) { return counts[a.id]; })
      .map(function (a) {
        return '<li><a href="#area-' + esc(a.id) + '">' + esc(a.title) +
          ' <span class="badge">' + esc(String(counts[a.id])) + "</span></a></li>";
      });
    if (counts._none) {
      items.push('<li><a href="#area-unfiled">Unfiled <span class="badge">' +
        esc(String(counts._none)) + "</span></a></li>");
    }
    if (!items.length) return "";
    return '<div class="group"><p class="eyebrow">Areas</p><ul>' +
      items.join("") + "</ul></div>";
  }

  // --- The views -----------------------------------------------------

  function inDomain(capabilities, view) {
    if (!view.domain) return [];
    return (capabilities || []).filter(function (c) {
      // A row written before `domain` existed, or by something that did
      // not set it, defaults to product rather than vanishing.
      return (c.domain || "product") === view.domain;
    });
  }

  function heading(title, description, id) {
    var html = '<h2 class="eyebrow eyebrow-heading"' +
      (id ? ' id="' + esc(id) + '"' : "") + ">" + esc(title) + "</h2>";
    if (description) html += '<p class="tag-description">' + esc(description) + "</p>";
    return html;
  }

  // The lead: what this domain is, in one band rather than four full
  // cards. A reader arriving at the page wants the shape of the thing
  // before the detail of it.
  function leadHtml(rows, ctx) {
    if (!rows.length) return "";
    return '<div class="pk-lead">' + rows.map(function (c) {
      return '<div class="pk-lead-item" id="capability-' + esc(c.id) + '">' +
        "<h3>" + esc(c.title) + "</h3>" +
        (c.summary ? "<p>" + esc(c.summary) + "</p>" : "") +
        ((c.blocks || []).length
          ? '<details class="pk-lead-more"><summary>More</summary>' +
            (c.blocks || []).map(function (b) { return App.blocks.render(b); }).join("") +
            App.platformCards.capabilityLinks(c, ctx) + "</details>"
          : App.platformCards.capabilityLinks(c, ctx)) +
        "</div>";
    }).join("") + "</div>";
  }

  // Capabilities grouped by their filing area, each area a heading a
  // knowledge_links row can address.
  function areasHtml(rows, data, ctx) {
    var byArea = {};
    rows.forEach(function (c) {
      var k = c.area_id || "_none";
      (byArea[k] = byArea[k] || []).push(c);
    });
    var html = "";
    (data.areas || []).slice().sort(byOrder).forEach(function (area) {
      var caps = byArea[area.id];
      if (!caps || !caps.length) return;
      html += '<section class="pk-area">' +
        heading(area.title, area.description, "area-" + area.id) +
        caps.sort(byOrder).map(function (c) {
          return App.platformCards.capabilityCard(c, ctx);
        }).join("") + "</section>";
    });
    if (byArea._none && byArea._none.length) {
      html += '<section class="pk-area">' +
        heading("Unfiled",
          "Capabilities with no filing area, so they group under nothing. " +
          "Set area_id and they join their section.", "area-unfiled") +
        byArea._none.sort(byOrder).map(function (c) {
          return App.platformCards.capabilityCard(c, ctx);
        }).join("") + "</section>";
    }
    return html;
  }

  // Any kind the database allows that this file does not place. Renders
  // under its own heading rather than vanishing, so a kind added to the
  // constraint is visible the moment it has a row - the failure this
  // page had for three kinds at once.
  function unplacedHtml(rows, ctx) {
    var placed = {};
    KINDS.forEach(function (k) { placed[k.key] = true; });
    var strays = rows.filter(function (c) { return !placed[c.kind]; });
    if (!strays.length) return "";
    var byKind = {};
    strays.forEach(function (c) { (byKind[c.kind] = byKind[c.kind] || []).push(c); });
    return Object.keys(byKind).sort().map(function (kind) {
      return heading(kind, "Recorded under a kind this page does not yet lay " +
        "out. Shown so nothing is stored-but-invisible.") +
        byKind[kind].sort(byOrder).map(function (c) {
          return App.platformCards.capabilityCard(c, ctx);
        }).join("");
    }).join("");
  }

  function emptyView(view) {
    return '<p class="notice">Nothing recorded under "' + esc(view.label) +
      '" yet. Rows are in the product_capabilities table with domain \'' +
      esc(String(view.domain)) + "'; see docs/PLATFORM.md.</p>";
  }

  // The whole content column for one view.
  // data = { areas, capabilities, stages, terms, facts, documents }
  function viewHtml(viewKey, data, ctx) {
    var view = viewByKey(viewKey);
    var K = App.platformKnowledge;

    if (view.key === "reference") {
      return K ? K.glossaryHtml(data) + K.factsHtml(data) +
        K.sourcesHtml(data) + K.coverageHtml(data) : "";
    }

    var rows = inDomain(data.capabilities, view);
    if (!rows.length) return emptyView(view);

    var leadKeys = kindsIn("lead");
    var lead = rows.filter(function (c) { return leadKeys.indexOf(c.kind) !== -1; })
      .sort(byOrder);
    var areaKeys = kindsIn("areas");
    var placed = rows.filter(function (c) { return areaKeys.indexOf(c.kind) !== -1; });

    var html = leadHtml(lead, ctx);
    // The lifecycle spine belongs to the product story, not to the
    // build one: a journey stage is something a merchant moves through.
    if (view.key === "product" && K) html += K.lifecycleHtml(data);
    html += areasHtml(placed, data, ctx);
    html += unplacedHtml(rows, ctx);
    return html;
  }

  App.platformViews = {
    VIEWS: VIEWS,
    KINDS: KINDS,
    kindsIn: kindsIn,
    viewByKey: viewByKey,
    inDomain: inDomain,
    switchHtml: switchHtml,
    coverageStripHtml: coverageStripHtml,
    toolbarHtml: toolbarHtml,
    sidebarHtml: sidebarHtml,
    leadHtml: leadHtml,
    areasHtml: areasHtml,
    unplacedHtml: unplacedHtml,
    viewHtml: viewHtml,
  };
})();
