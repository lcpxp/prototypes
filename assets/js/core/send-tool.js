// ------------------------------------------------------------------
// send-tool.js - A nav icon that opens the acquirer send snippet: a
// browser-console script that fires an application's document push
// and onboarding record from the partner portal, plus a collapsed
// handover prompt for reporting the result back.
//
// The snippet holds no host and no scope. Both are read at run time
// from the portal's own config.json by the pasted script, in the
// portal's own tab - so this repo, which is public, carries only
// route names and the shape of the call. See docs/SECURITY.md.
//
// This is a stopgap for actions that have no button in the portal
// yet. It is deliberately self-contained: delete this file and the
// nav slot and nothing else changes.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21.5 2.5 11 13"></path>' +
    '<path d="M21.5 2.5 15 21.5l-4-8.5-8.5-4Z"></path></svg>';

  // Held as lines rather than one template literal: the snippet is
  // itself full of backticks and ${} and stays readable this way.
  var SNIPPET = [
    "(async () => {",
    "  const id = location.pathname.match(/\\/applications\\/([0-9A-HJKMNP-TV-Z]{26})/i)?.[1];",
    "  if (!id) return console.error('No application id in the URL - open an application first.');",
    "",
    "  const cfg = await (await fetch('/config/config.json')).json();",
    "  const api = cfg.msalConfig.apis[0];",
    "  const scopeId = api.scopes[0].split('/')[3];",
    "",
    "  const t = [...Object.values(sessionStorage), ...Object.values(localStorage)]",
    "    .map(v => { try { return JSON.parse(v) } catch { return null } })",
    "    .find(o => o?.credentialType === 'AccessToken' && o?.target?.includes(scopeId))?.secret;",
    "  if (!t) return console.error('No API token found - are you signed in?');",
    "",
    "  const base = `${api.uri}v2/merchant-applications/${id}`;",
    "  const H = { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };",
    "  console.log('Application:', id);",
    "",
    "  for (const p of ['push-to-sftp', 'daopay-onboarding-record/send']) {",
    "    const t0 = Date.now();",
    "    console.log('sending', p, '...');",
    "    try {",
    "      const r = await fetch(`${base}/${p}`, { method: 'POST', headers: H, body: '{}' });",
    "      console.log(r.ok ? 'OK ' : 'ERR', p, r.status, `${Date.now() - t0}ms`,",
    "        (await r.text()).slice(0, 500));",
    "    } catch (e) {",
    "      console.log('ERR', p, `${Date.now() - t0}ms`,",
    "        'opaque - unhandled 500 or blocked response:', e.message);",
    "    }",
    "  }",
    "  console.log('done');",
    "})();"
  ].join("\n");

  var PROMPT = [
    "I ran the acquirer send snippet from the partner portal console.",
    "Console output below.",
    "",
    "Tell me, for each of the two calls:",
    "",
    "1. Whether it succeeded, failed, or never returned - and say which,",
    "   plainly, before anything else.",
    "2. What that means in practice. A 200 on the document push means every",
    "   asset uploaded, because the handler only returns success once all of",
    "   them have. A 200 on the onboarding record does not prove delivery: it",
    "   returns success silently when the cart's acquirer is not the expected",
    "   one, so say what still needs confirming.",
    "3. If a call failed, what to do next - and whether that is something I",
    "   can fix in the application data, something for the acquirer, or",
    "   something needing a developer.",
    "",
    "An opaque failure means an unhandled exception: the response carried no",
    "CORS headers, so the browser hid the body. The real message is in the",
    "outbound log lines for that operation - tell me what to search for.",
    "",
    "Known rejection cause worth checking first: the acquirer's validation",
    "allows only U+0020 to U+024F, so line breaks and smart punctuation in",
    "free-text answers fail. Some offending fields are system-generated and",
    "cannot be edited in the portal - flag it if that is what happened.",
    "",
    "Be brief. Lead with what happened. No preamble.",
    "",
    "---",
    "",
    "[paste console output here]"
  ].join("\n");

  App.sendTool = {};

  // Copy that survives a non-secure origin or a denied permission:
  // fall back to a hidden textarea and execCommand.
  function copy(text, button) {
    var done = function () {
      var was = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = was; }, 1400);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
    } else {
      fallback(text, done);
    }
  }

  function fallback(text, done) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* nothing to do */ }
    document.body.removeChild(area);
  }

  function buildDialog() {
    var dialog = document.createElement("dialog");
    dialog.className = "modal console-tool";
    dialog.id = "send-tool-modal";
    dialog.innerHTML =
      '<div class="modal-head">' +
      "<h2>Acquirer send</h2>" +
      '<button class="button quiet" data-close type="button">Close</button>' +
      "</div>" +
      '<p class="lede console-tool-lede">Open an application in the partner portal, ' +
      "paste this into the browser console and run it. It reads the application " +
      "id from the URL and fires both sends for it.</p>" +
      '<div class="console-tool-block">' +
      '<div class="console-tool-bar">' +
      '<span class="eyebrow">Console snippet</span>' +
      '<button class="button quiet" data-copy="snippet" type="button">Copy</button>' +
      "</div>" +
      '<pre class="console-tool-code" id="send-tool-snippet"></pre>' +
      "</div>" +
      '<details class="console-tool-details">' +
      "<summary>Handover prompt</summary>" +
      '<p class="console-tool-note">Paste this with the console output to get a ' +
      "read on what happened.</p>" +
      '<div class="console-tool-bar">' +
      '<span class="eyebrow">Prompt</span>' +
      '<button class="button quiet" data-copy="prompt" type="button">Copy</button>' +
      "</div>" +
      '<pre class="console-tool-code" id="send-tool-prompt"></pre>' +
      "</details>";

    // textContent, not innerHTML: the snippet is code and must never
    // be parsed as markup.
    dialog.querySelector("#send-tool-snippet").textContent = SNIPPET;
    dialog.querySelector("#send-tool-prompt").textContent = PROMPT;

    dialog.addEventListener("click", function (event) {
      var target = event.target;
      if (target.hasAttribute && target.hasAttribute("data-close")) {
        dialog.close();
        return;
      }
      var which = target.getAttribute && target.getAttribute("data-copy");
      if (which) copy(which === "snippet" ? SNIPPET : PROMPT, target);
      // Backdrop click: the dialog element itself is the click target
      // only when the press landed outside the panel.
      if (target === dialog) dialog.close();
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  App.sendTool.attach = function () {
    var host = document.getElementById("nav-send");
    if (!host) return;

    host.innerHTML =
      '<button class="nav-icon-btn" id="send-tool-trigger" type="button" ' +
      'title="Acquirer send" aria-label="Acquirer send">' +
      '<span class="nav-icon" aria-hidden="true">' + ICON + "</span></button>";

    var dialog = null;
    host.querySelector("#send-tool-trigger").addEventListener("click", function () {
      if (!dialog) dialog = buildDialog();
      dialog.showModal();
    });
  };
})();
