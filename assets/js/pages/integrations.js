// ------------------------------------------------------------------
// integrations.js - Integration overview for modules/integrations/.
// Renders the integrations table as a single overview grid; each row
// opens a modal with the full detail. The detail JSONB column is a
// flat object of label/value pairs rendered verbatim, so new facts
// are database edits, never code changes.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var rows = [];
  var modal, modalTitle, modalBody;

  function safeUrl(url) {
    return /^https?:\/\//i.test(String(url || "")) ? url : null;
  }

  function modalHtml(row) {
    var pairs = [
      ["Category", App.escape(row.category)],
      ["Purpose", App.escape(row.purpose || "")],
      ["Direction", App.escape(row.direction)],
      ["Status", App.statusBadge(row.status)],
      ["Owner", App.escape(row.owner || "")],
    ];
    var detail = row.detail || {};
    Object.keys(detail).forEach(function (key) {
      pairs.push([key, App.escape(String(detail[key]))]);
    });
    var url = safeUrl(row.docs_url);
    if (url) {
      pairs.push([
        "Documentation",
        '<a href="' + App.escape(url) + '" target="_blank" rel="noopener">' +
          App.escape(url) + "</a>",
      ]);
    }
    var html = '<dl class="kv">';
    pairs.forEach(function (pair) {
      if (!pair[1]) return;
      html += "<dt>" + App.escape(pair[0]) + "</dt><dd>" + pair[1] + "</dd>";
    });
    return html + "</dl>";
  }

  function openModal(row) {
    modalTitle.textContent = row.name;
    modalBody.innerHTML = modalHtml(row);
    modal.showModal();
  }

  function tableHtml(data) {
    var html =
      '<div class="table-wrap"><table><thead><tr>' +
      "<th>Integration</th><th>Category</th><th>Purpose</th>" +
      "<th>Direction</th><th>Status</th>" +
      "</tr></thead><tbody>";
    data.forEach(function (row, index) {
      html +=
        '<tr id="integration-' + App.escape(row.id) + '">' +
        '<td><button class="button quiet" type="button" data-index="' +
        index + '">' + App.escape(row.name) + "</button></td>" +
        "<td>" + App.escape(row.category) + "</td>" +
        "<td>" + App.escape(row.purpose || "") + "</td>" +
        "<td>" + App.escape(row.direction) + "</td>" +
        "<td>" + App.statusBadge(row.status) + "</td>" +
        "</tr>";
    });
    return html + "</tbody></table></div>";
  }

  App.onAuthed(async function () {
    var host = document.getElementById("integration-list");
    modal = document.getElementById("integration-modal");
    modalTitle = document.getElementById("integration-modal-title");
    modalBody = document.getElementById("integration-modal-body");

    document
      .getElementById("integration-modal-close")
      .addEventListener("click", function () { modal.close(); });
    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.close();
    });

    var result = await App.db
      .from(App.registry.tables.integrations)
      .select("id, name, category, purpose, direction, status, docs_url, owner, detail")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (result.error) {
      host.innerHTML =
        '<p class="notice error">Could not load integrations: ' +
        App.escape(result.error.message) + "</p>";
      return;
    }

    rows = result.data || [];
    if (rows.length === 0) {
      host.innerHTML =
        '<p class="notice">No integrations recorded. Insert rows into ' +
        "the integrations table in Supabase and they will appear here.</p>";
      return;
    }

    host.innerHTML = tableHtml(rows);
    host.querySelectorAll("button[data-index]").forEach(function (button) {
      button.addEventListener("click", function () {
        openModal(rows[Number(button.getAttribute("data-index"))]);
      });
    });
    App.deepLinkScroll();
  });
})();
