// ------------------------------------------------------------------
// roadmap-detail.js - Pure builders for the roadmap item drawer and the
// AI-optimised JSON export (App.roadmapDetail). Data-in / string-or-
// object-out, no DOM, so they load in a Node vm for unit testing
// (tests/unit/roadmap-detail.test.js). The drawer wiring, open/close and
// download live in roadmap.js.
//
// Depends on App.roadmapView (progressOf, themeLabel, bandLabel,
// endBandLabel, productItems) and App.sprints (sprint ranges). Every
// value rendered into HTML passes through App.escape.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var STATUS = {
    idea: "Idea", planned: "Planned", in_progress: "In progress",
    blocked: "Blocked", done: "Delivered", dropped: "Dropped",
  };
  var PRD_STATUS = {
    n_a: "N/A", in_progress: "In progress", pre_approved: "Pre-approved",
    approved: "Approved", rejected: "Rejected",
  };
  var PROJECT_STATUS = {
    planned: "Planned", in_progress: "In progress", pending: "Pending",
    on_hold: "On hold", completed: "Completed",
  };
  var PHASE = { discovery: "Discovery", build: "Build", certification: "Certification", launch: "Launch" };
  var PHASE_ORDER = ["discovery", "build", "certification", "launch"];

  function esc(v) { return App.escape(v); }
  function day(x) { return x ? String(x).slice(0, 10) : ""; }
  function dateRange(a, b) {
    a = day(a); b = day(b);
    if (a && b) return a + " to " + b;
    return a || b || "";
  }
  function byPhase(a, b) {
    return (PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)) ||
      ((a.sort_order || 0) - (b.sort_order || 0));
  }
  function sprintRange(code) {
    var r = App.sprints && App.sprints.sprintToRange(code);
    return r ? code + " (" + r.start + " to " + r.end + ")" : code;
  }
  // Single-word enum values (type, effort, impact, note kinds) read as
  // sentence case; underscores in attribute keys become spaces.
  function cap(v) { return v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : ""; }
  function keyLabel(k) { return cap(String(k).replace(/_/g, " ")); }
  function titleOf(id, ctx) {
    var it = id && ctx.itemById ? ctx.itemById[id] : null;
    return it ? it.title : "";
  }
  function listText(v) { return Array.isArray(v) ? v.join(", ") : (v == null ? "" : String(v)); }
  // 1 -> "1st", 4 -> "4th"; blank for a missing or non-positive rank.
  function ordinal(n) {
    n = parseInt(n, 10);
    if (!n || n < 1) return "";
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // Drop null/undefined/blank/empty so the export stays lean for an AI
  // reader: only fields that carry information survive.
  function clean(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === null || v === undefined || v === "") return;
      if (Array.isArray(v) && v.length === 0) return;
      if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) return;
      out[k] = v;
    });
    return out;
  }

  function attrs(item) { return item.attributes || {}; }
  function bandText(item) {
    var b = App.roadmapView.bandLabel(item);
    return item.end_horizon && item.end_horizon !== item.horizon
      ? b + " to " + App.roadmapView.endBandLabel(item) : b;
  }

  // --- Drawer HTML -------------------------------------------------

  function row(label, value) {
    return value ? '<div class="rmd-row"><dt>' + esc(label) + "</dt><dd>" + value + "</dd></div>" : "";
  }
  // Business area associations resolved to their display labels (owner
  // department excluded; that is the separate Department field).
  function businessAreaLabels(item) {
    return (item.associated_departments || []).map(function (d) {
      return App.departmentLabel(d) || d;
    });
  }
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
  var KNOWN_ATTRS = ["pnl_vertical", "team", "region", "customer", "resources",
    "cost", "merchant_value", "pxp_value", "blockers", "prd_link",
    "assignee_rank", "priority_band"];

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
  function priorityBand(item) {
    var pb = attrs(item).priority_band;
    if (pb != null) return parseInt(pb, 10);
    if (item.priority == null) return null;
    return Math.max(1, Math.floor(item.priority / 10));
  }
  function priorityLabel(item) {
    var b = priorityBand(item);
    return (b == null || isNaN(b)) ? "" : "P" + b;
  }

  // Progress as a thin bar plus a percentage, so a value of 1 reads as
  // "1% complete" rather than snapping to the "Not started" bucket. The
  // fill width is a runtime value, so it is spliced in (never a static
  // inline style). Delivered work reads complete regardless of the stored
  // number.
  function progressRow(item) {
    var prog = App.roadmapView.progressOf(item);
    var pct = item.status === "done" ? 100 : prog.pct;
    var label = item.status === "done" ? "Complete"
      : (pct > 0 ? pct + "% complete" : "Not started");
    return '<div class="rmd-row"><dt>Progress</dt><dd class="rmd-progress-cell">' +
      '<span class="rmd-progress"><span class="rmd-progress-fill" style="width:' +
      pct + '%"></span></span>' +
      '<span class="rmd-progress-num">' + esc(label) + "</span></dd></div>";
  }

  // The related work item as a clickable link into its own drawer (the
  // drawer body delegates data-item-id clicks). Blank when unset or the
  // target is not in view.
  function relatedLink(item, ctx) {
    var id = item.relates_to_id, t = titleOf(id, ctx);
    if (!t) return "";
    return '<a class="rmd-link" href="?item=' + esc(id) + '" data-item-id="' +
      esc(id) + '">' + esc(t) + "</a>";
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
  function detailsHtml(item) {
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
  function notesHtml(item) {
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

  function drawerHtml(item, ctx) {
    var V = App.roadmapView;
    var prog = V.progressOf(item);
    var a = attrs(item);
    var region = Array.isArray(a.region) ? a.region.map(esc).join(", ") : esc(a.region || "");
    var facts =
      row("Theme", esc(V.themeLabel(item, ctx))) +
      row("Area", esc(V.areaTitleOf(item, ctx))) +
      row("Workstream", esc(titleOf(item.parent_id, ctx))) +
      row("Related to", relatedLink(item, ctx)) +
      row("Department", esc(App.departmentLabel(item.department))) +
      row("Business areas", businessAreaLabels(item).map(esc).join(", ")) +
      row("Assignee", assigneeText(item, ctx)) +
      row("Band", esc(bandText(item))) +
      row("Status", esc(STATUS[item.status] || item.status)) +
      row("Level", item.level && item.level !== "workstream" ? esc(cap(item.level)) : "") +
      row("Presentation", esc(V.presentationLabel(item.presentation))) +
      row("Type", esc(cap(item.type))) +
      row("Effort", esc(cap(item.effort))) +
      row("Impact", esc(cap(item.impact))) +
      row("Priority", esc(priorityLabel(item))) +
      row("PRD status", esc(PRD_STATUS[item.prd_status] || "")) +
      row("Project status", esc(PROJECT_STATUS[item.project_status] || "")) +
      progressRow(item) +
      row("Dates", esc(dateRange(item.starts_on, item.ends_on))) +
      row("Sprints", item.end_sprint && item.end_sprint !== item.start_sprint
        ? esc((item.start_sprint || "?") + " to " + item.end_sprint)
        : esc(item.start_sprint ? sprintRange(item.start_sprint) : "")) +
      row("Vertical", esc(a.pnl_vertical || "")) +
      row("Team", esc(a.team || "")) +
      row("Region", region) +
      row("Customer", esc(a.customer || "")) +
      row("Resources", a.resources != null ? esc(String(a.resources)) : "") +
      row("Cost", a.cost != null ? esc(String(a.cost)) : "") +
      extraAttrRows(a) +
      row("Requested by", esc(item.requested_by || "")) +
      row("Source", sourceText(item, ctx)) +
      row("External ref", esc(item.external_ref || "")) +
      row("Tags", (item.tags || []).map(esc).join(", ")) +
      row("Created", esc(day(item.created_at))) +
      row("Updated", esc(day(item.updated_at)));
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
      detailsHtml(item) +
      '<dl class="rmd-facts">' + facts + "</dl>" +
      itemsSection +
      deliverablesSection +
      phasesHtml(item) +
      note("Merchant value", a.merchant_value) +
      note("PXP value", a.pxp_value) +
      note("Blockers and dependencies", a.blockers) +
      note("Resolution" + (resolvedOn ? " (" + resolvedOn + ")" : ""), item.resolution) +
      notesHtml(item) +
      '<div class="rmd-actions">' + prd +
      '<button class="button" type="button" id="rmd-export">Export JSON</button></div>';
  }

  // The JSON/CSV export builders share these value helpers with the
  // drawer; they live in roadmap-detail-export.js (App.roadmapDetail gets
  // toKpiItem/toKpiRoadmap/toCsvRoadmap there) to keep this file inside its
  // size budget. Data maps and formatters, no DOM.
  App._rmd = {
    attrs: attrs, byPhase: byPhase, PHASE: PHASE, clean: clean,
    KNOWN_ATTRS: KNOWN_ATTRS, titleOf: titleOf, businessAreaLabels: businessAreaLabels,
    bandText: bandText, STATUS: STATUS, priorityBand: priorityBand,
    PRD_STATUS: PRD_STATUS, PROJECT_STATUS: PROJECT_STATUS, day: day,
  };

  App.roadmapDetail = { drawerHtml: drawerHtml };
})();
