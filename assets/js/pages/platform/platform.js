// ------------------------------------------------------------------
// platform/platform.js - The platform product-knowledge viewer for
// modules/platform/. Read-only render of product_capabilities,
// grouped by the same work_areas (scope 'product') used by the
// roadmap and backlog, so "what exists today" and "what's planned"
// read against one shared taxonomy. Editing is a database change
// (Supabase dashboard or an AI assistant with Supabase access) - see
// docs/PLATFORM.md for the ingest and retrieval protocol.
//
// The pure HTML builders hang off App.platformView, DOM-free, so they
// are unit-tested without a browser (tests/unit/platform/render.test.js).
// blocks reuses the api_topics typed-block vocabulary (p, note, kv,
// table, code, values); unknown kinds are skipped so new block types
// can ship in the database before this viewer learns about them.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};


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

  // One typed-block renderer for the whole portal
  // (assets/js/core/blocks.js): the reference viewer and this page ran
  // identical copies, and both dropped unknown kinds silently.
  function blockHtml(block) {
    return App.blocks.render(block);
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
  // Every entity type a capability links to, not just other
  // capabilities. A capability's link to the roadmap item that changes
  // it is the single most useful thing on this card, and it rendered
  // nothing until the resolver learned the types.
  function capabilityLinks(cap, ctx) {
    var index = (ctx && ctx.linkIndex) || {};
    var links = index["capability:" + cap.id] || [];
    if (!links.length) return "";
    var titles = (ctx && ctx.linkTitles) || {};
    var parts = links.map(function (l) {
      var t = App.links.resolve(l, titles, ctx && ctx.root);
      if (!t.title) return "";
      var label = App.escape(t.title) +
        (l.otherType === "capability" ? ""
          : ' <span class="cap-link-type">' + App.escape(t.typeLabel) + "</span>");
      var body = t.href
        ? '<a href="' + App.escape(t.href) + '">' + label + "</a>"
        : label;
      // Proposed by an assistant, not yet confirmed by the owner.
      var pending = l.confidence === "proposed"
        ? ' <span class="badge tone-warn">proposed</span>' : "";
      return '<span class="cap-link"><span class="cap-link-kind">' +
        App.escape(t.reads) + "</span> " + body + pending + "</span>";
    }).filter(Boolean);
    return parts.length ? '<p class="cap-links">' + parts.join("") + "</p>" : "";
  }

  // Columns the card renders somewhere other than a fact row: identity
  // and ordering, the chips, the heading, the summary, the typed blocks
  // and the resolved source title.
  var CAP_HIDDEN = ["id", "area_id", "source_document_id", "key", "title",
    "summary", "kind", "maturity", "verified", "blocks", "sort_order"];

  function day(value) {
    return value ? App.escape(String(value).slice(0, 10)) : "";
  }

  // Everything else stored against the capability. `tags` was fetched by
  // nobody and shown nowhere; more to the point, a column added to
  // product_capabilities tomorrow lands here rather than nowhere
  // (docs/plan/40-SURFACING.md).
  function capabilityFacts(cap) {
    return App.detail.facts(cap, {
      fields: [
        { key: "tags", label: "Tags" },
        { key: "created_at", label: "Recorded", html: day },
        { key: "updated_at", label: "Updated", html: day },
      ],
      hidden: CAP_HIDDEN,
      overflowLabel: "Also recorded against this capability",
    });
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
    return html + capabilityFacts(cap) + "</article>";
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

  // id is optional: an area heading carries its row id so a
  // knowledge_links row pointing at the area has a destination
  // (assets/js/core/links.js). The Unfiled group has no row, so none.
  function sectionHeading(title, description, id) {
    var html = '<h2 class="eyebrow eyebrow-heading"' +
      (id ? ' id="area-' + App.escape(id) + '"' : "") + ">" +
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
  // ctx  = { docById, linkIndex, linkTitles, root }  (all optional)
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
      areaHtml += sectionHeading(area.title, area.description, area.id) +
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
        // The card renders everything on the row (App.detail.facts), so
        // this fetches everything: the usual "select only what you
        // render" rule and this one agree here.
        .select("*")
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

    // Links indexed under both ends and resolved by entity type: a
    // symmetric link is stored once, so reading only the `from` side
    // hides it from half the pairs it belongs to, and resolving only
    // capability targets hid every link out to the roadmap.
    var linkIndex = App.links.index(rows(6));
    var ctx = { docById: {}, linkIndex: linkIndex, linkTitles: {}, root: App.root };
    rows(5).forEach(function (d) { ctx.docById[d.id] = d; });
    capabilities.forEach(function (c) { ctx.linkTitles["capability:" + c.id] = c.title; });
    rows(2).forEach(function (st) { ctx.linkTitles["stage:" + st.id] = st.title; });
    rows(3).forEach(function (t) { ctx.linkTitles["term:" + t.id] = t.term; });
    rows(0).forEach(function (a) { ctx.linkTitles["area:" + a.id] = a.title; });
    rows(5).forEach(function (d) { ctx.linkTitles["document:" + d.id] = d.title; });

    host.innerHTML = pageHtml({
      areas: rows(0),
      capabilities: capabilities,
      stages: rows(2),
      terms: rows(3),
      facts: rows(4),
      documents: documents,
    }, ctx);
    App.deepLinkScroll();

    // Whatever the links reach that this page did not already load -
    // work items, most usefully - arrives after first paint and repaints
    // the cards, so the page is never held up by a request for names it
    // may not need.
    App.links.loadTitles(linkIndex, ctx.linkTitles).then(function (titles) {
      var added = Object.keys(titles).filter(function (k) { return !ctx.linkTitles[k]; });
      if (!added.length) return;
      added.forEach(function (k) { ctx.linkTitles[k] = titles[k]; });
      host.innerHTML = pageHtml({
        areas: rows(0), capabilities: capabilities, stages: rows(2),
        terms: rows(3), facts: rows(4), documents: documents,
      }, ctx);
      App.deepLinkScroll();
    });
  });
})();
