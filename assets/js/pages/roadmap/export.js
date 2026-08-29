// ------------------------------------------------------------------
// roadmap/export.js - The roadmap home's export dropdown wiring and the
// small download helpers it shares with the detail drawer
// (App.roadmapExport). Split out of roadmap.js per the size budget's exit
// plan ("the export dropdown wiring is the next extract seam"). The DOM
// wiring lives here; the KPI JSON/CSV builders stay in
// roadmap-detail-export.js (App.roadmapDetail). No state of its own: wire()
// pulls the current rows and ctx from a getter at click time, so the export
// always reflects the live department/custom selection - and fetches the
// heavy fields the board does not carry before it builds.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Download a JSON object as a file (the KPI-ready export), via the
  // shared App.download helper.
  function downloadJson(name, obj) {
    App.download(name, JSON.stringify(obj, null, 2), "application/json");
  }
  // A filesystem-safe slug for an item title, used to name a per-item
  // export file.
  function safeName(s) {
    return String(s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  }

  // Wire the export dropdown: a single trigger opens a menu of the three
  // formats, mirroring the account menu's dropdown pattern (toggle on the
  // trigger, dismiss on an outside click or Escape). Picking a format lets
  // the click bubble to the document listener, which closes the menu.
  // `source` is a getter returning { rows, ctx } evaluated at click time.
  function wire(source) {
    var trigger = document.getElementById("roadmap-export-trigger");
    var menu = document.getElementById("roadmap-export-menu");
    function setOpen(open) {
      if (!menu) return;
      menu.hidden = !open;
      if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (trigger && menu) {
      trigger.addEventListener("click", function (event) {
        event.stopPropagation();
        setOpen(menu.hidden);
      });
      document.addEventListener("click", function () {
        if (!menu.hidden) setOpen(false);
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !menu.hidden) {
          setOpen(false);
          trigger.focus();
        }
      });
    }

    // The board no longer carries notes, and after the board view lands
    // it will not carry details either (docs/plan/80-LOAD-SPEED.md) - but
    // both board-wide exports write them for EVERY row: toCsvRoadmap
    // through flattenItem, toKpiRoadmap through toKpiItem. So an export
    // fetches what it is about to write, at the moment it is pressed.
    //
    // The whole row set is hydrated rather than the exported subset. The
    // builders do their own scope filtering, and over-fetching is the
    // safe direction: under-fetching writes a blank column.
    //
    // A failed read cancels the download and says so. A file quietly
    // missing a column it used to carry is data loss nobody notices
    // until they open it, which is worse than no file at all.
    function withHeavy(rows, keys, write) {
      App.workItemsData.loadForExport(rows, keys).then(write, function () {
        App.flashLabel(trigger, "Export failed");
      });
    }

    var jsonBtn = document.getElementById("roadmap-export-json");
    if (jsonBtn) jsonBtn.addEventListener("click", function () {
      var s = source();
      withHeavy(s.rows, ["details", "notes"], function () {
        downloadJson("roadmap-kpi-export.json", App.roadmapDetail.toKpiRoadmap(s.rows, s.ctx));
      });
    });

    var csvBtn = document.getElementById("roadmap-export-csv");
    if (csvBtn) csvBtn.addEventListener("click", function () {
      var s = source();
      // No notes column in the CSV, so it does not pay for one.
      withHeavy(s.rows, ["details"], function () {
        App.download("roadmap-export.csv", App.roadmapDetail.toCsvRoadmap(s.rows, s.ctx), "text/csv");
      });
    });

    var printBtn = document.getElementById("roadmap-download");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  App.roadmapExport = { wire: wire, downloadJson: downloadJson, safeName: safeName };
})();
