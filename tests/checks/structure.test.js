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
      new RegExp(`^${prefix}assets/js/core/config\\.js$`),
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
    // CLAUDE.md asks for a page module after ui.js, but static pages
    // (e.g. silos/) legitimately omit one. Warn, do not fail.
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

test("every page loads the layered stylesheets in order", () => {
  const LAYERS = ["tokens", "base", "layout", "components", "pages"];
  for (const page of htmlPages()) {
    const prefix = page.includes("/")
      ? "../".repeat(page.split("/").length - 1) : "";
    const hrefs = [...read(page).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)]
      .map((m) => m[1]);
    assert.deepEqual(hrefs, LAYERS.map((n) => `${prefix}assets/css/${n}.css`),
      `${page}: stylesheets must be exactly tokens, base, layout, components, pages (see docs/DESIGN.md).`);
  }
});

test("every page is marked noindex", () => {
  for (const page of htmlPages()) {
    assert.match(read(page), /name="robots"[^>]*content="noindex"/,
      `${page}: missing <meta name="robots" content="noindex">.`);
  }
});
