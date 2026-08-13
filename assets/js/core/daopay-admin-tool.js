// ------------------------------------------------------------------
// daopay-admin-tool.js - A nav icon that opens two browser-console
// snippets for the DaoPay reviewer role: one that creates a portal
// user holding the role, and one that lists who currently holds it.
//
// The portal has no UI for assigning that role - its user-creation
// forms are partner-scoped and offer two other roles only - so this is
// a stopgap the operator runs by hand in the partner portal console.
//
// The snippets carry no host and no auth scope. Both are read at run
// time from the portal's own config.json by the pasted script, in the
// portal's own tab, so this repo, which is public, holds only route
// names and the shape of the call. See docs/SECURITY.md.
//
// Deliberately self-contained: delete this file and its nav slot and
// nothing else changes.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>' +
    '<circle cx="9" cy="7" r="4"></circle>' +
    '<path d="M19 8v6"></path><path d="M22 11h-6"></path></svg>';

  // Held as lines rather than one template literal: the snippets are
  // themselves full of backticks and ${} and stay readable this way.
  // The three arguments on the last line are placeholders the operator
  // edits before running; no real name or address ships in this repo.
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
    "      body: JSON.stringify({ firstName, lastName, email, roleName: 'DaoPayAdmin' })",
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
    "  const byRole = await get('?roleName=DaoPayAdmin');",
    "  const all = await get('?includeDeleted=true');",
    "",
    "  console.log('DaoPay admins:', byRole.length, '| total users:', all.length);",
    "  console.table(byRole.map(u => ({ ...u, partnerId: u.partnerId ?? '(none)' })));",
    "  console.log('role counts across all users:',",
    "    all.reduce((a, u) => (a[u.roleName] = (a[u.roleName] || 0) + 1, a), {}));",
    "})();"
  ].join("\n");

  App.daopayAdminTool = {};

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
    dialog.id = "daopay-admin-modal";
    dialog.innerHTML =
      '<div class="modal-head">' +
      "<h2>DaoPay admin</h2>" +
      '<button class="button quiet" data-close type="button">Close</button>' +
      "</div>" +
      '<p class="lede console-tool-lede">Run these in the browser console on the ' +
      "partner portal while signed in as a global admin. There is no UI for the " +
      "DaoPay reviewer role yet.</p>" +
      '<div class="console-tool-block">' +
      '<p class="console-tool-note">Replace the three arguments on the last line ' +
      "before running. This creates a real account and sends a registration email.</p>" +
      '<div class="console-tool-bar">' +
      '<span class="eyebrow">Add a DaoPay admin</span>' +
      '<button class="button quiet" data-copy="add" type="button">Copy</button>' +
      "</div>" +
      '<pre class="console-tool-code" id="daopay-admin-add"></pre>' +
      "</div>" +
      '<details class="console-tool-details">' +
      "<summary>List current DaoPay admins</summary>" +
      '<div class="console-tool-bar">' +
      '<span class="eyebrow">Console snippet</span>' +
      '<button class="button quiet" data-copy="list" type="button">Copy</button>' +
      "</div>" +
      '<pre class="console-tool-code" id="daopay-admin-list"></pre>' +
      "</details>";

    // textContent, not innerHTML: the snippets are code and must never
    // be parsed as markup.
    dialog.querySelector("#daopay-admin-add").textContent = ADD_SNIPPET;
    dialog.querySelector("#daopay-admin-list").textContent = LIST_SNIPPET;

    dialog.addEventListener("click", function (event) {
      var target = event.target;
      if (target.hasAttribute && target.hasAttribute("data-close")) {
        dialog.close();
        return;
      }
      var which = target.getAttribute && target.getAttribute("data-copy");
      if (which) copy(which === "add" ? ADD_SNIPPET : LIST_SNIPPET, target);
      // Backdrop click: the dialog element itself is the click target
      // only when the press landed outside the panel.
      if (target === dialog) dialog.close();
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  App.daopayAdminTool.attach = function () {
    var host = document.getElementById("nav-daopay-admin");
    if (!host) return;

    host.innerHTML =
      '<button class="nav-icon-btn" id="daopay-admin-trigger" type="button" ' +
      'title="DaoPay admin" aria-label="DaoPay admin">' +
      '<span class="nav-icon" aria-hidden="true">' + ICON + "</span></button>";

    var dialog = null;
    host.querySelector("#daopay-admin-trigger").addEventListener("click", function () {
      if (!dialog) dialog = buildDialog();
      dialog.showModal();
    });
  };
})();
