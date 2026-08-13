// ------------------------------------------------------------------
// blocks.js - The typed-block renderer, in one place.
//
// `blocks` is a jsonb array on api_topics, product_capabilities and
// (soon) other tables: p, note, code, table, kv, values. It exists so
// that recording a new fact about something is a database edit rather
// than a code change.
//
// This renderer used to exist twice - platform.js and
// reference-topics.js - implementing the same six kinds, and BOTH
// returned "" for anything else. Skipping was a deliberate
// forward-compatibility choice, so content could lead the code. It is
// the wrong default: a new block kind shipped to the database and
// showed nothing, with no error and no trace, which is precisely the
// stored-but-invisible failure the portal is being cleared of.
//
// So an unrecognised kind renders GENERICALLY - its own keys as a
// definition list, in a muted treatment. Content can still lead the
// code; it just lands visibly, and the muted treatment is the prompt
// to write a proper renderer for it.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var TONES = ["neutral", "info", "ok", "warn", "danger"];

  // Kinds with a hand-written renderer. tests/checks/render-coverage
  // holds this in step with the block kinds the schema documents.
  var KNOWN = ["p", "note", "code", "table", "kv", "values"];

  function toneClass(tone) {
    return TONES.indexOf(tone) === -1 ? "tone-neutral" : "tone-" + tone;
  }

  function defaultCodeblock(value) {
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

  // A named set of accepted values (an enum) with its source.
  function valuesBlock(block) {
    var html = '<div class="value-set"><h4>' + App.escape(block.name || "") +
      (block.field ? ' <code>' + App.escape(block.field) + "</code>" : "") +
      '</h4><p class="value-chips">';
    (block.values || []).forEach(function (v) {
      html += "<code>" + App.escape(v) + "</code> ";
    });
    html += "</p>";
    if (block.source) {
      html += '<p class="value-source">Source: ' + App.escape(block.source) + "</p>";
    }
    return html + "</div>";
  }

  // Anything the vocabulary has grown that the code has not. Renders
  // the kind as a heading and every other key as a row, so the content
  // is readable and obviously provisional. Nested values are stringified
  // rather than walked: the point is that nothing is lost, not that an
  // unknown shape gets a bespoke layout.
  function unknownBlock(block) {
    var keys = Object.keys(block).filter(function (k) { return k !== "kind"; });
    var html = '<div class="block-unknown"><p class="eyebrow">' +
      App.escape(String(block.kind || "untyped")) + " block</p>";
    if (!keys.length) return html + "</div>";
    html += '<div class="table-wrap"><table><tbody>';
    keys.forEach(function (key) {
      var value = block[key];
      var text = typeof value === "string" ? value : JSON.stringify(value);
      html += "<tr><th>" + App.escape(key) + "</th><td>" +
        App.escape(text == null ? "" : String(text)) + "</td></tr>";
    });
    return html + "</tbody></table></div></div>";
  }

  App.blocks = {};
  App.blocks.KNOWN = KNOWN.slice();
  App.blocks.toneClass = toneClass;

  // opts.codeblock lets the reference viewer pass its richer code
  // treatment; everything else renders the same everywhere, which is
  // the point of having one of these instead of two.
  App.blocks.render = function (block, opts) {
    if (!block || typeof block !== "object") return "";
    var codeblock = (opts && opts.codeblock) || defaultCodeblock;
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
        return unknownBlock(block);
    }
  };

  App.blocks.renderAll = function (blocks, opts) {
    return (blocks || []).map(function (block) {
      return App.blocks.render(block, opts);
    }).join("");
  };
})();
