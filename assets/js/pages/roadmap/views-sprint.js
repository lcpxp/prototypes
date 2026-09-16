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

  // The axis. Unanchored, a column is the offset the plan was built in;
  // anchored, it is the real sprint. Saying "Sprint +0" rather than
  // inventing a code is the honest state, and it is stated once above
  // the axis rather than repeated on every bar.
  function slotLabel(slot, codeBySlot) {
    return codeBySlot[slot] || ("Sprint +" + slot);
  }

  function axisNote(anchored) {
    return anchored ? ""
      : '<p class="rmv-sp-note">Sprint numbering starts when delivery ' +
        "starts. Columns are offsets from the first sprint, not dates.</p>";
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

  // The key to the colour. Colour is only information if the reader is
  // told what it means, once, where it is used.
  function legend() {
    return '<div class="rmv-sp-legend">' +
      '<span class="rmv-sp-key rmv-sp-key--planned">Planned</span>' +
      '<span class="rmv-sp-key rmv-sp-key--active">In flight</span>' +
      '<span class="rmv-sp-key rmv-sp-key--done">Delivered</span>' +
      '<span class="rmv-sp-key rmv-sp-key--blocked">Blocked</span>' +
      '<span class="rmv-sp-key rmv-sp-key--ext">Built elsewhere</span>' +
      "</div>";
  }

  function colStyle(startSlot, endSlot) {
    return "grid-column:" + (startSlot + 2) + " / " + (endSlot + 3);
  }

  function headRow(cols, codeBySlot) {
    var cells = "";
    for (var s = 0; s < cols; s++) {
      cells += '<span class="rmv-tl-col">' +
        App.escape(slotLabel(s, codeBySlot)) + "</span>";
    }
    return '<div class="rmv-tl-head"><span class="rmv-tl-label"></span>' +
      cells + "</div>";
  }

  function wrap(inner, cols, wide) {
    return '<div class="rmv-tl rmv-sp' + (wide ? " rmv-tl--wide" : "") +
      '" style="--tl-cols:' + cols + '">' + inner + "</div>";
  }

  // Metric chips, one per (kind, unit, basis) and never summed across
  // them: minutes per application and minutes per year are different
  // claims, and a total over both means nothing. A chip whose weakest
  // input is an estimate is marked, so a figure never reads firmer than
  // the softest thing inside it.
  function chips(metrics) {
    if (!metrics || !metrics.length) return "";
    var V = App.roadmapDetailValues;
    return '<span class="rmv-sp-chips">' + metrics.map(function (m) {
      var kind = (V.METRIC_KIND && V.METRIC_KIND[m.metric_kind]) || m.metric_kind;
      var text = V.metricText({ value: m.total, unit: m.unit, basis: m.basis });
      var soft = m.weakest_confidence === "estimated" ? " rmv-sp-chip--soft" : "";
      return '<span class="rmv-sp-chip' + soft + '">' + App.escape(kind) +
        " " + App.escape(text) + "</span>";
    }).join("") + "</span>";
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
    var metricsByStream = groupMetrics(data.metrics);

    var ordered = streams.slice().sort(function (a, b) {
      return num(a.first_slot, 0) - num(b.first_slot, 0) ||
        byNullableAsc(a.priority, b.priority);
    });

    // The bars run CONTIGUOUSLY, and what each stream buys sits below
    // the board rather than between the bars. A benefit is a sentence
    // and a bar is a shape; interleaving them pushed the rows apart far
    // enough that the waterfall - the whole point of this view - could
    // not be seen. Above: five rows, uniform columns, the trickle.
    // Below: the same five, in the same order and the same colour,
    // saying what they are worth.
    var body = ordered.map(function (st) {
      var first = num(st.first_slot, 0);
      var last = num(st.last_slot, first);
      var count = num(st.item_count, 0);
      var bar = '<span class="rmv-tl-bar rmv-tl-bar--ws rmv-sp-bar' +
        R.catClass(catByStream[st.workstream_id]) +
        (st.externally_gated ? " rmv-sp-bar--has-ext" : "") +
        '" data-item-id="' + App.escape(st.workstream_id) + '" style="' +
        colStyle(first, last) + '"><span class="rmv-tl-title">' +
        App.escape(st.workstream_title) + "</span>" +
        '<span class="rmv-sp-count">' + count +
        (count === 1 ? " item" : " items") + "</span></span>";
      return '<div class="rmv-tl-row rmv-sp-row">' +
        '<span class="rmv-tl-label rmv-sp-label' +
        R.catClass(catByStream[st.workstream_id]) + '" title="' +
        App.escape(st.workstream_title) + '">' +
        App.escape(st.workstream_title) + "</span>" + bar + "</div>";
    }).join("");

    var notes = ordered.map(function (st) {
      var meta = "";
      if (st.business_benefit) {
        meta += '<p class="rmv-sp-benefit">' + App.escape(st.business_benefit) + "</p>";
      }
      meta += chips(metricsByStream[st.workstream_id]);
      if (!meta) return "";
      return '<div class="rmv-sp-note-card' +
        R.catClass(catByStream[st.workstream_id]) +
        '" data-item-id="' + App.escape(st.workstream_id) + '">' +
        '<h3 class="rmv-sp-note-head">' + App.escape(st.workstream_title) +
        "</h3>" + meta + "</div>";
    }).join("");

    return axisNote(ax.anchored) +
      wrap(headRow(ax.cols, ax.codeBySlot) + body, ax.cols, opts.wide) +
      (notes ? '<div class="rmv-sp-notes">' + notes + "</div>" : "");
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

    var order = grouped.order.slice().sort(function (a, b) {
      var sa = grouped.byStream[a][0], sb = grouped.byStream[b][0];
      return num(sa.effective_slot, 0) - num(sb.effective_slot, 0) ||
        byNullableAsc(sa.priority, sb.priority);
    });

    var body = order.map(function (key) {
      var items = grouped.byStream[key];
      var st = streamById[items[0].workstream_id];
      var title = items[0].workstream_title || items[0].title;
      var first = st ? num(st.first_slot, 0) : num(items[0].effective_slot, 0);
      var last = st ? num(st.last_slot, first) : num(items[0].effective_end_slot, first);
      var head = '<div class="rmv-tl-row rmv-sp-row--head">' +
        '<span class="rmv-tl-label">' + App.escape(title) + "</span>" +
        '<span class="rmv-tl-bar rmv-tl-bar--ws rmv-sp-bar' +
        R.catClass(items[0].category_key) + '"' +
        (items[0].workstream_id
          ? ' data-item-id="' + App.escape(items[0].workstream_id) + '"' : "") +
        ' style="' + colStyle(first, last) + '">' +
        '<span class="rmv-tl-title">' + App.escape(title) + "</span></span></div>";

      var bars = items.map(function (r) {
        var s = num(r.effective_slot, 0);
        var e = num(r.effective_end_slot, s);
        if (e < s) e = s;
        var prog = R.progressOf && R.progressOf(r);
        var progCls = prog && prog.bucket ? " rmv-prog-" + prog.bucket : "";
        var ext = r.is_external
          ? '<span class="rmv-sp-ext">' +
            App.escape(r.external_party || "external") + "</span>" : "";
        var bar = '<span class="' + barClasses(r) + R.catClass(r.category_key) +
          progCls + '" data-item-id="' + App.escape(r.work_item_id) + '" style="' +
          colStyle(s, e) + '"><span class="rmv-tl-title">' +
          App.escape(r.title) + "</span>" + ext + "</span>";
        return '<div class="rmv-tl-row rmv-tl-row--child rmv-sp-row">' +
          '<span class="rmv-tl-label rmv-sp-label' + R.catClass(r.category_key) +
          '" title="' + App.escape(r.title) + '">' + App.escape(r.title) +
          "</span>" + bar + "</div>";
      }).join("");
      return head + bars;
    }).join("");

    return axisNote(ax.anchored) +
      wrap(headRow(ax.cols, ax.codeBySlot) + body, ax.cols, opts.wide);
  }

  App.roadmapView.sprintStreams = sprintStreams;
  App.roadmapView.sprintItems = sprintItems;
  App.roadmapView.sprintLegend = legend;
})();
