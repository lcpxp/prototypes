// ------------------------------------------------------------------
// search.js - Global header search (App.search). Renders results for
// the search box that ui.js places in the top nav. Queries, per module
// the signed-in user can reach, a small ilike lookup across a couple of
// columns and shows grouped results. RLS is the real gate; the access
// check just avoids pointless requests. Every value is escaped.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var DEBOUNCE = 220;
  var MIN = 2;
  var PER = 5;

  // Each source names the table, the columns to match, the display
  // column (name) and an optional secondary line (sub), the access keys
  // that gate it, and the module it links to.
  function sources() {
    var t = App.registry.tables;
    return [
      { keys: ["prototypes"], mod: "prototypes", label: "Prototypes", table: t.prototypes,
        cols: ["title", "description"], name: "title", sub: "description" },
      { keys: ["reference"], mod: "reference", label: "API reference", table: t.apiEndpoints,
        cols: ["path", "summary"], name: "path", sub: "summary" },
      { keys: ["roadmap", "backlog"], mod: "roadmap", label: "Roadmap and backlog", table: t.workItems,
        cols: ["title", "summary"], name: "title", sub: "summary" },
      { keys: ["platform"], mod: "platform", label: "Platform", table: t.productCapabilities,
        cols: ["title", "summary"], name: "title", sub: "summary" },
    ];
  }

  function canReach(keys) {
    if (!App.canAccess) return true;
    return keys.some(function (k) { return App.canAccess(k); });
  }
  function moduleByKey(key) {
    return App.registry.modules.find(function (m) { return m.key === key; });
  }
  // Strip characters that would break the PostgREST or() filter grammar.
  function clean(q) { return String(q || "").replace(/[,%()\\*"']/g, " ").trim(); }

  function render(box, input, srcs, results) {
    var groups = "";
    srcs.forEach(function (s, i) {
      var res = results[i];
      if (!res || res.error || !res.data || !res.data.length) return;
      var mod = moduleByKey(s.mod);
      var href = mod ? App.moduleHref(mod) : "#";
      var items = res.data.map(function (r) {
        var title = r[s.name] || "(untitled)";
        var sub = s.sub && r[s.sub] && r[s.sub] !== title
          ? '<span class="nav-search-sub">' + App.escape(r[s.sub]) + "</span>" : "";
        return '<li><a href="' + App.escape(href) + '">' +
          App.escape(title) + sub + "</a></li>";
      }).join("");
      groups += '<div class="nav-search-group"><p class="nav-search-label">' +
        App.escape(s.label) + "</p><ul>" + items + "</ul></div>";
    });
    box.innerHTML = groups || '<p class="nav-search-empty">No matches.</p>';
    box.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function attach() {
    var input = document.getElementById("nav-search-input");
    var box = document.getElementById("nav-search-results");
    if (!input || !box || input.getAttribute("data-wired")) return;
    input.setAttribute("data-wired", "1");
    var timer = null;

    function close() {
      box.hidden = true;
      box.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
    }
    function run() {
      var q = clean(input.value);
      if (q.length < MIN) { close(); return; }
      var srcs = sources().filter(function (s) { return canReach(s.keys); });
      Promise.all(srcs.map(function (s) {
        var or = s.cols.map(function (c) { return c + ".ilike.%" + q + "%"; }).join(",");
        var sel = "id," + s.name + (s.sub && s.sub !== s.name ? "," + s.sub : "");
        return App.db.from(s.table).select(sel).or(or).limit(PER);
      })).then(function (results) { render(box, input, srcs, results); });
    }

    input.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, DEBOUNCE);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); }
    });
    document.addEventListener("click", function (e) {
      if (e.target !== input && !box.contains(e.target)) close();
    });
  }

  App.search = { attach: attach };
})();
