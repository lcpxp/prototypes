// ------------------------------------------------------------------
// tests/unit/tools-warm.test.js - Benchmarks for the Splunk warm-up in
// assets/js/core/tools.js: the front door opened before the search so
// the deep link lands on results rather than the tool's error page.
// Split from tools.test.js, which covers the URL builder and the button
// markup; this file covers the two-beat open and the click that starts
// it, and needs a window with open() and a nav slot that listens.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

const BASE = "https://logs.splunkcloud.example/en-GB/app/search/search";
const FRONT = "https://logs.splunkcloud.example";
const ROW = { key: "s", label: "Splunk", icon: "bug", base_url: BASE, query: "index=x" };

// A tab the code was handed back by window.open. Every interaction with
// one is recorded, because what this feature does is entirely a sequence
// of them.
function tab(log, name) {
  return {
    name: name,
    opener: {},
    close() { log.push(name + " closed"); },
    focus() { log.push(name + " focused"); },
    location: { replace(url) { log.push(name + " -> " + url); } },
  };
}

// Loads the module with a window whose open() is scripted per call:
// `opens` lists what each successive open returns, null standing for a
// tab the browser refused. Timers fire immediately, so a test reads as
// one pass rather than a wait.
function load(opens, log, host) {
  const calls = [];
  const tabs = [];
  const sandbox = {
    location: { pathname: "/dashboard.html", href: "http://t/", search: "", hash: "" },
    navigator: {},
    setTimeout: (fn) => { fn(); return 0; },
    document: {
      addEventListener() {},
      getElementById: (id) => (id === "nav-tools" ? host || null : null),
    },
    open(url) {
      calls.push(url);
      const next = opens[calls.length - 1];
      if (next === null) return null;
      const handed = tab(log, next);
      tabs.push(handed);
      return handed;
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/registry.js"), sandbox, { filename: "registry.js" });
  sandbox.App.root = ".";
  vm.runInContext(read("assets/js/core/tools.js"), sandbox, { filename: "tools.js" });
  return { App: sandbox.App, calls, tabs };
}

test("only a Splunk row asks for a warm-up, and only into its own front door", () => {
  const { App } = load([], []);
  // The host is read off the row's target, so the host itself stays in
  // the database - this repo never learns where Splunk is.
  assert.equal(App.tools.warmOrigin(ROW), FRONT);
  // Every other tool is an ordinary link: the extra tab is a quirk of
  // one tool, not a rule about links.
  assert.equal(App.tools.warmOrigin({ base_url: "https://tickets.example.com/x", query: "a" }), "");
  // A Splunk row already pointing at the front door warms itself.
  assert.equal(App.tools.warmOrigin({ base_url: FRONT + "/" }), "");
  assert.equal(App.tools.warmOrigin({}), "");
});

test("render marks the warmed button and leaves every other link plain", () => {
  const { App } = load([], []);
  const html = App.tools.render([ROW]);
  assert.match(html, new RegExp('data-warm="' + FRONT + '"'));
  assert.match(html, /target="_blank"/, "the fallback path is still a plain new-tab link");
  assert.ok(
    !/data-warm/.test(App.tools.render([
      { label: "Other", icon: "bug", base_url: "https://tickets.example.com/x" },
    ])),
    "a row that needs no warm-up must not be intercepted"
  );
});

test("the front door opens first, then the search, and the front door closes", () => {
  const log = [];
  const { App, calls } = load(["front", "search"], log);
  assert.equal(App.tools.openWarmed(BASE, FRONT), true);
  assert.deepEqual(calls, [FRONT, BASE], "front door first, search second");
  assert.deepEqual(log, ["search focused", "front closed"],
    "the search tab is the one left in front");
});

test("the search tab is severed from this page once it is open", () => {
  // The anchors carry rel=noopener for this reason. This path cannot ask
  // for it at open time, because a window opened with noopener hands
  // back nothing and the sequence needs the handle to know the tab was
  // allowed at all - so it cuts the link immediately afterwards instead.
  const { App, tabs } = load(["front", "search"], []);
  App.tools.openWarmed(BASE, FRONT);
  assert.equal(tabs[1].opener, null);
});

test("a blocked search tab reuses the front door rather than stranding the press", () => {
  // The press's activation is often spent on the front door, so browsers
  // refusing the second tab is expected rather than exceptional. The
  // visitor still ends on the search, with a session behind them.
  const log = [];
  const { App, calls } = load(["front", null], log);
  assert.equal(App.tools.openWarmed(BASE, FRONT), true);
  assert.deepEqual(calls, [FRONT, BASE]);
  assert.deepEqual(log, ["front -> " + BASE]);
});

test("a blocked front door hands the press back to the anchor", () => {
  // Nothing opened, so the click must not be swallowed: the plain
  // target=_blank link then behaves exactly as it did before.
  const log = [];
  const { App, calls } = load([null], log);
  assert.equal(App.tools.openWarmed(BASE, FRONT), false);
  assert.deepEqual(calls, [FRONT]);
  assert.deepEqual(log, []);
});

// --- The click that starts it ---------------------------------------

function navSlot() {
  const host = { innerHTML: "", handlers: {} };
  host.addEventListener = (type, fn) => { host.handlers[type] = fn; };
  return host;
}

function anchor(warm) {
  const el = { href: BASE, getAttribute: (n) => (n === "data-warm" ? warm : null) };
  el.closest = (sel) => (warm && sel.indexOf("data-warm") !== -1 ? el : null);
  return el;
}

function press(host, link, extra) {
  const event = Object.assign({ target: link, button: 0, prevented: false }, extra || {});
  event.preventDefault = () => { event.prevented = true; };
  host.handlers.click(event);
  return event.prevented;
}

function attached(opens, log) {
  const host = navSlot();
  const loaded = load(opens, log, host);
  loaded.App.db = { from: () => ({ select: () => ({ order: () => ({ then: () => {} }) }) }) };
  loaded.App.onAuthed = () => {};
  loaded.App.tools.attach();
  return { host: host, calls: loaded.calls };
}

test("a plain press runs the warm-up instead of following the link", () => {
  const log = [];
  const { host, calls } = attached(["front", "search"], log);
  assert.equal(press(host, anchor(FRONT)), true, "the anchor must not also navigate");
  assert.deepEqual(calls, [FRONT, BASE]);
});

test("a modified press is left to the browser", () => {
  // Middle-click, cmd/ctrl-click, shift and alt are the visitor telling
  // the browser where to put the page. A warm-up would only fight them.
  for (const extra of [{ button: 1 }, { metaKey: true }, { ctrlKey: true },
                       { shiftKey: true }, { altKey: true }]) {
    const { host, calls } = attached(["front", "search"], []);
    assert.equal(press(host, anchor(FRONT), extra), false, JSON.stringify(extra));
    assert.deepEqual(calls, [], JSON.stringify(extra));
  }
});

test("a press on an unmarked link is not intercepted", () => {
  const { host, calls } = attached(["front", "search"], []);
  assert.equal(press(host, anchor(null)), false);
  assert.deepEqual(calls, []);
});
