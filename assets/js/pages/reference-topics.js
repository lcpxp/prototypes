// ------------------------------------------------------------------
// reference-topics.js - Pure HTML builders for api_topics rows: the
// narrative sections of a spec (overview, conventions, runbooks,
// accepted values, gap registers). Loaded after reference-render.js,
// which supplies the shared codeblock builder. No DOM access, so the
// builders are benchmarked in tests/unit/reference-render.test.js,
// which loads this module alongside it.
//
// blocks is a jsonb array of typed blocks (shapes documented in
// supabase/schema/10_reference.sql), rendered by App.blocks. A kind
// the code does not know renders generically rather than vanishing.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // The typed-block vocabulary lives in assets/js/core/blocks.js, so
  // the reference viewer and the platform page cannot drift apart on
  // what a `kv` or a `values` block looks like. This passes the
  // viewer's richer code treatment through; everything else is shared.
  function blockHtml(block) {
    return App.blocks.render(block, { codeblock: App.refRender.codeblock });
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
