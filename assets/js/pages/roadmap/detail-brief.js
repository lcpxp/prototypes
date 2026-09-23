// ------------------------------------------------------------------
// roadmap/detail-brief.js - "Where it stands": the current state of a
// piece of planned work, at the top of its drawer.
//
// The drawer carries everything ever recorded against a row - the
// write-up, the chronology of every re-map and re-frame, thirty facts.
// That record is canonical and stays, below. What it could not do was
// answer "what is the plan, right now" without being read end to end,
// because the answer was spread across the allocation, the stream's
// other rows and the open notes, and interleaved with history.
//
// So this composes the answer from data that is CURRENT BY
// CONSTRUCTION, never from prose that might be old:
//   - the live allocation: which sprint, which step of the stream, who
//     builds it and where they have got to - and whose work it is;
//   - the stream's order: what this step follows and what it leads
//     into, or - on a workstream - every planned step with its one-line
//     summary, in sprint order;
//   - notes whose STATUS says they are still live: open questions, live
//     risks and open actions. Decisions are deliberately left out: most
//     record how the plan came to be (a re-map, a rename), which is the
//     history this section exists to get out of the way of. They are all
//     still in "Notes and decisions" below.
//
// Data in, string out - no DOM - so it runs in the Node vm with the
// other drawer builders.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  function esc(v) { return App.escape(v); }
  function V() { return App.roadmapDetailValues; }

  function num(v) { return v == null || v === "" ? NaN : Number(v); }
  function slotOf(k) {
    var al = k.allocation || {};
    var s = num(al.effective_slot);
    return isFinite(s) ? s : num(al.slot);
  }
  function bySequence(a, b) {
    return (slotOf(a) - slotOf(b)) ||
      ((num(a.allocation.sequence_position) || 0) -
       (num(b.allocation.sequence_position) || 0));
  }
  // A workstream's steps that are ON the sprint plan. The roadmap page
  // hands the drawer every child - the whole programme, next and later
  // included - and the plan is the subset carrying an allocation.
  function plannedSteps(ws, ctx) {
    var kids = App.roadmapView && ctx ? App.roadmapView.barKids(ws, ctx) : [];
    return kids.filter(function (k) {
      return k.allocation && isFinite(slotOf(k));
    }).sort(bySequence);
  }

  function link(k) {
    return '<a class="rmd-link" href="?item=' + esc(k.id) + '" data-item-id="' +
      esc(k.id) + '">' + esc(k.title) + "</a>";
  }
  // Who builds it, when it is not the LaunchPad team, and where they are.
  function builder(al) {
    if (!al || !al.is_external || !al.external_party) return "";
    var st = V().EXTERNAL_STATUS[al.external_status] || "";
    return al.external_party + (st ? " - " + st.toLowerCase() : "");
  }

  // The first sentence of a note, which is where every note in this
  // system states its point; the rest is the reasoning, one click away
  // in the full list. Cut at a word, never mid-word, when a sentence
  // runs on.
  var LINE = 180;
  function firstLine(text) {
    var t = String(text || "").replace(/\s+/g, " ").trim();
    var m = t.match(/^.+?[.?!](?=\s|$)/);
    var s = m ? m[0] : t;
    if (s.length <= LINE) return s;
    return s.slice(0, s.lastIndexOf(" ", LINE)).replace(/[,;:\s-]+$/, "") + "...";
  }

  // Who answers for it and who else has a claim on it. The fact grid
  // that also says this is folded below, so the brief carries it: a
  // plan is not stated until it says whose it is.
  function stakeholders(item) {
    var owner = item.department ? App.departmentLabel(item.department) : "";
    var also = (item.associated_departments || []).filter(function (k) {
      return k !== item.department;
    }).map(function (k) { return App.departmentLabel(k) || k; });
    if (!owner && !also.length) return "";
    return esc((owner ? owner + " (owner)" : "") +
      (also.length ? (owner ? "; also " : "") + also.join(", ") : ""));
  }

  function fact(label, value) {
    return value ? '<div class="rmd-brief-fact"><dt>' + esc(label) +
      "</dt><dd>" + value + "</dd></div>" : "";
  }

  // The item's own coordinates. Each line is a question someone asks in
  // a planning conversation, answered in the words the board uses.
  function itemFacts(item, ctx) {
    var al = item.allocation;
    var parent = ctx && ctx.itemById ? ctx.itemById[item.parent_id] : null;
    var steps = parent ? plannedSteps(parent, ctx) : [];
    var at = steps.map(function (k) { return k.id; }).indexOf(item.id);
    var out = fact("Status", esc(V().STATUS[item.status] || item.status || "")) +
      fact("When", esc(V().sprintWhen(al)));
    if (at > -1) {
      out += fact("Step", esc((at + 1) + " of " + steps.length + " in ") +
        link(parent));
      if (at > 0) out += fact("Follows", link(steps[at - 1]));
      if (at < steps.length - 1) out += fact("Leads into", link(steps[at + 1]));
    }
    return out + fact("Built by", esc(builder(al))) + fact("Stakeholders", stakeholders(item));
  }

  // A workstream's current plan: its span, then every planned step in
  // order with the one line that says what it does. That list IS the
  // concise account of the stream as it stands - each summary is kept
  // current as the step changes, which the write-up is not.
  function streamFacts(ws, ctx, steps) {
    if (!steps.length) return "";
    var first = steps[0].allocation;
    var last = steps.reduce(function (a, k) {
      var e = num(k.allocation.effective_end_slot);
      return isFinite(e) && e > a.end ? { end: e, al: k.allocation } : a;
    }, { end: -1, al: first }).al;
    var span = {
      effective_slot: slotOf(steps[0]),
      effective_end_slot: num(last.effective_end_slot),
      start_code: first.start_code, end_code: last.end_code,
    };
    var ext = steps.filter(function (k) { return builder(k.allocation); }).length;
    return fact("Status", esc(V().STATUS[ws.status] || ws.status || "")) +
      fact("When", esc(V().sprintWhen(span))) +
      fact("Planned", esc(steps.length + (steps.length === 1 ? " step" : " steps") +
        (ext ? ", " + ext + " built outside the team" : ""))) +
      fact("Shape", esc(V().scopeLabel(ws.scope))) +
      fact("Stakeholders", stakeholders(ws));
  }
  function planList(steps) {
    if (!steps.length) return "";
    return '<ol class="rmd-plan">' + steps.map(function (k) {
      var by = builder(k.allocation);
      return '<li class="rmd-plan-step"><span class="rmd-plan-when">' +
        esc(V().sprintWhen(k.allocation)) + "</span>" +
        '<span class="rmd-plan-body">' + link(k) +
        (by ? ' <span class="rmd-plan-by">' + esc(by) + "</span>" : "") +
        (k.summary ? '<span class="rmd-plan-sum">' + esc(k.summary) + "</span>" : "") +
        "</span></li>";
    }).join("") + "</ol>";
  }

  // What is still open. Ordered by what it asks of a reader: a question
  // needs an answer, a risk needs watching, an action needs doing.
  var OPEN = [["question", "Open question"], ["risk", "Live risk"], ["action", "Open action"]];
  function openNow(item, state) {
    if (state === "waiting") {
      return '<div class="skeleton" aria-hidden="true"><span></span></div>' +
        '<p class="visually-hidden">Loading what is still open</p>';
    }
    var live = (item.notes || []).filter(function (n) {
      return (!n.status || n.status === "active") && !n.inherited;
    });
    var rows = [];
    OPEN.forEach(function (pair) {
      live.forEach(function (n) {
        if (n.kind !== pair[0]) return;
        rows.push('<li><span class="rmd-note-kind rmd-note-kind--' + pair[0] +
          '">' + esc(pair[1]) + "</span> " + esc(firstLine(n.body)) + "</li>");
      });
    });
    if (!rows.length) return "";
    return '<h4 class="rmd-brief-sub">Still open</h4><ul class="rmd-open">' +
      rows.join("") + "</ul>";
  }

  // Only for work on the sprint plan: a row with no allocation and no
  // planned steps has no current plan to state, and a heading over two
  // lines of status would be the placeholder the drawer avoids elsewhere.
  function briefHtml(item, ctx, state) {
    var ws = item.level === "workstream";
    var steps = ws ? plannedSteps(item, ctx) : [];
    if (ws ? !steps.length : !(item.allocation && isFinite(slotOf(item)))) return "";
    var facts = ws ? streamFacts(item, ctx, steps) : itemFacts(item, ctx);
    return '<section class="rmd-brief" aria-labelledby="rmd-brief-h">' +
      '<h3 id="rmd-brief-h">Where it stands</h3>' +
      '<dl class="rmd-brief-facts">' + facts + "</dl>" +
      (ws ? '<h4 class="rmd-brief-sub">The plan</h4>' + planList(steps) : "") +
      openNow(item, state) + "</section>";
  }

  App.roadmapDetailBrief = {
    html: briefHtml,
    plannedSteps: plannedSteps,
    firstLine: firstLine,
  };
})();
