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

  // Built through App.detail.facts, so the named fields lead and
  // ANYTHING else on the row still appears. The old version listed five
  // columns by hand: a column added to the integrations table was
  // fetched and then silently dropped here, which is the exact failure
  // docs/plan/40-SURFACING.md exists to remove.
  function modalHtml(row) {
    return App.detail.facts(row, {
      fields: [
        { key: "category", label: "Category" },
        { key: "purpose", label: "Purpose" },
        { key: "direction", label: "Direction" },
        { key: "status", label: "Status",
          html: function (value) { return App.statusBadge(value); } },
        { key: "owner", label: "Owner" },
        { key: "created_at", label: "Recorded", html: function (value) {
          return value ? App.escape(String(value).slice(0, 10)) : "";
        } },
        { key: "updated_at", label: "Updated", html: function (value) {
          return value ? App.escape(String(value).slice(0, 10)) : "";
        } },
        { key: "docs_url", label: "Documentation", html: function (value) {
          var url = safeUrl(value);
          return url
            ? '<a href="' + App.escape(url) + '" target="_blank" rel="noopener">' +
              App.escape(url) + "</a>"
            : "";
        } },
      ],
      // The detail bag is flat label/value pairs by design, so its keys
      // read as rows of their own.
      flatten: ["detail"],
      // id is the row's handle and name is the modal's title; neither is
      // a fact about the integration.
      hidden: ["id", "name", "sort_order"],
    });
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
      // The modal renders everything on the row (App.detail.facts), so
      // this fetches everything: the usual "select only what you render"
      // rule and this one agree here. Fourteen rows, no heavy column.
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (result.error) {
      App.notice(host, "error", "Could not load integrations: " + result.error.message);
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
