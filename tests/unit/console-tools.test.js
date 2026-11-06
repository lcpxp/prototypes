// ------------------------------------------------------------------
// tests/unit/console-tools.test.js - Benchmarks for the High risk
// partner setup tool in assets/js/core/console-tools.js.
// Opens the tool's dialog in a Node vm with a minimal DOM shim, lets it
// fetch its texts from assets/snippets/, and pins the snippet: it
// compiles, it is byte-identical to the tested script, and it carries no
// host - the repo is public (docs/SECURITY.md).
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

// The sha256 of the script as tested against the partner portal. A change
// to the snippet's text must be a deliberate change to this value too.
const SNIPPET_SHA256 =
  "f76c2dfa6e9b99c4a7261fe50ccc9bbcf3c6cd30520ed204150e0d24250ba736";

function element() {
  const el = {
    listeners: {}, slots: {},
    addEventListener(type, fn) { el.listeners[type] = fn; },
    querySelector(sel) {
      const slot = sel.match(/data-slot="(\w+)"/);
      if (slot) return (el.slots[slot[1]] = el.slots[slot[1]] || { textContent: "" });
      return el.trigger || (el.trigger = element());
    },
    showModal() { el.open = true; },
  };
  return el;
}

// Mounts the tool, presses its nav icon and waits for both fetches.
async function openTool() {
  const host = element();
  const fetched = [];
  const sandbox = {
    App: { root: ".", escape: (s) => String(s) },
    document: {
      getElementById: (id) => (id === "nav-partner-setup" ? host : null),
      createElement: () => (sandbox.dialog = element()),
      body: { appendChild() {} },
    },
    fetch: async (url) => {
      fetched.push(url);
      const text = read(url.replace(/^\.\//, ""));
      return { ok: true, status: 200, text: async () => text };
    },
    setTimeout,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/console-tools.js"), sandbox,
    { filename: "console-tools.js" });
  sandbox.App.partnerSetupTool.attach();
  assert.match(host.innerHTML, /id="partner-setup-trigger"/);
  host.trigger.listeners.click();
  await new Promise((resolve) => setImmediate(resolve));
  return { dialog: sandbox.dialog, fetched };
}

test("partner setup opens a dialog holding its snippet and prompt", async () => {
  const { dialog, fetched } = await openTool();
  assert.equal(dialog.id, "partner-setup-modal");
  assert.equal(dialog.open, true);
  assert.deepEqual(fetched, ["./assets/snippets/partner-setup.js",
    "./assets/snippets/partner-setup-prompt.txt"]);
  assert.equal(dialog.slots.primary.textContent, read("assets/snippets/partner-setup.js"));
  assert.equal(dialog.slots.extra.textContent, read("assets/snippets/partner-setup-prompt.txt"));
});

test("partner setup snippet compiles and is the tested script, byte for byte", async () => {
  const text = (await openTool()).dialog.slots.primary.textContent;
  assert.doesNotThrow(() => new vm.Script(text));
  assert.equal(crypto.createHash("sha256").update(text, "utf8").digest("hex"), SNIPPET_SHA256);
});

test("partner setup snippet carries no host and reads the portal's config", async () => {
  const text = (await openTool()).dialog.slots.primary.textContent;
  for (const banned of ["http://", "https://", "pxpfinancial"]) {
    assert.ok(!text.toLowerCase().includes(banned), `snippet contains ${banned}`);
  }
  assert.match(text, /^[\x00-\x7F]*$/, "snippet is not pure ASCII");
  assert.ok(text.includes("fetch('/config/config.json')"),
    "snippet must read the API address from the portal's config at run time");
});
