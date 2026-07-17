// ------------------------------------------------------------------
// tests/checks/structure.test.js - Page structure gates.
// Enforces the CLAUDE.md front-end rules: script include order on
// protected pages, data-root on nested pages, guard.js absent from
// the login page, robots noindex everywhere.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read } = require("../lib/repo.js");

const LOGIN_PAGE = "index.html";

function htmlPages() {
  return trackedFiles().filter((f) => f.endsWith(".html"));
}
function protectedPages() {
  return htmlPages().filter((f) => f !== LOGIN_PAGE);
}
function scriptSrcs(content) {
  return [...content.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
}

test("protected pages include scripts in the required order", () => {
  for (const page of protectedPages()) {
    const prefix = page.includes("/")
      ? "../".repeat(page.split("/").length - 1) : "";
    const srcs = scriptSrcs(read(page));
    const required = [
      /@supabase\/supabase-js/,
      new RegExp(`^${prefix}assets/js/core/supabase\\.js$`),
      new RegExp(`^${prefix}assets/js/core/registry\\.js$`),
      new RegExp(`^${prefix}assets/js/core/guard\\.js$`),
      new RegExp(`^${prefix}assets/js/core/ui\\.js$`),
    ];
    let cursor = -1;
    for (const re of required) {
      const idx = srcs.findIndex((s, i) => i > cursor && re.test(s));
      assert.ok(idx > cursor,
        `${page}: missing or out-of-order script matching ${re}. Order found: ${srcs.join(", ")}`);
      cursor = idx;
    }
    // CLAUDE.md asks for a page module after ui.js, but a purely
    // static page legitimately omits one. Warn, do not fail.
    if (srcs.length === cursor + 1) {
      console.warn(`WARN ${page}: no page module after ui.js (static page?).`);
    }
  }
});

test("pages below the repo root set data-root on <body>", () => {
  for (const page of protectedPages().filter((p) => p.includes("/"))) {
    assert.match(read(page), /<body[^>]*\sdata-root="/,
      `${page}: nested page must set data-root on <body> (see guard.js).`);
  }
});

test("module pages declare a data-module key known to the registry", () => {
  const registry = read("assets/js/core/registry.js");
  const knownKeys = [...registry.matchAll(/key: "([a-z0-9-]+)"/g)].map((m) => m[1]);
  for (const page of protectedPages().filter((p) => p.includes("/"))) {
    const m = read(page).match(/<body[^>]*\sdata-module="([^"]*)"/);
    assert.ok(m,
      `${page}: module page must set data-module on <body> so guard.js can enforce access.`);
    assert.ok(knownKeys.includes(m[1]),
      `${page}: data-module "${m[1]}" is not a key in assets/js/core/registry.js (${knownKeys.join(", ")}).`);
  }
});

test("login page uses auth.js and never loads guard.js", () => {
  const srcs = scriptSrcs(read(LOGIN_PAGE));
  assert.ok(srcs.some((s) => s.endsWith("assets/js/core/auth.js")),
    "index.html must load assets/js/core/auth.js");
  assert.ok(!srcs.some((s) => s.endsWith("guard.js")),
    "index.html must not load guard.js (it would redirect the login page).");
});

test("every page loads the core stylesheets first, in order", () => {
  const CORE = ["tokens", "base", "layout", "components", "pages"];
  for (const page of htmlPages()) {
    const prefix = page.includes("/")
      ? "../".repeat(page.split("/").length - 1) : "";
    const hrefs = [...read(page).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)]
      .map((m) => m[1]);
    assert.deepEqual(hrefs.slice(0, CORE.length),
      CORE.map((n) => `${prefix}assets/css/${n}.css`),
      `${page}: the first stylesheets must be tokens, base, layout, components, pages in order (see docs/DESIGN.md).`);
    // Page-specific sheets (e.g. login.css) may follow, but only from assets/css/.
    for (const extra of hrefs.slice(CORE.length)) {
      assert.match(extra, new RegExp(`^${prefix}assets/css/[a-z-]+\\.css$`),
        `${page}: extra stylesheet "${extra}" must be a page sheet under assets/css/.`);
    }
  }
});

test("every page is marked noindex", () => {
  for (const page of htmlPages()) {
    assert.match(read(page), /name="robots"[^>]*content="noindex"/,
      `${page}: missing <meta name="robots" content="noindex">.`);
  }
});

test("every page has exactly one theme guard", () => {
  // The inline theme guard must run once, before the stylesheets, to
  // set data-theme ahead of first paint. A past multi-edit duplicated
  // it once per stylesheet link on the module pages; this pins it to one.
  for (const page of htmlPages()) {
    const n = (read(page).match(/localStorage\.getItem\("theme"\)/g) || []).length;
    assert.equal(n, 1,
      `${page}: the inline theme guard must appear exactly once, found ${n}.`);
  }
});

test("external scripts load deferred from <head> (theme.js excepted)", () => {
  // Scripts live in <head> with defer so they never block first paint;
  // defer preserves execution order, so the include contract still holds.
  // theme.js is the one intentional exception: it must run before paint
  // to apply the stored/OS theme without a flash, so it stays blocking.
  for (const page of htmlPages()) {
    const content = read(page);
    const headEnd = content.indexOf("</head>");
    const body = headEnd === -1 ? content : content.slice(headEnd);
    assert.ok(!/<script\b[^>]*\ssrc=/.test(body),
      `${page}: external scripts must live in <head> with defer, not in <body>.`);
    for (const [full, src] of content.matchAll(/<script\b[^>]*\ssrc="([^"]+)"[^>]*>/g)) {
      if (/core\/theme\.js$/.test(src)) {
        assert.ok(!/\bdefer\b/.test(full),
          `${page}: theme.js must stay render-blocking (no defer) to prevent a theme flash.`);
      } else {
        assert.match(full, /\bdefer\b/,
          `${page}: <script src="${src}"> must carry defer.`);
      }
    }
  }
});
