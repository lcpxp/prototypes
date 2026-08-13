// ------------------------------------------------------------------
// portalreview-render.js - The portal review board's HTML builders
// (App.portalReviewRender). Pure: rows in, string out, no DOM.
//
// This file owns the display half of every vocabulary in
// supabase/schema/52_portal_review.sql - kind, state, emphasis,
// visibility and disposition. tests/checks/render-coverage.test.js
// holds it to that: a value the database allows and this file does not
// name is a row that renders blank, which is the failure the whole
// surfacing workstream exists to remove.
//
// Everything dynamic goes through App.escape; findings carry a typed
// `blocks` bag rendered by the shared renderer, so a finding can hold
// a table or a code snippet without a schema change here.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  function esc(v) { return App.escape(v == null ? "" : v); }
  function day(v) { return v ? String(v).slice(0, 10) : ""; }

  // --- the five vocabularies ---------------------------------------

  var KIND = {
    issue: "Issue",
    question: "Question",
    works: "Worked well",
    note: "Note",
  };

  var STATE = {
    open: "Open",
    answered: "Answered, not verified",
    verified: "Verified",
    closed: "Closed",
  };

  // How loud, not how bad. A finding with no emphasis is the ordinary
  // case and gets no chip at all.
  var EMPHASIS = {
    lead: { label: "Lead", tone: "tone-info" },
    bug: { label: "Bug", tone: "tone-warn" },
    blocker: { label: "Blocker", tone: "tone-danger" },
  };

  // Who sees it. 'full' is the default and says nothing; the other two
  // must be visible on the row, because the whole point of the flag is
  // that somebody is about to paste this somewhere.
  var VISIBILITY = {
    full: "",
    roadmap_only: "Roadmap only - not for the developer conversation",
    internal: "Internal - does not leave the review",
  };

  var DISPOSITION = {
    promoted: "Promoted to a work item",
    merged: "Merged into an existing item",
    parked: "Parked - real, not now",
    archived: "Archived as a review artefact",
  };

  // A wave says which review it belongs to. Shared table, three kinds.
  var WAVE_KIND = {
    application: "Application review",
    portal: "Portal review",
    code: "Code review",
  };

  App.portalReviewRender = {
    KIND: KIND, STATE: STATE, EMPHASIS: EMPHASIS,
    VISIBILITY: VISIBILITY, DISPOSITION: DISPOSITION, WAVE_KIND: WAVE_KIND,
  };

  // A value the database allows and this file has never seen still
  // reads as itself rather than as blank - the same fallback the block
  // renderer uses, for the same reason.
  function labelOf(map, value) {
    if (value == null || value === "") return "";
    return map[value] || String(value);
  }
  App.portalReviewRender.labelOf = labelOf;

  // --- one finding ---------------------------------------------------

  function chips(f) {
    var out = [];
    var em = EMPHASIS[f.emphasis];
    if (f.emphasis) {
      out.push('<span class="badge ' + (em ? em.tone : "tone-neutral") + '">' +
        esc(em ? em.label : f.emphasis) + "</span>");
    }
    if (f.kind && f.kind !== "issue") {
      out.push('<span class="badge">' + esc(labelOf(KIND, f.kind)) + "</span>");
    }
    if (f.standing) out.push('<span class="badge tone-info">Standing</span>');
    if (f.owner_action) out.push('<span class="badge tone-warn">Yours</span>');
    // A re-raise is a deliberate signal that the item still matters.
    if (f.raised_count > 1) {
      out.push('<span class="badge tone-warn">Raised ' + esc(f.raised_count) + " times</span>");
    }
    return out.join(" ");
  }

  function metaLine(f) {
    var parts = [];
    if (f.ref) parts.push(esc(f.ref));
    parts.push(esc(labelOf(STATE, f.state)));
    if (f.environment) parts.push("Environment: " + esc(f.environment));
    if (f.disposition) parts.push(esc(labelOf(DISPOSITION, f.disposition)));
    return parts.join(" &middot; ");
  }

  // The response, the verification and the resolution are three
  // different statements and never collapse into one line: a developer
  // saying done is a claim, a reviewer verifying it is a decision, and
  // a resolution is what the review concluded.
  function trail(f) {
    var out = "";
    if (f.response) {
      out += '<div class="pr-said"><span class="eyebrow">Answered' +
        (f.response_by ? " by " + esc(f.response_by) : "") +
        (f.responded_at ? " &middot; " + esc(day(f.responded_at)) : "") +
        "</span><p>" + esc(f.response) + "</p></div>";
    }
    if (f.verified_at) {
      out += '<div class="pr-said pr-said--verified"><span class="eyebrow">Verified ' +
        esc(day(f.verified_at)) + "</span>" +
        (f.verification_note ? "<p>" + esc(f.verification_note) + "</p>" : "") + "</div>";
    }
    if (f.resolution) {
      out += '<div class="pr-said"><span class="eyebrow">Resolution' +
        (f.resolved_at ? " &middot; " + esc(day(f.resolved_at)) : "") +
        "</span><p>" + esc(f.resolution) + "</p></div>";
    }
    return out;
  }

  App.portalReviewRender.findingHtml = function (f, ctx) {
    ctx = ctx || {};
    var chipRow = chips(f);
    var restricted = VISIBILITY[f.visibility];
    var blocks = f.blocks && f.blocks.length && App.blocks
      ? App.blocks.renderAll(f.blocks) : "";
    // A promoted finding links to the work item it became, so the
    // decision is one click from the thing it produced.
    var promoted = f.promoted_work_item_id && ctx.workItemHref
      ? '<p class="pr-promoted"><a href="' +
        esc(ctx.workItemHref(f.promoted_work_item_id)) + '">' +
        esc(ctx.workItemTitle && ctx.workItemTitle[f.promoted_work_item_id]
          ? "Promoted: " + ctx.workItemTitle[f.promoted_work_item_id]
          : "Open the work item this became") + "</a></p>"
      : "";
    return '<article class="pr-finding' +
      (f.emphasis ? " pr-finding--" + esc(f.emphasis) : "") +
      '" id="finding-' + esc(f.id) + '">' +
      (chipRow ? '<p class="pr-chips">' + chipRow + "</p>" : "") +
      "<h4>" + esc(f.title) + "</h4>" +
      '<p class="pr-meta">' + metaLine(f) + "</p>" +
      (restricted ? '<p class="notice tone-warn">' + esc(restricted) + "</p>" : "") +
      (f.body ? "<p>" + esc(f.body) + "</p>" : "") +
      blocks +
      trail(f) +
      promoted +
      "</article>";
  };

  // --- one area ------------------------------------------------------

  // Open findings lead; the other three groups collapse behind a
  // summary that always carries its count. "Awaiting verification (3)"
  // is information; "Awaiting verification" is a mystery box.
  App.portalReviewRender.areaHtml = function (entry, findings, ctx) {
    var area = entry.area || entry;
    var groups = App.portalReview.groupsFor(findings);
    var body = "";
    App.portalReview.GROUPS.forEach(function (g) {
      var rows = groups[g.key];
      if (!rows.length) return;
      var inner = rows.map(function (f) {
        return App.portalReviewRender.findingHtml(f, ctx);
      }).join("");
      body += g.key === "open"
        ? inner
        : "<details class=\"pr-group\"><summary>" + esc(g.label) +
          " (" + esc(rows.length) + ")</summary>" + inner + "</details>";
    });
    if (!body) {
      body = '<p class="notice">Nothing recorded against this area yet.</p>';
    }
    return '<section class="pr-area" id="area-' + esc(area.id) + '">' +
      '<div class="pr-area-head">' +
      '<span class="pr-code">' + esc(area.code) + "</span>" +
      "<h3>" + esc(area.title) + "</h3>" +
      '<span class="pr-area-state">' +
      (entry.walked ? "Walked" : "Not walked this wave") + "</span></div>" +
      (area.note ? '<p class="notice">' + esc(area.note) + "</p>" : "") +
      body + "</section>";
  };

  // --- the coverage rail ---------------------------------------------

  // A dot per area: filled when this wave walked it, hollow when not,
  // with the open count beside a part that has any. Colour never
  // carries the meaning alone - the dot has a title and the part line
  // says the figure in words.
  App.portalReviewRender.railHtml = function (parts) {
    return '<nav class="pr-rail" aria-label="Coverage by part">' +
      (parts || []).map(function (p) {
        var dots = p.areas.map(function (a) {
          return '<a class="pr-dot' + (a.walked ? " pr-dot--walked" : "") +
            (a.open ? " pr-dot--open" : "") + '" href="#area-' + esc(a.area.id) +
            '" title="' + esc(a.area.code + " " + a.area.title +
              (a.walked ? " - walked" : " - not walked this wave") +
              (a.open ? ", " + a.open + " open" : "")) +
            '"><span aria-hidden="true"></span><span class="visually-hidden">' +
            esc(a.area.code) + "</span></a>";
        }).join("");
        return '<div class="pr-rail-part"><p class="eyebrow">' + esc(p.part) +
          "</p>" + '<p class="pr-rail-figure">' + esc(p.walked) + " of " +
          esc(p.total) + " walked" +
          (p.open ? " &middot; " + esc(p.open) + " open" : "") + "</p>" +
          '<div class="pr-dots">' + dots + "</div></div>";
      }).join("") + "</nav>";
  };

  // --- a wave card ----------------------------------------------------

  App.portalReviewRender.waveCardHtml = function (wave, summary, href) {
    return '<a class="card pr-wave" href="' + esc(href || "#") + '">' +
      '<span class="eyebrow">' + esc(labelOf(WAVE_KIND, wave.kind)) + "</span>" +
      "<h3>" + esc(wave.name) + "</h3>" +
      '<p class="pr-wave-action">' +
      esc(App.portalReview.nextAction(summary)) + "</p>" +
      '<p class="card-meta">' + esc(summary.walked) + " of " + esc(summary.areas) +
      " areas walked &middot; " + esc(summary.findings) +
      (summary.findings === 1 ? " finding" : " findings") +
      (wave.opened_at ? " &middot; opened " + esc(day(wave.opened_at)) : "") +
      "</p>" +
      (summary.blockers
        ? '<p class="pr-wave-blockers">' + esc(summary.blockers) +
          (summary.blockers === 1 ? " blocker open" : " blockers open") + "</p>"
        : "") +
      "</a>";
  };
})();
