#!/usr/bin/env node
// ------------------------------------------------------------------
// scripts/gen-surface.js - Regenerates tests/surface-baseline.json.
//
// That file is what tests/checks/surface.test.js compares the repo
// against: every App.* surface with the file(s) that attach it, and
// every page's ordered stylesheet and script includes.
//
// Run this ONLY when a surface or an include genuinely changed, and
// read the diff before committing. The value of the baseline is that
// such a change shows up as a reviewable line rather than as a silent
// side effect of a refactor, so regenerating it without looking is the
// one way to make this gate worthless.
//
// It reads `git ls-files`, so a NEW module must be git-added before you
// regenerate - otherwise its surface is silently missing from the
// baseline and the gate passes while recording nothing.
//
// Run: npm run surface
// ------------------------------------------------------------------
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const tracked = (pattern) =>
  execFileSync("git", ["ls-files", ...pattern], { cwd: ROOT, encoding: "utf8" })
    .split("\n").filter(Boolean);
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

// A surface is any App.<name> = ... or App.<name>.<member> = ... so the
// "extend another module's namespace" pattern (roadmap-detail-export.js
// adding to App.roadmapDetail) is recorded rather than missed.
function appSurfaces() {
  const found = {};
  const files = tracked(["assets/js"])
    .filter((f) => f.endsWith(".js") && !f.endsWith("config.example.js"));
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

// Includes are stored resolved to repo-root paths, so the baseline says
// which FILE a page loads rather than which relative string it used.
function pageIncludes() {
  const out = {};
  for (const page of tracked(["*.html", "**/*.html"]).sort()) {
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

const payload = {
  comment:
    "Generated baseline read by tests/checks/surface.test.js. Regenerate " +
    "DELIBERATELY with `npm run surface` when a surface or an include " +
    "genuinely changes, and read the diff: the point of this file is that " +
    "such a change is a reviewable line, not a silent side effect.",
  appSurfaces: appSurfaces(),
  pageIncludes: pageIncludes(),
};

const target = path.join(ROOT, "tests/surface-baseline.json");
fs.writeFileSync(target, JSON.stringify(payload, null, 2) + "\n");
if (!process.argv.includes("--quiet")) {
  const pages = Object.keys(payload.pageIncludes).length;
  const surfaces = Object.keys(payload.appSurfaces).length;
  console.log(`tests/surface-baseline.json: ${surfaces} surfaces, ${pages} pages`);
}
