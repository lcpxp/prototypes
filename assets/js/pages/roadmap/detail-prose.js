// ------------------------------------------------------------------
// roadmap/detail-prose.js - The drawer's late-arriving sections: an
// item's written detail, its user stories and acceptance criteria, and
// the notes recorded against it.
//
// Split from detail.js on the seam tests/size-budget.json recorded for
// it. These builders share one property that the rest of the drawer
// does not: their content is fetched when the drawer opens rather than
// with the board (App.lazyDetail, docs/plan/80-LOAD-SPEED.md), so each
// takes the loader's state and renders it - waiting, failed or ready -
// instead of an empty region that would read as "none recorded".
//
// Data in, string out - no DOM - so it loads in the Node vm with the
// other drawer builders. Every value rendered passes through App.escape.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var V = App.roadmapDetailValues;
  var cap = V.cap;
  var day = V.day;
  var esc = App.escape;

  // The pseudo-fields work_items.details is written in: a leading label,
  // then free text, repeated. Parsed into titled sections so the blob
  // reads as structure; anything before the first label (or the whole
  // string when no label matches) falls through as a plain block.
  var DETAIL_LABELS = ["What", "Relates to", "Business benefits",
    "User & merchant benefits", "User and merchant benefits", "Merchant benefits",
    "User benefits", "Why", "How", "Scope", "Acceptance", "Acceptance criteria",
    "Technical notes", "Dependencies", "Risks", "Notes"];
  function parseDetails(text) {
    var labels = DETAIL_LABELS.slice().sort(function (a, b) { return b.length - a.length; });
    var alt = labels.map(function (l) { return l.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&"); }).join("|");
    var re = new RegExp("(^|\\n)[ \\t]*(" + alt + ")[ \\t]*:", "gi");
    var matches = [], m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ label: m[2], labelStart: m.index + m[1].length, bodyStart: m.index + m[0].length });
    }
    if (!matches.length) return null;
    var sections = [];
    for (var i = 0; i < matches.length; i++) {
      var end = i + 1 < matches.length ? matches[i + 1].labelStart : text.length;
      sections.push({ label: matches[i].label, body: text.slice(matches[i].bodyStart, end).trim() });
    }
    return { lead: text.slice(0, matches[0].labelStart).trim(), sections: sections };
  }
  // Three states, like notesHtml and for the same reason: the prose
  // arrives when the drawer opens rather than on page load, so an empty
  // region has to be distinguishable from one that has not arrived. Here
  // it matters more than it does for notes - an item with no write-up is
  // common, so a blank gap reads as a fact about the item rather than as
  // a moment in the load.
  //
  // The skeleton is unlabelled because the region has no heading of its
  // own: the prose sits directly under the summary. A screen reader gets
  // the visually-hidden line instead.
  function detailsHtml(item, state) {
    if (state === "waiting") {
      return '<div class="skeleton" aria-hidden="true">' +
        "<span></span><span></span><span></span></div>" +
        '<p class="visually-hidden">Loading the detail</p>';
    }
    if (state === "failed") {
      return '<p class="notice tone-warn">Couldn\'t load the detail - ' +
        "try reopening.</p>";
    }
    if (!item.details) return "";
    var parsed = parseDetails(item.details);
    var out = parsed
      ? (parsed.lead ? '<p class="rmd-details">' + esc(parsed.lead) + "</p>" : "") +
        parsed.sections.map(function (s) {
          return '<section class="rmd-detail-sec"><h4>' + esc(cap(s.label)) +
            '</h4><p class="rmd-details">' + esc(s.body) + "</p></section>";
        }).join("")
      : '<p class="rmd-details">' + esc(item.details) + "</p>";
    // A mature workstream's detail runs to thousands of characters - the
    // chronology of every merge and decision behind it. That is worth
    // keeping and worth reading, and it is not worth scrolling past
    // every time the drawer opens, so past a screenful it folds. Short
    // detail stays open: a fold over two lines is a click for nothing.
    return item.details.length > DETAIL_FOLD
      ? '<details class="rmd-fold"><summary>Background and history</summary>' +
        out + "</details>"
      : out;
  }
  var DETAIL_FOLD = 700;

  // Decisions and notes recorded against the item (work_notes rows,
  // attached by roadmap.js; absent when the viewer lacks backlog access).
  // Each note carries a kind (decision, fact, question, action, risk, note)
  // so a risk never reads like a bare note, and a status where it is not
  // active (a resolved question, a superseded decision) so replaced or
  // closed context is shown as such rather than as current fact.
  var NOTE_KINDS = { decision: "Decision", fact: "Fact", question: "Question",
    action: "Action", risk: "Risk", note: "Note" };
  var NOTE_STATUS = { resolved: "Resolved", superseded: "Superseded" };
  function noteRow(n) {
    var kind = n.kind || "note";
    var st = NOTE_STATUS[n.status];
    var meta = '<span class="rmd-note-kind rmd-note-kind--' + esc(kind) + '">' +
      esc(NOTE_KINDS[kind] || cap(kind)) + "</span>" +
      (st ? '<span class="rmd-note-status">' + esc(st) + "</span>" : "") +
      (n.inherited ? '<span class="rmd-note-status">Area</span>' : "") +
      (n.created_at ? '<span class="rmd-note-date">' + esc(day(n.created_at)) + "</span>" : "");
    return '<div class="rmd-note-row' + (st ? " rmd-note-row--muted" : "") +
      '"><div class="rmd-note-meta">' + meta + "</div><p>" + esc(n.body) + "</p></div>";
  }
  // Three states, not two. Notes arrive when the drawer opens rather
  // than on page load, so "none recorded" and "not here yet" have to
  // look different - an empty section reads as the former and would be
  // a lie for the ~50ms it is wrong.
  function notesHtml(item, state) {
    if (state === "waiting") {
      return '<section class="rmd-section"><h3>Notes and decisions</h3>' +
        '<div class="skeleton" aria-hidden="true">' +
        '<span></span><span></span><span></span></div>' +
        '<p class="visually-hidden">Loading notes</p></section>';
    }
    if (state === "failed") {
      return '<section class="rmd-section"><h3>Notes and decisions</h3>' +
        '<p class="notice tone-warn">Couldn\'t load the notes - try reopening.</p>' +
        "</section>";
    }
    var notes = item.notes || [];
    if (!notes.length) return "";
    return '<section class="rmd-section"><h3>Notes and decisions</h3>' +
      notes.map(noteRow).join("") + "</section>";
  }

  // The user stories and acceptance criteria written for sprint work
  // (docs/SPRINT-DELIVERY.md Part A). A workstream holds its epic, an
  // item its own stories. They arrive with the prose when the drawer
  // opens, so they take the same three states - but only on a row that
  // is ON THE PLAN, because that is where stories are owed. Off the plan
  // a row without stories is the normal case and gets no section at all.
  //
  // Until the column has arrived nothing is drawn: "not written yet" in
  // the moment before the stories land would be a claim, not a wait.
  var STORIES_HEAD = { item: "User stories and acceptance criteria",
    workstream: "Epic and acceptance criteria" };
  var STORIES_NONE = "Not written yet. Stories are written for sprint work " +
    "before its sprint starts.";
  function storyHtml(s) {
    var criteria = (s.criteria || []).map(function (c) {
      return "<li>" + esc(c) + "</li>";
    }).join("");
    return '<div class="rmd-story"><h4>' + esc(s.title) + "</h4><p>" +
      esc(s.story) + "</p>" +
      (criteria ? '<ul class="rmd-points">' + criteria + "</ul>" : "") + "</div>";
  }
  // Copying runs through the database's own paste format
  // (sprint_story_pack), so drawer.js binds these by data attribute and
  // nothing here builds the text. The company roadmap is written per
  // workstream, so only a workstream offers it.
  function copyButtons(item, ws) {
    var btn = function (part, label) {
      return '<button class="button secondary" type="button" data-story-pack="' +
        part + '" data-story-id="' + esc(item.id) + '">' + label + "</button>";
    };
    return '<div class="rmd-story-copy">' + btn("devops", "Copy for DevOps") +
      (ws ? btn("roadmap", "Copy for company roadmap") : "") + "</div>";
  }
  function storiesHtml(item, onPlan, state) {
    var ws = item.level === "workstream";
    var loaded = Object.prototype.hasOwnProperty.call(item, "user_stories");
    var stories = Array.isArray(item.user_stories) ? item.user_stories : [];
    if (!onPlan && !stories.length) return "";
    var body;
    if (state === "waiting") {
      body = '<div class="skeleton" aria-hidden="true"><span></span><span></span></div>' +
        '<p class="visually-hidden">Loading the stories</p>';
    } else if (state === "failed") {
      body = '<p class="notice tone-warn">Couldn\'t load the stories - try reopening.</p>';
    } else if (!loaded) {
      return "";
    } else {
      body = stories.length ? stories.map(storyHtml).join("")
        : '<p class="rmd-story-none">' + esc(STORIES_NONE) + "</p>";
    }
    var draft = V.STORIES_STATUS[item.stories_status] || "";
    return '<section class="rmd-section rmd-stories"><h3>' +
      esc(ws ? STORIES_HEAD.workstream : STORIES_HEAD.item) +
      (draft ? ' <span class="rmd-benefit-draft">' + esc(draft) + "</span>" : "") +
      "</h3>" + body + (onPlan ? copyButtons(item, ws) : "") + "</section>";
  }

  App.roadmapDetailProse = {
    detailsHtml: detailsHtml,
    storiesHtml: storiesHtml,
    notesHtml: notesHtml,
    parseDetails: parseDetails,
    DETAIL_LABELS: DETAIL_LABELS,
    DETAIL_FOLD: DETAIL_FOLD,
    NOTE_KINDS: NOTE_KINDS,
    NOTE_STATUS: NOTE_STATUS,
    STORIES_NONE: STORIES_NONE,
  };
})();
