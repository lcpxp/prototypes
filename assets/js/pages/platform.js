// ------------------------------------------------------------------
// platform.js - The platform product-knowledge viewer for
// modules/platform/. Read-only render of product_capabilities,
// grouped by the same work_areas (scope 'product') used by the
// roadmap and backlog, so "what exists today" and "what's planned"
// read against one shared taxonomy. Editing is a database change
// (Supabase dashboard or an AI assistant with Supabase access) - see
// docs/PLATFORM.md for the ingest and retrieval protocol.
//
// The pure HTML builders hang off App.platformView, DOM-free, so they
// are unit-tested without a browser (tests/unit/platform-render.test.js).
// blocks reuses the api_topics typed-block vocabulary (p, note, kv,
// table, code, values); unknown kinds are skipped so new block types
// can ship in the database before this viewer learns about them.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var TONES = ["neutral", "info", "ok", "warn", "danger"];

  // Every kind product_capabilities allows, and where each one renders.
  // Held as data because the previous version hard-coded three kinds in
  // three separate filters: when technical, styling and positioning were
  // added to the constraint on 2026-08-09 they matched none of them and
  // rendered NOWHERE - stored, readable, and invisible. renderUnknown()
  // below is the backstop for the next kind someone adds.
  var KINDS = [
    { key: "overview",    zone: "lead",    title: "What LaunchPad is" },
    { key: "value",       zone: "lead",    title: "Why it matters" },
    { key: "positioning", zone: "lead",    title: "Positioning" },
    { key: "capability",  zone: "areas",   title: "Capabilities" },
    { key: "technical",   zone: "section", title: "How it is built" },
    { key: "styling",     zone: "section", title: "Look and feel" },
    { key: "glance",      zone: "section", title: "At a glance" },
  ];
  function kindsIn(zone) {
    return KINDS.filter(function (k) { return k.zone === zone; }).map(function (k) { return k.key; });
  }

  function toneClass(tone) {
    return TONES.indexOf(tone) === -1 ? "tone-neutral" : "tone-" + tone;
  }

  function codeblock(value) {
    var text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return "<pre><code>" + App.escape(text) + "</code></pre>";
  }

  function tableBlock(block) {
    var columns = block.columns || [];
    var html = '<div class="table-wrap"><table>';
    if (columns.length > 0) {
      html += "<thead><tr>";
      columns.forEach(function (c) { html += "<th>" + App.escape(c) + "</th>"; });
      html += "</tr></thead>";
    }
    html += "<tbody>";
    (block.rows || []).forEach(function (row) {
      html += "<tr>";
      (row || []).forEach(function (cell) { html += "<td>" + App.escape(cell) + "</td>"; });
      html += "</tr>";
    });
    return html + "</tbody></table></div>";
  }

  function kvBlock(block) {
    var html = '<div class="table-wrap"><table><tbody>';
    (block.items || []).forEach(function (item) {
      html += "<tr><th>" + App.escape(item.label || "") + "</th><td>" +
        App.escape(item.value || "") + "</td></tr>";
    });
    return html + "</tbody></table></div>";
  }

  function valuesBlock(block) {
    var html = '<div class="value-set"><h4>' + App.escape(block.name || "") +
      (block.field ? ' <code>' + App.escape(block.field) + "</code>" : "") +
      "</h4><p class=\"value-chips\">";
    (block.values || []).forEach(function (v) { html += "<code>" + App.escape(v) + "</code> "; });
    html += "</p>";
    if (block.source) {
      html += '<p class="value-source">Source: ' + App.escape(block.source) + "</p>";
    }
    return html + "</div>";
  }

  // The typed block vocabulary shared with the reference viewer's
  // api_topics rendering (assets/js/pages/reference-topics.js). Kept
  // as a local copy rather than a cross-module dependency; a shared
  // typed-block module is a possible future refactor.
  function blockHtml(block) {
    if (!block || typeof block !== "object") return "";
    switch (block.kind) {
      case "p":
        return "<p>" + App.escape(block.text || "") + "</p>";
      case "note":
        return '<p class="notice ' + toneClass(block.tone) + '">' +
          App.escape(block.text || "") + "</p>";
      case "code":
        return codeblock(block.json !== undefined ? block.json : (block.text || ""));
      case "table":
        return tableBlock(block);
      case "kv":
        return kvBlock(block);
      case "values":
        return valuesBlock(block);
      default:
        return "";
    }
  }

  function maturityChips(cap) {
    return App.statusBadge(cap.maturity) +
      (cap.verified ? "" : ' <span class="badge tone-warn">unverified</span>');
  }

  // Typed links out of this capability, resolved to the other end's
  // title. A capability that the roadmap is actively changing should say
  // so on its own card - that is the whole point of the link graph, and
  // reading it off the page is how "how does this feature work now"
  // stops being a question only the database can answer.
  function capabilityLinks(cap, ctx) {
    var links = (ctx && ctx.linksByCapability && ctx.linksByCapability[cap.id]) || [];
    if (!links.length) return "";
    return '<p class="cap-links">' + links.map(function (l) {
      return '<span class="cap-link"><span class="cap-link-kind">' +
        App.escape(l.reads) + "</span> " + App.escape(l.otherTitle) + "</span>";
    }).join("") + "</p>";
  }

  function capabilityCard(cap, ctx) {
    var html = '<article class="card cap-card"' +
      (cap.id ? ' id="capability-' + App.escape(cap.id) + '"' : "") + ">" +
      '<p class="cap-chips">' + maturityChips(cap) + "</p>" +
      "<h2>" + App.escape(cap.title) + "</h2>";
    if (cap.summary) html += '<p class="card-meta">' + App.escape(cap.summary) + "</p>";
    (cap.blocks || []).forEach(function (b) { html += blockHtml(b); });
    html += capabilityLinks(cap, ctx);
    var src = ctx && ctx.docById ? ctx.docById[cap.source_document_id] : null;
    if (src) html += '<p class="cap-source">Source: ' + App.escape(src.title) + "</p>";
    return html + "</article>";
  }

  function byOrder(a, b) { return a.sort_order - b.sort_order; }

  // Rows keyed by kind. Areas are grouped and sorted by sort_order so
  // rendering order always matches how an owner curated the catalogue.
  function groupByArea(capabilities) {
    var byArea = {};
    capabilities.filter(function (c) { return c.kind === "capability"; })
      .forEach(function (cap) {
        var key = cap.area_id || "_none";
        if (!byArea[key]) byArea[key] = [];
        byArea[key].push(cap);
      });
    Object.keys(byArea).forEach(function (key) { byArea[key].sort(byOrder); });
    return byArea;
  }

  function sectionHeading(title, description) {
    var html = '<h2 class="eyebrow eyebrow-heading">' +
      App.escape(title) + "</h2>";
    if (description) html += '<p class="tag-description">' + App.escape(description) + "</p>";
    return html;
  }

  // Any kind the database allows that this file does not place. Renders
  // under its own heading rather than vanishing, so a kind added to the
  // constraint is visible the moment it has a row - the failure this
  // page had for three kinds at once.
  function renderUnknown(capabilities, ctx) {
    var placed = {};
    KINDS.forEach(function (k) { placed[k.key] = true; });
    var strays = capabilities.filter(function (c) { return !placed[c.kind]; });
    if (!strays.length) return "";
    var byKind = {};
    strays.forEach(function (c) { (byKind[c.kind] = byKind[c.kind] || []).push(c); });
    return Object.keys(byKind).sort().map(function (kind) {
      return sectionHeading(kind, "Recorded under a kind this page does not " +
        "yet lay out. Shown so nothing is stored-but-invisible.") +
        byKind[kind].sort(byOrder).map(function (c) { return capabilityCard(c, ctx); }).join("");
    }).join("");
  }

  // The whole page as a string.
  // data = { areas, capabilities, stages, terms, facts, documents }
  // ctx  = { docById, linksByCapability }  (both optional)
  function pageHtml(data, ctx) {
    var capabilities = data.capabilities || [];
    var areas = data.areas || [];
    var K = App.platformKnowledge;
    var hasAnything = capabilities.length || (data.stages || []).length ||
      (data.terms || []).length || (data.facts || []).length;
    if (!hasAnything) {
      return '<p class="notice">No platform knowledge recorded yet. Rows are ' +
        "in the product_capabilities table; see docs/PLATFORM.md to ingest " +
        "the first overview.</p>";
    }

    var inZone = function (zone) {
      var keys = kindsIn(zone);
      return capabilities.filter(function (c) { return keys.indexOf(c.kind) !== -1; }).sort(byOrder);
    };

    // 1. The story: what it is, why it matters, who it is for.
    var html = inZone("lead").map(function (c) { return capabilityCard(c, ctx); }).join("");

    // 2. Coverage, including the gaps - stated early because an owner
    //    filling a hole is the point, not a footnote.
    html += K ? K.coverageHtml(data) : "";

    // 3. The lifecycle spine, then the capability detail hung off areas.
    html += K ? K.lifecycleHtml(data) : "";

    var byArea = groupByArea(capabilities);
    var areaHtml = "";
    areas.slice().sort(byOrder).forEach(function (area) {
      var caps = byArea[area.id];
      if (!caps || caps.length === 0) return;
      areaHtml += sectionHeading(area.title, area.description) +
        caps.map(function (c) { return capabilityCard(c, ctx); }).join("");
    });
    if (byArea._none && byArea._none.length) {
      areaHtml += sectionHeading("Unfiled",
        "Capabilities with no product area. Set area_id so they group.") +
        byArea._none.map(function (c) { return capabilityCard(c, ctx); }).join("");
    }
    if (areaHtml) {
      html += '<section class="pk-section" id="capabilities">' +
        '<h2 class="eyebrow eyebrow-heading">Capabilities</h2>' + areaHtml + "</section>";
    }

    // 4. The remaining kinds, each in its own section.
    KINDS.filter(function (k) { return k.zone === "section"; }).forEach(function (k) {
      var rows = capabilities.filter(function (c) { return c.kind === k.key; }).sort(byOrder);
      if (!rows.length) return;
      html += sectionHeading(k.title) +
        rows.map(function (c) { return capabilityCard(c, ctx); }).join("");
    });
    html += renderUnknown(capabilities, ctx);

    // 5. Supporting stores.
    html += K ? K.glossaryHtml(data) + K.factsHtml(data) + K.sourcesHtml(data) : "";
    return html;
  }

  App.platformView = {
    blockHtml: blockHtml,
    capabilityCard: capabilityCard,
    groupByArea: groupByArea,
    pageHtml: pageHtml,
  };

  // --- DOM wiring ---------------------------------------------------

  App.onAuthed(async function () {
    var host = document.getElementById("platform-content");

    // Six reads. Only capabilities are required; the rest sit behind
    // other module grants (facts and documents behind backlog, links
    // behind roadmap or backlog), so a reader without those grants gets
    // a thinner page rather than an error - the same degrade-gracefully
    // pattern roadmap.js uses.
    var results = await Promise.all([
      App.db.from(App.registry.tables.workAreas)
        .select("id, title, description, scope, sort_order")
        .eq("scope", "product")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.productCapabilities)
        .select("id, area_id, key, title, summary, kind, maturity, verified, " +
          "blocks, sort_order, source_document_id")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.journeyStages)
        .select("id, stage_no, key, title, actor, description")
        .order("stage_no", { ascending: true }),
      App.db.from(App.registry.tables.domainTerms)
        .select("id, term, expansion, definition, verified, area_id")
        .order("term", { ascending: true }),
      App.db.from(App.registry.tables.workNotes)
        .select("id, body, area_id, status, created_at")
        .eq("kind", "fact")
        .order("created_at", { ascending: false }),
      App.db.from(App.registry.tables.workDocuments)
        .select("id, title, summary, status, captured_on, kind")
        .order("captured_on", { ascending: false }),
      App.db.from(App.registry.tables.knowledgeLinks)
        .select("from_type, from_id, to_type, to_id, kind, note, confidence")
        .is("valid_to", null),
    ]);

    var capsResult = results[1];
    if (capsResult.error) {
      App.notice(host, "error", "Could not load platform knowledge: " + capsResult.error.message);
      return;
    }
    function rows(i) { return results[i] && !results[i].error ? results[i].data || [] : []; }

    var capabilities = capsResult.data || [];
    var documents = rows(5).filter(function (d) { return d.kind === "platform"; });

    // Link endpoints resolved to titles, indexed by capability id and
    // read from both ends - a symmetric link is stored once, so reading
    // only the `from` side would hide it from half the pairs it belongs
    // to (the same trap the roadmap drawer hit).
    var titleOf = {};
    capabilities.forEach(function (c) { titleOf[c.id] = c.title; });
    var ctx = { docById: {}, linksByCapability: {} };
    rows(5).forEach(function (d) { ctx.docById[d.id] = d; });
    rows(6).forEach(function (l) {
      var K = App.registry.linkKinds[l.kind];
      if (!K) return;
      var push = function (type, id, otherType, otherId, reads) {
        if (type !== "capability" || !titleOf[otherId] && otherType === "capability") return;
        var other = titleOf[otherId];
        if (!other) return;
        (ctx.linksByCapability[id] = ctx.linksByCapability[id] || [])
          .push({ kind: l.kind, reads: reads, otherTitle: other, note: l.note || "" });
      };
      push(l.from_type, l.from_id, l.to_type, l.to_id, K.label);
      push(l.to_type, l.to_id, l.from_type, l.from_id, K.symmetric ? K.label : K.inverse);
    });

    host.innerHTML = pageHtml({
      areas: rows(0),
      capabilities: capabilities,
      stages: rows(2),
      terms: rows(3),
      facts: rows(4),
      documents: documents,
    }, ctx);
    App.deepLinkScroll();
  });
})();
