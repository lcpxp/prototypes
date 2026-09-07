// ------------------------------------------------------------------
// platform/cards.js - One capability, as a card (App.platformCards).
//
// Split out of platform.js on 2026-09-07, when the card stopped being
// an always-open <article> and became a <details> that opens on
// demand. That is the whole fix for the page's oldest complaint: 46
// capabilities, every block, every fact grid and every link chip
// rendered at once produced a wall nobody could scan, and the material
// most people wanted - what an area does, at a glance - was buried
// under the material almost nobody wanted on any given visit.
//
// The summary row carries what a reader chooses on: title, how real it
// is, who says so, when it was last checked, and how much is attached.
// Everything else waits for a click. Same <details> mechanics the
// reference viewer has used for 572 endpoints since July, so the two
// pages behave identically and share their CSS.
//
// Builders are pure - data in, HTML string out - so they unit-test
// with no DOM, the same shape as App.platformView.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var esc = App.escape;

  // How real the claim is. App.statusBadge tones any value it is given,
  // so a maturity added to the constraint tomorrow is styled, not
  // dropped.
  function maturityBadge(cap) {
    return App.statusBadge(cap.maturity);
  }

  // WHO says so. Reads the value rather than branching on the three we
  // know, because the boolean this replaced could only say verified or
  // not - which is precisely how an owner's judgement and a claim
  // nobody had examined came to look identical on screen.
  //
  //   owner       the owner accepted it. Unremarkable, so unbadged:
  //               it is what a reader assumes of a knowledge base.
  //   derived     a session distilled it from rows the owner already
  //               owns, restating them and nothing more, with a link
  //               to every source. Badged, because "worked out from
  //               your delivered work" is not "you said so".
  //   unattested  nobody has stood behind it either way.
  var ATTESTATION = {
    owner: null,
    derived: { tone: "info", label: "derived" },
    unattested: { tone: "warn", label: "unattested" },
  };
  function attestationBadge(cap) {
    var known = ATTESTATION[cap.attestation];
    if (known === null) return "";
    // An attestation this file has not met still shows, named. The
    // alternative is the failure this whole column exists to end.
    var tone = known ? known.tone : "neutral";
    var label = known ? known.label : String(cap.attestation || "");
    if (!label) return "";
    return ' <span class="badge tone-' + esc(tone) + '">' + esc(label) + "</span>";
  }

  // When the claim was last checked, and whether work has landed in its
  // area since. `stale` is computed by the caller, which has the
  // delivery dates; the card only renders what it is told.
  function freshness(cap, stale) {
    if (!cap.as_of) return ' <span class="cap-stale">never checked</span>';
    var text = "checked " + String(cap.as_of).slice(0, 10);
    return stale
      ? ' <span class="cap-stale">' + esc(text) + ", work delivered since</span>"
      : ' <span class="cap-asof">' + esc(text) + "</span>";
  }

  // Typed links out of this capability, resolved to the other end's
  // title. A capability the roadmap is actively changing should say so
  // on its own card - that is the whole point of the link graph, and
  // reading it off the page is how "how does this feature work now"
  // stops being a question only the database can answer.
  // Beyond this many links of one entity type, the rest collapse into a
  // count. A capability served by 61 endpoints is a useful fact; 61
  // chips is the wall this page was rebuilt to remove.
  var LINK_CHIP_LIMIT = 6;

  function capabilityLinks(cap, ctx) {
    var index = (ctx && ctx.linkIndex) || {};
    var all = index["capability:" + cap.id] || [];
    if (!all.length) return "";
    // Grouped by what the link reaches, so the far ends of one kind read
    // together and a long tail can be summarised as itself rather than
    // as an arbitrary slice of everything.
    var byType = {};
    all.forEach(function (l) { (byType[l.otherType] = byType[l.otherType] || []).push(l); });
    var overflow = [];
    var links = [];
    Object.keys(byType).sort().forEach(function (type) {
      var group = byType[type];
      links = links.concat(group.slice(0, LINK_CHIP_LIMIT));
      if (group.length > LINK_CHIP_LIMIT) {
        overflow.push({ type: type, n: group.length - LINK_CHIP_LIMIT });
      }
    });
    var titles = (ctx && ctx.linkTitles) || {};
    var parts = links.map(function (l) {
      var t = App.links.resolve(l, titles, ctx && ctx.root);
      if (!t.title) return "";
      var label = esc(t.title) +
        (l.otherType === "capability" ? ""
          : ' <span class="cap-link-type">' + esc(t.typeLabel) + "</span>");
      var body = t.href
        ? '<a href="' + esc(t.href) + '">' + label + "</a>"
        : label;
      // Written by an assistant and not yet owner-confirmed. 'derived'
      // is badged too, and differently: it restates a row the owner
      // owns rather than proposing something new.
      var mark = "";
      if (l.confidence === "proposed") mark = ' <span class="badge tone-warn">proposed</span>';
      if (l.confidence === "derived") mark = ' <span class="badge tone-info">derived</span>';
      return '<span class="cap-link"><span class="cap-link-kind">' +
        esc(t.reads) + "</span> " + body + mark + "</span>";
    }).filter(Boolean);
    overflow.forEach(function (o) {
      var entity = (App.registry.linkEntities || {})[o.type] || {};
      var label = entity.label || o.type;
      parts.push('<span class="cap-link cap-link-more">' + esc(String(o.n)) +
        " more " + esc(label.toLowerCase()) + (o.n === 1 ? "" : "s") + "</span>");
    });
    return parts.length ? '<p class="cap-links">' + parts.join("") + "</p>" : "";
  }

  // How many links this card has, by family, for the summary row. A
  // reader deciding whether to open a card wants to know there is
  // something behind it, not what.
  function linkCount(cap, ctx) {
    var index = (ctx && ctx.linkIndex) || {};
    return (index["capability:" + cap.id] || []).length;
  }

  // Columns the card renders somewhere other than a fact row: identity
  // and ordering, the chips, the heading, the summary, the typed blocks
  // and the resolved source title.
  var CAP_HIDDEN = ["id", "area_id", "source_document_id", "key", "title",
    "summary", "domain", "kind", "maturity", "attestation", "as_of",
    "verified", "blocks", "sort_order"];

  function day(value) {
    return value ? esc(String(value).slice(0, 10)) : "";
  }

  // Everything else stored against the capability. A column added to
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

  // The closed state: everything a reader needs to decide whether to
  // open it, and nothing else.
  function summaryHtml(cap, ctx) {
    var n = linkCount(cap, ctx);
    var stale = ctx && ctx.staleById ? ctx.staleById[cap.id] : false;
    return "<summary>" +
      '<span class="cap-title">' + esc(cap.title) + "</span>" +
      '<span class="cap-chips">' + maturityBadge(cap) + attestationBadge(cap) + "</span>" +
      '<span class="cap-meta">' + freshness(cap, stale) +
      (n ? ' <span class="cap-linkcount">' + esc(String(n)) +
        (n === 1 ? " link" : " links") + "</span>" : "") +
      "</span></summary>";
  }

  // The open state. Everything the row holds, in the order a reader
  // asks for it: what it is, the detail, what it touches, where it came
  // from, then the raw remainder.
  function bodyHtml(cap, ctx) {
    var html = '<div class="cap-body">';
    if (cap.summary) html += '<p class="card-meta">' + esc(cap.summary) + "</p>";
    (cap.blocks || []).forEach(function (b) { html += App.blocks.render(b); });
    html += capabilityLinks(cap, ctx);
    var src = ctx && ctx.docById ? ctx.docById[cap.source_document_id] : null;
    if (src) html += '<p class="cap-source">Source: ' + esc(src.title) + "</p>";
    return html + capabilityFacts(cap) + "</div>";
  }

  // id on the <details> itself so a knowledge_links row pointing at
  // this capability has a destination, and so the page can open the
  // card a deep link names.
  function capabilityCard(cap, ctx) {
    return '<details class="cap-card"' +
      (cap.id ? ' id="capability-' + esc(cap.id) + '"' : "") + ">" +
      summaryHtml(cap, ctx) + bodyHtml(cap, ctx) + "</details>";
  }

  App.platformCards = {
    attestationBadge: attestationBadge,
    maturityBadge: maturityBadge,
    freshness: freshness,
    capabilityLinks: capabilityLinks,
    capabilityFacts: capabilityFacts,
    summaryHtml: summaryHtml,
    capabilityCard: capabilityCard,
    linkCount: linkCount,
  };
})();
