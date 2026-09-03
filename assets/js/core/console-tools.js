// ------------------------------------------------------------------
// console-tools.js - The nav's console-snippet tools: Acquirer send
// (App.sendTool) and EU Acquirer admin (App.euAcquirerAdminTool).
//
// Both are stopgaps for actions the partner portal has no button for
// yet. Each is a nav icon that opens a dialog holding a script to paste
// into the portal's own browser console.
//
// No snippet carries a host or an auth scope. Each reads those at run
// time from the portal's own config.json, in the portal's own tab, so
// this repo - which is public - holds only route names and the shape of
// the call. See docs/SECURITY.md.
//
// ONE file for two tools because they were built the same way twice:
// identical copy-with-fallback helpers byte for byte, and dialogs with
// the same head/lede/block/details shape assembled by hand in each. The
// duplication is gone, and the pages that load them make one request
// instead of two. Both surfaces are unchanged - ui.js still renders each
// slot only if its surface exists, so deleting either tool below and its
// nav slot still changes nothing else.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Copy that survives a non-secure origin or a denied permission: fall
  // back to a hidden textarea and execCommand. App.copyText in ui.js has
  // no such fallback - it is for a page's own copy buttons, on a page
  // already served over https.
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

  // Both dialogs have the same shape: a head, a lede, one primary block,
  // and a collapsed extra. Described rather than assembled by hand, so
  // adding a third tool is a data change.
  function bar(eyebrow, key) {
    return '<div class="console-tool-bar">' +
      '<span class="eyebrow">' + App.escape(eyebrow) + "</span>" +
      '<button class="button quiet" data-copy="' + App.escape(key) +
      '" type="button">Copy</button></div>';
  }

  function note(text) {
    return text ? '<p class="console-tool-note">' + App.escape(text) + "</p>" : "";
  }

  function buildDialog(spec) {
    var dialog = document.createElement("dialog");
    dialog.className = "modal console-tool";
    dialog.id = spec.id;
    dialog.innerHTML =
      '<div class="modal-head">' +
      "<h2>" + App.escape(spec.title) + "</h2>" +
      '<button class="button quiet" data-close type="button">Close</button>' +
      "</div>" +
      '<p class="lede console-tool-lede">' + App.escape(spec.lede) + "</p>" +
      '<div class="console-tool-block">' +
      note(spec.primary.note) +
      bar(spec.primary.eyebrow, "primary") +
      '<pre class="console-tool-code" data-slot="primary"></pre>' +
      "</div>" +
      '<details class="console-tool-details">' +
      "<summary>" + App.escape(spec.extra.summary) + "</summary>" +
      note(spec.extra.note) +
      bar(spec.extra.eyebrow, "extra") +
      '<pre class="console-tool-code" data-slot="extra"></pre>' +
      "</details>";

    // textContent, not innerHTML: the snippets are code and must never
    // be parsed as markup.
    dialog.querySelector('[data-slot="primary"]').textContent = spec.primary.text;
    dialog.querySelector('[data-slot="extra"]').textContent = spec.extra.text;

    dialog.addEventListener("click", function (event) {
      var target = event.target;
      if (target.hasAttribute && target.hasAttribute("data-close")) {
        dialog.close();
        return;
      }
      var which = target.getAttribute && target.getAttribute("data-copy");
      if (which) copy(which === "primary" ? spec.primary.text : spec.extra.text, target);
      // Backdrop click: the dialog element itself is the click target
      // only when the press landed outside the panel.
      if (target === dialog) dialog.close();
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  // The dialog is built on first press, not at load: most visits never
  // open either tool.
  function mount(slotId, triggerId, label, icon, spec) {
    var host = document.getElementById(slotId);
    if (!host) return;
    host.innerHTML =
      '<button class="nav-icon-btn" id="' + triggerId + '" type="button" ' +
      'title="' + label + '" aria-label="' + label + '">' +
      '<span class="nav-icon" aria-hidden="true">' + icon + "</span></button>";
    var dialog = null;
    host.querySelector("#" + triggerId).addEventListener("click", function () {
      if (!dialog) dialog = buildDialog(spec);
      dialog.showModal();
    });
  }

  // --- Acquirer send ------------------------------------------------
  // Fires an application's document push and onboarding record from the
  // partner portal, plus a collapsed prompt for reporting the result.

  var SEND_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21.5 2.5 11 13"></path>' +
    '<path d="M21.5 2.5 15 21.5l-4-8.5-8.5-4Z"></path></svg>';

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
    "  for (const p of ['push-to-sftp', 'eu-acquirer-onboarding-record/send']) {",
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
  App.sendTool.attach = function () {
    mount("nav-send", "send-tool-trigger", "Acquirer send", SEND_ICON, {
      id: "send-tool-modal",
      title: "Acquirer send",
      lede: "Open an application in the partner portal, paste this into the " +
        "browser console and run it. It reads the application id from the URL " +
        "and fires both sends for it.",
      primary: { eyebrow: "Console snippet", text: SNIPPET },
      extra: {
        summary: "Handover prompt",
        note: "Paste this with the console output to get a read on what happened.",
        eyebrow: "Prompt",
        text: PROMPT,
      },
    });
  };

  // --- EU Acquirer admin -------------------------------------------------
  // Creates a portal user holding the EU Acquirer reviewer role, and lists
  // who holds it. The portal has no UI for that role: its user-creation
  // forms are partner-scoped and offer two other roles only.

  var DAO_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>' +
    '<circle cx="9" cy="7" r="4"></circle>' +
    '<path d="M19 8v6"></path><path d="M22 11h-6"></path></svg>';

  var ADD_SNIPPET = [
    "(async (firstName, lastName, email) => {",
    "  const cfg = await (await fetch('/config/config.json')).json();",
    "  const api = cfg.msalConfig.apis[0];",
    "  const scopeId = api.scopes[0].split('/')[3];",
    "  const t = [...Object.values(sessionStorage), ...Object.values(localStorage)]",
    "    .map(v => { try { return JSON.parse(v) } catch { return null } })",
    "    .find(o => o?.credentialType === 'AccessToken' && o?.target?.includes(scopeId))?.secret;",
    "  if (!t) return console.error('No API token found - are you signed in?');",
    "",
    "  try {",
    "    const r = await fetch(`${api.uri}v1/admin/users`, {",
    "      method: 'POST',",
    "      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },",
    "      body: JSON.stringify({ firstName, lastName, email, roleName: 'EuAcquirerAdmin' })",
    "    });",
    "    console.log(r.status, (await r.text()).slice(0, 500));",
    "  } catch (e) {",
    "    console.log('opaque failure - check the logs:', e.message);",
    "  }",
    "})('FIRST', 'LAST', 'someone@example.com');"
  ].join("\n");

  var LIST_SNIPPET = [
    "(async () => {",
    "  const cfg = await (await fetch('/config/config.json')).json();",
    "  const api = cfg.msalConfig.apis[0];",
    "  const scopeId = api.scopes[0].split('/')[3];",
    "  const t = [...Object.values(sessionStorage), ...Object.values(localStorage)]",
    "    .map(v => { try { return JSON.parse(v) } catch { return null } })",
    "    .find(o => o?.credentialType === 'AccessToken' && o?.target?.includes(scopeId))?.secret;",
    "  if (!t) return console.error('No API token found - are you signed in?');",
    "  const H = { Authorization: `Bearer ${t}` };",
    "",
    "  const get = async q => {",
    "    const r = await fetch(`${api.uri}v1/admin/users${q}`, { headers: H });",
    "    return r.ok ? r.json() : (console.log(q, r.status, await r.text()), []);",
    "  };",
    "",
    "  const byRole = await get('?roleName=EuAcquirerAdmin');",
    "  const all = await get('?includeDeleted=true');",
    "",
    "  console.log('EU Acquirer admins:', byRole.length, '| total users:', all.length);",
    "  console.table(byRole.map(u => ({ ...u, partnerId: u.partnerId ?? '(none)' })));",
    "  console.log('role counts across all users:',",
    "    all.reduce((a, u) => (a[u.roleName] = (a[u.roleName] || 0) + 1, a), {}));",
    "})();"
  ].join("\n");

  App.euAcquirerAdminTool = {};
  App.euAcquirerAdminTool.attach = function () {
    mount("nav-eu-acquirer-admin", "eu-acquirer-admin-trigger", "EU Acquirer admin", DAO_ICON, {
      id: "eu-acquirer-admin-modal",
      title: "EU Acquirer admin",
      lede: "Run these in the browser console on the partner portal while " +
        "signed in as a global admin. There is no UI for the EU Acquirer reviewer " +
        "role yet.",
      primary: {
        eyebrow: "Add a EU Acquirer admin",
        note: "Replace the three arguments on the last line before running. " +
          "This creates a real account and sends a registration email.",
        text: ADD_SNIPPET,
      },
      extra: {
        summary: "List current EU Acquirer admins",
        eyebrow: "Console snippet",
        text: LIST_SNIPPET,
      },
    });
  };
})();
