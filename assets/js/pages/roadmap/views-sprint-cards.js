// ------------------------------------------------------------------
// roadmap/views-sprint-cards.js - What each workstream buys, as the
// cards that sit below the sprint board.
//
// Split from views-sprint.js on the seam tests/size-budget.json named:
// none of this reads an allocation row. A card knows a workstream's
// span, its audiences and its metrics; it knows nothing about slots,
// columns, grid coordinates or the axis, and the board knows nothing
// about audiences or metric vocabulary. Two concerns that shared a file
// only because they shared a page.
//
// The card is built to be TALKED THROUGH, not read: the name is the
// heading, the span and count sit under it as facts, the summary is one
// line, the audiences align in a definition list, and the countable
// value is a row of tiles with the figure as the hero. The long-form
// case folds away behind a control that sits in the same place on every
// card, because it is the route into detail when a claim is challenged.
//
// Data in, string out - no DOM - so it loads in the Node vm alongside
// the other view builders and is benchmarked without a browser.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var R = App.roadmapViewsShared;

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  // The span a card states, so a reader is not looking up to the board
  // and back down. Codes once anchored; counted sprints until then.
  function spanText(st) {
    var first = num(st.first_slot, 0);
    var last = num(st.last_slot, first);
    if (st.start_code || st.end_code) {
      var a = st.start_code || ("Sprint " + (first + 1));
      var b = st.end_code || ("Sprint " + (last + 1));
      return a === b ? a : a + " to " + b;
    }
    return first === last ? "Sprint " + (first + 1)
      : "Sprints " + (first + 1) + " to " + (last + 1);
  }

  // Where the stream sits in the ordering, for when the axis is being
  // read as a priority scale. It REPLACES the span rather than joining
  // it: in that reading the columns are not sprints, so a sprint span
  // is answering a question the board is no longer asking. The number
  // is the one already on the bar and the card, so the two cannot
  // disagree.
  function rankText(rank, total) {
    if (!rank) return "Unranked";
    return total ? "Priority " + rank + " of " + total : "Priority " + rank;
  }

  function countText(n) {
    return n + (n === 1 ? " item" : " items");
  }

  // One tile per (kind, unit, basis), never summed across them: minutes
  // per application and minutes per year are different claims, and a
  // total over both means nothing.
  //
  // The FIGURE is the hero and the words sit under it, because across a
  // room a sentence is a grey smudge and a number is legible. The basis
  // renders as English from the one vocabulary that holds it
  // (roadmap/detail-values.js), so "2 one-off" - which reads as a typo -
  // becomes 2 / Providers removed / one-off.
  //
  // A tile whose weakest input is unmeasured wears a tilde and a dashed
  // rule, not merely a paler grey: a figure must never read firmer than
  // the softest thing inside it, and colour alone cannot say so on a
  // projector. It is marked with "~" rather than with the confidence
  // word the drawer uses, because on a board of sprints that word reads
  // as an effort estimate - the one thing this surface must never carry
  // (see the benchmark that bans the vocabulary outright).
  function metricTiles(metrics) {
    if (!metrics || !metrics.length) {
      return '<p class="rmv-sp-nometric">No measured value recorded yet.</p>';
    }
    var V = App.roadmapDetailValues;
    return '<ul class="rmv-sp-metrics">' + metrics.map(function (m) {
      var kind = (V.METRIC_KIND && V.METRIC_KIND[m.metric_kind]) ||
        m.metric_kind;
      var unit = V.METRIC_UNIT && V.METRIC_UNIT[m.unit] !== undefined
        ? V.METRIC_UNIT[m.unit] : m.unit;
      var basis = (V.METRIC_BASIS && V.METRIC_BASIS[m.basis]) || m.basis || "";
      var soft = m.weakest_confidence === "estimated";
      var n = Number(m.total);
      var fig = isFinite(n)
        ? String(n % 1 === 0 ? n : Number(n.toFixed(1)))
        : String(m.total || "");
      return '<li class="rmv-sp-metric' + (soft ? " rmv-sp-metric--soft" : "") +
        '"><span class="rmv-sp-fig">' +
        (soft ? '<span class="visually-hidden">Approximately </span>' : "") +
        '<span>' + (soft ? "~" : "") + App.escape(fig) + "</span>" +
        (unit ? '<span class="rmv-sp-unit">' + App.escape(unit) + "</span>"
          : "") + "</span>" +
        '<span class="rmv-sp-kind">' + App.escape(kind) + "</span>" +
        (basis ? '<span class="rmv-sp-basis">' + App.escape(basis) + "</span>"
          : "") +
        "</li>";
    }).join("") + "</ul>";
  }

  // What each stream buys, collected below the board. Both views carry
  // it, and both carry it at WORKSTREAM level only: a per-item summary
  // under the delivery view would be eighteen paragraphs where the
  // question being asked is still "what do these five streams buy".
  // The cards keep the board's order and the board's colour, so a card
  // and its bar are the same stream without being labelled as such.
  // ONE reading, not three. The work item and the drawer hold what a
  // partner's staff and a merchant get; this board does not, because
  // this board exists for one question in one meeting - what does the
  // acquirer stop doing by hand. Three lines of audience detail on every
  // card pushed the figures down the screen and split the attention of a
  // room that had come to hear about operational effort.
  //
  // The label names the beneficiary outright. "Acquirer staff" left a
  // reader working out whether that meant us or someone we acquire for;
  // on a card whose whole job is our own efficiency case, that is the one
  // thing that cannot be ambiguous.
  var BENEFIT = {
    field: "pxp_staff_value",
    label: "Business benefit (Acquirer/us)",
  };

  // The label sits ABOVE its line rather than beside it. At thirty
  // characters it would take most of a card's width as a max-content
  // column, and stacked it reads further across a room - the same move
  // the meta line above it already makes.
  function valueList(st) {
    var text = st[BENEFIT.field];
    if (!text || !String(text).trim()) return "";
    return '<div class="rmv-sp-values"><span class="rmv-sp-vlabel">' +
      App.escape(BENEFIT.label) + '</span><p class="rmv-sp-vtext">' +
      App.escape(text) + "</p></div>";
  }

  // WHAT SHAPE THE STREAM IS. A bar's length says when the work runs,
  // never whether it ever ends - and that is the question a room asks
  // about a stream it is being asked to fund. Three answers, because
  // three is what the work divides into: bounded activities with a
  // clear objective, bounded ones delivered in stages where a stage is
  // a legitimate place to stop, and standing objectives that are
  // maintained and improved rather than finished.
  //
  // The wording carries the distinction rather than a colour, because
  // the difference between "this ends" and "this is maintained" is the
  // whole point and a hue cannot say it across a room.
  var SCOPE = {
    finite: "Finite scope - this one ends",
    staged: "Staged scope - each stage is a stopping point",
    continuous: "Ongoing - maintained and improved, not finished",
  };

  function scopeChip(st) {
    var label = SCOPE[st.scope];
    if (!label) return "";
    return '<p class="rmv-sp-scope rmv-sp-scope--' + App.escape(st.scope) +
      '">' + App.escape(label) + "</p>";
  }

  // THE CEILINGS A STREAM LIFTS, under the figures rather than beside
  // them. A metric tile answers "how much, per unit"; these answer
  // "and what stops being a limit", which is the half a figure cannot
  // carry. "8-10 merchants a day" is not a quantity to be summed
  // across a sprint - it is a wall, and the claim is that it stops
  // being there. Summing it would mean nothing, which is exactly why
  // these are prose and not work_item_metrics rows.
  //
  // Sentences, so they are set as full-width rows rather than inline
  // pills: a sentence in a pill wraps into a shape nobody can scan.
  function scaleTags(st) {
    var notes = st.scale_notes;
    if (!notes || !notes.length) return "";
    return '<ul class="rmv-sp-scale">' + notes.map(function (n) {
      return '<li class="rmv-sp-scale-tag">' + App.escape(n) + "</li>";
    }).join("") + "</ul>";
  }

  // A discussion card, not a paragraph. What it is, in one bold line;
  // who stops doing what, as bullets; what it is worth, as chips; and
  // the long-form case folded away for whoever asks for it. The prose
  // is still here - it is the thing a benefit was written as - but it
  // no longer stands between a reader and the point.
  // `ordered` arrives already filtered: the BOARD owns hide mode, because
  // hiding is a property of what is being looked at, not of a card. A
  // card renders what it is handed and asks no questions about state.
  function streamNotes(ordered, ctx) {
    var notes = ordered.map(function (st) {
      var id = st.workstream_id;
      var ext = ctx.ext[id];
      var meta = [
        ctx.byPriority ? rankText(ctx.no[id], ctx.streamCount) : spanText(st),
        countText(num(st.item_count, 0))];
      if (ext && ext.parties.length) {
        meta.push("Built elsewhere: " + ext.parties.join(", "));
      }
      var head = st.summary
        ? '<p class="rmv-sp-lede">' + App.escape(st.summary) + "</p>" : "";
      // The prose only earns a disclosure when there is a headline above
      // it. Without one it IS the summary, so it stays open.
      var prose = "";
      if (st.business_benefit) {
        prose = head
          ? '<details class="rmv-sp-more"><summary data-no-drawer="1">' +
            "The case in full</summary>" +
            '<p class="rmv-sp-benefit">' + App.escape(st.business_benefit) +
            "</p></details>"
          : '<p class="rmv-sp-benefit">' + App.escape(st.business_benefit) +
            "</p>";
      }
      return '<div class="rmv-sp-note-card' + R.catClass(ctx.cat[id]) +
        (ctx.cls ? ctx.cls(id) : "") + '" data-item-id="' +
        App.escape(id) + '">' +
        '<h3 class="rmv-sp-note-head"><span class="rmv-sp-no" ' +
        'aria-hidden="true">' + (ctx.no[id] || "") + "</span>" +
        App.escape(st.workstream_title) + "</h3>" +
        '<p class="rmv-sp-meta">' + meta.map(function (bit) {
          return '<span class="rmv-sp-meta-bit">' + App.escape(bit) + "</span>";
        }).join("") + "</p>" +
        scopeChip(st) + head + valueList(st) +
        metricTiles(ctx.metrics[id]) + scaleTags(st) + prose + "</div>";
    }).join("");
    return notes ? '<div class="rmv-sp-notes">' + notes + "</div>" : "";
  }

  App.roadmapSprintCards = {
    streamNotes: streamNotes,
    metricTiles: metricTiles,
    valueList: valueList,
    scopeChip: scopeChip,
    scaleTags: scaleTags,
    spanText: spanText,
    rankText: rankText,
    countText: countText,
  };
})();
