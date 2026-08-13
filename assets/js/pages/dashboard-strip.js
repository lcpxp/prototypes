// ------------------------------------------------------------------
// dashboard-strip.js - The now/next strip, the dashboard's headline
// (docs/plan/50-DASHBOARD.md). A pure builder: rows in, HTML string
// out, no DOM and no fetching, so it loads in a Node vm for testing
// (tests/unit/dashboard-strip.test.js). The same split roadmap-detail.js
// uses.
//
// Rows come from dashboard_summary().workstreams, already ordered
// now-then-next by priority. Each reads as one line: theme rail,
// title, progress, assignee and a count of open children, linking
// into the roadmap module with that item's drawer open.
//
// It is a summary, not a second roadmap. Later and Someday are
// deliberately absent - the roadmap answers everything, this answers
// "what is being worked on now, and what is next".
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Next is capped so the strip stays a glance. Now is not: if there
  // are twelve things in flight, hiding six of them is the problem,
  // not the display.
  var NEXT_CAP = 6;

  var STATUS = {
    idea: "Idea", planned: "Planned", in_progress: "In progress",
    blocked: "Blocked", done: "Delivered", dropped: "Dropped",
  };

  function esc(value) { return App.escape(value == null ? "" : value); }

  // A workstream is finished when it is done AND has nothing open
  // under it. It belongs in Delivered on the roadmap, not on a strip
  // answering "what is being worked on".
  function isFinished(row) {
    return row.status === "done" && !(row.open_children > 0);
  }

  // Blocked first within a band: one blocked workstream is easy to
  // miss and expensive to miss. The server already ordered by
  // priority, so this is a stable partition rather than a re-sort.
  function order(rows) {
    var blocked = [], rest = [];
    rows.forEach(function (row) {
      (row.status === "blocked" ? blocked : rest).push(row);
    });
    return blocked.concat(rest);
  }

  App.dashboardStrip = {};

  // { now: [...], next: [...], nextHidden: n } from the flat list.
  App.dashboardStrip.bands = function (rows) {
    var live = (rows || []).filter(function (row) { return !isFinished(row); });
    var now = order(live.filter(function (r) { return r.horizon === "now"; }));
    var next = order(live.filter(function (r) { return r.horizon === "next"; }));
    return { now: now, next: next.slice(0, NEXT_CAP),
      nextHidden: Math.max(0, next.length - NEXT_CAP) };
  };

  // One workstream. The progress fill width is a runtime value, so it
  // is spliced into the style attribute; every other value is a class
  // or escaped text (tests/checks/style.test.js bans static inline
  // styles, not computed ones).
  App.dashboardStrip.rowHtml = function (row, href) {
    var pct = row.status === "done" ? 100 : Math.max(0, Math.min(100, row.progress || 0));
    var theme = row.theme ? " rm-cat-" + esc(row.theme) : "";
    var open = row.open_children > 0
      ? esc(row.open_children) + (row.open_children === 1 ? " open item" : " open items")
      : "";
    var meta = [row.assignee ? esc(row.assignee) : "", open]
      .filter(Boolean).join(" &middot; ");
    return '<a class="ds-row' + theme +
      (row.status === "blocked" ? " ds-row--blocked" : "") +
      '" href="' + esc(href) + '">' +
      '<span class="ds-rail" aria-hidden="true"></span>' +
      '<span class="ds-body">' +
      '<span class="ds-title">' + esc(row.title) + "</span>" +
      (meta ? '<span class="ds-meta">' + meta + "</span>" : "") +
      "</span>" +
      '<span class="ds-prog" role="img" aria-label="' + esc(pct) +
      ' percent complete"><span class="ds-prog-fill" style="width:' + pct +
      '%"></span></span>' +
      '<span class="ds-status">' + esc(STATUS[row.status] || row.status) +
      "</span></a>";
  };

  // The whole strip. `href(row)` builds the link (the caller owns
  // routing); `moreHref` is where "and N more" goes. Returns "" when
  // there is nothing live, so the page can leave the region out
  // rather than draw an empty frame.
  App.dashboardStrip.html = function (rows, opts) {
    opts = opts || {};
    var href = opts.href || function () { return "#"; };
    var bands = App.dashboardStrip.bands(rows);
    if (!bands.now.length && !bands.next.length) return "";

    function band(title, list, extra) {
      if (!list.length) {
        return '<section class="ds-band"><h3 class="eyebrow">' + esc(title) +
          '</h3><p class="notice">Nothing at ' + esc(title.toLowerCase()) +
          ". Move a workstream here from the roadmap.</p></section>";
      }
      return '<section class="ds-band"><h3 class="eyebrow">' + esc(title) +
        "</h3>" + list.map(function (row) {
          return App.dashboardStrip.rowHtml(row, href(row));
        }).join("") + (extra || "") + "</section>";
    }

    var more = bands.nextHidden
      ? '<a class="ds-more" href="' + esc(opts.moreHref || "#") + '">and ' +
        esc(bands.nextHidden) + " more at next</a>"
      : "";
    return band("Now", bands.now) + band("Next", bands.next, more);
  };

  // The delivery line that sits in the strip's header: a state, not a
  // score. "266 work items" is not an achievement; this is.
  App.dashboardStrip.deliveryLine = function (delivery) {
    if (!delivery || !delivery.total) return "";
    var parts = [esc(delivery.delivered || 0) + " of " + esc(delivery.total) + " delivered"];
    if (delivery.active) parts.push(esc(delivery.active) + " in progress");
    if (delivery.blocked) parts.push(esc(delivery.blocked) + " blocked");
    if (delivery.parked) parts.push(esc(delivery.parked) + " parked");
    return parts.join(" &middot; ");
  };
})();
