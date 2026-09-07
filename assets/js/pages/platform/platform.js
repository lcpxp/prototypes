// ------------------------------------------------------------------
// platform/platform.js - The shell of the platform knowledge page:
// what it fetches, which view is showing, and the filter and
// disclosure wiring over it.
//
// The HTML builders moved out on 2026-09-07 - App.platformViews for
// the three views and their furniture, App.platformCards for one
// capability, App.platformKnowledge for the stores no single view owns.
// This file holds the parts that need a DOM and nothing that does not,
// so everything that decides what a reader sees is testable without a
// browser.
//
// Editing is a database change (Supabase dashboard, or a session with
// Supabase access); see docs/PLATFORM.md for the ingest, derivation and
// retrieval protocol. platform_context(area_key) is the same knowledge
// for a session rather than a reader.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var VIEW_KEY = "platform-view";

  // --- view state ---------------------------------------------------

  // #<view> or #<view>/<anchor>. The anchor half is what a
  // knowledge_links deep link carries (#capability-<id>), and it has to
  // survive the view switch or a link from the roadmap lands on the
  // wrong view with the right hash.
  function readHash() {
    var raw = String(location.hash || "").replace(/^#/, "");
    if (!raw) return { view: null, anchor: "" };
    var parts = raw.split("/");
    var known = App.platformViews.VIEWS.some(function (v) { return v.key === parts[0]; });
    if (known) return { view: parts[0], anchor: parts.slice(1).join("/") };
    // A bare anchor from an older link, or from another page.
    return { view: null, anchor: raw };
  }

  // Which view owns a bare anchor, so an incoming #capability-<id>
  // opens the view that actually contains it rather than the default.
  function viewForAnchor(anchor, data) {
    if (!anchor) return null;
    var capId = /^capability-(.+)$/.exec(anchor);
    if (capId) {
      var cap = (data.capabilities || []).filter(function (c) {
        return c.id === capId[1];
      })[0];
      return cap ? (cap.domain || "product") : null;
    }
    var areaId = /^area-(.+)$/.exec(anchor);
    if (areaId) {
      var area = (data.areas || []).filter(function (a) { return a.id === areaId[1]; })[0];
      return area && area.scope === "build" ? "build" : "product";
    }
    if (/^(term|note|document)-/.test(anchor) ||
        ["glossary", "facts", "sources", "coverage"].indexOf(anchor) !== -1) {
      return "reference";
    }
    if (/^stage-/.test(anchor) || anchor === "lifecycle") return "product";
    return null;
  }

  // --- filtering ----------------------------------------------------

  // Hide rather than re-render: the cards are <details>, and rebuilding
  // the column on every keystroke would close every one a reader had
  // opened. Matching is over the summary text the card already shows
  // plus the area heading above it, which is what a reader is looking
  // at when they type.
  function applyFilter(host, state) {
    var q = String(state.q || "").trim().toLowerCase();
    host.querySelectorAll(".pk-area").forEach(function (section) {
      var shown = 0;
      section.querySelectorAll(".cap-card").forEach(function (card) {
        var text = (card.textContent || "").toLowerCase();
        var hit = (!q || text.indexOf(q) !== -1) &&
          (!state.maturity || card.getAttribute("data-maturity") === state.maturity) &&
          (!state.attestation || card.getAttribute("data-attestation") === state.attestation);
        card.hidden = !hit;
        if (hit) shown += 1;
      });
      // An area heading with nothing under it reads as an empty
      // promise, so the whole section goes.
      section.hidden = shown === 0;
    });
  }

  function setAllOpen(host, open) {
    host.querySelectorAll("details.cap-card").forEach(function (d) {
      if (!d.hidden) d.open = open;
    });
  }

  // --- render -------------------------------------------------------

  function render(page) {
    var view = App.platformViews.viewByKey(page.view);
    document.getElementById("pk-strip").innerHTML =
      App.platformViews.coverageStripHtml(page.data);
    document.getElementById("pk-switch").innerHTML =
      App.platformViews.switchHtml(view.key);
    document.getElementById("pk-lede").textContent = view.lede;

    var toolbar = document.getElementById("pk-toolbar");
    var rows = App.platformViews.inDomain(page.data.capabilities, view);
    toolbar.innerHTML = rows.length ? App.platformViews.toolbarHtml(rows) : "";

    document.getElementById("pk-sidebar").innerHTML =
      App.platformViews.sidebarHtml(view, page.data);

    var host = document.getElementById("platform-content");
    host.innerHTML = App.platformViews.viewHtml(view.key, page.data, page.ctx);

    // The filter reads these off the card rather than re-deriving them
    // from the row, so one attribute is the whole contract between the
    // builder and the wiring.
    host.querySelectorAll(".cap-card").forEach(function (card) {
      var id = (card.id || "").replace(/^capability-/, "");
      var cap = page.byId[id];
      if (!cap) return;
      card.setAttribute("data-maturity", cap.maturity || "");
      card.setAttribute("data-attestation", cap.attestation || "");
    });

    wireToolbar(host);
    openAnchor(page);
  }

  function wireToolbar(host) {
    var state = { q: "", maturity: "", attestation: "" };
    var search = document.getElementById("pk-search");
    var maturity = document.getElementById("pk-maturity");
    var attestation = document.getElementById("pk-attestation");
    if (search) {
      search.addEventListener("input", function () {
        state.q = search.value;
        applyFilter(host, state);
      });
    }
    if (maturity) {
      maturity.addEventListener("change", function () {
        state.maturity = maturity.value;
        applyFilter(host, state);
      });
    }
    if (attestation) {
      attestation.addEventListener("change", function () {
        state.attestation = attestation.value;
        applyFilter(host, state);
      });
    }
    var expand = document.getElementById("pk-expand");
    var collapse = document.getElementById("pk-collapse");
    if (expand) expand.addEventListener("click", function () { setAllOpen(host, true); });
    if (collapse) collapse.addEventListener("click", function () { setAllOpen(host, false); });
  }

  // A deep link names a row, not a scroll position. App.deepLinkScroll
  // opens whatever disclosure encloses the target and marks it; the id
  // is passed explicitly because this page's hash is "<view>/<anchor>"
  // rather than a bare id.
  function openAnchor(page) {
    if (page.anchor) App.deepLinkScroll(page.anchor);
  }

  // --- boot ---------------------------------------------------------

  App.onAuthed(async function () {
    var host = document.getElementById("platform-content");

    // Seven reads. Only capabilities are required; the rest sit behind
    // other module grants (facts, documents and delivered work behind
    // backlog or roadmap, links behind either), so a reader without
    // those gets a thinner page rather than an error - the same
    // degrade-gracefully pattern roadmap.js uses, and the same one
    // platform_context() relies on server-side.
    var results = await Promise.all([
      App.db.from(App.registry.tables.workAreas)
        .select("id, title, description, scope, sort_order")
        .in("scope", ["product", "build"])
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
      // When work last landed in each area. Without it "stale" would
      // mean "old", which is not the same thing: a claim written in
      // July about an area nothing has touched since is still true.
      App.db.from(App.registry.tables.workItems)
        .select("area_id, resolved_at")
        .eq("status", "done")
        .not("resolved_at", "is", null),
    ]);

    var capsResult = results[1];
    if (capsResult.error) {
      App.notice(host, "error", "Could not load platform knowledge: " + capsResult.error.message);
      return;
    }
    function rows(i) { return results[i] && !results[i].error ? results[i].data || [] : []; }

    var capabilities = capsResult.data || [];
    var documents = rows(5).filter(function (d) { return d.kind === "platform"; });

    var deliveredByArea = {};
    rows(7).forEach(function (i) {
      if (!i.area_id) return;
      var d = String(i.resolved_at).slice(0, 10);
      if (!deliveredByArea[i.area_id] || d > deliveredByArea[i.area_id]) {
        deliveredByArea[i.area_id] = d;
      }
    });

    // Links indexed under both ends and resolved by entity type: a
    // symmetric link is stored once, so reading only the `from` side
    // hides it from half the pairs it belongs to.
    var linkIndex = App.links.index(rows(6));
    var ctx = {
      docById: {}, linkIndex: linkIndex, linkTitles: {}, root: App.root,
      staleById: {},
    };
    rows(5).forEach(function (d) { ctx.docById[d.id] = d; });
    capabilities.forEach(function (c) {
      ctx.linkTitles["capability:" + c.id] = c.title;
      ctx.staleById[c.id] = App.platformKnowledge.isStale(c, deliveredByArea);
    });
    rows(2).forEach(function (st) { ctx.linkTitles["stage:" + st.id] = st.title; });
    rows(3).forEach(function (t) { ctx.linkTitles["term:" + t.id] = t.term; });
    rows(0).forEach(function (a) { ctx.linkTitles["area:" + a.id] = a.title; });
    rows(5).forEach(function (d) { ctx.linkTitles["document:" + d.id] = d.title; });

    var data = {
      areas: rows(0),
      capabilities: capabilities,
      stages: rows(2),
      terms: rows(3),
      facts: rows(4),
      documents: documents,
      deliveredByArea: deliveredByArea,
    };
    var byId = {};
    capabilities.forEach(function (c) { byId[c.id] = c; });

    var hash = readHash();
    var page = {
      data: data,
      ctx: ctx,
      byId: byId,
      anchor: hash.anchor,
      view: hash.view || viewForAnchor(hash.anchor, data) ||
        App.store.get(VIEW_KEY) || "product",
    };

    render(page);

    document.getElementById("pk-switch").addEventListener("click", function (event) {
      var button = event.target.closest("[data-view]");
      if (!button) return;
      page.view = button.getAttribute("data-view");
      page.anchor = "";
      App.store.set(VIEW_KEY, page.view);
      location.hash = page.view;
      render(page);
    });

    window.addEventListener("hashchange", function () {
      var next = readHash();
      var wanted = next.view || viewForAnchor(next.anchor, data);
      if (wanted && wanted !== page.view) {
        page.view = wanted;
        page.anchor = next.anchor;
        render(page);
        return;
      }
      page.anchor = next.anchor;
      openAnchor(page);
    });

    // Whatever the links reach that this page did not already load -
    // work items and endpoints, most usefully - arrives after first
    // paint, so the page is never held up by a request for names it may
    // not need.
    App.links.loadTitles(linkIndex, ctx.linkTitles).then(function (titles) {
      var added = Object.keys(titles).filter(function (k) { return !ctx.linkTitles[k]; });
      if (!added.length) return;
      added.forEach(function (k) { ctx.linkTitles[k] = titles[k]; });
      render(page);
    });
  });
})();
