// ------------------------------------------------------------------
// roadmap-detail-export.js - The AI-optimised JSON and the flat CSV
// exports for the roadmap (App.roadmapDetail.toKpiItem / toKpiRoadmap /
// toCsvRoadmap). Split out of roadmap-detail.js per the size budget; the
// drawer's value helpers are shared through App._rmd. Data-in /
// object-or-string-out, no DOM, so it loads in a Node vm for unit testing
// (tests/unit/roadmap-detail.test.js).
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var H = App._rmd;

  // --- AI-optimised JSON -------------------------------------------

  function toKpiItem(item, ctx) {
    var V = App.roadmapView;
    var a = H.attrs(item);
    var prog = V.progressOf(item);
    var phases = (item.phases || []).slice().sort(H.byPhase).map(function (p) {
      return H.clean({
        phase: H.PHASE[p.phase] || p.phase, quarter: p.quarter || null,
        start: p.starts_on || null, end: p.ends_on || null,
        start_tbc: p.start_tbc || undefined, end_tbc: p.end_tbc || undefined,
      });
    });
    var extra = {};
    Object.keys(a).forEach(function (k) {
      if (H.KNOWN_ATTRS.indexOf(k) === -1) extra[k] = a[k];
    });
    // Nested work items (bars) and deliverables (drawer-only detail), each
    // resolved to a title + done flag so the export carries the structure.
    var workItems = (V.barKids ? V.barKids(item, ctx) : []).map(function (k) {
      return H.clean({ title: k.title, done: k.status === "done" || undefined });
    });
    var deliverables = (V.deliverablesOf ? V.deliverablesOf(item, ctx) : []).map(function (k) {
      return H.clean({ title: k.title, done: k.status === "done" || undefined });
    });
    return H.clean({
      id: item.id,
      title: item.title,
      level: item.level === "workstream" ? "workstream"
        : (item.level === "deliverable" ? "deliverable" : null),
      assignee: item.assignee || null,
      support_assignee: item.support_assignee || null,
      assignee_rank: a.assignee_rank != null ? a.assignee_rank : null,
      workstream: H.titleOf(item.parent_id, ctx) || null,
      // Typed relationships, as read from THIS item's end. An AI reader
      // needs the kind, not just the neighbour: "distinct from" and
      // "duplicate of" mean opposite things about the same pair.
      links: (function () {
        var ls = (ctx && ctx.linksByItem && ctx.linksByItem[item.id]) || [];
        return ls.map(function (l) {
          return H.clean({
            kind: l.kind, reads: l.reads,
            title: H.titleOf(l.otherId, ctx) || null,
            id: l.otherId, note: l.note || null,
            confidence: l.confidence,
          });
        });
      })(),
      theme: V.themeLabel(item, ctx),
      area: V.areaTitleOf(item, ctx) || null,
      department: App.departmentLabel(item.department) || null,
      business_areas: H.businessAreaLabels(item).length ? H.businessAreaLabels(item) : null,
      band: H.bandText(item),
      status: H.STATUS[item.status] || item.status,
      presentation: item.presentation || null,
      type: item.type || null,
      effort: item.effort || null,
      impact: item.impact || null,
      priority: item.priority != null ? item.priority : null,
      priority_band: H.priorityBand(item),
      prd_status: H.PRD_STATUS[item.prd_status] || null,
      project_status: H.PROJECT_STATUS[item.project_status] || null,
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
      source_document_id: item.source_document_id || null,
      external_ref: item.external_ref || null,
      resolution: item.resolution || null,
      resolved_at: item.resolved_at || null,
      created_at: item.created_at || null,
      work_items: workItems.length ? workItems : null,
      deliverables: deliverables.length ? deliverables : null,
      notes: (item.notes || []).map(function (n) {
        return H.clean({ kind: n.kind || "note", status: n.status || null,
          date: H.day(n.created_at) || null, body: n.body });
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
    "business_areas", "assignee", "support_assignee",
    "band", "status", "horizon", "end_horizon", "presentation", "prd_status", "project_status",
    "progress", "progress_label", "sub_steps_total", "sub_steps_done", "priority", "priority_band",
    "level", "type", "effort", "impact",
    "start_date", "end_date", "start_sprint", "end_sprint",
    "related_to", "requested_by", "source_document_id", "external_ref", "resolution", "details",
    "tags", "created_at", "updated_at",
  ];

  // One flat record per work item: the resolved, board-accurate values
  // (theme/area/band/department labels), the sub-step roll-up, and every
  // attributes key spread as attr_<key>. parent_id/parent_title keep the
  // hierarchy reconstructable so children read as their own rows.
  function flattenItem(item, ctx, titleById) {
    var V = App.roadmapView;
    var a = H.attrs(item);
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
      business_areas: H.businessAreaLabels(item).join("; "),
      assignee: item.assignee || "",
      support_assignee: item.support_assignee || "",
      band: H.bandText(item),
      status: H.STATUS[item.status] || item.status,
      horizon: item.horizon || "",
      end_horizon: item.end_horizon || "",
      presentation: item.presentation || "",
      prd_status: H.PRD_STATUS[item.prd_status] || "",
      project_status: H.PROJECT_STATUS[item.project_status] || "",
      progress: prog.pct,
      progress_label: prog.label,
      sub_steps_total: st.total,
      sub_steps_done: st.done,
      priority: item.priority,
      priority_band: H.priorityBand(item),
      level: item.level || "item",
      type: item.type || "",
      effort: item.effort || "",
      impact: item.impact || "",
      start_date: item.starts_on || "",
      end_date: item.ends_on || "",
      start_sprint: item.start_sprint || "",
      end_sprint: item.end_sprint || "",
      // One column still, so the leading column set stays stable:
      // "kind: title" pairs, semicolon-separated.
      related_to: ((ctx && ctx.linksByItem && ctx.linksByItem[item.id]) || [])
        .map(function (l) {
          var t2 = H.titleOf(l.otherId, ctx);
          return t2 ? l.reads + ": " + t2 : "";
        }).filter(Boolean).join("; "),
      requested_by: item.requested_by || "",
      source_document_id: item.source_document_id || "",
      external_ref: item.external_ref || "",
      resolution: item.resolution || "",
      details: item.details || "",
      tags: item.tags || [],
      created_at: item.created_at || "",
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

  App.roadmapDetail = App.roadmapDetail || {};
  App.roadmapDetail.toKpiItem = toKpiItem;
  App.roadmapDetail.toKpiRoadmap = toKpiRoadmap;
  App.roadmapDetail.toCsvRoadmap = toCsvRoadmap;
})();
