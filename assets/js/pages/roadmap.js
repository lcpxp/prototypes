// ------------------------------------------------------------------
// roadmap.js - The roadmap board for modules/roadmap/.
// A read-only, print-ready render of the roadmap tables in Supabase,
// laid out in three zones:
//   Delivered   items with status 'done'
//   In focus    everything else, ordered by priority, with a
//               proportional bar and a category lane colour
//   Horizon     items with horizon 'someday'
// Editing the roadmap (reprioritising, marking delivered, adding
// items or categories) is a database change, made in the Supabase
// dashboard or by an AI assistant with Supabase access - see
// docs/ROADMAP.md. This page always renders live table state.
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

  // Which board zone an item sits in, derived from its own fields so
  // moving between zones is a plain data edit (see docs/ROADMAP.md).
  function zoneOf(item) {
    if (item.status === "done") return "delivered";
    if (item.horizon === "someday") return "horizon";
    return "active";
  }

  // Fable's cascade: spread the active bars left to right by position
  // so overlap reads as concurrency. Ongoing items run to the edge.
  function cascade(list) {
    var n = list.length;
    var maxStart = 74;
    var step = n > 1 ? maxStart / (n - 1) : 0;
    return list.map(function (item, i) {
      var start = +(i * step).toFixed(2);
      var width = item.presentation === "ongoing"
        ? Math.max(20, 100 - start - 1) : 24;
      if (start + width > 100) width = 100 - start;
      return { start: start, width: +width.toFixed(2) };
    });
  }

  function catClass(categoryId, catById) {
    var cat = categoryId && catById[categoryId];
    return cat ? " rm-cat-" + App.escape(cat.key) : "";
  }

  function scopeItems(items, scope, scopeByArea) {
    if (scope === "all") return items;
    return items.filter(function (i) { return scopeByArea[i.area_id] === scope; });
  }

  function byOrder(a, b) {
    return (a.priority - b.priority) || (a.sort_order - b.sort_order);
  }

  function tileHtml(item, kind) {
    var eyebrow = kind === "delivered" ? "Delivered" : "Horizon";
    return (
      '<article class="rm-tile rm-tile--' + kind + '">' +
      '<p class="rm-tile-eyebrow">' + eyebrow + "</p>" +
      "<h3>" + App.escape(item.title) + "</h3>" +
      (item.summary ? "<p>" + App.escape(item.summary) + "</p>" : "") +
      "</article>"
    );
  }

  function rowHtml(item, index, geom, catById) {
    var label = PRESENTATION[item.presentation] || "";
    var cat = item.category_id && catById[item.category_id];
    var cc = catClass(item.category_id, catById);
    var num = index < 9 ? "0" + (index + 1) : String(index + 1);
    var barCls = "rm-bar" + cc +
      (item.presentation !== "sequenced" ? " rm-bar--" + item.presentation : "");
    return (
      '<div class="rm-row">' +
      '<div class="rm-row-label">' +
      '<span class="rm-num">' + num + "</span>" +
      '<div class="rm-row-meta">' +
      '<p class="rm-tagrow">' +
      (cat ? '<span class="rm-pill' + cc + '">' + App.escape(cat.label) + "</span>" : "") +
      (label ? '<span class="rm-state rm-state--' + item.presentation + '">' +
        App.escape(label) + "</span>" : "") +
      "</p>" +
      '<p class="rm-title">' + App.escape(item.title) + "</p>" +
      (item.summary ? '<p class="rm-desc">' + App.escape(item.summary) + "</p>" : "") +
      "</div></div>" +
      '<div class="rm-field"><div class="' + barCls + '" style="inset-inline-start:' +
      geom.start + "%;inline-size:" + geom.width + '%"></div></div>' +
      "</div>"
    );
  }

  function legendHtml(categories) {
    if (!categories.length) return "";
    var lanes = categories.map(function (c) {
      return '<span class="rm-lg"><span class="rm-dot rm-cat-' + App.escape(c.key) +
        '"></span>' + App.escape(c.label) + "</span>";
    }).join("");
    return '<div class="rm-legend">' + lanes +
      '<span class="rm-lg"><span class="rm-dot rm-dot--done"></span>Delivered</span>' +
      '<span class="rm-lg"><span class="rm-dot rm-dot--horizon"></span>Horizon</span>' +
      "</div>";
  }

  // The whole board as a string. data = {categories, areas, items};
  // scope is 'product' | 'portal' | 'all'.
  function boardHtml(data, scope) {
    var catById = {};
    (data.categories || []).forEach(function (c) { catById[c.id] = c; });
    var scopeByArea = {};
    (data.areas || []).forEach(function (a) { scopeByArea[a.id] = a.scope; });

    var items = scopeItems(data.items || [], scope, scopeByArea);
    var delivered = items.filter(function (i) { return zoneOf(i) === "delivered"; }).sort(byOrder);
    var horizon = items.filter(function (i) { return zoneOf(i) === "horizon"; }).sort(byOrder);
    var active = items.filter(function (i) { return zoneOf(i) === "active"; }).sort(byOrder);
    var geoms = cascade(active);

    if (!items.length) {
      return '<p class="notice">No roadmap items in this view. Items are rows ' +
        "in the roadmap_items table in Supabase; the scope follows each item's " +
        "work_areas.scope. Add rows or switch scope above.</p>";
    }

    var deliveredCol = delivered.length
      ? delivered.map(function (i) { return tileHtml(i, "delivered"); }).join("")
      : '<p class="rm-empty">Nothing delivered in this view yet.</p>';
    var horizonCol = horizon.length
      ? horizon.map(function (i) { return tileHtml(i, "horizon"); }).join("")
      : '<p class="rm-empty">Nothing on the horizon in this view.</p>';
    var activeCol = active.length
      ? active.map(function (i, idx) { return rowHtml(i, idx, geoms[idx], catById); }).join("")
      : '<p class="rm-empty">Nothing in focus in this view.</p>';

    return (
      legendHtml(data.categories || []) +
      '<div class="rm-board">' +
      '<section class="rm-zone"><h2 class="eyebrow">Delivered</h2>' +
      '<div class="rm-col">' + deliveredCol + "</div></section>" +
      '<section class="rm-zone rm-zone--center"><h2 class="eyebrow">In focus and prioritised</h2>' +
      '<div class="rm-phase"><span>Now</span><span>Next</span><span>Later</span></div>' +
      '<div class="rm-rows">' + activeCol + "</div>" +
      '<p class="rm-foot">Position left to right shows rough sequence; ' +
      "overlapping bars run concurrently. Not to scale.</p></section>" +
      '<section class="rm-zone"><h2 class="eyebrow">Horizon</h2>' +
      '<div class="rm-col rm-col--horizon">' + horizonCol + "</div></section>" +
      "</div>"
    );
  }

  App.roadmapView = {
    zoneOf: zoneOf,
    cascade: cascade,
    scopeItems: scopeItems,
    boardHtml: boardHtml,
    presentationLabel: function (p) { return PRESENTATION[p] || ""; },
  };

  // --- DOM wiring ---------------------------------------------------

  App.onAuthed(async function () {
    var host = document.getElementById("roadmap-content");
    var data = { categories: [], areas: [], items: [] };
    var scope = "product";

    function draw() {
      host.innerHTML = boardHtml(data, scope);
    }

    var scopeControl = document.getElementById("roadmap-scope");
    if (scopeControl) {
      scopeControl.addEventListener("click", function (event) {
        var btn = event.target.closest("button[data-scope]");
        if (!btn) return;
        scope = btn.getAttribute("data-scope");
        scopeControl.querySelectorAll("button[data-scope]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        draw();
      });
    }
    var printBtn = document.getElementById("roadmap-print");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

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
          "presentation, priority, sort_order")
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
