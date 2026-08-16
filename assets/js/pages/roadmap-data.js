// ------------------------------------------------------------------
// roadmap-data.js - The roadmap's per-item reads: the fields fetched
// when a drawer opens rather than for all 268 items on page load.
//
// The first step of the extract seam roadmap.js's size-budget note has
// named for a while. It starts here rather than with the page-load
// fetch because this is the part with a rule of its own worth stating
// once: the order notes are shown in.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Active entries lead, then resolved or superseded, each kept in its
  // recency order, so replaced context sits below the current record.
  // Anything the status vocabulary grows to that is not 'active' sorts
  // with the replaced ones, which is the safe direction: a new status
  // appears below the live record rather than above it.
  var STATUS_RANK = { active: 0 };

  function loadNotes(item) {
    return App.db.from(App.registry.tables.workNotes)
      .select("work_item_id, kind, body, status, created_at")
      .eq("work_item_id", item.id)
      .order("created_at", { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = (res.data || []).slice().sort(function (a, b) {
          return (STATUS_RANK[a.status] != null ? 0 : 1) -
            (STATUS_RANK[b.status] != null ? 0 : 1);
        });
        return { notes: rows };
      });
  }

  App.roadmapData = { loadNotes: loadNotes, STATUS_RANK: STATUS_RANK };
})();
