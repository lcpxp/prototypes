// ------------------------------------------------------------------
// roadmap-detail.js - Pure builders for the roadmap item drawer and the
// AI-optimised JSON export (App.roadmapDetail). Data-in / string-or-
// object-out, no DOM, so they load in a Node vm for unit testing
// (tests/unit/roadmap/detail.test.js). The drawer wiring, open/close and
// download live in roadmap.js.
//
// Depends on App.roadmapView (progressOf, themeLabel, bandLabel,
// endBandLabel, productItems) and App.sprints (sprint ranges). Every
// value rendered into HTML passes through App.escape.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Formatting and derivation live in roadmap-detail-values.js, shared
  // with the export builders. Bound here as locals so every builder
  // below reads exactly as it did before the split.
  var V = App.roadmapDetailValues;
  var STATUS = V.STATUS;
  var PRD_STATUS = V.PRD_STATUS;
  var PROJECT_STATUS = V.PROJECT_STATUS;
  var PHASE = V.PHASE;
  var PHASE_ORDER = V.PHASE_ORDER;
  var KNOWN_ATTRS = V.KNOWN_ATTRS;
  var day = V.day;
  var dateRange = V.dateRange;
  var byPhase = V.byPhase;
  var sprintRange = V.sprintRange;
  var cap = V.cap;
  var keyLabel = V.keyLabel;
  var titleOf = V.titleOf;
  var listText = V.listText;
  var ordinal = V.ordinal;
  var clean = V.clean;
  var attrs = V.attrs;
  var bandText = V.bandText;
  var businessAreaLabels = V.businessAreaLabels;
  var priorityBand = V.priorityBand;
  var priorityLabel = V.priorityLabel;


  var esc = App.escape;
  // Single-word enum values (type, effort, impact, note kinds) read as
  // sentence case; underscores in attribute keys become spaces.
  // 1 -> "1st", 4 -> "4th"; blank for a missing or non-positive rank.

  // Drop null/undefined/blank/empty so the export stays lean for an AI
  // reader: only fields that carry information survive.


  // --- Drawer HTML -------------------------------------------------

  function row(label, value) {
    return value ? '<div class="rmd-row"><dt>' + esc(label) + "</dt><dd>" + value + "</dd></div>" : "";
  }
  // Business area associations resolved to their display labels (owner
  // department excluded; that is the separate Department field).
  function note(label, text) {
    return text ? '<section class="rmd-note"><h3>' + esc(label) + "</h3><p>" +
      esc(text) + "</p></section>" : "";
  }

  // Attribute keys the drawer renders by hand; anything else in the
  // attributes bag still surfaces as a generic fact row, so a new (or
  // legacy) key is never stored-but-invisible. assignee_rank and
  // priority_band are internal ordering scaffolding: assignee_rank folds
  // into the assignee line, priority_band into the priority band, so both
  // are handled and neither auto-dumps as a raw "Assignee rank: 1" row.

  // Ownership line: the assignee, an optional supporter, and the item's
  // rank within that owner's queue stated in words ("Xavier - 1st of 5")
  // rather than the bare "Assignee rank: 1" the raw key used to print.
  function assigneeText(item, ctx) {
    if (!item.assignee) return "";
    var out = esc(item.assignee);
    if (item.support_assignee) out += " (" + esc(item.support_assignee) + " supporting)";
    var ord = ordinal(attrs(item).assignee_rank);
    if (ord) {
      var total = ctx && ctx.assigneeCounts ? ctx.assigneeCounts[item.assignee] : null;
      out += ' <span class="rmd-rank">&middot; ' + esc(ord) +
        (total ? " of " + esc(String(total)) : "") + "</span>";
    }
    return out;
  }

  // The reader-facing priority band (P1, P2 ...). priority_band carries it
  // directly where set; otherwise it derives from the priority sort integer
  // (band x 10), so the raw number never reaches the panel.

  // Progress as a thin bar plus a percentage, so a value of 1 reads as
  // "1% complete" rather than snapping to the "Not started" bucket. The
  // fill width is a runtime value, so it is spliced in (never a static
  // inline style). Delivered work reads complete regardless of the stored
  // number.
  function progressCell(item) {
    var prog = App.roadmapView.progressOf(item);
    var pct = item.status === "done" ? 100 : prog.pct;
    var label = item.status === "done" ? "Complete"
      : (pct > 0 ? pct + "% complete" : "Not started");
    return '<span class="rmd-progress-cell">' +
      '<span class="rmd-progress"><span class="rmd-progress-fill" style="width:' +
      pct + '%"></span></span>' +
      '<span class="rmd-progress-num">' + esc(label) + "</span></span>";
  }

  // Typed relationships, one drawer row per reading ("Part of", then
  // "Related to", then "Distinct from"). ctx.linkIndex is built in
  // roadmap.js by App.links.index and already carries the reading that
  // applies from THIS end, so nothing here has to know which way the
  // row was stored. A `note` becomes the title attribute: on
  // distinct_from that note is the reason the pair was judged apart,
  // which is the thing worth not losing.
  //
  // Every entity type renders, not just work items. Another work item
  // opens in this drawer; a capability or anything else with a page
  // gets a normal link; a type with no destination yet still shows its
  // name and its type, because a relationship is a fact even when its
  // far end has nowhere to go. Silence was the old behaviour and it hid
  // every cross-type link in the graph.
  function relatedRows(item, ctx) {
    var index = (ctx && ctx.linkIndex) || {};
    var links = index["work_item:" + item.id] || [];
    var titles = (ctx && ctx.linkTitles) || {};
    var byReading = {};
    links.forEach(function (l) {
      var t = App.links.resolve(l, titles, ctx && ctx.root);
      if (!t.title) return;
      var title = l.note ? ' title="' + esc(l.note) + '"' : "";
      // A link an assistant wrote stays `proposed` until the owner
      // confirms it (supabase/schema/33_links.sql). Showing nothing was
      // the old behaviour, which left a reader unable to tell a
      // suggestion from a decision - the same badge the platform page
      // already uses for an unverified row.
      var pending = l.confidence === "proposed"
        ? ' <span class="badge tone-warn">proposed</span>' : "";
      var label = esc(t.title) + (l.otherType === "work_item" ? ""
        : ' <span class="rmd-link-type">' + esc(t.typeLabel) + "</span>");
      var html;
      if (l.otherType === "work_item") {
        html = '<a class="rmd-link" href="?item=' + esc(l.otherId) +
          '" data-item-id="' + esc(l.otherId) + '"' + title + ">" + label + "</a>";
      } else if (t.href) {
        html = '<a class="rmd-link" href="' + esc(t.href) + '"' + title + ">" +
          label + "</a>";
      } else {
        html = '<span class="rmd-link rmd-link--flat"' + title + ">" + label + "</span>";
      }
      html += pending;
      (byReading[t.reads] = byReading[t.reads] || []).push(html);
    });
    return Object.keys(byReading).map(function (reads) {
      return row(reads, byReading[reads].join(", "));
    }).join("");
  }

  // The milestone an item is targeted at, with its date where it has
  // one. roadmap_milestones is empty today and kept deliberately; this
  // is what stops a milestone being stored and shown nowhere the day
  // somebody first sets one.
  function milestoneText(item, ctx) {
    var found = item.milestone_id && ctx && ctx.milestoneById
      ? ctx.milestoneById[item.milestone_id] : null;
    if (!found) return "";
    var due = day(found.due_on);
    return esc(found.title) + (due ? " (" + esc(due) + ")" : "");
  }

  // The originating work_document title (provenance), resolved through the
  // ctx map roadmap.js builds. Blank when unset or unreadable.
  function sourceText(item, ctx) {
    var id = item.source_document_id;
    if (!id) return "";
    var doc = ctx && ctx.docById ? ctx.docById[id] : null;
    return doc ? esc(doc.title) : "";
  }

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
    if (!parsed) return '<p class="rmd-details">' + esc(item.details) + "</p>";
    var out = parsed.lead ? '<p class="rmd-details">' + esc(parsed.lead) + "</p>" : "";
    out += parsed.sections.map(function (s) {
      return '<section class="rmd-detail-sec"><h4>' + esc(cap(s.label)) +
        '</h4><p class="rmd-details">' + esc(s.body) + "</p></section>";
    }).join("");
    return out;
  }
  function extraAttrRows(a) {
    return Object.keys(a).filter(function (k) { return KNOWN_ATTRS.indexOf(k) === -1; })
      .sort().map(function (k) { return row(keyLabel(k), esc(listText(a[k]))); }).join("");
  }

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

  function phasesHtml(item) {
    var phases = (item.phases || []).slice().sort(byPhase);
    if (!phases.length) return "";
    var rows = phases.map(function (p) {
      var when = dateRange(p.starts_on, p.ends_on);
      var tbc = (p.start_tbc || p.end_tbc) ? ' <span class="rmd-tbc">TBC</span>' : "";
      var meta = (p.quarter ? esc(p.quarter) + (when ? " &middot; " : "") : "") + esc(when) + tbc;
      return '<div class="rmd-phase"><span class="rmd-phase-name">' +
        esc(PHASE[p.phase] || p.phase) + "</span><span class=\"rmd-phase-when\">" +
        (meta || "&mdash;") + "</span></div>";
    }).join("");
    return '<section class="rmd-section"><h3>Phases</h3>' + rows + "</section>";
  }

  // Columns the drawer accounts for somewhere OTHER than a fact row, so
  // the overflow does not repeat them: identity and ordering scaffolding,
  // the title and summary in the head, details and resolution as prose
  // sections, notes and phases as their own sections, and the two
  // attribute-bag keys extraAttrRows already walks.
  // resolved_at is here because it renders as the date beside the
  // Resolution heading, not as a row.
  var FACTS_HIDDEN = ["id", "sort_order", "title", "summary", "details",
    "resolution", "resolved_at", "notes", "phases", "attributes",
    "children", "deliverables"];

  // The drawer keeps its own row layout (a bordered two-column grid per
  // row), so it passes that skin to the shared builder rather than
  // adopting .detail-facts. What it gets in return is the guarantee: a
  // column added to work_items tomorrow renders here with no edit to
  // this file.
  var FACTS_MARKUP = {
    row: row,
    head: function (label) {
      return '<div class="rmd-row rmd-row--overflow"><dt aria-hidden="true"></dt>' +
        "<dd>" + esc(label) + "</dd></div>";
    },
    wrap: function (inner) { return '<dl class="rmd-facts">' + inner + "</dl>"; },
  };

  // Every fact row, in reading order. A field with an `html` builder
  // decides its own content and may return "" to omit itself; `also`
  // names the further columns that row already speaks for, so an end
  // date folded into "Dates" is accounted for rather than repeated.
  function factFields(item, ctx) {
    var V = App.roadmapView;
    var a = attrs(item);
    var region = Array.isArray(a.region) ? a.region.map(esc).join(", ") : esc(a.region || "");
    return [
      { key: "category_id", label: "Theme", html: function () { return esc(V.themeLabel(item, ctx)); } },
      { key: "area_id", label: "Area", html: function () { return esc(V.areaTitleOf(item, ctx)); } },
      { key: "parent_id", label: "Workstream", html: function () { return esc(titleOf(item.parent_id, ctx)); } },
      { key: "_links", multi: true, html: function () { return relatedRows(item, ctx); } },
      { key: "department", label: "Department", html: function () { return esc(App.departmentLabel(item.department)); } },
      { key: "associated_departments", label: "Business areas",
        html: function () { return businessAreaLabels(item).map(esc).join(", "); } },
      { key: "assignee", label: "Assignee", also: ["support_assignee"],
        html: function () { return assigneeText(item, ctx); } },
      { key: "horizon", label: "Band", also: ["end_horizon"],
        html: function () { return esc(bandText(item)); } },
      { key: "status", label: "Status", html: function () { return esc(STATUS[item.status] || item.status); } },
      { key: "level", label: "Level",
        html: function () { return item.level && item.level !== "workstream" ? esc(cap(item.level)) : ""; } },
      { key: "presentation", label: "Presentation", html: function () { return esc(V.presentationLabel(item.presentation)); } },
      { key: "type", label: "Type", html: function () { return esc(cap(item.type)); } },
      { key: "effort", label: "Effort", html: function () { return esc(cap(item.effort)); } },
      { key: "impact", label: "Impact", html: function () { return esc(cap(item.impact)); } },
      { key: "priority", label: "Priority", html: function () { return esc(priorityLabel(item)); } },
      { key: "prd_status", label: "PRD status", html: function () { return esc(PRD_STATUS[item.prd_status] || ""); } },
      { key: "project_status", label: "Project status", html: function () { return esc(PROJECT_STATUS[item.project_status] || ""); } },
      { key: "progress", label: "Progress", html: function () { return progressCell(item); } },
      { key: "milestone_id", label: "Milestone", html: function () { return milestoneText(item, ctx); } },
      { key: "starts_on", label: "Dates", also: ["ends_on"],
        html: function () { return esc(dateRange(item.starts_on, item.ends_on)); } },
      { key: "start_sprint", label: "Sprints", also: ["end_sprint"], html: function () {
        return item.end_sprint && item.end_sprint !== item.start_sprint
          ? esc((item.start_sprint || "?") + " to " + item.end_sprint)
          : esc(item.start_sprint ? sprintRange(item.start_sprint) : "");
      } },
      { key: "_vertical", label: "Vertical", html: function () { return esc(a.pnl_vertical || ""); } },
      { key: "_team", label: "Team", html: function () { return esc(a.team || ""); } },
      { key: "_region", label: "Region", html: function () { return region; } },
      { key: "_customer", label: "Customer", html: function () { return esc(a.customer || ""); } },
      { key: "_resources", label: "Resources", html: function () { return a.resources != null ? esc(String(a.resources)) : ""; } },
      { key: "_cost", label: "Cost", html: function () { return a.cost != null ? esc(String(a.cost)) : ""; } },
      { key: "_attrs", multi: true, html: function () { return extraAttrRows(a); } },
      { key: "requested_by", label: "Requested by", html: function () { return esc(item.requested_by || ""); } },
      { key: "source_document_id", label: "Source", html: function () { return sourceText(item, ctx); } },
      { key: "external_ref", label: "External ref", html: function () { return esc(item.external_ref || ""); } },
      { key: "tags", label: "Tags", html: function () { return (item.tags || []).map(esc).join(", "); } },
      { key: "created_at", label: "Created", html: function () { return esc(day(item.created_at)); } },
      { key: "updated_at", label: "Updated", html: function () { return esc(day(item.updated_at)); } },
      // The latch that pins a delivery to Previously completed (work_items.
      // previously_completed_at). Shown only when set, so nothing is
      // stored-but-invisible; clearing the column removes the row.
      { key: "previously_completed_at", label: "Moved to Previously completed",
        html: function () { return esc(day(item.previously_completed_at)); } },
    ];
  }

  // The whole fact list through the shared builder: the declared rows in
  // the declared order, then every column nothing above spoke for. That
  // last part is the guarantee - a column added to work_items tomorrow
  // renders here with no edit to this file.
  function factsHtml(item, ctx) {
    return App.detail.facts(item, {
      fields: factFields(item, ctx),
      hidden: FACTS_HIDDEN,
      markup: FACTS_MARKUP,
      overflowLabel: "Also recorded against this item",
    });
  }

  // `state` is the lazy loader's: "ready", "waiting" or "failed".
  // Absent means ready, so every existing caller and benchmark keeps
  // working and only the drawer has to know the field arrives late.
  function drawerHtml(item, ctx, state) {
    var V = App.roadmapView;
    var prog = V.progressOf(item);
    var a = attrs(item);
    var facts = factsHtml(item, ctx);
    var prd = a.prd_link
      ? '<a class="button secondary" href="' + esc(a.prd_link) +
        '" target="_blank" rel="noopener">Open PRD</a>' : "";
    // A workstream lists its nested work items (each a board bar, clickable
    // through to its own drawer); every level lists its deliverables (the
    // drawer-only detail beneath it).
    var itemsList = V.itemListHtml ? V.itemListHtml(item, ctx) : "";
    var itemsSection = itemsList
      ? '<section class="rmd-section"><h3>Work items</h3>' + itemsList + "</section>" : "";
    var deliverables = V.checklistHtml(item, ctx);
    var deliverablesSection = deliverables
      ? '<section class="rmd-section"><h3>Deliverables</h3>' + deliverables + "</section>" : "";
    var resolvedOn = day(item.resolved_at);
    return '<div class="rmd-head"><span class="eyebrow">' + esc(V.themeLabel(item, ctx)) +
        "</span>" +
        (item.level === "workstream" ? '<p class="rmv-ws-tag">Workstream</p>' : "") +
        "<h2>" + esc(item.title) + "</h2>" +
        '<div class="rm-card-progress rmv-prog-' + prog.bucket +
        '" role="img" aria-label="Progress: ' + esc(prog.label) + '"><span></span></div></div>' +
      (item.summary ? '<p class="rmd-summary">' + esc(item.summary) + "</p>" : "") +
      detailsHtml(item, state) +
      facts +
      itemsSection +
      deliverablesSection +
      phasesHtml(item) +
      note("Merchant value", a.merchant_value) +
      note("PXP value", a.pxp_value) +
      note("Blockers and dependencies", a.blockers) +
      note("Resolution" + (resolvedOn ? " (" + resolvedOn + ")" : ""), item.resolution) +
      notesHtml(item, state) +
      '<div class="rmd-actions">' + prd +
      '<button class="button" type="button" id="rmd-export">Export JSON</button></div>';
  }


  App.roadmapDetail = { drawerHtml: drawerHtml };
})();
