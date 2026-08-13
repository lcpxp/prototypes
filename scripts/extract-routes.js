#!/usr/bin/env node
// ------------------------------------------------------------------
// scripts/extract-routes.js - Reads a LaunchPad API checkout and emits
// its route inventory as JSON: one entry per [Http*] action attribute,
// composed onto its controller [Route], with the version resolved.
//
// This is inventory A of the three in docs/plan/20-API-REFERENCE.md.
// It reads a scratch checkout passed on the command line and NEVER a
// committed copy - the LaunchPad source does not enter this public
// repo, and neither does its output beyond the counts and digest in
// supabase/reference-coverage.json.
//
// Usage:
//   node scripts/extract-routes.js <path-to-Presentation-dir>
//   node scripts/extract-routes.js <path> --digest   (just the sha256)
//
// The seven normalisation rules below each exist because getting one
// wrong produces a diff that is confidently wrong, which is worse than
// no diff at all. The benchmarks in tests/unit/route-extract.test.js
// exercise every one against fixtures, so this file can be trusted
// without the LaunchPad source on hand.
// ------------------------------------------------------------------
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// Rule 5: anchored to line start with only horizontal whitespace
// before it, so "//   [HttpGet]" is a comment and not an endpoint.
// Two LaunchPad controllers and seven v2 actions exist only as
// comments; an unanchored pattern documents them as live.
const ROUTE_RE = /^[ \t]*\[Route\("([^"]+)"\)\]/m;
const VERSION_RE = /^[ \t]*\[ApiVersion\("([^"]+)"\)\]/m;
const ACTION_RE = /^[ \t]*\[Http(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?\]/gm;

// Rule 3: {id}, {applicationId} and {merchantApplicationId} are the
// same slot. Compare positionally; keep the real name on the row.
function normalisePath(route) {
  let p = route.replace(/\{[^}]+\}/g, "{}").replace(/\/+/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  return p.length > 1 ? p.replace(/\/$/, "") : p;
}

// Rule 4: comparison ignores case - /api/Dropdown/CountryCodes and
// /api/dropdown/countrycodes are one route.
function routeKey(method, route) {
  return method.toUpperCase() + " " + normalisePath(route).toLowerCase();
}

function controllerName(file) {
  return path.basename(file, ".cs").replace(/Controller$/, "");
}

// Rule 2: the version segment is a template, not a literal. The route
// text already carries the "v", so the placeholder is replaced by the
// bare major number - substituting "v2" yields "api/vv2".
// Rule 6: no [ApiVersion] means UNVERSIONED, not v1. Twenty-six
// LaunchPad routes serve /api/... with no version segment, and
// assuming v1 is the single largest source of wrong documented paths.
function baseRoute(source, file) {
  const route = ROUTE_RE.exec(source);
  if (!route) return null;
  const declared = VERSION_RE.exec(source);
  const version = declared ? declared[1].split(".")[0] : null;
  let base = route[1].replace(/\[controller\]/g, controllerName(file));
  if (version) base = base.replace(/\{version[^}]*\}/g, version);
  return { base, version };
}

// Rule 1: compose, never read the action attribute alone. An action's
// [HttpPatch("price-sheets/{id}")] on a controller based at
// api/v1/admin/merchant serves api/v1/admin/merchant/price-sheets/{id}
// - reading the action attribute alone invents a top-level resource.
function joinRoute(base, action) {
  const tail = (action || "").replace(/^\/+/, "");
  const head = base.replace(/\/+$/, "");
  return tail ? head + "/" + tail : head;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

// One controller file in, its routes out. Returns [] for a file with
// no route base, which covers helpers, DTOs and fully commented
// controllers alike.
function extractFile(source, file) {
  const found = baseRoute(source, file);
  if (!found) return [];
  const routes = [];
  ACTION_RE.lastIndex = 0;
  let m;
  while ((m = ACTION_RE.exec(source)) !== null) {
    const full = joinRoute(found.base, m[2]);
    routes.push({
      method: m[1].toUpperCase(),
      path: normalisePath(full),
      version: found.version,
      controller: controllerName(file),
      file: file,
      line: lineOf(source, m.index),
    });
  }
  return routes;
}

function walk(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".cs")) out.push(full);
  }
  return out;
}

// The digest is what supabase/reference-coverage.json carries into
// this public repo: a fingerprint of the sorted route list, so a
// session can tell the API changed without any path being committed.
function digestOf(routes) {
  const keys = routes.map((r) => routeKey(r.method, r.path)).sort();
  return crypto.createHash("sha256").update(keys.join("\n")).digest("hex");
}

function extractDir(dir) {
  const routes = [];
  const controllers = new Set();
  for (const file of walk(dir)) {
    const found = extractFile(fs.readFileSync(file, "utf8"), file);
    if (found.length) controllers.add(file);
    routes.push(...found);
  }
  routes.sort((a, b) =>
    routeKey(a.method, a.path).localeCompare(routeKey(b.method, b.path)));
  const byVersion = {};
  for (const r of routes) {
    const key = r.version ? "v" + r.version : "unversioned";
    byVersion[key] = (byVersion[key] || 0) + 1;
  }
  return {
    routes: routes,
    total: routes.length,
    distinct: new Set(routes.map((r) => routeKey(r.method, r.path))).size,
    controllers: controllers.size,
    byVersion: byVersion,
    digest: digestOf(routes),
  };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: node scripts/extract-routes.js <path-to-Presentation-dir> [--digest]");
    process.exit(2);
  }
  const result = extractDir(dir);
  if (process.argv.includes("--digest")) console.log(result.digest);
  else console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  normalisePath, routeKey, controllerName, baseRoute, joinRoute,
  extractFile, extractDir, digestOf,
};
