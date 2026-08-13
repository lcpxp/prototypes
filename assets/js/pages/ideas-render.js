// ------------------------------------------------------------------
// ideas-render.js - The prototype ideas board's builders
// (App.ideasView). Pure: rows in, string out, no DOM and no fetching.
//
// This file owns the display half of the two vocabularies on
// future_prototypes - status and effort - so a value the database
// allows and this file does not name is caught by
// tests/checks/render-coverage.test.js rather than by a reader
// noticing a blank cell.
//
// An idea's plan lives in its typed `blocks` bag and is drawn by the
// shared renderer, so a new kind of plan content needs no change here
// and cannot be silently dropped.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  function esc(v) { return App.escape(v == null ? "" : v); }

  // Display order as well as vocabulary: shortlisted and planned lead,
  // because those are the ones a reader can act on. The inbox comes
  // after them, and what is closed comes last.
  var STATUSES = [
    { key: "planned", label: "Planned", note: "A plan is written against it." },
    { key: "shortlisted", label: "Shortlisted", note: "Survived a review pass." },
    { key: "building", label: "Building", note: "A page exists; no registry row yet." },
    { key: "idea", label: "Ideas", note: "The inbox. Captured, not yet sorted." },
    { key: "promoted", label: "Promoted", note: "Now a prototype." },
    { key: "dropped", label: "Dropped", note: "Closed with a reason, kept." },
  ];

  var EFFORT = { small: "Small", medium: "Medium", large: "Large" };

  App.ideasView = { STATUSES: STATUSES.slice(), EFFORT: EFFORT };

  // A value the database allows and no map has seen reads as itself.
  function labelOf(map, value) {
    if (value == null || value === "") return "";
    return map[value] || String(value);
  }
  App.ideasView.labelOf = labelOf;

  // Priority is banded by tens, the same reading work_items uses, so
  // "P2" means the same thing on both boards.
  App.ideasView.band = function (priority) {
    if (priority == null) return "";
    var n = parseInt(priority, 10);
    if (isNaN(n)) return "";
    return "P" + Math.max(1, Math.floor(n / 10));
  };

  App.ideasView.byStatus = function (rows) {
    var live = (rows || []).slice().sort(function (a, b) {
      return (a.priority || 0) - (b.priority || 0) ||
        (a.sort_order || 0) - (b.sort_order || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""));
    });
    return STATUSES.map(function (s) {
      return {
        key: s.key, label: s.label, note: s.note,
        rows: live.filter(function (r) { return (r.status || "idea") === s.key; }),
      };
    });
  };

  // The top few by priority, for the gallery strip. Closed ideas are
  // not candidates, and neither is one already promoted.
  App.ideasView.top = function (rows, limit) {
    var open = (rows || []).filter(function (r) {
      return ["promoted", "dropped"].indexOf(r.status || "idea") === -1;
    }).sort(function (a, b) {
      return (a.priority || 0) - (b.priority || 0) ||
        (a.sort_order || 0) - (b.sort_order || 0);
    });
    return open.slice(0, limit || 5);
  };

  // One line on the gallery. Deliberately terse: it is a pointer at
  // the board, not a second board.
  App.ideasView.stripHtml = function (rows, opts) {
    opts = opts || {};
    var top = App.ideasView.top(rows, opts.limit);
    if (!top.length) {
      return '<p class="notice">No prototype ideas recorded. Capture one in a ' +
        "Claude session with /prototype-idea.</p>";
    }
    var open = (rows || []).filter(function (r) {
      return ["promoted", "dropped"].indexOf(r.status || "idea") === -1;
    }).length;
    return '<ul class="idea-strip">' + top.map(function (row) {
      var band = App.ideasView.band(row.priority);
      return '<li><a href="' + esc(opts.href || "ideas.html") + "#idea-" +
        esc(row.id) + '">' + esc(row.name) + "</a>" +
        (band ? ' <span class="idea-band">' + esc(band) + "</span>" : "") +
        (row.summary ? '<span class="idea-line">' + esc(row.summary) + "</span>" : "") +
        "</li>";
    }).join("") + "</ul>" +
      (open > top.length
        ? '<p class="card-meta"><a href="' + esc(opts.href || "ideas.html") + '">' +
          esc(open) + " open ideas in all</a></p>"
        : "");
  };

  // One idea on the board. The plan blocks render through the shared
  // renderer; everything the row carries and this builder does not
  // name still appears, via App.detail.facts.
  App.ideasView.ideaHtml = function (row, ctx) {
    ctx = ctx || {};
    var band = App.ideasView.band(row.priority);
    var area = ctx.areaTitle && ctx.areaTitle[row.area_id];
    // The band is in the head; repeating it here would say the same
    // thing twice on every row.
    var meta = [
      labelOf(EFFORT, row.effort) && labelOf(EFFORT, row.effort) + " effort",
      area, row.requested_by && "Asked for by " + row.requested_by,
    ].filter(Boolean).map(esc).join(" &middot; ");
    var promoted = row.promoted_prototype_id && ctx.prototypeHref
      ? '<p class="idea-promoted"><a href="' +
        esc(ctx.prototypeHref(row.promoted_prototype_id)) + '">' +
        esc(ctx.prototypeTitle && ctx.prototypeTitle[row.promoted_prototype_id]
          ? "Built as: " + ctx.prototypeTitle[row.promoted_prototype_id]
          : "Open the prototype this became") + "</a></p>"
      : "";
    var plan = row.blocks && row.blocks.length && App.blocks
      ? '<div class="idea-plan">' + App.blocks.renderAll(row.blocks) + "</div>" : "";
    // Everything else on the row, so a column added tomorrow shows up
    // here rather than nowhere (docs/plan/40-SURFACING.md).
    var rest = App.detail ? App.detail.facts(row, {
      fields: [
        { key: "tags", label: "Tags" },
        { key: "created_at", label: "Captured", html: function (v) {
          return v ? esc(String(v).slice(0, 10)) : "";
        } },
      ],
      hidden: ["id", "name", "summary", "note", "status", "priority", "effort",
        "value_note", "area_id", "blocks", "requested_by", "sort_order",
        "promoted_prototype_id", "resolution", "resolved_at", "updated_at"],
      overflowLabel: "Also recorded against this idea",
    }) : "";

    return '<article class="idea" id="idea-' + esc(row.id) + '">' +
      '<div class="idea-head"><h3>' + esc(row.name) + "</h3>" +
      (band ? '<span class="idea-band">' + esc(band) + "</span>" : "") + "</div>" +
      (meta ? '<p class="idea-meta">' + meta + "</p>" : "") +
      (row.summary ? '<p class="idea-summary">' + esc(row.summary) + "</p>" : "") +
      (row.value_note
        ? '<p class="idea-value"><span class="eyebrow">What it would prove</span>' +
          esc(row.value_note) + "</p>" : "") +
      (row.note ? "<p>" + esc(row.note) + "</p>" : "") +
      plan +
      (row.resolution
        ? '<p class="idea-resolution"><span class="eyebrow">Resolution' +
          (row.resolved_at ? " &middot; " + esc(String(row.resolved_at).slice(0, 10)) : "") +
          "</span>" + esc(row.resolution) + "</p>" : "") +
      promoted + rest + "</article>";
  };

  App.ideasView.boardHtml = function (rows, ctx) {
    var groups = App.ideasView.byStatus(rows);
    if (!(rows || []).length) {
      return '<p class="notice">No prototype ideas recorded yet. They are rows in ' +
        "the future_prototypes table; capture one with /prototype-idea.</p>";
    }
    return groups.filter(function (g) { return g.rows.length; }).map(function (g) {
      return '<section class="idea-group"><h2>' + esc(g.label) +
        ' <span class="idea-count">' + esc(g.rows.length) + "</span></h2>" +
        '<p class="idea-note">' + esc(g.note) + "</p>" +
        g.rows.map(function (row) {
          return App.ideasView.ideaHtml(row, ctx);
        }).join("") + "</section>";
    }).join("");
  };
})();
