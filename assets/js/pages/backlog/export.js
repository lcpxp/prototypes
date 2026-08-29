// ------------------------------------------------------------------
// backlog/export.js - The backlog's CSV export: the column order, the
// flat record builder and the wiring. Split out of backlog.js on the
// exit plan its size-budget note has carried since the export landed.
//
// The builder is pure - rows plus a name lookup in, CSV text out - so
// tests/unit/backlog/export.test.js holds it with no DOM. The wiring
// fetches details for the rows it is about to write, because the list
// does not carry that column (docs/plan/80-LOAD-SPEED.md).
//
// names = { titleById, areaTitle, docTitle, bandLabel(item) }. The band
// derivation stays in backlog.js, where the table reads it too; passing
// it in keeps one home for the rule rather than a second copy here.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // The leading column order; App.csvFromRows adds any further keys, so
  // the export stays future-proof against new fields.
  var CSV_COLUMNS = [
    "id", "parent_id", "parent_title", "title", "band", "type", "department",
    "area", "status", "horizon", "end_horizon", "priority", "summary", "details",
    "external_ref", "requested_by", "source", "tags", "resolution", "raised", "resolved",
  ];

  // One flat record per item, resolved to the same labels the table
  // shows (band, department, area, source, parent title).
  function toCsvRecord(item, names) {
    return {
      id: item.id,
      parent_id: item.parent_id || "",
      parent_title: item.parent_id ? (names.titleById[item.parent_id] || "") : "",
      title: item.title,
      band: names.bandLabel(item),
      type: item.type || "",
      department: App.departmentLabel(item.department) || "",
      area: names.areaTitle[item.area_id] || "",
      status: item.status,
      horizon: item.horizon || "",
      end_horizon: item.end_horizon || "",
      priority: item.priority,
      summary: item.summary || "",
      details: item.details || "",
      external_ref: item.external_ref || "",
      requested_by: item.requested_by || "",
      source: names.docTitle[item.source_document_id] || "",
      tags: item.tags || [],
      resolution: item.resolution || "",
      raised: item.created_at || "",
      resolved: item.resolved_at || "",
    };
  }

  function toCsv(items, names) {
    return App.csvFromRows((items || []).map(function (item) {
      return toCsvRecord(item, names);
    }), CSV_COLUMNS);
  }

  // `source` is a getter returning { rows, names }, evaluated at click
  // time so the export reflects the live filter selection. details is
  // fetched for those rows first; a failed read cancels the download and
  // says so, because a CSV with an empty Details column for every row is
  // data loss nobody notices until they open the file.
  function wire(button, source) {
    if (!button) return;
    button.addEventListener("click", function () {
      var s = source();
      App.workItemsData.loadForExport(s.rows, ["details"]).then(function () {
        App.download("backlog-export.csv", toCsv(s.rows, s.names), "text/csv");
      }, function () {
        App.flashLabel(button, "Export failed");
      });
    });
  }

  App.backlogExport = {
    COLUMNS: CSV_COLUMNS,
    toCsvRecord: toCsvRecord,
    toCsv: toCsv,
    wire: wire,
  };
})();
