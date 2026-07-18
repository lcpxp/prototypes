// ------------------------------------------------------------------
// platform.js - The platform product-knowledge viewer for
// modules/platform/. Read-only render of product_capabilities,
// grouped by the same work_areas (scope 'product') used by the
// roadmap and backlog, so "what exists today" and "what's planned"
// read against one shared taxonomy. Editing is a database change
// (Supabase dashboard or an AI assistant with Supabase access) - see
// docs/PLATFORM.md for the ingest and retrieval protocol.
//
// The pure HTML builders hang off App.platformView, DOM-free, so they
// are unit-tested without a browser (tests/unit/platform-render.test.js).
// blocks reuses the api_topics typed-block vocabulary (p, note, kv,
// table, code, values); unknown kinds are skipped so new block types
// can ship in the database before this viewer learns about them.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var TONES = ["neutral", "info", "ok", "warn", "danger"];

  function toneClass(tone) {
    return TONES.indexOf(tone) === -1 ? "tone-neutral" : "tone-" + tone;
  }

  function codeblock(value) {
    var text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return "<pre><code>" + App.escape(text) + "</code></pre>";
  }

  function tableBlock(block) {
    var columns = block.columns || [];
    var html = '<div class="table-wrap"><table>';
    if (columns.length > 0) {
      html += "<thead><tr>";
      columns.forEach(function (c) { html += "<th>" + App.escape(c) + "</th>"; });
      html += "</tr></thead>";
    }
    html += "<tbody>";
    (block.rows || []).forEach(function (row) {
      html += "<tr>";
      (row || []).forEach(function (cell) { html += "<td>" + App.escape(cell) + "</td>"; });
      html += "</tr>";
    });
    return html + "</tbody></table></div>";
  }

  function kvBlock(block) {
    var html = '<div class="table-wrap"><table><tbody>';
    (block.items || []).forEach(function (item) {
      html += "<tr><th>" + App.escape(item.label || "") + "</th><td>" +
        App.escape(item.value || "") + "</td></tr>";
    });
    return html + "</tbody></table></div>";
  }

  function valuesBlock(block) {
    var html = '<div class="value-set"><h4>' + App.escape(block.name || "") +
      (block.field ? ' <code>' + App.escape(block.field) + "</code>" : "") +
      "</h4><p class=\"value-chips\">";
    (block.values || []).forEach(function (v) { html += "<code>" + App.escape(v) + "</code> "; });
    html += "</p>";
    if (block.source) {
      html += '<p class="value-source">Source: ' + App.escape(block.source) + "</p>";
    }
    return html + "</div>";
  }

  // The typed block vocabulary shared with the reference viewer's
  // api_topics rendering (assets/js/pages/reference-topics.js). Kept
  // as a local copy rather than a cross-module dependency; see
  // docs/SESSIONS.md for the noted future-refactor option.
  function blockHtml(block) {
    if (!block || typeof block !== "object") return "";
    switch (block.kind) {
      case "p":
        return "<p>" + App.escape(block.text || "") + "</p>";
      case "note":
        return '<p class="notice ' + toneClass(block.tone) + '">' +
          App.escape(block.text || "") + "</p>";
      case "code":
        return codeblock(block.json !== undefined ? block.json : (block.text || ""));
      case "table":
        return tableBlock(block);
      case "kv":
        return kvBlock(block);
      case "values":
        return valuesBlock(block);
      default:
        return "";
    }
  }

  function maturityChips(cap) {
    return App.statusBadge(cap.maturity) +
      (cap.verified ? "" : ' <span class="badge tone-warn">unverified</span>');
  }

  function capabilityCard(cap) {
    var html = '<article class="card cap-card"' +
      (cap.id ? ' id="capability-' + App.escape(cap.id) + '"' : "") + ">" +
      '<p class="cap-chips">' + maturityChips(cap) + "</p>" +
      "<h2>" + App.escape(cap.title) + "</h2>";
    if (cap.summary) html += '<p class="card-meta">' + App.escape(cap.summary) + "</p>";
    (cap.blocks || []).forEach(function (b) { html += blockHtml(b); });
    return html + "</article>";
  }

  function byOrder(a, b) { return a.sort_order - b.sort_order; }

  // Rows keyed by kind. Areas are grouped and sorted by sort_order so
  // rendering order always matches how an owner curated the catalogue.
  function groupByArea(capabilities) {
    var byArea = {};
    capabilities.filter(function (c) { return c.kind === "capability"; })
      .forEach(function (cap) {
        var key = cap.area_id || "_none";
        if (!byArea[key]) byArea[key] = [];
        byArea[key].push(cap);
      });
    Object.keys(byArea).forEach(function (key) { byArea[key].sort(byOrder); });
    return byArea;
  }

  function sectionHeading(title, description) {
    var html = '<h2 class="eyebrow eyebrow-heading">' +
      App.escape(title) + "</h2>";
    if (description) html += '<p class="tag-description">' + App.escape(description) + "</p>";
    return html;
  }

  // The whole page as a string. data = { areas, capabilities }.
  function pageHtml(data) {
    var capabilities = data.capabilities || [];
    var areas = data.areas || [];
    if (capabilities.length === 0) {
      return '<p class="notice">No platform knowledge recorded yet. Rows are ' +
        "in the product_capabilities table; see docs/PLATFORM.md to ingest " +
        "the first overview.</p>";
    }

    var lead = capabilities
      .filter(function (c) { return c.kind === "overview" || c.kind === "value"; })
      .sort(byOrder);
    var glance = capabilities.filter(function (c) { return c.kind === "glance"; }).sort(byOrder);
    var byArea = groupByArea(capabilities);

    var html = lead.map(capabilityCard).join("");

    areas.slice().sort(byOrder).forEach(function (area) {
      var caps = byArea[area.id];
      if (!caps || caps.length === 0) return;
      html += sectionHeading(area.title, area.description);
      html += caps.map(capabilityCard).join("");
    });

    if (glance.length > 0) {
      html += sectionHeading("At a glance");
      html += glance.map(capabilityCard).join("");
    }

    return html;
  }

  App.platformView = {
    blockHtml: blockHtml,
    capabilityCard: capabilityCard,
    groupByArea: groupByArea,
    pageHtml: pageHtml,
  };

  // --- DOM wiring ---------------------------------------------------

  App.onAuthed(async function () {
    var host = document.getElementById("platform-content");

    var results = await Promise.all([
      App.db.from(App.registry.tables.workAreas)
        .select("id, title, description, scope, sort_order")
        .eq("scope", "product")
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.productCapabilities)
        .select("id, area_id, key, title, summary, kind, maturity, verified, blocks, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    var capsResult = results[1];
    if (capsResult.error) {
      App.notice(host, "error", "Could not load platform knowledge: " + capsResult.error.message);
      return;
    }

    host.innerHTML = pageHtml({
      areas: results[0].error ? [] : results[0].data || [],
      capabilities: capsResult.data || [],
    });
    App.deepLinkScroll();
  });
})();
