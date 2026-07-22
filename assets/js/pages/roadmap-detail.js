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
  // legacy) key is never stored-but-invisible.
  var KNOWN_ATTRS = ["pnl_vertical", "team", "region", "customer", "resources",
    "cost", "merchant_value", "pxp_value", "blockers", "prd_link"];
  function extraAttrRows(a) {
    return Object.keys(a).filter(function (k) { return KNOWN_ATTRS.indexOf(k) === -1; })
      .sort().map(function (k) { return row(keyLabel(k), esc(listText(a[k]))); }).join("");
  }

  // Decisions and notes recorded against the item (work_notes rows,
  // attached by roadmap.js; absent when the viewer lacks backlog access).
  function notesHtml(item) {
    var notes = item.notes || [];
    if (!notes.length) return "";
    var rows = notes.map(function (n) {
      return '<div class="rmd-note-row"><span class="rmd-note-meta">' + esc(cap(n.kind || "note")) +
        (n.created_at ? " &middot; " + esc(day(n.created_at)) : "") + "</span><p>" +
        esc(n.body) + "</p></div>";
    }).join("");
    return '<section class="rmd-section"><h3>Notes and decisions</h3>' + rows + "</section>";
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
      row("Related to", esc(titleOf(item.relates_to_id, ctx))) +
      row("Department", esc(App.departmentLabel(item.department))) +
      row("Business areas", businessAreaLabels(item).map(esc).join(", ")) +
      row("Band", esc(bandText(item))) +
      row("Status", esc(STATUS[item.status] || item.status)) +
      row("Type", esc(cap(item.type))) +
      row("Effort", esc(cap(item.effort))) +
      row("Impact", esc(cap(item.impact))) +
      row("Priority", item.priority != null ? esc(String(item.priority)) : "") +
      row("PRD status", esc(PRD_STATUS[item.prd_status] || "")) +
      row("Project status", esc(PROJECT_STATUS[item.project_status] || "")) +
      row("Progress", esc(prog.label)) +
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
      row("External ref", esc(item.external_ref || "")) +
      row("Tags", (item.tags || []).map(esc).join(", ")) +
      row("Updated", esc(day(item.updated_at)));
    var prd = a.prd_link
      ? '<a class="button secondary" href="' + esc(a.prd_link) +
        '" target="_blank" rel="noopener">Open PRD</a>' : "";
    var steps = V.checklistHtml(item, ctx);
    var stepsSection = steps ? '<section class="rmd-section"><h3>Sub-steps</h3>' + steps + "</section>" : "";
    var resolvedOn = day(item.resolved_at);
    return '<div class="rmd-head"><span class="eyebrow">' + esc(V.themeLabel(item, ctx)) +
        "</span>" +
        (item.level === "workstream" ? '<p class="rmv-ws-tag">Workstream</p>' : "") +
        "<h2>" + esc(item.title) + "</h2>" +
        '<div class="rm-card-progress rmv-prog-' + prog.bucket +
        '" role="img" aria-label="Progress: ' + esc(prog.label) + '"><span></span></div></div>' +
      (item.summary ? '<p class="rmd-summary">' + esc(item.summary) + "</p>" : "") +
      (item.details ? '<p class="rmd-details">' + esc(item.details) + "</p>" : "") +
      '<dl class="rmd-facts">' + facts + "</dl>" +
      stepsSection +
      phasesHtml(item) +
      note("Merchant value", a.merchant_value) +
      note("PXP value", a.pxp_value) +
      note("Blockers and dependencies", a.blockers) +
      note("Resolution" + (resolvedOn ? " (" + resolvedOn + ")" : ""), item.resolution) +
      notesHtml(item) +
      '<div class="rmd-actions">' + prd +
      '<button class="button" type="button" id="rmd-export">Export JSON</button></div>';
  }

  // --- AI-optimised JSON -------------------------------------------

  function toKpiItem(item, ctx) {
    var V = App.roadmapView;
    var a = attrs(item);
    var prog = V.progressOf(item);
    var phases = (item.phases || []).slice().sort(byPhase).map(function (p) {
      return clean({
        phase: PHASE[p.phase] || p.phase, quarter: p.quarter || null,
        start: p.starts_on || null, end: p.ends_on || null,
        start_tbc: p.start_tbc || undefined, end_tbc: p.end_tbc || undefined,
      });
    });
    var extra = {};
    Object.keys(a).forEach(function (k) {
      if (KNOWN_ATTRS.indexOf(k) === -1) extra[k] = a[k];
    });
    return clean({
      id: item.id,
      title: item.title,
      level: item.level === "workstream" ? "workstream" : null,
      workstream: titleOf(item.parent_id, ctx) || null,
      related_to: titleOf(item.relates_to_id, ctx) || null,
      theme: V.themeLabel(item, ctx),
      area: V.areaTitleOf(item, ctx) || null,
      department: App.departmentLabel(item.department) || null,
      business_areas: businessAreaLabels(item).length ? businessAreaLabels(item) : null,
      band: bandText(item),
      status: STATUS[item.status] || item.status,
      type: item.type || null,
      effort: item.effort || null,
      impact: item.impact || null,
      priority: item.priority != null ? item.priority : null,
      prd_status: PRD_STATUS[item.prd_status] || null,
      project_status: PROJECT_STATUS[item.project_status] || null,
      progress: prog.pct,
      progress_label: prog.label,
      summary: item.summary || null,
      details: item.details || null,
      start_date: item.starts_on || null,
      end_date: item.ends_on || null,
      start_sprint: item.start_sprint || null,
      end_sprint: item.end_sprint || null,
      phases: phases,
      pnl_vertical: a.pnl_vertical || null,
      team: a.team || null,
      region: a.region || null,
      customer: a.customer || null,
      resources: a.resources != null ? a.resources : null,
      cost: a.cost != null ? a.cost : null,
      merchant_value: a.merchant_value || null,
      pxp_value: a.pxp_value || null,
      blockers: a.blockers || null,
      prd_link: a.prd_link || null,
      attributes: extra,
      tags: item.tags && item.tags.length ? item.tags : null,
      requested_by: item.requested_by || null,
      external_ref: item.external_ref || null,
      resolution: item.resolution || null,
      resolved_at: item.resolved_at || null,
      notes: (item.notes || []).map(function (n) {
        return clean({ kind: n.kind || "note", date: day(n.created_at) || null, body: n.body });
      }),
      updated_at: item.updated_at || null,
    });
  }

  function toKpiRoadmap(items, ctx, today) {
    var V = App.roadmapView;
    var list = V.productItems(items || [], ctx.scopeByArea).slice().sort(V.byOrder);
    return {
      generated_at: new Date(today || Date.now()).toISOString(),
      sprint_context: {
        anchor: App.sprints ? App.sprints.ANCHOR : null,
        current_sprint: App.sprints ? App.sprints.currentSprint(today) : null,
      },
      count: list.length,
      items: list.map(function (i) { return toKpiItem(i, ctx); }),
    };
  }

  // --- CSV export --------------------------------------------------
  // The leading, stable column order; every attributes key follows as an
  // attr_<key> column, derived dynamically by App.csvFromRows so a new
  // KPI field flows into the CSV with no code change (future-proof).
  var CSV_COLUMNS = [
    "id", "parent_id", "parent_title", "title", "theme", "area", "department",
    "business_areas",
    "band", "status", "horizon", "end_horizon", "prd_status", "project_status",
    "progress", "progress_label", "sub_steps_total", "sub_steps_done", "priority",
    "level", "type", "effort", "impact",
    "start_date", "end_date", "start_sprint", "end_sprint",
    "related_to", "requested_by", "external_ref", "resolution", "details",
    "tags", "updated_at",
  ];

  // One flat record per work item: the resolved, board-accurate values
  // (theme/area/band/department labels), the sub-step roll-up, and every
  // attributes key spread as attr_<key>. parent_id/parent_title keep the
  // hierarchy reconstructable so children read as their own rows.
  function flattenItem(item, ctx, titleById) {
    var V = App.roadmapView;
    var a = attrs(item);
    var prog = V.progressOf(item);
    var st = V.childStats(item, ctx);
    var rec = {
      id: item.id,
      parent_id: item.parent_id || "",
      parent_title: item.parent_id ? (titleById[item.parent_id] || "") : "",
      title: item.title,
      theme: V.themeLabel(item, ctx),
      area: V.areaTitleOf(item, ctx),
      department: App.departmentLabel(item.department) || "",
      business_areas: businessAreaLabels(item).join("; "),
      band: bandText(item),
      status: STATUS[item.status] || item.status,
      horizon: item.horizon || "",
      end_horizon: item.end_horizon || "",
      prd_status: PRD_STATUS[item.prd_status] || "",
      project_status: PROJECT_STATUS[item.project_status] || "",
      progress: prog.pct,
      progress_label: prog.label,
      sub_steps_total: st.total,
      sub_steps_done: st.done,
      priority: item.priority,
      level: item.level || "item",
      type: item.type || "",
      effort: item.effort || "",
      impact: item.impact || "",
      start_date: item.starts_on || "",
      end_date: item.ends_on || "",
      start_sprint: item.start_sprint || "",
      end_sprint: item.end_sprint || "",
      related_to: titleOf(item.relates_to_id, ctx),
      requested_by: item.requested_by || "",
      external_ref: item.external_ref || "",
      resolution: item.resolution || "",
      details: item.details || "",
      tags: item.tags || [],
      updated_at: item.updated_at || "",
    };
    Object.keys(a).forEach(function (k) { rec["attr_" + k] = a[k]; });
    return rec;
  }

  // The whole roadmap as CSV: every product item (top-level and
  // sub-item) as a row, in board order.
  function toCsvRoadmap(items, ctx) {
    var V = App.roadmapView;
    var list = V.productItems(items || [], ctx.scopeByArea).slice().sort(V.byOrder);
    var titleById = {};
    list.forEach(function (i) { titleById[i.id] = i.title; });
    var records = list.map(function (i) { return flattenItem(i, ctx, titleById); });
    return App.csvFromRows(records, CSV_COLUMNS);
  }

  App.roadmapDetail = {
    drawerHtml: drawerHtml,
    toKpiItem: toKpiItem,
    toKpiRoadmap: toKpiRoadmap,
    toCsvRoadmap: toCsvRoadmap,
  };
})();
