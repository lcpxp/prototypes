// ------------------------------------------------------------------
// backlog.js - The master work list for modules/backlog/.
// Renders every work_items row as one prioritised table - active,
// parked and delivered, across every area and scope - filtered by
// area, type and band, each row opening a modal with full detail, plus
// the work_documents intake list. The roadmap home draws the same rows
// as a gantt; this is the flat list. Closed items keep their
// resolution, so the table doubles as the historic record. Intake
// conventions live in docs/WORKFLOW.md.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var TYPES = ["consideration", "feature", "functionality", "bug", "improvement", "task"];

  // A row's band derives from its own fields, exactly as the roadmap
  // views do: done is Delivered; someday or dropped is Parked; the rest
  // is Active, keyed by horizon. Active bands sort first, history last.
  var BAND_RANK = { now: 1, next: 2, later: 3, parked: 4, delivered: 5 };
  var BAND_LABEL = { now: "Now", next: "Next", later: "Later", parked: "Parked", delivered: "Delivered" };
  var BAND_GROUPS = {
    active: ["now", "next", "later"],
    parked: ["parked"],
    delivered: ["delivered"],
  };

  var items = [];
  var documents = [];
  var areaTitle = {};
  var docTitle = {};
  var modal, modalTitle, modalBody;

  function bandOf(item) {
    if (item.status === "done") return "delivered";
    if (item.status === "dropped" || item.horizon === "someday") return "parked";
    return item.horizon;
  }

  function fmtDate(value) {
    return value ? new Date(value).toLocaleDateString() : "";
  }

  function badges(list) {
    return (list || []).map(function (tag) {
      return '<span class="badge">' + App.escape(tag) + "</span>";
    }).join(" ");
  }

  // Both modals go through App.detail.facts (docs/plan/40-SURFACING.md):
  // the named fields lead, and any column neither named nor hidden still
  // appears under its own heading. A hand-written pair list renders the
  // columns that existed the day it was written and drops the rest with
  // no error to notice.
  //
  // Only two columns are hidden for a reason other than "shown
  // elsewhere on this modal": work_items.attributes, which the roadmap
  // drawer lays out properly and this compact modal would flatten, and
  // work_documents.content, the raw pasted material - deliberately not
  // fetched, because it is unbounded and this list loads every row.
  var ITEM_HIDDEN = ["id", "title", "area_id", "source_document_id",
    "parent_id", "sort_order", "attributes"];
  var DOC_HIDDEN = ["id", "title", "area_id", "supersedes_id", "content"];

  function dateCell(value) { return App.escape(fmtDate(value)); }

  // Pure builders: row plus a lookup context, HTML out, no DOM. That is
  // what lets tests/unit/backlog-detail.test.js hold them.
  // names = { areaTitle, docTitle }
  function itemFactsHtml(item, names) {
    names = names || {};
    var areas = names.areaTitle || {};
    var docs = names.docTitle || {};
    return App.detail.facts(item, {
      fields: [
        { key: "horizon", label: "Band", also: ["end_horizon"],
          html: function () { return App.escape(BAND_LABEL[bandOf(item)]); } },
        { key: "_horizon", label: "Horizon", html: function () { return App.escape(item.horizon || ""); } },
        { key: "type", label: "Type" },
        { key: "department", label: "Department",
          html: function (v) { return App.escape(App.departmentLabel(v)); } },
        { key: "_area", label: "Area", html: function () { return App.escape(areas[item.area_id] || ""); } },
        { key: "status", label: "Status", html: function (v) { return App.statusBadge(v); } },
        { key: "priority", label: "Priority" },
        { key: "summary", label: "Summary" },
        { key: "details", label: "Details" },
        { key: "external_ref", label: "External ref" },
        { key: "requested_by", label: "Requested by" },
        { key: "_source", label: "Source",
          html: function () { return App.escape(docs[item.source_document_id] || ""); } },
        { key: "tags", label: "Tags", html: function (v) { return badges(v); } },
        { key: "created_at", label: "Raised", html: dateCell },
        { key: "resolved_at", label: "Resolved", html: dateCell },
        { key: "resolution", label: "Resolution" },
      ],
      hidden: ITEM_HIDDEN,
      overflowLabel: "Also recorded against this item",
    });
  }

  function documentFactsHtml(doc, names) {
    names = names || {};
    var areas = names.areaTitle || {};
    var docs = names.docTitle || {};
    return App.detail.facts(doc, {
      fields: [
        { key: "kind", label: "Kind" },
        { key: "_area", label: "Area", html: function () { return App.escape(areas[doc.area_id] || ""); } },
        { key: "status", label: "Status", html: function (v) { return App.statusBadge(v); } },
        { key: "captured_on", label: "Captured", html: dateCell },
        { key: "summary", label: "Summary" },
        { key: "tags", label: "Tags", html: function (v) { return badges(v); } },
        // A superseded document keeps its row and its back-link, so the
        // replaced version is never lost. It was stored and shown
        // nowhere until now.
        { key: "_supersedes", label: "Supersedes",
          html: function () { return App.escape(docs[doc.supersedes_id] || ""); } },
      ],
      hidden: DOC_HIDDEN,
      overflowLabel: "Also recorded against this document",
    }) +
    '<p class="card-meta">The full raw content is kept in the ' +
    "work_documents table.</p>";
  }

  function names() { return { areaTitle: areaTitle, docTitle: docTitle }; }

  function openItemModal(item) {
    modalTitle.textContent = item.title;
    modalBody.innerHTML = itemFactsHtml(item, names());
    modal.showModal();
  }

  function openDocumentModal(doc) {
    modalTitle.textContent = doc.title;
    modalBody.innerHTML = documentFactsHtml(doc, names());
    modal.showModal();
  }

  function filteredItems() {
    var area = document.getElementById("filter-area").value;
    var department = document.getElementById("filter-department").value;
    var type = document.getElementById("filter-type").value;
    var band = document.getElementById("filter-band").value;
    return items.filter(function (item) {
      if (area && item.area_id !== area) return false;
      if (department && item.department !== department) return false;
      if (type && item.type !== type) return false;
      if (band && BAND_GROUPS[band].indexOf(bandOf(item)) === -1) return false;
      return true;
    });
  }

  // Active first (Now -> Next -> Later), then Parked, then Delivered;
  // within a band, by priority then sort_order.
  function ordered(list) {
    return list.slice().sort(function (a, b) {
      return (BAND_RANK[bandOf(a)] - BAND_RANK[bandOf(b)]) ||
        (a.priority - b.priority) || (a.sort_order - b.sort_order);
    });
  }

  // CSV export: one flat record per item, resolved to the same labels
  // the table shows (band, department, area, source, parent title). The
  // leading column order; App.csvFromRows adds any further keys, so the
  // export stays future-proof against new fields.
  var CSV_COLUMNS = [
    "id", "parent_id", "parent_title", "title", "band", "type", "department",
    "area", "status", "horizon", "end_horizon", "priority", "summary", "details",
    "external_ref", "requested_by", "source", "tags", "resolution", "raised", "resolved",
  ];
  function toCsvRecord(item, titleById) {
    return {
      id: item.id,
      parent_id: item.parent_id || "",
      parent_title: item.parent_id ? (titleById[item.parent_id] || "") : "",
      title: item.title,
      band: BAND_LABEL[bandOf(item)],
      type: item.type || "",
      department: App.departmentLabel(item.department) || "",
      area: areaTitle[item.area_id] || "",
      status: item.status,
      horizon: item.horizon || "",
      end_horizon: item.end_horizon || "",
      priority: item.priority,
      summary: item.summary || "",
      details: item.details || "",
      external_ref: item.external_ref || "",
      requested_by: item.requested_by || "",
      source: docTitle[item.source_document_id] || "",
      tags: item.tags || [],
      resolution: item.resolution || "",
      raised: item.created_at || "",
      resolved: item.resolved_at || "",
    };
  }
  function exportCsv() {
    var titleById = {};
    items.forEach(function (i) { titleById[i.id] = i.title; });
    var records = ordered(filteredItems()).map(function (i) { return toCsvRecord(i, titleById); });
    App.download("backlog-export.csv", App.csvFromRows(records, CSV_COLUMNS), "text/csv");
  }

  function renderItems() {
    var host = document.getElementById("backlog-list");
    var data = ordered(filteredItems());
    if (data.length === 0) {
      host.innerHTML =
        '<p class="notice">No work items match the current filters. ' +
        "Items are rows in the work_items table.</p>";
      return;
    }
    var html =
      '<div class="table-wrap"><table><thead><tr>' +
      "<th>Item</th><th>Band</th><th>Type</th><th>Department</th><th>Area</th><th>Status</th><th>Priority</th>" +
      "</tr></thead><tbody>";
    data.forEach(function (item) {
      html +=
        "<tr>" +
        '<td><button class="button quiet" type="button" data-item="' +
        App.escape(item.id) + '">' + App.escape(item.title) + "</button></td>" +
        "<td>" + App.escape(BAND_LABEL[bandOf(item)]) + "</td>" +
        "<td>" + App.escape(item.type || "") + "</td>" +
        "<td>" + App.escape(App.departmentLabel(item.department)) + "</td>" +
        "<td>" + App.escape(areaTitle[item.area_id] || "") + "</td>" +
        "<td>" + App.statusBadge(item.status) + "</td>" +
        '<td class="mono">' + App.escape(String(item.priority)) + "</td>" +
        "</tr>";
    });
    host.innerHTML = html + "</tbody></table></div>";
    host.querySelectorAll("button[data-item]").forEach(function (button) {
      button.addEventListener("click", function () {
        var item = items.find(function (i) {
          return i.id === button.getAttribute("data-item");
        });
        if (item) openItemModal(item);
      });
    });
  }

  function renderDocuments() {
    var host = document.getElementById("document-list");
    if (documents.length === 0) {
      host.innerHTML =
        '<p class="notice">No source material yet. Supplied documents are ' +
        "recorded as rows in the work_documents table.</p>";
      return;
    }
    var html =
      '<div class="table-wrap"><table><thead><tr>' +
      "<th>Document</th><th>Kind</th><th>Area</th><th>Status</th><th>Captured</th>" +
      "</tr></thead><tbody>";
    documents.forEach(function (doc) {
      // Anchored by id so a knowledge_links row pointing at a document
      // has somewhere to land (assets/js/core/links.js).
      html +=
        '<tr id="document-' + App.escape(doc.id) + '">' +
        '<td><button class="button quiet" type="button" data-doc="' +
        App.escape(doc.id) + '">' + App.escape(doc.title) + "</button></td>" +
        "<td>" + App.escape(doc.kind) + "</td>" +
        "<td>" + App.escape(areaTitle[doc.area_id] || "") + "</td>" +
        "<td>" + App.statusBadge(doc.status) + "</td>" +
        "<td>" + App.escape(fmtDate(doc.captured_on)) + "</td>" +
        "</tr>";
    });
    host.innerHTML = html + "</tbody></table></div>";
    host.querySelectorAll("button[data-doc]").forEach(function (button) {
      button.addEventListener("click", function () {
        var doc = documents.find(function (d) {
          return d.id === button.getAttribute("data-doc");
        });
        if (doc) openDocumentModal(doc);
      });
    });
  }

  function fillFilters(areas) {
    var areaSelect = document.getElementById("filter-area");
    areas.forEach(function (area) {
      var option = document.createElement("option");
      option.value = area.id;
      option.textContent = area.title;
      areaSelect.appendChild(option);
    });
    var departmentSelect = document.getElementById("filter-department");
    (App.registry.departments || []).forEach(function (department) {
      var option = document.createElement("option");
      option.value = department.key;
      option.textContent = department.label;
      departmentSelect.appendChild(option);
    });
    var typeSelect = document.getElementById("filter-type");
    TYPES.forEach(function (type) {
      var option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
    ["filter-area", "filter-department", "filter-type", "filter-band"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", renderItems);
    });
  }

  App.onAuthed(async function () {
    modal = document.getElementById("backlog-modal");
    modalTitle = document.getElementById("backlog-modal-title");
    modalBody = document.getElementById("backlog-modal-body");
    document
      .getElementById("backlog-modal-close")
      .addEventListener("click", function () { modal.close(); });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.close();
    });

    // The three lists are independent, so fetch them in parallel.
    var results = await Promise.all([
      App.db
        .from(App.registry.tables.workAreas)
        .select("id, title, scope, sort_order")
        .order("sort_order", { ascending: true }),
      App.db
        .from(App.registry.tables.workDocuments)
        // Every column except `content`, which is the raw pasted
        // material: unbounded, and this loads every document. It is the
        // one column named in DOC_HIDDEN for a reason other than being
        // shown elsewhere on the modal.
        .select("id, title, kind, area_id, summary, status, captured_on, " +
          "tags, supersedes_id, created_at, updated_at")
        .order("captured_on", { ascending: false }),
      App.db
        .from(App.registry.tables.workItems)
        // The modal renders everything on the row (App.detail.facts).
        .select("*")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);
    var areasResult = results[0];
    var docsResult = results[1];
    var itemsResult = results[2];

    if (areasResult.error) {
      App.notice("backlog-list", "error", "Could not load work areas: " + areasResult.error.message);
      return;
    }
    (areasResult.data || []).forEach(function (area) {
      areaTitle[area.id] = area.title;
    });

    documents = docsResult.error ? [] : docsResult.data || [];
    documents.forEach(function (doc) { docTitle[doc.id] = doc.title; });

    if (itemsResult.error) {
      App.notice("backlog-list", "error", "Could not load work items: " + itemsResult.error.message);
      return;
    }
    items = itemsResult.data || [];

    fillFilters(areasResult.data || []);
    var csvBtn = document.getElementById("backlog-export-csv");
    if (csvBtn) csvBtn.addEventListener("click", exportCsv);
    renderItems();
    renderDocuments();

    // Deep link: ?item=<id> opens that work item's detail on load.
    var requestedItem = new URLSearchParams(window.location.search).get("item");
    if (requestedItem) {
      var deep = items.find(function (i) { return i.id === requestedItem; });
      if (deep) openItemModal(deep);
    }

    // A knowledge_links row pointing at a document resolves to
    // #document-<id> here (assets/js/core/links.js). Without this the
    // link landed on the page and never reached the row, which is a
    // destination in name only.
    App.deepLinkScroll();
  });

  App.backlogView = {
    itemFactsHtml: itemFactsHtml,
    documentFactsHtml: documentFactsHtml,
  };
})();
