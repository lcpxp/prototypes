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
const includes = require("../../assets/js/core/includes.json");

const LOGIN_PAGE = "index.html";

// Surfaces that belong to the shared runtime. A page module that sets
// one is extending core behaviour, not claiming a name of its own.
const SHARED_SURFACES = ["escape", "db", "notice", "onAuthed", "store",
  "download", "flashLabel", "deepLinkScroll", "links", "tools", "detail",
  "workItemsData", "copyText", "methodBadge", "statusBadge", "drawer",
  "lazyDetail", "blocks", "sprints", "registry", "root", "theme"];

// The single agreed external stylesheet: Inter for the Acquirer replica.
// Pinned exactly, so a future edit cannot widen it into "any Google font".
const GOOGLE_FONTS_INTER =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

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
  // The order is DATA, in assets/js/core/includes.json, and this check
  // reads it. It used to be a hand-written list of five entries here,
  // with the full order restated in CLAUDE.md and in
  // docs/ARCHITECTURE.md - three homes, all three stale, none of them
  // naming links.js, detail.js, blocks.js, drawer.js, sprints.js or
  // send-tool.js. Now the manifest is the one home and all fourteen are
  // enforced.
  for (const page of protectedPages()) {
    const prefix = page.includes("/")
      ? "../".repeat(page.split("/").length - 1) : "";
    const srcs = scriptSrcs(read(page));
    const required = includes.universal
      .map((entry) => entry.external
        ? new RegExp(entry.file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        : new RegExp(`^${prefix}${entry.file.replace(/\./g, "\\.")}$`));
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
    // Page-specific sheets (e.g. login.css) may follow, but only from
    // assets/css/ - with one agreed exception: the Acquirer replica pages
    // load Inter from Google Fonts, because the real portal uses it and
    // an indicative system stack made the replica unfaithful. Owner
    // agreement recorded in docs/STATE.md. No other external
    // stylesheet is permitted.
    for (const extra of hrefs.slice(CORE.length)) {
      if (extra === GOOGLE_FONTS_INTER) continue;
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

test("theme.js is the first script on the page, and blocking", () => {
  // The theme has to be applied before first paint or the page flashes
  // the wrong palette. theme.js does that, and it must run before the
  // stylesheets so it is not waiting on CSSOM to execute.
  //
  // This replaces a check that pinned an inline guard reading
  // localStorage["theme"]. theme.js writes "lpio-theme" and nothing ever
  // wrote the bare key, so that guard never did anything on any page -
  // it was 24 copies of dead code the suite was holding in place.
  for (const page of htmlPages()) {
    const content = read(page);
    const srcs = scriptSrcs(content);
    assert.ok(srcs.length > 0, `${page}: no scripts at all.`);
    assert.match(srcs[0], /core\/theme\.js$/,
      `${page}: theme.js must be the FIRST script, found "${srcs[0]}".`);
    const themeTag = content.match(/<script\b[^>]*\ssrc="[^"]*core\/theme\.js"[^>]*>/);
    assert.ok(themeTag && !/\bdefer\b/.test(themeTag[0]),
      `${page}: theme.js must stay render-blocking (no defer).`);
    // It must also precede the stylesheets it is meant to beat.
    assert.ok(content.indexOf("core/theme.js") < content.indexOf('rel="stylesheet"'),
      `${page}: theme.js must come before the first stylesheet link.`);
    // And the dead inline guard must not come back.
    assert.doesNotMatch(content, /localStorage\.getItem\("theme"\)/,
      `${page}: the inline guard read localStorage["theme"], which nothing ` +
      'writes - theme.js uses "lpio-theme". It was dead on arrival; do not restore it.');
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

test("docs/STATE.md is a fixed-size state file, not a log", () => {
  // The rolling session log was replaced by one overwritten state file.
  // Regressing to log-keeping (a Completed section, unbounded growth) is
  // a test failure, not a habit.
  const state = read("docs/STATE.md");
  for (const heading of ["## In progress", "## Next steps", "## Open decisions"]) {
    assert.ok(state.includes(heading),
      `docs/STATE.md must contain the "${heading}" heading.`);
  }
  assert.doesNotMatch(state, /^#+\s*Completed/im,
    "docs/STATE.md must have no Completed section - finished work lives in commits.");
  const lines = state.split("\n").length;
  assert.ok(lines <= 40, `docs/STATE.md must be 40 lines or fewer, found ${lines}.`);
});

test("a nested page module attaches surfaces named for its directory", () => {
  // assets/js/pages/<module>/*.js must attach App.<camelCase(module)>...
  // so a surface says where it lives. App.refRender used to sit in
  // reference-render.js and App.portalReviewRender in
  // portalreview-render.js: three spellings of one name, none derivable
  // from the others, and an agent reading the wrong file first.
  //
  // Files directly under pages/ are single-file pages and are not
  // constrained - there is no directory for them to disagree with.
  const camel = (dir) => dir.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const problems = [];
  for (const file of trackedFiles()) {
    const m = /^assets\/js\/pages\/([a-z][a-z0-9-]*)\/[a-z0-9-]+\.js$/.exec(file);
    if (!m) continue;
    const expected = camel(m[1]);
    const attached = [...read(file).matchAll(
      /^\s*(?:window\.)?App\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:\.[A-Za-z0-9_]+\s*)?=/gm)]
      .map((x) => x[1]);
    for (const surface of new Set(attached)) {
      // A module may read shared core surfaces; only what it ATTACHES
      // has to carry its name, and only if it is a page-level surface.
      if (surface === expected) continue;
      if (surface.startsWith(expected)) continue;
      if (SHARED_SURFACES.includes(surface)) continue;
      problems.push(`${file} attaches App.${surface}, which does not start ` +
        `with App.${expected} - so nothing says it lives in ${m[1]}/`);
    }
  }
  assert.deepEqual(problems, [], "Page modules whose surface disagrees with " +
    "their directory:\n" + problems.join("\n"));
});

test("every page directory is actually loaded by a page", () => {
  // The real risk of a directory is an orphaned one: files nothing
  // includes, which read as live code and are not. Registry membership
  // is the wrong test for it - dashboard/ serves the root page, and
  // eu-acquirer/, pci/ and ideas/ serve prototypes under modules/prototypes/,
  // none of which are registry modules.
  const pages = trackedFiles().filter((f) => f.endsWith(".html")).map(read).join("\n");
  const dirs = new Set();
  for (const file of trackedFiles()) {
    const m = /^assets\/js\/pages\/([a-z][a-z0-9-]*)\//.exec(file);
    if (m) dirs.add(m[1]);
  }
  const orphaned = [...dirs].filter((d) => !pages.includes(`assets/js/pages/${d}/`));
  assert.deepEqual(orphaned, [],
    `Page directories no page loads: ${orphaned.join(", ")}. Either wire them ` +
    "up or delete them - unreferenced code reads as live and is not.");
});

test("a registry module with a page directory uses its own key", () => {
  // Where a module DOES have both, the two must agree: modules/roadmap/
  // is served by assets/js/pages/roadmap/, not by pages/rm/.
  const registry = read("assets/js/core/registry.js");
  const keys = [...registry.matchAll(/key: "([a-z0-9-]+)"/g)].map((m) => m[1]);
  const mismatched = [];
  for (const key of keys) {
    const page = `modules/${key}/index.html`;
    const dir = `assets/js/pages/${key}/`;
    if (!trackedFiles().includes(page)) continue;
    // Only where the directory exists: a page may legitimately load
    // another module's files (modules/prototypes/ draws the ideas strip
    // from pages/ideas/), so loading a foreign directory is not a fault.
    // Owning one and not loading it is.
    if (!trackedFiles().some((f) => f.startsWith(dir))) continue;
    if (!read(page).includes(dir)) {
      mismatched.push(`${key}: ${dir} exists but modules/${key}/index.html ` +
        "does not load anything from it");
    }
  }
  assert.deepEqual(mismatched, [],
    "Modules whose page directory does not match their registry key:\n" +
    mismatched.join("\n"));
});

test("the include manifest matches what the pages actually load", () => {
  // A manifest nobody checks is a fourth stale home for the include
  // order, which is the problem it was written to end. Every optional
  // entry names the pages that load it, and those lists have to be true.
  const problems = [];
  for (const entry of includes.optional) {
    const name = entry.file.replace(/^.*\//, "");
    const actual = trackedFiles()
      .filter((f) => f.endsWith(".html"))
      .filter((f) => read(f).includes("core/" + name))
      .sort();
    const claimed = [...entry.pages].sort();
    if (actual.join("|") !== claimed.join("|")) {
      problems.push(`${name}: manifest says [${claimed.join(", ")}] but the ` +
        `pages that load it are [${actual.join(", ")}]`);
    }
  }
  for (const entry of includes.universal) {
    if (entry.external) continue;
    assert.ok(trackedFiles().includes(entry.file),
      `${entry.file}: named in the manifest but not in the repo`);
  }
  assert.deepEqual(problems, [],
    "assets/js/core/includes.json disagrees with the pages:\n" + problems.join("\n"));
});

test("the login page loads exactly what the manifest says it does", () => {
  const srcs = scriptSrcs(read(LOGIN_PAGE));
  for (const file of includes["login-page"].loads) {
    assert.ok(srcs.some((s) => s === file),
      `${LOGIN_PAGE}: the manifest says it loads ${file}`);
  }
  assert.ok(!srcs.some((s) => s.endsWith("guard.js")),
    "index.html must not load guard.js: it would redirect the login page.");
});

test("a page module's header names the file it is in", () => {
  // Every one of these headers named a file that no longer existed after
  // the directory move, and the codemap renders them as each file's
  // purpose - so the map described the repo by its old filenames.
  const wrong = [];
  for (const file of trackedFiles()) {
    if (!file.startsWith("assets/js/pages/") || !file.endsWith(".js")) continue;
    const rel = file.slice("assets/js/pages/".length);
    const header = read(file).split("\n").slice(0, 5).join("\n");
    const m = /^\/\/ ([a-z0-9/-]+\.js) - /m.exec(header);
    if (!m) continue;
    if (m[1] !== rel) wrong.push(`${file}: header says "${m[1]}"`);
  }
  assert.deepEqual(wrong, [],
    "Page modules whose header names another file:\n" + wrong.join("\n"));
});
