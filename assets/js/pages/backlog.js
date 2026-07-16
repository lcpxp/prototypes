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

  function kvHtml(pairs) {
    var html = '<dl class="kv">';
    pairs.forEach(function (pair) {
      if (!pair[1]) return;
      html += "<dt>" + App.escape(pair[0]) + "</dt><dd>" + pair[1] + "</dd>";
    });
    return html + "</dl>";
  }

  function badges(list) {
    return (list || []).map(function (tag) {
      return '<span class="badge">' + App.escape(tag) + "</span>";
    }).join(" ");
  }

  function openItemModal(item) {
    var band = bandOf(item);
    modalTitle.textContent = item.title;
    modalBody.innerHTML = kvHtml([
      ["Band", App.escape(BAND_LABEL[band])],
      ["Horizon", App.escape(item.horizon || "")],
      ["Type", App.escape(item.type || "")],
      ["Area", App.escape(areaTitle[item.area_id] || "")],
      ["Status", App.statusBadge(item.status)],
      ["Priority", App.escape(String(item.priority))],
      ["Summary", App.escape(item.summary || "")],
      ["Details", App.escape(item.details || "")],
      ["External ref", App.escape(item.external_ref || "")],
      ["Requested by", App.escape(item.requested_by || "")],
      ["Source", App.escape(docTitle[item.source_document_id] || "")],
      ["Tags", badges(item.tags)],
      ["Raised", App.escape(fmtDate(item.created_at))],
      ["Resolved", App.escape(fmtDate(item.resolved_at))],
      ["Resolution", App.escape(item.resolution || "")],
    ]);
    modal.showModal();
  }

  function openDocumentModal(doc) {
    modalTitle.textContent = doc.title;
    modalBody.innerHTML = kvHtml([
      ["Kind", App.escape(doc.kind)],
      ["Area", App.escape(areaTitle[doc.area_id] || "")],
      ["Status", App.statusBadge(doc.status)],
      ["Captured", App.escape(fmtDate(doc.captured_on))],
      ["Summary", App.escape(doc.summary || "")],
      ["Tags", badges(doc.tags)],
    ]) +
    '<p class="card-meta">The full raw content is kept in the ' +
    "work_documents table.</p>";
    modal.showModal();
  }

  function filteredItems() {
    var area = document.getElementById("filter-area").value;
    var type = document.getElementById("filter-type").value;
    var band = document.getElementById("filter-band").value;
    return items.filter(function (item) {
      if (area && item.area_id !== area) return false;
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
      "<th>Item</th><th>Band</th><th>Type</th><th>Area</th><th>Status</th><th>Priority</th>" +
      "</tr></thead><tbody>";
    data.forEach(function (item) {
      html +=
        "<tr>" +
        '<td><button class="button quiet" type="button" data-item="' +
        App.escape(item.id) + '">' + App.escape(item.title) + "</button></td>" +
        "<td>" + App.escape(BAND_LABEL[bandOf(item)]) + "</td>" +
        "<td>" + App.escape(item.type || "") + "</td>" +
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
      html +=
        "<tr>" +
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
    var typeSelect = document.getElementById("filter-type");
    TYPES.forEach(function (type) {
      var option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
    ["filter-area", "filter-type", "filter-band"].forEach(function (id) {
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
        .select("id, title, kind, area_id, summary, status, captured_on, tags")
        .order("captured_on", { ascending: false }),
      App.db
        .from(App.registry.tables.workItems)
        .select("id, area_id, source_document_id, type, title, summary, details, " +
          "status, horizon, end_horizon, priority, external_ref, requested_by, " +
          "tags, resolution, resolved_at, created_at, sort_order")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);
    var areasResult = results[0];
    var docsResult = results[1];
    var itemsResult = results[2];

    if (areasResult.error) {
      document.getElementById("backlog-list").innerHTML =
        '<p class="notice error">Could not load work areas: ' +
        App.escape(areasResult.error.message) + "</p>";
      return;
    }
    (areasResult.data || []).forEach(function (area) {
      areaTitle[area.id] = area.title;
    });

    documents = docsResult.error ? [] : docsResult.data || [];
    documents.forEach(function (doc) { docTitle[doc.id] = doc.title; });

    if (itemsResult.error) {
      document.getElementById("backlog-list").innerHTML =
        '<p class="notice error">Could not load work items: ' +
        App.escape(itemsResult.error.message) + "</p>";
      return;
    }
    items = itemsResult.data || [];

    fillFilters(areasResult.data || []);
    renderItems();
    renderDocuments();
  });
})();
