// ------------------------------------------------------------------
// roadmap.js - The roadmap board for modules/roadmap/.
// A read-only, print-ready render of the LaunchPad product roadmap
// tables in Supabase, laid out as a lane x horizon grid:
//   Rows    = roadmap_categories (themed colour lanes)
//   Columns = horizon: Now | Next | Later (later merges 'someday')
//   Delivered items (status 'done') collapse into a disclosure below.
// Density decays left to right: Now cards carry a summary and state
// label, Next cards a clamped one-line summary, Later items are
// title-only chips. The roadmap renders product scope only; portal
// work is tracked in the backlog, not here.
//
// Editing the roadmap (reprioritising, marking delivered, adding
// items or categories, moving between horizons) is a database change,
// made in the Supabase dashboard or by an AI assistant with Supabase
// access - see docs/ROADMAP.md. This page always renders live state.
//
// The pure HTML builders hang off App.roadmapView so they can be
// unit-tested without a DOM (tests/unit/roadmap-render.test.js).
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var PRESENTATION = {
    current: "Current focus",
    ongoing: "Ongoing",
    wind: "Wrapping up",
    bridge: "Next horizon",
    sequenced: "",
  };

  // The three live horizon columns. 'later' absorbs both 'later' and
  // 'someday' so the old side zone folds into the grid.
  var COLUMNS = [
    { key: "now", label: "Now", horizons: ["now"] },
    { key: "next", label: "Next", horizons: ["next"] },
    { key: "later", label: "Later", horizons: ["later", "someday"] },
  ];

  // Which grid column an item sits in, derived from its own fields so
  // moving an item is a plain data edit (see docs/ROADMAP.md).
  function columnOf(item) {
    if (item.status === "done") return "delivered";
    if (item.horizon === "next") return "next";
    if (item.horizon === "now") return "now";
    return "later";
  }

  function productItems(items, scopeByArea) {
    return items.filter(function (i) { return scopeByArea[i.area_id] === "product"; });
  }

  function byOrder(a, b) {
    return (a.priority - b.priority) || (a.sort_order - b.sort_order);
  }

  // One item, rendered at the density its column calls for.
  function cardHtml(item, col) {
    if (col === "later") {
      return '<li class="rm-chip">' + App.escape(item.title) + "</li>";
    }
    var label = col === "now" ? (PRESENTATION[item.presentation] || "") : "";
    return (
      '<li class="rm-card rm-card--' + col + '">' +
      (label ? '<p class="rm-state rm-state--' + App.escape(item.presentation) +
        '">' + App.escape(label) + "</p>" : "") +
      "<h3>" + App.escape(item.title) + "</h3>" +
      (item.summary ? '<p class="rm-card-sum">' + App.escape(item.summary) + "</p>" : "") +
      "</li>"
    );
  }

  function laneRowHtml(cat, itemsByCol) {
    var cc = cat ? " rm-cat-" + App.escape(cat.key) : "";
    var laneName = cat ? cat.label : "General";
    var cells = COLUMNS.map(function (c) {
      var list = itemsByCol[c.key] || [];
      if (!list.length) {
        return '<div class="rm-cell"><span class="rm-cell-empty" aria-hidden="true"></span></div>';
      }
      // A real list: screen readers announce item counts; the aria-label
      // carries lane + column so grid position is never the only cue.
      return '<ul class="rm-cell rm-cell--' + c.key + '" aria-label="' +
        App.escape(laneName + " - " + c.label) + '">' +
        list.map(function (i) { return cardHtml(i, c.key); }).join("") + "</ul>";
    }).join("");
    return '<div class="rm-lane' + cc + '">' +
      '<h2 class="rm-lane-label">' + App.escape(laneName) + "</h2>" + cells + "</div>";
  }

  function deliveredStrip(delivered) {
    if (!delivered.length) return "";
    // Native disclosure: accessible with zero JS, find-in-page still
    // works in Chromium, and collapsing history keeps the board
    // birds-eye. Keep the native marker - screen readers use it to
    // announce the open/closed state.
    return '<details class="rm-delivered">' +
      '<summary>Delivered - ' + delivered.length + "</summary>" +
      '<ul class="rm-delivered-list" aria-label="Delivered items">' +
      delivered.map(function (i) {
        return '<li class="rm-chip rm-chip--done">' + App.escape(i.title) + "</li>";
      }).join("") + "</ul></details>";
  }

  function freshnessHtml(items) {
    var latest = "";
    items.forEach(function (i) {
      if (i.updated_at && i.updated_at > latest) latest = i.updated_at;
    });
    if (!latest) return "";
    return '<p class="rm-updated">Data as of ' +
      App.escape(latest.slice(0, 10)) + "</p>";
  }

  function legendHtml(categories) {
    if (!categories.length) return "";
    var lanes = categories.map(function (c) {
      return '<span class="rm-lg"><span class="rm-dot rm-cat-' + App.escape(c.key) +
        '"></span>' + App.escape(c.label) + "</span>";
    }).join("");
    return '<div class="rm-legend">' + lanes +
      '<span class="rm-lg"><span class="rm-dot rm-dot--done"></span>Delivered</span>' +
      "</div>";
  }

  // The whole board as a string. data = {categories, areas, items}.
  // The roadmap is product-only; portal-scoped items are filtered out.
  function boardHtml(data) {
    var catById = {};
    (data.categories || []).forEach(function (c) { catById[c.id] = c; });
    var scopeByArea = {};
    (data.areas || []).forEach(function (a) { scopeByArea[a.id] = a.scope; });

    var items = productItems(data.items || [], scopeByArea);
    if (!items.length) {
      return '<p class="notice">No roadmap items yet. Items are rows in the ' +
        "roadmap_items table in Supabase (see docs/ROADMAP.md).</p>";
    }

    var delivered = items.filter(function (i) { return columnOf(i) === "delivered"; })
      .sort(byOrder);
    var live = items.filter(function (i) { return columnOf(i) !== "delivered"; });

    // Group: category -> column -> ordered items.
    var lanes = (data.categories || []).slice()
      .sort(function (a, b) { return a.sort_order - b.sort_order; });
    var grouped = {};
    live.forEach(function (i) {
      var lane = i.category_id && catById[i.category_id] ? i.category_id : "none";
      (grouped[lane] = grouped[lane] || {})[columnOf(i)] =
        (grouped[lane][columnOf(i)] || []).concat(i);
    });
    Object.keys(grouped).forEach(function (k) {
      Object.keys(grouped[k]).forEach(function (c) { grouped[k][c].sort(byOrder); });
    });

    var head = '<div class="rm-lane rm-lane--head">' +
      '<div class="rm-lane-label" aria-hidden="true"></div>' +
      COLUMNS.map(function (c) {
        return '<div class="rm-col-head">' + c.label + "</div>";
      }).join("") + "</div>";

    var rows = lanes.filter(function (c) { return grouped[c.id]; })
      .map(function (c) { return laneRowHtml(c, grouped[c.id]); });
    if (grouped.none) rows.push(laneRowHtml(null, grouped.none));

    return '<div class="rm-grid">' + head + rows.join("") + "</div>" +
      deliveredStrip(delivered) + legendHtml(data.categories || []) +
      freshnessHtml(items);
  }

  App.roadmapView = {
    columnOf: columnOf,
    productItems: productItems,
    freshnessHtml: freshnessHtml,
    boardHtml: boardHtml,
    presentationLabel: function (p) { return PRESENTATION[p] || ""; },
  };

  // --- DOM wiring ---------------------------------------------------

  App.onAuthed(async function () {
    var host = document.getElementById("roadmap-content");
    var data = { categories: [], areas: [], items: [] };

    function draw() {
      host.innerHTML = boardHtml(data);
    }

    var dlBtn = document.getElementById("roadmap-download");
    if (dlBtn) dlBtn.addEventListener("click", function () { window.print(); });

    // The one legitimate print-event use: a closed <details> renders no
    // content on paper, so expand Delivered before any print (button or
    // Ctrl+P). Opening is idempotent, so the event's known quirks
    // (multiple fires, early fires) are harmless here; never re-close.
    window.addEventListener("beforeprint", function () {
      document.querySelectorAll("details.rm-delivered").forEach(function (d) {
        d.open = true;
      });
    });

    // The three lists are independent, so fetch them in parallel.
    var results = await Promise.all([
      App.db.from(App.registry.tables.roadmapCategories)
        .select("id, key, label, description, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workAreas)
        .select("id, key, title, scope, sort_order")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.roadmapItems)
        .select("id, area_id, category_id, title, summary, status, horizon, " +
          "presentation, priority, sort_order, updated_at")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

    var itemsResult = results[2];
    if (itemsResult.error) {
      host.innerHTML = '<p class="notice error">Could not load the roadmap: ' +
        App.escape(itemsResult.error.message) + "</p>";
      return;
    }
    data.categories = results[0].error ? [] : results[0].data || [];
    data.areas = results[1].error ? [] : results[1].data || [];
    data.items = itemsResult.data || [];
    draw();
  });
})();
