// ------------------------------------------------------------------
// tests/checks/surface.test.js - The refactor safety net.
//
// Two things nothing else in the suite watches:
//
//   1. The App namespace. Every App.<name> surface, and which file
//      attaches it. A rename that drops a surface, or moves it to a
//      file nothing loads, fails here rather than in a browser.
//   2. Per-page includes. Each page's ordered stylesheets and scripts.
//      A page silently losing an include produces NO error - the page
//      renders its shell, the unit suite passes, and one feature is
//      quietly gone. This is the only check that sees it.
//
// The expected values live in tests/surface-baseline.json, regenerated
// deliberately with `npm run surface`. Keeping them as data is the
// point: a genuine change is one reviewable line in a diff, and a
// refactor that changes them by accident cannot pass quietly.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { trackedFiles, read } = require("../lib/repo.js");
const baseline = require("../surface-baseline.json");

const REGENERATE = "Run `npm run surface`, read the diff, and commit it only " +
  "if every line is a change you meant to make.";

function currentSurfaces() {
  const found = {};
  const files = trackedFiles()
    .filter((f) => f.startsWith("assets/js/") && f.endsWith(".js"))
    .filter((f) => !f.endsWith("config.example.js"));
  for (const file of files) {
    const re = /^\s*(?:window\.)?App\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:\.[A-Za-z0-9_]+\s*)?=/gm;
    for (const m of read(file).matchAll(re)) {
      (found[m[1]] = found[m[1]] || new Set()).add(file);
    }
  }
  const out = {};
  for (const key of Object.keys(found).sort()) out[key] = [...found[key]].sort();
  return out;
}

function currentIncludes() {
  const out = {};
  for (const page of trackedFiles().filter((f) => f.endsWith(".html")).sort()) {
    const src = read(page);
    const dir = path.dirname(page);
    const resolve = (href) =>
      /^https?:/.test(href) ? href : path.normalize(path.join(dir, href));
    out[page] = {
      css: [...src.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => resolve(m[1])),
      js: [...src.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => resolve(m[1])),
    };
  }
  return out;
}

test("every App surface in the baseline still exists", () => {
  const now = currentSurfaces();
  const missing = Object.keys(baseline.appSurfaces).filter((k) => !now[k]);
  assert.deepEqual(missing, [],
    `App surfaces have disappeared: ${missing.join(", ")}. A page that calls ` +
    `one of these now throws. If the removal is intended: ${REGENERATE}`);
});

test("no App surface has appeared without being recorded", () => {
  const now = currentSurfaces();
  const added = Object.keys(now).filter((k) => !baseline.appSurfaces[k]);
  assert.deepEqual(added, [],
    `Undeclared App surfaces: ${added.join(", ")}. A new shared surface is a ` +
    `decision, not a detail. ${REGENERATE}`);
});

test("every App surface is attached by the files the baseline names", () => {
  const now = currentSurfaces();
  const moved = [];
  for (const [key, files] of Object.entries(baseline.appSurfaces)) {
    if (!now[key]) continue; // reported by the first test
    const a = files.join(", ");
    const b = now[key].join(", ");
    if (a !== b) moved.push(`App.${key}: baseline [${a}] but found [${b}]`);
  }
  assert.deepEqual(moved, [],
    "App surfaces attached from different files than recorded:\n" +
    moved.join("\n") + `\n${REGENERATE}`);
});

test("every page loads exactly the stylesheets and scripts recorded for it", () => {
  const now = currentIncludes();
  const problems = [];
  for (const [page, want] of Object.entries(baseline.pageIncludes)) {
    const got = now[page];
    if (!got) { problems.push(`${page}: page is gone from the repo`); continue; }
    for (const kind of ["css", "js"]) {
      const a = want[kind], b = got[kind];
      if (a.join("|") === b.join("|")) continue;
      const lost = a.filter((x) => !b.includes(x));
      const gained = b.filter((x) => !a.includes(x));
      problems.push(
        `${page} (${kind}): ` +
        (lost.length ? `LOST ${lost.join(", ")}. ` : "") +
        (gained.length ? `GAINED ${gained.join(", ")}. ` : "") +
        (!lost.length && !gained.length ? "same set, different ORDER. " : ""));
    }
  }
  assert.deepEqual(problems, [],
    "Page includes differ from the baseline:\n" + problems.join("\n") +
    `\n${REGENERATE}`);
});

test("every recorded include resolves to a file that exists", () => {
  // A path that 404s costs one feature and no error the suite can see.
  const tracked = new Set(trackedFiles());
  const missing = [];
  for (const [page, sets] of Object.entries(baseline.pageIncludes)) {
    for (const kind of ["css", "js"]) {
      for (const target of sets[kind]) {
        if (/^https?:/.test(target)) continue;
        if (!tracked.has(target)) missing.push(`${page} -> ${target}`);
      }
    }
  }
  assert.deepEqual(missing, [],
    "Pages reference files that do not exist:\n" + missing.join("\n"));
});
