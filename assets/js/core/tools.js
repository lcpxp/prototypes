// ------------------------------------------------------------------
// tools.js - The nav's outbound links to external tools, rendered as
// icon buttons beside the theme switch.
//
// No target lives in this file. This repo is public, and a tool's
// host, the log indexes a saved search names and the API routes it
// filters on are all material docs/SECURITY.md keeps out of git. Each
// button is one portal_links row instead, read behind RLS by a
// signed-in user; this file only knows how to turn a row into a URL
// and an icon, so retuning a search is a database update rather than
// a commit and a deploy.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Icons the nav knows how to draw, keyed by portal_links.icon. A row
  // naming an icon that is not here renders nothing rather than an
  // empty button - add the SVG when a new kind of link arrives.
  var ICONS = {
    bug:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="8" y="6" width="8" height="12" rx="4"></rect>' +
      '<path d="M12 6V4"></path><path d="M10 4L8.5 2.5"></path>' +
      '<path d="M14 4l1.5-1.5"></path><path d="M8 9H4"></path>' +
      '<path d="M8 12H3"></path><path d="M8 15H4"></path>' +
      '<path d="M16 9h4"></path><path d="M16 12h5"></path>' +
      '<path d="M16 15h4"></path><path d="M12 6v12"></path></svg>',
  };

  // A row stores its search exactly as it would be pasted into the
  // tool's own search bar. Splunk's ?q= is stricter than that bar: it
  // must open with a command, so a search starting on a bare `index=`
  // term needs the implied `search` put back. Adding it here rather
  // than storing it keeps the row readable and re-pasteable.
  function searchCommand(spl) {
    var q = String(spl == null ? "" : spl).replace(/^\s+/, "");
    return /^(search\b|\|)/.test(q) ? q : "search " + q;
  }

  App.tools = {};

  // Build a row's target: base_url, the search as ?q=, then every
  // extra parameter the row carries (time range, display options) in
  // the order the row lists them.
  App.tools.href = function (row) {
    if (!row || !row.base_url) return "";
    var parts = [];
    if (row.query) {
      parts.push("q=" + encodeURIComponent(searchCommand(row.query)));
    }
    var params = row.params || {};
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      parts.push(
        encodeURIComponent(key) + "=" +
        encodeURIComponent(value === null || value === undefined ? "" : value)
      );
    });
    if (!parts.length) return row.base_url;
    return row.base_url +
      (row.base_url.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
  };

  // One anchor per row. An anchor rather than a button so the new tab
  // is a plain navigation the browser never treats as a popup, and so
  // middle-click and cmd-click behave as they do on any other link.
  App.tools.render = function (rows) {
    return (rows || []).map(function (row) {
      var icon = ICONS[row && row.icon];
      var href = App.tools.href(row);
      if (!icon || !href) return "";
      var label = App.escape(row.label || "");
      return '<a class="nav-icon-btn" href="' + App.escape(href) + '" ' +
        'target="_blank" rel="noopener noreferrer" title="' + label + '" ' +
        'aria-label="' + label + '">' +
        '<span class="nav-icon" aria-hidden="true">' + icon + "</span></a>";
    }).join("");
  };

  // Fill the nav slot once the rows are known. Nothing renders until
  // the read lands, so a signed-out session or a failed fetch leaves
  // the nav as it was rather than offering a link to nowhere.
  App.tools.attach = function () {
    var host = document.getElementById("nav-tools");
    if (!host || !App.db || !App.onAuthed) return;
    App.onAuthed(function () {
      App.db
        .from(App.registry.tables.portalLinks)
        .select("key,label,icon,base_url,query,params")
        .order("sort_order")
        .then(function (result) {
          if (result.error || !result.data) return;
          host.innerHTML = App.tools.render(result.data);
        });
    });
  };
})();
