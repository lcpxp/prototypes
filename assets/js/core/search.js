// ------------------------------------------------------------------
// search.js - Global header search (App.search). Renders results for
// the search box that ui.js places in the top nav. Queries, per module
// the signed-in user can reach, a small ilike lookup across a couple of
// columns and shows grouped, badged, deep-linked results. RLS is the
// real gate; the access check just avoids pointless requests. Every
// value is escaped; the box is a keyboard-driven ARIA combobox.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var DEBOUNCE = 220;
  var MIN = 2;
  var PER = 5;

  // Each source names the table, the columns to match, the display
  // column (name) and optional secondary line (sub), an optional badge
  // column (rendered with methodBadge or statusBadge), any extra columns
  // a deep link needs, the access keys that gate it, and the module it
  // links to. App.itemHref (registry.js) turns a row into an item URL.
  function sources() {
    var t = App.registry.tables;
    return [
      { keys: ["prototypes"], mod: "prototypes", label: "Prototypes", table: t.prototypes,
        cols: ["title", "description"], name: "title", sub: "description",
        badge: "status", badgeType: "status", extra: ["path"] },
      { keys: ["reference"], mod: "reference", label: "API reference", table: t.apiEndpoints,
        cols: ["path", "summary"], name: "path", sub: "summary",
        badge: "method", badgeType: "method", extra: ["spec_id"] },
      { keys: ["roadmap", "backlog"], mod: "roadmap", label: "Roadmap and backlog", table: t.workItems,
        cols: ["title", "summary"], name: "title", sub: "summary",
        badge: "status", badgeType: "status" },
      { keys: ["platform"], mod: "platform", label: "Platform", table: t.productCapabilities,
        cols: ["title", "summary"], name: "title", sub: "summary" },
      { keys: ["users"], mod: "users", label: "Users", table: t.profiles,
        cols: ["display_name", "email"], name: "display_name", sub: "email",
        badge: "role", badgeType: "status" },
      { keys: ["integrations"], mod: "integrations", label: "Integrations", table: t.integrations,
        cols: ["name", "purpose"], name: "name", sub: "purpose",
        badge: "status", badgeType: "status" },
    ];
  }

  function canReach(keys) {
    if (!App.canAccess) return true;
    return keys.some(function (k) { return App.canAccess(k); });
  }
  function moduleByKey(key) {
    return App.registry.modules.find(function (m) { return m.key === key; });
  }

  // Work items live in both roadmap and backlog; link to whichever the
  // user can reach, preferring roadmap. Every other source maps to one.
  function targetMod(s) {
    if (s.mod === "roadmap" && App.canAccess &&
        !App.canAccess("roadmap") && App.canAccess("backlog")) {
      return moduleByKey("backlog");
    }
    return moduleByKey(s.mod);
  }

  // Strip characters that would break the PostgREST or() filter grammar.
  function clean(q) { return String(q || "").replace(/[,%()\\*"']/g, " ").trim(); }

  // The distinct set of columns to select for a source: id, display,
  // sub, badge and any link-only extras, deduplicated.
  function selectFor(s) {
    var cols = ["id"];
    [s.name, s.sub, s.badge].concat(s.extra || []).forEach(function (c) {
      if (c && cols.indexOf(c) === -1) cols.push(c);
    });
    return cols.join(",");
  }

  // Escape first, then wrap the first occurrence of the query in <mark>.
  // First occurrence only: a global replace over user input invites
  // escaping bugs.
  function highlight(text, q) {
    var safe = App.escape(text);
    var needle = App.escape(q || "");
    if (!needle) return safe;
    var i = safe.toLowerCase().indexOf(needle.toLowerCase());
    if (i === -1) return safe;
    return safe.slice(0, i) + "<mark>" + safe.slice(i, i + needle.length) +
      "</mark>" + safe.slice(i + needle.length);
  }

  function badgeHtml(s, r) {
    if (!s.badge || !r[s.badge]) return "";
    var b = s.badgeType === "method"
      ? App.methodBadge(r[s.badge]) : App.statusBadge(r[s.badge]);
    return '<span class="nav-search-badge">' + b + "</span>";
  }

  // Pure string builder for the results markup. Options get a running
  // id across all groups so keyboard navigation can address them.
  function buildHtml(srcs, results, query) {
    var html = "";
    var optIndex = 0;
    srcs.forEach(function (s, i) {
      var res = results[i];
      if (!res || res.error || !res.data || !res.data.length) return;
      var count = res.data.length;
      var full = count === PER;
      var mod = targetMod(s);
      var lis = res.data.map(function (r) {
        var href = App.itemHref(mod, r);
        var title = highlight(r[s.name] || "(untitled)", query);
        var sub = s.sub && r[s.sub] && r[s.sub] !== r[s.name]
          ? '<span class="nav-search-sub">' + highlight(r[s.sub], query) + "</span>" : "";
        var li = '<li><a role="option" id="nav-search-opt-' + optIndex + '" href="' +
          App.escape(href) + '">' + badgeHtml(s, r) + title + sub + "</a></li>";
        optIndex++;
        return li;
      }).join("");
      html += '<div class="nav-search-group"><p class="nav-search-label">' +
        App.escape(s.label) + ' <span class="nav-search-count">' + count +
        (full ? "+" : "") + "</span></p><ul>" + lis + "</ul>" +
        (full ? '<a class="nav-search-more" href="' + App.escape(App.moduleHref(mod)) +
          '">View all in ' + App.escape(s.label) + "</a>" : "") + "</div>";
    });
    return html || '<p class="nav-search-empty">No matches for that term. ' +
      "Try a shorter word or a different spelling.</p>";
  }

  function attach() {
    var input = document.getElementById("nav-search-input");
    var box = document.getElementById("nav-search-results");
    if (!input || !box || input.getAttribute("data-wired")) return;
    input.setAttribute("data-wired", "1");
    var timer = null;
    var seq = 0;              // request sequence: drop stale responses
    var options = [];         // [{ el, href }] for the current results
    var activeIndex = -1;

    function close() {
      box.hidden = true;
      box.innerHTML = "";
      options = [];
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }

    function open() {
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function paint(srcs, results, query) {
      box.innerHTML = buildHtml(srcs, results, query);
      open();
      input.removeAttribute("aria-activedescendant");
      options = [].slice.call(box.querySelectorAll('a[role="option"]'))
        .map(function (el) { return { el: el, href: el.getAttribute("href") }; });
      activeIndex = -1;
    }

    function setActive(next) {
      if (!options.length) return;
      if (activeIndex >= 0 && options[activeIndex]) {
        options[activeIndex].el.removeAttribute("aria-selected");
      }
      activeIndex = (next + options.length) % options.length;
      var opt = options[activeIndex];
      opt.el.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", opt.el.id);
      opt.el.scrollIntoView({ block: "nearest" });
    }

    function run() {
      var q = clean(input.value);
      if (q.length < MIN) { close(); return; }
      var mine = ++seq;
      var srcs = sources().filter(function (s) { return canReach(s.keys); });
      Promise.all(srcs.map(function (s) {
        var or = s.cols.map(function (c) { return c + ".ilike.%" + q + "%"; }).join(",");
        return App.db.from(s.table).select(selectFor(s)).or(or).limit(PER);
      })).then(function (results) {
        if (mine !== seq) return;   // a fresher query has overtaken this one
        paint(srcs, results, q);
      }).catch(function () {
        if (mine !== seq) return;
        box.innerHTML = '<p class="nav-search-empty">Search failed. ' +
          "Check your connection and try again.</p>";
        open();
        options = [];
        activeIndex = -1;
      });
    }

    input.addEventListener("input", function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, DEBOUNCE);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); return; }
      if (box.hidden || !options.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === "Home") { e.preventDefault(); setActive(0); }
      else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
      else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        window.location.href = options[activeIndex].href;
      }
    });

    document.addEventListener("click", function (e) {
      if (e.target !== input && !box.contains(e.target)) close();
    });
  }

  App.search = {
    attach: attach,
    clean: clean,
    highlight: highlight,
    selectFor: selectFor,
    sources: sources,
  };
})();
