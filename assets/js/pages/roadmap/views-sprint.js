// ------------------------------------------------------------------
// roadmap/views-sprint.js - The Sprint Roadmap: the same Now work the
// product board bands by horizon, placed instead against sprints.
//
// It lives in roadmap/ and attaches to App.roadmapView because that is
// what it is - another reading of the same work over the same .rmv-tl
// coordinate model - even though the page that draws it is
// modules/sprints/. Moving the file to follow the page would have split
// the view family across two directories to no end.
//
// Two renderings of one allocation. sprintStreams is the stakeholder
// view - one bar per workstream, how far it spans, what it includes and
// what it is worth. sprintItems is the delivery view - every allocated
// item across the sprints, with overlap and external gating visible.
//
// It REUSES the timeline coordinate model rather than restating it:
// .rmv-tl is already a spanning grid driven by --tl-cols and
// grid-column, so N sprint columns need no new grid CSS and the bar,
// sticky header, scroll and progress rules come for free. Only what is
// genuinely new to sprints lives in assets/css/sprints.css.
//
// Spans and rollups come from the database views rather than being
// recomputed here: v_sprint_plan_items for the delivery view and
// v_sprint_plan_streams for the stakeholder one, so the board and a
// session querying the plan cannot disagree about where a bar starts.
//
// Data in, string out - no DOM - so it loads in the Node vm alongside
// the other view builders and is benchmarked without a browser.
//
// Durations never appear here. A bar says which sprints it spans and
// nothing else: no day counts, no capacity, no velocity. The planning
// constants exist to produce the allocation, not to be published with
// it (docs/SPRINT-DELIVERY.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var R = App.roadmapViewsShared;
  function C() { return App.roadmapSprintCards; }

  var EMPTY = '<p class="notice">No work is allocated to a sprint yet. ' +
    "An item reaches the Sprint Roadmap when it sits in Now and is given " +
    "a slot.</p>";

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }
  function byNullableAsc(a, b) {
    return (a == null ? Infinity : a) - (b == null ? Infinity : b);
  }

  // The axis. Unanchored, a column is counted from the first sprint of
  // the plan; anchored, it is the real sprint. The SLOT stays
  // zero-indexed everywhere - in the view, in the database and in every
  // calculation - and only its label counts from one, because "Sprint +0"
  // reads as the sprint before the first one to everyone who is not
  // holding the data model in their head. That the numbering is relative
  // is said once, on the column headings, where the question arises.
  function slotLabel(slot, codeBySlot) {
    return codeBySlot[slot] || ("Sprint " + (slot + 1));
  }

  // Which sprints of a workstream hold work someone else is building, and
  // who. Read from the item rows the board already has, so this adds no
  // fetch: the stakeholder view can show WHICH sprints sit with EIT or
  // the Payment Service team rather than only that some of them do.
  function externalSlots(rows) {
    var out = {};
    rows.forEach(function (r) {
      if (!r.is_external || !r.workstream_id) return;
      var s = num(r.effective_slot, 0);
      var e = num(r.effective_end_slot, s);
      if (e < s) e = s;
      var b = out[r.workstream_id] ||
        (out[r.workstream_id] = { slots: {}, parties: [] });
      for (var i = s; i <= e; i++) b.slots[i] = true;
      var who = r.external_party || "external";
      if (b.parties.indexOf(who) === -1) b.parties.push(who);
    });
    return out;
  }

  // Contiguous runs, so a two-sprint stretch draws as one marked segment
  // rather than two abutting ones with a seam down the middle.
  function slotRuns(slots) {
    var keys = Object.keys(slots).map(Number).sort(function (a, b) {
      return a - b;
    });
    var out = [], i = 0;
    while (i < keys.length) {
      var start = keys[i], end = start;
      while (i + 1 < keys.length && keys[i + 1] === end + 1) end = keys[++i];
      out.push([start, end]);
      i++;
    }
    return out;
  }

  // The segments themselves ride in the row's own grid, in the same cells
  // the bar spans, so they land on exactly the sprints they describe.
  // Hatched AND dashed AND named: three encodings of one fact, so it
  // survives a projector, a greyscale print and colour blindness alike.
  function externalSegs(ext, cat) {
    if (!ext) return "";
    var who = ext.parties.join(", ");
    return slotRuns(ext.slots).map(function (r) {
      // The segment carries the stream's own theme class: it is a sibling
      // of the bar, not a child, so --rm-a does not reach it otherwise and
      // it would rail in the neutral fallback on a coloured row.
      return '<span class="rmv-sp-ext-seg' + R.catClass(cat) + '" style="' +
        colStyle(r[0], r[1]) +
        '" title="Built by ' + App.escape(who) + '">' +
        '<span class="rmv-sp-ext-who">' + App.escape(who) + "</span></span>";
    }).join("");
  }

  // A stream's number is its position on the board, and it is the same
  // number on the bar and on the card. Colour alone cannot carry "this
  // one" across a room, and two streams can share a category; a number
  // cannot collide and reads at any distance.
  function numbering(ordered, idOf) {
    var out = {};
    ordered.forEach(function (row, i) { out[idOf(row)] = i + 1; });
    return out;
  }

  // An external bar is drawn as an outline rather than a fill, so a
  // reader can see at a glance which parts of the plan PXP is not the
  // one moving. The party is named on the bar and in the drawer.
  // Delivered, in flight, blocked or planned. Without this the board
  // showed intent and never movement, so nothing on it read as a flow
  // of work being completed - only as a set of intentions with dates.
  function stateOf(row) {
    if (row.status === "done") return "done";
    if (row.status === "blocked") return "blocked";
    if (row.status === "in_progress") return "active";
    return "planned";
  }

  function barClasses(row) {
    var cls = "rmv-tl-bar rmv-sp-bar rmv-sp-bar--" + stateOf(row);
    if (row.is_external) cls += " rmv-sp-bar--ext";
    if (row.overlap === "overlappable") cls += " rmv-sp-bar--overlap";
    if (row.overlap === "parallel") cls += " rmv-sp-bar--parallel";
    if (row.external_status === "slipped") cls += " rmv-sp-bar--slipped";
    return cls;
  }

  // The key to the board. It READS as a key: a labelled list of
  // swatches, not a strip of pills that look like filters and are not.
  // Nothing here is clickable and nothing here pretends to be.
  function legend() {
    var keys = [
      ["planned", "Planned"], ["active", "In flight"],
      ["done", "Delivered"], ["blocked", "Blocked"],
      ["ext", "Built elsewhere"],
    ];
    return '<div class="rmv-sp-legend">' +
      '<span class="rmv-sp-legend-head">Key</span><ul class="rmv-sp-keys">' +
      keys.map(function (k) {
        return '<li class="rmv-sp-key rmv-sp-key--' + k[0] + '">' + k[1] +
          "</li>";
      }).join("") + "</ul></div>";
  }

  // Hiding a row. ONE mechanism, worked the way the roadmap's custom
  // view already works: a toolbar toggle reveals a control on every row,
  // and pressing a row's control drops it.
  //
  // In hide mode nothing actually disappears - a hidden row dims and
  // keeps its eye, because a control you cannot reach is a row you
  // cannot get back. Leaving hide mode is what removes them. The axis
  // never changes either way: it is a property of the PLAN, not of what
  // is being looked at, so the rows still shown keep their real
  // positions rather than sliding left to fill a gap.
  //
  // Hiding a workstream hides everything inside it; hiding one item
  // hides only that item. Both are the same gesture in the same place.
  //
  // View-only, held in the browser (assets/js/pages/sprints/sprints.js).
  // It changes nothing in the database and no other reader sees it.
  function isHidden(id, opts) {
    return !!(opts && opts.hidden && id && opts.hidden[id]);
  }
  function hiddenCls(id, opts) {
    return isHidden(id, opts) ? " rmv-unpicked rmv-sp-hidden" : "";
  }
  // Drawn only in hide mode, so the board stays clean the rest of the
  // time. It is the last child of the row and .rmv-tl parks it in the
  // trailing column, the same way the roadmap parks its pick box.
  function eye(id, opts, what) {
    if (!opts || !opts.hideMode || !id) return "";
    var off = isHidden(id, opts);
    return '<button type="button" class="rmv-sp-eye" data-hide-id="' +
      App.escape(id) + '" aria-pressed="' + (off ? "true" : "false") +
      '" title="' + (off ? "Show " : "Hide ") + App.escape(what) +
      '" aria-label="' + (off ? "Show " : "Hide ") + App.escape(what) +
      '">' + (off ? EYE_OFF : EYE_ON) + "</button>";
  }
  var EYE_ON =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>' +
    '<circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 3l18 18"/>' +
    '<path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.4 3.4"/>' +
    '<path d="M6.3 6.4A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.2-1"/>' +
    '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  // A row is drawn unless it is hidden AND we have left hide mode.
  function dropped(id, opts) {
    return isHidden(id, opts) && !(opts && opts.hideMode);
  }

  function colStyle(startSlot, endSlot) {
    return "grid-column:" + (startSlot + 2) + " / " + (endSlot + 3);
  }

  // The same axis, read as a PRIORITY SCALE instead of as sprints.
  // Nothing about the plan changes: the columns, the order and the bars
  // are identical, and what the reader is told they mean is what
  // switches. That is honest rather than a relabelling trick, because
  // the sequence already IS the ordering - work is allocated by
  // workstream priority, so earlier columns hold higher-priority work
  // by construction. Saying so lets the board be discussed as a set of
  // priorities in a room that has not agreed a start date, without a
  // second ordering to keep in step with the first.
  //
  // Only the two ENDS are labelled. A scale is defined by its extremes,
  // and captioning every column "high-ish" would be inventing precision
  // the ordering does not carry; the rule drawn across the heads
  // (assets/css/sprints.css) is what joins them into one scale.
  function priorityCells(cols) {
    if (cols === 1) {
      return '<span class="rmv-tl-col rmv-sp-col rmv-sp-col--priority">' +
        "Priority</span>";
    }
    var out = "";
    for (var s = 0; s < cols; s++) {
      var label = s === 0 ? "Highest priority"
        : (s === cols - 1 ? "Lowest priority" : "");
      out += '<span class="rmv-tl-col rmv-sp-col rmv-sp-col--priority">' +
        label + "</span>";
    }
    return out;
  }

  // The gutter cell heads the label column instead of sitting empty, and
  // carries the one statement that qualifies the headings beside it -
  // that the numbering is relative, or that the columns are a scale.
  // Whichever reading is on, it is said once and nowhere else.
  function headRow(cols, codeBySlot, anchored, opts) {
    var priority = !!(opts && opts.priorityLabels);
    var cells = "";
    if (priority) {
      cells = priorityCells(cols);
    } else {
      for (var s = 0; s < cols; s++) {
        cells += '<span class="rmv-tl-col rmv-sp-col">' +
          App.escape(slotLabel(s, codeBySlot)) + "</span>";
      }
    }
    // The sprint note would be answering a question nobody asked once
    // the columns stop claiming to be sprints, so the two are
    // alternatives rather than both.
    var note = priority
      ? '<span class="rmv-sp-note">Left is highest priority, right is ' +
        "lowest.</span>"
      : (anchored ? "" : '<span class="rmv-sp-note">Numbering is relative ' +
        "until a start date is set.</span>");
    return '<div class="rmv-tl-head rmv-sp-head' +
      (priority ? " rmv-sp-head--priority" : "") + '">' +
      '<span class="rmv-tl-label rmv-sp-head-label">Workstream' +
      note + "</span>" + cells + "</div>";
  }

  function wrap(inner, cols, wide, opts) {
    return '<div class="rmv-tl rmv-sp' + (wide ? " rmv-tl--wide" : "") +
      (opts && opts.hideMode ? " rmv-sp--hiding" : "") +
      '" style="--tl-cols:' + cols + '">' + inner + "</div>";
  }

  // Roll metric rows up to the workstream, keeping (kind, unit, basis)
  // separate for the reason above.
  function groupMetrics(metrics) {
    var out = {};
    (metrics || []).forEach(function (m) {
      if (!m.workstream_id) return;
      var bucket = out[m.workstream_id] || (out[m.workstream_id] = {});
      var sig = m.metric_kind + "|" + m.unit + "|" + m.basis;
      if (!bucket[sig]) {
        bucket[sig] = { metric_kind: m.metric_kind, unit: m.unit, basis: m.basis,
          total: 0, weakest_confidence: "owner_stated" };
      }
      bucket[sig].total += num(m.total, 0);
      if (m.weakest_confidence === "estimated") bucket[sig].weakest_confidence = "estimated";
    });
    Object.keys(out).forEach(function (k) {
      out[k] = Object.keys(out[k]).map(function (sig) { return out[k][sig]; });
    });
    return out;
  }

  // The axis: how many columns, and which sprint code (if any) each one
  // carries. Built from the item rows, then filled across spans so a
  // column in the middle of a bar still has a label once anchored.
  function axis(rows, sprintCodes) {
    var maxSlot = 0, anchored = false, codeBySlot = {};
    rows.forEach(function (r) {
      var s = num(r.effective_slot, 0);
      var e = num(r.effective_end_slot, s);
      if (e < s) e = s;
      if (e > maxSlot) maxSlot = e;
      if (r.anchored) anchored = true;
      if (r.start_code) codeBySlot[s] = r.start_code;
      if (r.end_code) codeBySlot[e] = r.end_code;
    });
    var cols = maxSlot + 1;
    if (anchored && sprintCodes) {
      for (var i = 0; i < cols; i++) {
        if (!codeBySlot[i] && sprintCodes[i]) codeBySlot[i] = sprintCodes[i];
      }
    }
    return { cols: cols, anchored: anchored, codeBySlot: codeBySlot };
  }

  // Group the item rows under their workstream, in slot then sequence
  // order. Spans come from the row, never recomputed.
  function groupItems(rows) {
    var byStream = {}, order = [];
    rows.forEach(function (r) {
      var key = r.workstream_id || ("_loose_" + r.work_item_id);
      if (!byStream[key]) { byStream[key] = []; order.push(key); }
      byStream[key].push(r);
    });
    order.forEach(function (k) {
      byStream[k].sort(function (a, b) {
        return num(a.effective_slot, 0) - num(b.effective_slot, 0) ||
          byNullableAsc(a.sequence_position, b.sequence_position) ||
          byNullableAsc(a.priority, b.priority);
      });
    });
    return { byStream: byStream, order: order };
  }

  // The label lane. A full title at body size on its own line, a colour
  // chip and the stream's number - no truncation, because a title that
  // ends in an ellipsis is a title nobody can say out loud.
  function labelCell(no, title, cat, child) {
    return '<span class="rmv-tl-label rmv-sp-label' +
      (child ? " rmv-sp-label--child" : "") + R.catClass(cat) + '">' +
      (no ? '<span class="rmv-sp-no" aria-hidden="true">' + no + "</span>" : "") +
      '<span class="rmv-sp-name">' + App.escape(title) + "</span></span>";
  }

  // ----------------------------------------------------------------
  // Stakeholder view. Reads v_sprint_plan_streams, so the span, the
  // item count and the external flag are the database's answer rather
  // than a second one computed here.
  // ----------------------------------------------------------------
  function sprintStreams(data, opts) {
    opts = opts || {};
    var rows = (data && data.sprintItems) || [];
    var streams = (data && data.sprintStreams) || [];
    if (!rows.length || !streams.length) return EMPTY;

    var ax = axis(rows, data.sprintCodes);
    var catByStream = {};
    rows.forEach(function (r) {
      if (r.workstream_id && !catByStream[r.workstream_id]) {
        catByStream[r.workstream_id] = r.category_key;
      }
    });
    var ctx = {
      cat: catByStream,
      metrics: groupMetrics(data.metrics),
      ext: externalSlots(rows),
      no: {},
      cls: function (id) { return hiddenCls(id, opts); },
      // Which reading the axis is carrying, so a card does not talk in
      // sprints while the columns above it are a priority scale.
      byPriority: !!opts.priorityLabels,
    };

    var ordered = streams.slice().sort(function (a, b) {
      return num(a.first_slot, 0) - num(b.first_slot, 0) ||
        byNullableAsc(a.priority, b.priority);
    });
    ctx.no = numbering(ordered, function (r) { return r.workstream_id; });
    ctx.streamCount = ordered.length;

    // The bars run CONTIGUOUSLY, and what each stream buys sits below
    // the board rather than between the bars. A benefit is a sentence
    // and a bar is a shape; interleaving them pushed the rows apart far
    // enough that the waterfall - the whole point of this view - could
    // not be seen. Above: five rows, uniform columns, the trickle.
    // Below: the same five, in the same order, colour and number,
    // saying what they are worth.
    //
    // A bar carries the item count and nothing else. The title is in the
    // label lane, in full and once: printing it inside the bar as well
    // meant two truncated copies of one string fighting for the same
    // pixels.
    var body = ordered.filter(function (st) {
      return !dropped(st.workstream_id, opts);
    }).map(function (st) {
      var id = st.workstream_id;
      var first = num(st.first_slot, 0);
      var last = num(st.last_slot, first);
      var bar = '<span class="rmv-tl-bar rmv-tl-bar--ws rmv-sp-bar' +
        R.catClass(catByStream[id]) +
        (st.externally_gated ? " rmv-sp-bar--has-ext" : "") +
        '" data-item-id="' + App.escape(id) + '" style="' +
        colStyle(first, last) + '"><span class="rmv-sp-count">' +
        C().countText(num(st.item_count, 0)) + "</span></span>";
      return '<div class="rmv-tl-row rmv-sp-row' + hiddenCls(id, opts) + '">' +
        labelCell(ctx.no[id], st.workstream_title, catByStream[id]) + bar +
        externalSegs(ctx.ext[id], catByStream[id]) +
        eye(id, opts, st.workstream_title) +
        "</div>";
    }).join("");

    return wrap(headRow(ax.cols, ax.codeBySlot, ax.anchored, opts) + body,
      ax.cols, opts.wide, opts) +
      C().streamNotes(ordered.filter(function (st) {
        return !dropped(st.workstream_id, opts);
      }), ctx);
  }

  // ----------------------------------------------------------------
  // Delivery view: every allocated item, indented under its workstream.
  // ----------------------------------------------------------------
  function sprintItems(data, opts) {
    opts = opts || {};
    var rows = (data && data.sprintItems) || [];
    if (!rows.length) return EMPTY;

    var ax = axis(rows, data.sprintCodes);
    var grouped = groupItems(rows);
    var streamById = {};
    ((data && data.sprintStreams) || []).forEach(function (s) {
      streamById[s.workstream_id] = s;
    });

    // Ordered on the STREAM's own slot and priority, which is what the
    // stakeholder view sorts on - not on the first item's. Sorting by the
    // first item silently renumbered the board between the two tabs
    // whenever a stream's leading item did not share its rank: Payment
    // Service (stream priority 10, leading item 20) fell behind EIT
    // (stream 20, leading item 10), so stream 1 on one tab was stream 2
    // on the other while both claimed to be the same plan. Falls back to
    // the item for a loose row with no stream of its own.
    var order = grouped.order.slice().sort(function (a, b) {
      var wa = streamById[a], wb = streamById[b];
      var sa = grouped.byStream[a][0], sb = grouped.byStream[b][0];
      return (wa ? num(wa.first_slot, 0) : num(sa.effective_slot, 0)) -
             (wb ? num(wb.first_slot, 0) : num(sb.effective_slot, 0)) ||
        byNullableAsc(wa ? wa.priority : sa.priority,
                      wb ? wb.priority : sb.priority);
    });

    // The same numbers, colours and order the stakeholder view uses, so
    // switching tab does not renumber the plan under the reader.
    var notesOrder = [], catByStream = {};
    order.forEach(function (key) {
      var items = grouped.byStream[key];
      catByStream[items[0].workstream_id] = items[0].category_key;
      if (streamById[key]) notesOrder.push(streamById[key]);
    });
    var ctx = {
      cat: catByStream,
      metrics: groupMetrics((data && data.metrics) || []),
      ext: externalSlots(rows),
      no: numbering(notesOrder, function (r) { return r.workstream_id; }),
      streamCount: notesOrder.length,
      cls: function (id) { return hiddenCls(id, opts); },
      // Which reading the axis is carrying, so a card does not talk in
      // sprints while the columns above it are a priority scale.
      byPriority: !!opts.priorityLabels,
    };

    var body = order.filter(function (key) {
      return !dropped(grouped.byStream[key][0].workstream_id, opts);
    }).map(function (key) {
      var items = grouped.byStream[key];
      var wsId = items[0].workstream_id;
      var st = streamById[wsId];
      var off = hiddenCls(wsId, opts);
      var title = items[0].workstream_title || items[0].title;
      var cat = items[0].category_key;
      var first = st ? num(st.first_slot, 0) : num(items[0].effective_slot, 0);
      var last = st ? num(st.last_slot, first)
        : num(items[0].effective_end_slot, first);
      var head = '<div class="rmv-tl-row rmv-sp-row rmv-sp-row--head' + off +
        '">' + labelCell(ctx.no[wsId], title, cat) +
        '<span class="rmv-tl-bar rmv-tl-bar--ws rmv-sp-bar' + R.catClass(cat) +
        '"' + (wsId ? ' data-item-id="' + App.escape(wsId) + '"' : "") +
        ' style="' + colStyle(first, last) + '"><span class="rmv-sp-count">' +
        C().countText(items.length) + "</span></span>" +
        externalSegs(ctx.ext[wsId], cat) + eye(wsId, opts, title) + "</div>";

      var bars = items.filter(function (r) {
        return !dropped(r.work_item_id, opts);
      }).map(function (r) {
        var s = num(r.effective_slot, 0);
        var e = num(r.effective_end_slot, s);
        if (e < s) e = s;
        var prog = R.progressOf && R.progressOf(r);
        var progCls = prog && prog.bucket ? " rmv-prog-" + prog.bucket : "";
        // An external item names its party ON the bar as well as wearing
        // the hatch, so the fact survives without the colour.
        var ext = r.is_external
          ? '<span class="rmv-sp-ext">' +
            App.escape(r.external_party || "external") + "</span>" : "";
        var bar = '<span class="' + barClasses(r) + R.catClass(r.category_key) +
          progCls + '" data-item-id="' + App.escape(r.work_item_id) +
          '" style="' + colStyle(s, e) + '">' + ext + "</span>";
        return '<div class="rmv-tl-row rmv-tl-row--child rmv-sp-row' + off +
          hiddenCls(r.work_item_id, opts) + '">' +
          labelCell(0, r.title, r.category_key, true) + bar +
          eye(r.work_item_id, opts, r.title) + "</div>";
      }).join("");
      return head + bars;
    }).join("");

    return wrap(headRow(ax.cols, ax.codeBySlot, ax.anchored, opts) + body,
      ax.cols, opts.wide, opts) +
      C().streamNotes(notesOrder.filter(function (st) {
        return !dropped(st.workstream_id, opts);
      }), ctx);
  }

  App.roadmapView.sprintStreams = sprintStreams;
  App.roadmapView.sprintItems = sprintItems;
  App.roadmapView.sprintLegend = legend;
})();
