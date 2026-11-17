// ------------------------------------------------------------------
// glossary/glossary.js - The Glossary page, modules/glossary/.
// The one home for terminology: domain_terms rendered by section,
// searchable as you type, each term addressable as #term-<id> so a
// search result or a knowledge link lands on it.
//
// Sections come from a tag on each row (glossary:industry and so on),
// so filing a term is a database edit, never a code change. A row
// tagged glossary:duplicate stays in the table and off the page.
// ------------------------------------------------------------------

(function () {
  "use strict";

  App.glossary = App.glossary || {};

  // Display order and wording of the sections. The tag on a row picks
  // its section; a row with none falls into the last one.
  var SECTIONS = [
    { key: "industry", title: "Card payments: the industry" },
    { key: "pxp", title: "PXP: the company and its platforms" },
    { key: "product", title: "LaunchPad: how the product talks" },
    { key: "build", title: "LaunchPad: how it is built" },
  ];
  var TAG_PREFIX = "glossary:";

  var terms = [];
  var state = { query: "", section: "" };

  function el(id) { return document.getElementById(id); }

  function sectionOf(row) {
    var tags = row.tags || [];
    for (var i = 0; i < SECTIONS.length; i++) {
      if (tags.indexOf(TAG_PREFIX + SECTIONS[i].key) !== -1) return SECTIONS[i].key;
    }
    return SECTIONS[SECTIONS.length - 1].key;
  }

  function isHidden(row) {
    return (row.tags || []).indexOf(TAG_PREFIX + "duplicate") !== -1;
  }

  // Lower-cased text a query is matched against: the name, its
  // expansion and the definition.
  function haystack(row) {
    return [row.term, row.expansion, row.definition].filter(Boolean).join(" ").toLowerCase();
  }

  // Pure: which rows a query and a section leave on screen. Every word
  // of the query must appear somewhere in the row, in any order.
  App.glossary.filter = function (rows, query, section) {
    var words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(function (row) {
      if (section && row.section !== section) return false;
      if (!words.length) return true;
      var text = row.text;
      return words.every(function (w) { return text.indexOf(w) !== -1; });
    });
  };

  // Pure: the rows the page shows, prepared once after loading.
  App.glossary.prepare = function (rows) {
    return (rows || []).filter(function (row) { return !isHidden(row); }).map(function (row) {
      return {
        id: row.id, term: row.term, expansion: row.expansion, definition: row.definition,
        verified: row.verified !== false, section: sectionOf(row), text: haystack(row),
      };
    }).sort(function (a, b) {
      return String(a.term).localeCompare(String(b.term), "en", { sensitivity: "base" });
    });
  };

  // Pure: one term. An unverified term says so where it is read, not
  // only in a coverage figure somewhere else.
  App.glossary.termHtml = function (row) {
    return '<div class="gl-term" id="term-' + App.escape(row.id) + '">' +
      "<dt>" + App.escape(row.term) +
      (row.expansion ? ' <span class="gl-expansion">' + App.escape(row.expansion) + "</span>" : "") +
      (row.verified ? "" : ' <span class="badge tone-warn">unverified</span>') +
      "</dt><dd>" + App.escape(row.definition) + "</dd></div>";
  };

  function render() {
    var shown = App.glossary.filter(terms, state.query, state.section);
    var count = el("gl-count");
    if (count) {
      count.textContent = shown.length === terms.length
        ? terms.length + " terms"
        : shown.length + " of " + terms.length + " terms";
    }
    var host = el("gl-body");
    if (!host) return;
    if (!shown.length) {
      host.innerHTML = '<p class="notice">No term matches "' + App.escape(state.query) +
        '". Try a shorter word, or clear the section filter.</p>';
      return;
    }
    host.innerHTML = SECTIONS.map(function (s) {
      var rows = shown.filter(function (row) { return row.section === s.key; });
      if (!rows.length) return "";
      return '<section class="gl-section"><h2>' + App.escape(s.title) +
        ' <span class="gl-section-count">' + rows.length + "</span></h2>" +
        '<dl class="gl-list">' + rows.map(App.glossary.termHtml).join("") + "</dl></section>";
    }).join("");
  }

  function renderSections() {
    var host = el("gl-sections");
    if (!host) return;
    var buttons = [{ key: "", title: "All" }].concat(SECTIONS.filter(function (s) {
      return terms.some(function (row) { return row.section === s.key; });
    }));
    host.innerHTML = buttons.map(function (s) {
      return '<button type="button" class="gl-chip" data-section="' + App.escape(s.key) + '"' +
        ' aria-pressed="' + (state.section === s.key ? "true" : "false") + '">' +
        App.escape(s.title) + "</button>";
    }).join("");
    host.onclick = function (event) {
      var button = event.target.closest("button[data-section]");
      if (!button) return;
      state.section = button.getAttribute("data-section");
      renderSections();
      render();
    };
  }

  // A link to #term-<id> must land on that term even when a filter or
  // a search would hide it, so the filters clear first.
  function revealAnchor() {
    var hash = window.location.hash.slice(1);
    if (!/^term-/.test(hash)) return;
    state.query = ""; state.section = "";
    var input = el("gl-search");
    if (input) input.value = "";
    renderSections();
    render();
    App.deepLinkScroll(hash);
  }

  async function load() {
    var res = await App.db.from(App.registry.tables.domainTerms)
      .select("id, term, expansion, definition, verified, tags")
      .order("term", { ascending: true });
    if (res.error) {
      App.notice(el("page-notice"), "error",
        "Could not load the glossary: " + res.error.message + ". Reload the page to try again.");
      el("gl-body").innerHTML = "";
      return;
    }
    terms = App.glossary.prepare(res.data);

    var input = el("gl-search");
    if (input) {
      var initial = new URLSearchParams(window.location.search).get("q");
      if (initial) { input.value = initial; state.query = initial; }
      input.addEventListener("input", function () {
        state.query = input.value;
        render();
      });
    }
    renderSections();
    render();
    revealAnchor();
    window.addEventListener("hashchange", revealAnchor);
  }

  if (App.onAuthed) App.onAuthed(load);
})();
