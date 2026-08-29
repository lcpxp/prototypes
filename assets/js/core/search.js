// ------------------------------------------------------------------
// search.js - Global header search (App.search). Renders results for
// the search box that ui.js places in the top nav. Queries, per module
// the signed-in user can reach, a small ilike lookup across a couple of
// columns and shows grouped, badged, deep-linked results. RLS is the
// real gate; the access check just avoids pointless requests. Every
// value is escaped; the box is a keyboard-driven ARIA combobox.
//
// Cost: one request per reachable source per query, debounced, each
// capped at PER rows. That is fourteen for a viewer with every grant,
// up from six - the price of the narrative content being findable at
// all. Each is an indexed ilike with a limit, and a stale response is
// dropped rather than painted, so a fast typist never sees an older
// result overtake a newer one.
// ------------------------------------------------------------------

// Over the soft line budget and NOT split: search.js is a core module
// in the fixed include order on 23 pages, so splitting it costs an
// extra request on every page load and a 23-file edit. Roughly a
// third of the file is the declarative source table.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var DEBOUNCE = 220;
  var MIN = 2;
  var PER = 5;

  // Each source names the table, the columns to match, the display
  // column (name) and optional secondary line (sub), an optional badge
  // column (rendered with methodBadge or statusBadge), any extra columns
  // a deep link needs, the access keys that gate it, and the module it
  // links to.
  //
  // Where a row goes:
  //   entity  the registry.linkEntities type, so App.linkHref builds the
  //           address from the same anchor a knowledge link uses. One
  //           home for "where does a row of this type live".
  //   href    a per-row builder, for the rows whose destination depends
  //           on the row rather than its type - a note lives inside
  //           whatever it is about, a finding inside its wave.
  //   neither means App.itemHref, which is right for anything the
  //           module routes by id or path.
  //
  // Until 2026-08-13 this covered six sources and missed the richest
  // narrative content in the system: 174 work notes, 16 documents, 34
  // glossary terms, 13 journey stages, the API topics and specs, the
  // prototype ideas and the review findings were all unfindable from
  // the nav. `snippet: true` windows the matched text rather than
  // showing the first line, because searching notes without seeing why
  // a note matched is close to useless.
  function sources() {
    var t = App.registry.tables;
    return [
      { keys: ["prototypes"], mod: "prototypes", label: "Prototypes", table: t.prototypes,
        cols: ["title", "description"], name: "title", sub: "description",
        badge: "status", badgeType: "status", extra: ["path"] },
      { keys: ["reference"], mod: "reference", label: "API reference", table: t.apiEndpoints,
        cols: ["path", "summary"], name: "path", sub: "summary",
        badge: "method", badgeType: "method", extra: ["spec_id"] },
      { keys: ["reference"], mod: "reference", label: "API topics", table: t.apiTopics,
        cols: ["title", "intro"], name: "title", sub: "intro", snippet: true,
        extra: ["spec_id"], href: function (r) {
          return specHref(r.spec_id) + (r.id ? "#topic-" + r.id : "");
        } },
      { keys: ["reference"], mod: "reference", label: "API specs", table: t.apiSpecs,
        cols: ["title", "description"], name: "title", sub: "description",
        badge: "status", badgeType: "status", extra: ["version"],
        href: function (r) { return specHref(r.id); } },
      { keys: ["roadmap", "backlog"], mod: "roadmap", label: "Roadmap and backlog", table: t.workItems,
        cols: ["title", "summary"], name: "title", sub: "summary",
        badge: "status", badgeType: "status" },
      // A note lives inside whatever it is about, so its address comes
      // from the row rather than from its type - which is also why
      // `note` is the one link entity with no page of its own.
      { keys: ["roadmap", "backlog"], mod: "backlog", label: "Notes and decisions",
        table: t.workNotes, cols: ["body"], name: "body", snippet: true,
        badge: "kind", badgeType: "status",
        extra: ["work_item_id", "document_id"], href: noteHref },
      { keys: ["backlog"], mod: "backlog", label: "Source documents", table: t.workDocuments,
        cols: ["title", "summary"], name: "title", sub: "summary",
        badge: "kind", badgeType: "status", entity: "document" },
      { keys: ["platform"], mod: "platform", label: "Platform", table: t.productCapabilities,
        cols: ["title", "summary"], name: "title", sub: "summary",
        badge: "maturity", badgeType: "status", entity: "capability" },
      { keys: ["platform"], mod: "platform", label: "Glossary", table: t.domainTerms,
        cols: ["term", "expansion", "definition"], name: "term", sub: "definition",
        snippet: true, entity: "term" },
      { keys: ["platform"], mod: "platform", label: "Journey stages", table: t.journeyStages,
        cols: ["title", "description"], name: "title", sub: "description",
        snippet: true, entity: "stage" },
      { keys: ["prototypes"], mod: "prototypes", label: "Prototype ideas",
        table: t.futurePrototypes, cols: ["name", "summary", "value_note", "note"],
        name: "name", sub: "summary", badge: "status", badgeType: "status",
        entity: "prototype_idea" },
      { keys: ["portal-review"], mod: "portal-review", label: "Review findings",
        table: t.reviewFindings, cols: ["title", "body"], name: "title", sub: "body",
        snippet: true, badge: "state", badgeType: "status", extra: ["wave_id"],
        // A soft-deleted finding is filtered out of every other view;
        // search must not be the one place it resurfaces.
        live: "deleted_at",
        href: function (r) {
          return App.moduleHref(moduleByKey("portal-review")) + "wave.html?wave=" +
            encodeURIComponent(r.wave_id || "") + "#finding-" + encodeURIComponent(r.id);
        } },
      { keys: ["users"], mod: "users", label: "Users", table: t.profiles,
        cols: ["display_name", "email"], name: "display_name", sub: "email",
        badge: "role", badgeType: "status" },
      { keys: ["integrations"], mod: "integrations", label: "Integrations", table: t.integrations,
        cols: ["name", "purpose"], name: "name", sub: "purpose",
        badge: "status", badgeType: "status" },
    ];
  }

  function canReach(keys) {
    if (!App.canAccess) return true;
    return keys.some(function (k) { return App.canAccess(k); });
  }
  function moduleByKey(key) {
    return App.registry.modules.find(function (m) { return m.key === key; });
  }

  function specHref(specId) {
    var mod = moduleByKey("reference");
    return mod ? App.moduleHref(mod) + "index.html?spec=" +
      encodeURIComponent(specId || "") : "#";
  }

  // A note is shown inside the thing it is about, so its address is
  // that thing's. Twenty notes are anchored to nothing at all; those
  // resolve to the backlog index rather than to a link that lies about
  // where they live.
  function noteHref(r) {
    if (r.work_item_id) {
      return App.itemHref(moduleByKey("roadmap"), { id: r.work_item_id });
    }
    if (r.document_id) {
      return App.linkHref("document", r.document_id, App.root);
    }
    var mod = moduleByKey("backlog");
    return mod ? App.moduleHref(mod) : "#";
  }

  // Where one result goes. `href` wins (the row decides), then
  // `entity` (the type decides, through the same anchor a knowledge
  // link uses), then App.itemHref.
  function hrefFor(s, r) {
    if (s.href) return s.href(r);
    if (s.entity) {
      var byType = App.linkHref(s.entity, r.id, App.root);
      if (byType) return byType;
    }
    return App.itemHref(targetMod(s), r);
  }

  // Work items live in both roadmap and backlog; link to whichever the
  // user can reach, preferring roadmap. Every other source maps to one.
  function targetMod(s) {
    if (s.mod === "roadmap" && App.canAccess &&
        !App.canAccess("roadmap") && App.canAccess("backlog")) {
      return moduleByKey("backlog");
    }
    return moduleByKey(s.mod);
  }

  // Strip characters that would break the PostgREST or() filter grammar.
  function clean(q) { return String(q || "").replace(/[,%()\\*"']/g, " ").trim(); }

  // The distinct set of columns to select for a source: id, display,
  // sub, badge and any link-only extras, deduplicated.
  function selectFor(s) {
    var cols = ["id"];
    [s.name, s.sub, s.badge].concat(s.extra || []).forEach(function (c) {
      if (c && cols.indexOf(c) === -1) cols.push(c);
    });
    return cols.join(",");
  }

  // A window of the text around the match, so a note result shows WHY
  // it matched rather than its first line. Trimmed to a word boundary
  // at each end, with an ellipsis where text was cut.
  var SNIPPET = 140;
  function snippet(text, q) {
    var full = String(text || "");
    if (full.length <= SNIPPET) return full;
    var at = q ? full.toLowerCase().indexOf(String(q).toLowerCase()) : -1;
    if (at === -1) return full.slice(0, SNIPPET).replace(/\s+\S*$/, "") + "\u2026";
    var start = Math.max(0, at - Math.floor((SNIPPET - q.length) / 2));
    var end = Math.min(full.length, start + SNIPPET);
    var cut = full.slice(start, end);
    if (start > 0) cut = cut.replace(/^\S*\s+/, "\u2026");
    if (end < full.length) cut = cut.replace(/\s+\S*$/, "\u2026");
    return cut;
  }

  // Escape first, then wrap the first occurrence of the query in <mark>.
  // First occurrence only: a global replace over user input invites
  // escaping bugs.
  function highlight(text, q) {
    var safe = App.escape(text);
    var needle = App.escape(q || "");
    if (!needle) return safe;
    var i = safe.toLowerCase().indexOf(needle.toLowerCase());
    if (i === -1) return safe;
    return safe.slice(0, i) + "<mark>" + safe.slice(i, i + needle.length) +
      "</mark>" + safe.slice(i + needle.length);
  }

  function badgeHtml(s, r) {
    if (!s.badge || !r[s.badge]) return "";
    var b = s.badgeType === "method"
      ? App.methodBadge(r[s.badge]) : App.statusBadge(r[s.badge]);
    return '<span class="nav-search-badge">' + b + "</span>";
  }

  // Pure string builder for the results markup. Options get a running
  // id across all groups so keyboard navigation can address them.
  function buildHtml(srcs, results, query) {
    var html = "";
    var optIndex = 0;
    srcs.forEach(function (s, i) {
      var res = results[i];
      if (!res || res.error || !res.data || !res.data.length) return;
      var count = res.data.length;
      var full = count === PER;
      var mod = targetMod(s);
      var lis = res.data.map(function (r) {
        var href = hrefFor(s, r);
        // A note's display column IS its body, so the title is a
        // snippet too - otherwise every note reads as its first line.
        var titleText = s.snippet && !s.sub
          ? snippet(r[s.name], query) : r[s.name];
        var title = highlight(titleText || "(untitled)", query);
        var subText = s.sub && r[s.sub] && r[s.sub] !== r[s.name]
          ? (s.snippet ? snippet(r[s.sub], query) : r[s.sub]) : "";
        var sub = subText
          ? '<span class="nav-search-sub">' + highlight(subText, query) + "</span>" : "";
        var li = '<li><a role="option" id="nav-search-opt-' + optIndex + '" href="' +
          App.escape(href) + '">' + badgeHtml(s, r) + title + sub + "</a></li>";
        optIndex++;
        return li;
      }).join("");
      html += '<div class="nav-search-group"><p class="nav-search-label">' +
        App.escape(s.label) + ' <span class="nav-search-count">' + count +
        (full ? "+" : "") + "</span></p><ul>" + lis + "</ul>" +
        (full ? '<a class="nav-search-more" href="' + App.escape(App.moduleHref(mod)) +
          '">View all in ' + App.escape(s.label) + "</a>" : "") + "</div>";
    });
    return html || '<p class="nav-search-empty">No matches for that term. ' +
      "Try a shorter word or a different spelling.</p>";
  }

  function attach() {
    var input = document.getElementById("nav-search-input");
    var box = document.getElementById("nav-search-results");
    if (!input || !box || input.getAttribute("data-wired")) return;
    input.setAttribute("data-wired", "1");
    var timer = null;
    var seq = 0;              // request sequence: drop stale responses
    var options = [];         // [{ el, href }] for the current results
    var activeIndex = -1;

    function close() {
      box.hidden = true;
      box.innerHTML = "";
      options = [];
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }

    function open() {
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function paint(srcs, results, query) {
      box.innerHTML = buildHtml(srcs, results, query);
      open();
      input.removeAttribute("aria-activedescendant");
      options = [].slice.call(box.querySelectorAll('a[role="option"]'))
        .map(function (el) { return { el: el, href: el.getAttribute("href") }; });
      activeIndex = -1;
    }

    function setActive(next) {
      if (!options.length) return;
      if (activeIndex >= 0 && options[activeIndex]) {
        options[activeIndex].el.removeAttribute("aria-selected");
      }
      activeIndex = (next + options.length) % options.length;
      var opt = options[activeIndex];
      opt.el.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", opt.el.id);
      opt.el.scrollIntoView({ block: "nearest" });
    }

    function run() {
      var q = clean(input.value);
      if (q.length < MIN) { close(); return; }
      var mine = ++seq;
      var srcs = sources().filter(function (s) { return canReach(s.keys); });
      Promise.all(srcs.map(function (s) {
        var or = s.cols.map(function (c) { return c + ".ilike.%" + q + "%"; }).join(",");
        var query = App.db.from(s.table).select(selectFor(s)).or(or);
        if (s.live) query = query.is(s.live, null);
        return query.limit(PER);
      })).then(function (results) {
        if (mine !== seq) return;   // a fresher query has overtaken this one
        paint(srcs, results, q);
      }).catch(function () {
        if (mine !== seq) return;
        box.innerHTML = '<p class="nav-search-empty">Search failed. ' +
          "Check your connection and try again.</p>";
        open();
        options = [];
        activeIndex = -1;
      });
    }

    input.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, DEBOUNCE);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); return; }
      if (box.hidden || !options.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === "Home") { e.preventDefault(); setActive(0); }
      else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
      else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        window.location.href = options[activeIndex].href;
      }
    });

    document.addEventListener("click", function (e) {
      if (e.target !== input && !box.contains(e.target)) close();
    });
  }

  App.search = {
    attach: attach,
    clean: clean,
    highlight: highlight,
    snippet: snippet,
    selectFor: selectFor,
    sources: sources,
  };
})();
