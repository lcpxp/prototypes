// ------------------------------------------------------------------
// reference-topics.js - Pure HTML builders for api_topics rows: the
// narrative sections of a spec (overview, conventions, runbooks,
// accepted values, gap registers). Loaded after reference-render.js,
// which supplies the shared codeblock builder. No DOM access, so the
// builders are benchmarked in tests/unit/reference-topics.test.js.
//
// blocks is a jsonb array of typed blocks (shapes documented in
// supabase/schema/10_reference.sql). Unknown kinds render as
// nothing, so new block types can ship in the database before the
// viewer learns about them.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var TONES = ["neutral", "info", "ok", "warn", "danger"];

  function toneClass(tone) {
    return TONES.indexOf(tone) === -1 ? "tone-neutral" : "tone-" + tone;
  }

  function tableBlock(block) {
    var columns = block.columns || [];
    var rows = block.rows || [];
    var html = '<div class="table-wrap"><table>';
    if (columns.length > 0) {
      html += "<thead><tr>";
      columns.forEach(function (c) { html += "<th>" + App.escape(c) + "</th>"; });
      html += "</tr></thead>";
    }
    html += "<tbody>";
    rows.forEach(function (row) {
      html += "<tr>";
      (row || []).forEach(function (cell) {
        html += "<td>" + App.escape(cell) + "</td>";
      });
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
      "</h4><p class=\"value-chips\">";
    (block.values || []).forEach(function (v) {
      html += "<code>" + App.escape(v) + "</code> ";
    });
    html += "</p>";
    if (block.source) {
      html += '<p class="value-source">Source: ' + App.escape(block.source) + "</p>";
    }
    return html + "</div>";
  }

  function blockHtml(block) {
    if (!block || typeof block !== "object") return "";
    switch (block.kind) {
      case "p":
        return "<p>" + App.escape(block.text || "") + "</p>";
      case "note":
        return '<p class="notice ' + toneClass(block.tone) + '">' +
          App.escape(block.text || "") + "</p>";
      case "code":
        return App.refRender.codeblock(
          block.json !== undefined ? block.json : (block.text || ""));
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

  // One collapsible topic section, same shell as an endpoint block
  // so the page reads as a single system.
  function topicBlock(topic) {
    var html = '<details class="endpoint topic" id="topic-' +
      App.escape(topic.id) + '"><summary>' +
      '<span class="badge tone-neutral">guide</span>' +
      '<span class="summary-text">' + App.escape(topic.title || "") +
      "</span></summary>";
    html += '<div class="endpoint-body">';
    if (topic.intro) html += "<p>" + App.escape(topic.intro) + "</p>";
    (topic.blocks || []).forEach(function (block) {
      html += blockHtml(block);
    });
    return html + "</div></details>";
  }

  App.refTopics = {
    blockHtml: blockHtml,
    topicBlock: topicBlock,
  };
})();
