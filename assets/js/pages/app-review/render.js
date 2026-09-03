// ------------------------------------------------------------------
// app-review/render.js - The board's HTML builders. Data in, string
// out: no fetching, no element lookups, no event wiring. That lives
// in appreview-board.js, which owns the page state and calls these.
//
// Every builder takes an explicit ctx rather than reading shared
// state, so what a piece of the board depends on is visible in its
// signature:
//   ctx.categories  triage_categories keyed by key
//   ctx.statuses    launchpad_statuses keyed by key
//   ctx.dupes       duplicate keys for this wave
//   ctx.active      category keys currently showing
//   ctx.now         millisecond clock, so age is deterministic in tests
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var M = App.appReview;
  var F = App.appReviewFindings;

  // A row's colour is applied once, as two custom properties, so the
  // stylesheet never names a category. A category whose colour_token
  // has no matching pair in tokens.css falls through to the neutral
  // defaults in app-review.css and still renders.
  function rowStyle(key, categories) {
    var category = categories[key];
    if (!category || !category.colour_token) return "";
    var token = category.colour_token;
    return ' style="--row-accent:var(--' + token +
      ");--row-tint:var(--" + token + '-soft)"';
  }

  // The state marker glyph. Open and settled are drawn rather than
  // typed - the tick characters all sit inside the emoji range the
  // repo bans - and they pair deliberately: a hollow ring for still
  // open, a tick for done with. Assumed and ongoing stay as plain
  // punctuation, which needs no drawing.
  //
  // Meaning is carried by the adjacent visually-hidden label, never by
  // the glyph or the row colour alone.
  var MARKER_SVG = 'viewBox="0 0 24 24" width="14" height="14" fill="none" ' +
    'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true"';

  function markerGlyph(kind) {
    if (kind === "settled") {
      return "<svg " + MARKER_SVG + ' stroke-width="3">' +
        '<path d="M4 12l6 6L20 6"></path></svg>';
    }
    if (kind === "assumed") return "?";
    if (kind === "ongoing") return "!";
    return "<svg " + MARKER_SVG + ' stroke-width="2.5">' +
      '<circle cx="12" cy="12" r="7"></circle></svg>';
  }

  // ----------------------------------------------------------------
  // Headline split
  // ----------------------------------------------------------------

  var SPLIT_CELLS = [
    { key: "needs_action", cls: "is-needs", label: "Need something now",
      note: "Including assumptions still waiting to be confirmed" },
    { key: "ongoing", cls: "is-ongoing", label: "Need watching",
      note: "Carries forward into the next wave" },
    { key: "settled", cls: "is-settled", label: "Settled",
      note: "Closed, confirmed, or not ours to act on" },
  ];

  function splitHtml(apps, ctx) {
    var counts = M.split(apps, ctx.categories);
    return SPLIT_CELLS.map(function (cell) {
      return '<div class="ar-split-cell ' + cell.cls + '">' +
        '<span class="eyebrow">' + App.escape(cell.label) + "</span>" +
        '<p class="ar-split-figure">' + counts[cell.key] + "</p>" +
        '<p class="ar-split-note">' + App.escape(cell.note) + "</p></div>";
    }).join("");
  }

  // ----------------------------------------------------------------
  // Partner-scope blockers, read once at wave level
  // ----------------------------------------------------------------

  function partnerPanelHtml(apps) {
    var rolled = F.partnerBlockers(apps);
    if (!rolled.length) return "";
    var items = rolled.map(function (entry) {
      return "<li><strong>" + App.escape(entry.partner) + "</strong> - " +
        entry.applications.length +
        (entry.applications.length === 1 ? " application" : " applications") +
        " blocked at partner level</li>";
    }).join("");
    return '<div class="ar-panel"><h2>Partner-level blockers</h2>' +
      "<p>These gate every application under the partner, not just the rows " +
      "they are recorded against. Worth checking partner establishment " +
      "before the next submission rather than finding it in a mail trail.</p>" +
      "<ul>" + items + "</ul></div>";
  }

  // ----------------------------------------------------------------
  // Do now, and its conversion into the carry-forward list
  // ----------------------------------------------------------------

  function doNowItem(app, ctx, rank, trailing) {
    return '<button type="button" class="ar-donow-item" ' +
      'data-application="' + App.escape(app.id) + '"' +
      rowStyle(app.triage_category, ctx.categories) + ">" +
      (rank ? '<span class="ar-donow-rank">' + rank + "</span>" : "") +
      '<span class="ar-donow-what">' + App.escape(app.merchant_name) + "</span>" +
      '<span class="ar-donow-action">' + App.escape(trailing) + "</span></button>";
  }

  // Returns { heading, html }. When Needs action empties, this strip
  // does not go blank: it becomes the carry-forward list, which is the
  // wave's actual output, and says so. That transition is the moment
  // the wave is done.
  function doNowHtml(apps, ctx) {
    var queue = M.doNowOrder(apps, ctx.categories);
    if (queue.length) {
      return {
        heading: "Do now",
        html: '<div class="ar-donow-list">' + queue.map(function (app, i) {
          return doNowItem(app, ctx, i + 1,
            app.action_text || "No action recorded");
        }).join("") + "</div>",
      };
    }

    var carrying = M.carryForward(apps, ctx.categories);
    if (!carrying.length) {
      return {
        heading: "Carrying forward",
        html: '<div class="ar-done"><h2>This wave is finished</h2>' +
          "<p>Nothing needs action and nothing needs watching. There is no " +
          "standing list to carry into the next wave.</p></div>",
      };
    }
    return {
      heading: "Carrying forward",
      html: '<div class="ar-done"><h2>This wave is worked through</h2>' +
        "<p>Nothing is left needing action. These " + carrying.length +
        (carrying.length === 1 ? " application is" : " applications are") +
        " the wave's output: they carry into the next wave with their " +
        "history, notes and triggers intact.</p></div>" +
        '<div class="ar-donow-list">' + carrying.map(function (app) {
          var trigger = M.triggerOf(app);
          return doNowItem(app, ctx, null,
            trigger ? "Waiting on " + trigger.label : "No trigger set");
        }).join("") + "</div>",
    };
  }

  // ----------------------------------------------------------------
  // Legend and filters
  // ----------------------------------------------------------------

  function legendHtml(apps, ctx) {
    var counts = M.categoryCounts(apps, ctx.categories);
    var split = M.split(apps, ctx.categories);
    var keys = Object.keys(ctx.categories);

    return M.GROUPS.map(function (group) {
      var members = keys
        .map(function (key) { return ctx.categories[key]; })
        .filter(function (c) { return c.group_key === group.key; })
        .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });

      // A group reads as soloed when the showing set is exactly its
      // own members - which is what clicking its heading produces.
      var soloed = members.length > 0 &&
        ctx.active.length === members.length &&
        members.every(function (c) { return ctx.active.indexOf(c.key) !== -1; });

      var chips = members.map(function (category) {
        var on = ctx.active.indexOf(category.key) !== -1;
        return '<button type="button" class="ar-chip" data-category="' +
          App.escape(category.key) + '" aria-pressed="' +
          (on ? "true" : "false") + '"' +
          rowStyle(category.key, ctx.categories) + ">" +
          App.escape(category.label) +
          '<span class="ar-chip-count">' + (counts[category.key] || 0) +
          "</span></button>";
      }).join("");

      return '<div class="ar-legend-group">' +
        '<button type="button" class="ar-legend-head" data-group="' +
        App.escape(group.key) + '" aria-pressed="' + (soloed ? "true" : "false") +
        '"><span class="eyebrow">' + App.escape(group.label) + "</span>" +
        '<span class="ar-legend-count">' + split[group.key] + "</span></button>" +
        '<div class="ar-chips">' + chips + "</div></div>";
    }).join("");
  }

  // ----------------------------------------------------------------
  // The board
  // ----------------------------------------------------------------

  function flagsHtml(app, ctx) {
    var flags = [];
    if (app.manual_pipeline) {
      flags.push('<span class="ar-flag is-danger">Do not send digitally</span>');
    }
    // Any scope the constraint allows, not just the two that were
    // spelled out: blocker_scope also permits 'record', which carried no
    // flag at all and so read as though nothing were blocking it.
    if (app.blocker_scope) {
      var scope = String(app.blocker_scope);
      flags.push('<span class="ar-flag">' +
        App.escape(scope.charAt(0).toUpperCase() + scope.slice(1)) +
        " blocker</span>");
    }
    if (ctx.dupes[F.duplicateKeyOf(app)]) {
      flags.push('<span class="ar-flag is-info">Duplicate</span>');
    }
    if (app.evidence_confidence === "truncated") {
      flags.push('<span class="ar-flag">Truncated evidence</span>');
    }
    if (app.is_draft) flags.push('<span class="ar-flag is-info">Draft</span>');
    return flags.length ? '<div class="ar-flags">' + flags.join("") + "</div>" : "";
  }

  // Age is always shown when known; only the flagging changes. On a
  // status where age means nothing the cell says so on hover, because
  // an unexplained big number is what made healthy drafts look stale.
  function ageCell(app, ctx) {
    var age = M.ageOf(app, ctx.statuses, ctx.now);
    if (age.days === null) return "<td></td>";
    var cls = age.isStale ? " is-stale" : age.isSignal ? "" : " is-quiet";
    var title = age.isSignal
      ? "Days since this was raised in LP"
      : "Days since this was raised. Not a staleness signal at this status - " +
        "nothing has been handed to us.";
    return '<td class="ar-age' + cls + '" title="' + App.escape(title) + '">' +
      age.days + "d</td>";
  }

  function rowHtml(app, index, ctx) {
    var category = ctx.categories[app.triage_category];
    var status = ctx.statuses[app.launchpad_status];
    var kind = M.marker(app, ctx.categories);
    var classes = ["ar-row"];
    if (M.groupOf(app, ctx.categories) === "settled") classes.push("is-settled");
    if (app.launchpad_status === "cancelled") classes.push("is-cancelled");

    return '<tr class="' + classes.join(" ") + '" tabindex="0" ' +
      'data-application="' + App.escape(app.id) + '"' +
      rowStyle(app.triage_category, ctx.categories) + ">" +
      '<td class="ar-index">' + (index + 1) + "</td>" +
      '<td><span class="ar-merchant">' + App.escape(app.merchant_name) +
      '</span><span class="ar-partner">' +
      App.escape(app.partner_name || "No partner recorded") + "</span>" +
      flagsHtml(app, ctx) + "</td>" +
      "<td>" + App.escape(status ? status.label : app.launchpad_status) + "</td>" +
      '<td><span class="badge ar-badge">' +
      App.escape(category ? category.label : "Unclassified") + "</span></td>" +
      ageCell(app, ctx) +
      '<td class="ar-marker"><span aria-hidden="true">' + markerGlyph(kind) +
      '</span><span class="visually-hidden">' +
      App.escape(M.MARKER_LABEL[kind]) + "</span></td></tr>";
  }

  function boardHtml(apps, ctx) {
    if (!apps.length) {
      return '<p class="notice">This wave holds no applications. Rows are ' +
        "added to review_applications from a Claude Code session.</p>";
    }
    var shown = M.visible(apps, ctx.active);
    if (!shown.length) {
      return '<p class="notice">Every category is hidden. Turn one back on ' +
        "in the legend above to see rows.</p>";
    }
    return '<div class="table-wrap"><table>' +
      "<thead><tr><th>#</th><th>Merchant</th><th>LP status</th>" +
      "<th>Triage</th><th>Age</th><th>State</th></tr></thead><tbody>" +
      shown.map(function (app, i) { return rowHtml(app, i, ctx); }).join("") +
      "</tbody></table></div>";
  }

  App.appReviewRender = {
    flagsHtml: flagsHtml,
    splitHtml: splitHtml,
    partnerPanelHtml: partnerPanelHtml,
    doNowHtml: doNowHtml,
    legendHtml: legendHtml,
    boardHtml: boardHtml,
    rowStyle: rowStyle,
    markerGlyph: markerGlyph,
  };
})();
