#!/usr/bin/env node
// ------------------------------------------------------------------
// scripts/audit.js - One-screen repo health report. Read-only; reuses
// tests/lib/repo.js so its figures match the gates. Run: npm run audit
// ------------------------------------------------------------------
"use strict";
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { ROOT, trackedFiles, read } = require("../tests/lib/repo.js");
const budget = require("../tests/size-budget.json");

function row(label, value) { console.log("  " + String(label).padEnd(31) + " " + value); }
function head(title) { console.log("\n" + title); }

// 1. Test totals - run the suite and parse the TAP summary (node --test
//    exits non-zero on failure, so capture stdout from the error too).
function testTotals() {
  var out = "";
  try {
    out = execFileSync("node", ["--test", "tests/**/*.test.js"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    out = (e.stdout || "") + (e.stderr || "");
  }
  var pick = function (re) { var m = out.match(re); return m ? m[1] : "?"; };
  return {
    tests: pick(/# tests (\d+)/),
    pass: pick(/# pass (\d+)/),
    fail: pick(/# fail (\d+)/),
  };
}

// 2. Files over their soft budget with nothing recorded about it.
//    The exempt trees and the acknowledgements are read from
//    tests/size-budget.json rather than restated here: this figure and
//    the gate in tests/checks/size.test.js must never disagree.
function overSoft() {
  var out = [];
  var exemptTrees = Object.keys(budget["exempt-trees"] || {});
  trackedFiles().forEach(function (f) {
    if (budget.generated.includes(f)) return;
    if (exemptTrees.some(function (t) { return f.indexOf(t) === 0; })) return;
    if (budget.exceptions[f] || (budget.acknowledged || {})[f]) return;
    var rule = budget.byExtension[path.extname(f)];
    if (!rule) return;
    var n = read(f).split("\n").length;
    if (n > rule.soft) out.push(f + " (" + n + " > " + rule.soft + ")");
  });
  return out;
}

// 3. Schema tables with no matching mention in policies.sql. The
//    security suite is authoritative; this is a fast heads-up.
function tablesMissingPolicy() {
  var schema = trackedFiles()
    .filter(function (f) { return f.startsWith("supabase/schema/") && f.endsWith(".sql"); })
    .map(read).join("\n");
  var policies = read("supabase/policies.sql");
  var tables = (schema.match(/create table if not exists public\.(\w+)/gi) || [])
    .map(function (s) { return s.replace(/.*public\./i, ""); });
  return tables.filter(function (t) {
    return !new RegExp("public\\." + t + "\\b").test(policies);
  });
}

// 4. HTML pages that do not apply the theme before first paint.
//    theme.js must be the first script and must NOT be deferred. This
//    replaced a count of an inline guard that read localStorage["theme"]
//    - a key nothing ever wrote, so the guard never did anything.
function themeGuardAnomalies() {
  return trackedFiles()
    .filter(function (f) { return f.endsWith(".html"); })
    .map(function (f) {
      var c = read(f);
      var first = (c.match(/<script[^>]+src="([^"]+)"/) || [])[1] || "";
      if (!/core\/theme\.js$/.test(first)) return f + " (first script: " + (first || "none") + ")";
      var tag = c.match(/<script\b[^>]*\ssrc="[^"]*core\/theme\.js"[^>]*>/);
      if (tag && /\bdefer\b/.test(tag[0])) return f + " (theme.js deferred)";
      if (/localStorage\.getItem\("theme"\)/.test(c)) return f + " (dead inline guard is back)";
      return null;
    })
    .filter(Boolean);
}

// 5. Promise chains with no rejection handler.
//
//    This used to count ".then(" against ".catch(" and print "35 / 4",
//    which reads like 31 unhandled rejections. It never was: the count
//    could not see the TWO-ARGUMENT form, .then(onOk, onErr), which is
//    how this repo handles the one path that actually throws
//    (work-items-data.js, whose four callers all use it). It also could
//    not see that the Supabase client RESOLVES with { data, error }
//    rather than rejecting, so most chains have nothing to catch and a
//    .catch would be dead code.
//
//    So: walk to the matching close paren of each .then(, and count a
//    chain as handled if it takes a second argument or is followed by
//    .catch. A metric that cries wolf gets ignored, and then so does
//    the real thing.
function unhandledChains() {
  var total = 0, twoArg = 0, caught = 0, checked = 0;
  var bare = [];
  trackedFiles()
    .filter(function (f) { return f.startsWith("assets/js/") && f.endsWith(".js"); })
    .forEach(function (f) {
      var src = read(f);
      var re = /\.then\(/g, m;
      while ((m = re.exec(src))) {
        total++;
        var i = m.index + 6, depth = 1, inStr = null, commaAtTop = false;
        while (i < src.length && depth > 0) {
          var ch = src[i], prev = src[i - 1];
          if (inStr) { if (ch === inStr && prev !== "\\") inStr = null; }
          else if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
          else if (ch === "(" || ch === "{" || ch === "[") depth++;
          else if (ch === ")" || ch === "}" || ch === "]") { depth--; if (depth === 0) break; }
          else if (ch === "," && depth === 1) commaAtTop = true;
          i++;
        }
        if (commaAtTop) { twoArg++; continue; }
        if (/^\s*\)?\s*\.catch\(/.test(src.slice(i, i + 220))) { caught++; continue; }
        // The Supabase client resolves with { data, error }: a handler
        // that reads .error IS the error path, and a .catch beside it
        // would be dead code. Counting those as unhandled is what made
        // the old metric useless.
        var body = src.slice(m.index, i);
        if (/\berror\b/.test(body) || /\bthrow\b/.test(body)) { checked++; continue; }
        bare.push(f + ":" + src.slice(0, m.index).split("\n").length);
      }
    });
  return { total: total, twoArg: twoArg, caught: caught, checked: checked, bare: bare };
}

// 6. Stale flat-layout path references (the security gate's dual config
//    ban and the closed archive are intentional and excluded).
function stalePaths() {
  var re = /reference\.html|users\.html|(^|[^\w/])main\.css|assets\/js\/config\.js/g;
  var hits = 0;
  trackedFiles().forEach(function (f) {
    if (!/\.(md|js|html)$/.test(f)) return;
    if (f === "tests/checks/security.test.js") return;
    if (f.startsWith("docs/sessions-archive/")) return;
    if (budget.generated.includes(f)) return;
    hits += (read(f).match(re) || []).length;
  });
  return hits;
}

// 6. Database drift at a glance. The gate that fails a commit lives in
//    tests/checks/schema-drift.test.js; this is the one-screen read.
function snapshotSummary() {
  var snap = JSON.parse(read("supabase/schema-snapshot.json"));
  var dir = path.join(ROOT, "supabase", "migrations");
  var files = require("node:fs").readdirSync(dir)
    .filter(function (f) { return f.endsWith(".sql"); });
  return {
    tables: Object.keys(snap.tables || {}).length,
    policies: (snap.policies || []).length,
    migrations: (snap.migrations || []).length,
    files: files.length,
  };
}

var t = testTotals();
console.log("LPIO audit");
head("Tests");
row("pass / fail / total", t.pass + " / " + t.fail + " / " + t.tests);

head("Size");
var os = overSoft();
row("over soft, unacknowledged", os.length);
os.forEach(function (f) { row("", f); });

head("Security");
var mp = tablesMissingPolicy();
row("schema tables missing policy", mp.length + (mp.length ? " (" + mp.join(", ") + ")" : ""));

head("Database");
var snap = snapshotSummary();
row("snapshot tables / policies", snap.tables + " / " + snap.policies);
row("applied migrations", snap.migrations + " (files: " + snap.files + ")");
row("snapshot vs migration files", snap.migrations === snap.files
  ? "in step" : "DRIFT - run npm test for detail");

// Knowledge decay, in the order it matters: the promises already kept
// first, so a zero that has become a one is the line you read.
head("Knowledge");
try {
  var kc = JSON.parse(read("supabase/knowledge-coverage.json"));
  var kb = JSON.parse(read("tests/knowledge-budget.json"));
  var kept = ["terms.no_source", "terms.no_definition", "stages.no_source",
    "documents.no_digest", "findings.promoted_without_item", "embeddings.stale"];
  var broken = kept.filter(function (k) {
    return kc.figures[k] && kc.figures[k].n > 0;
  });
  row("promises kept (must be 0)", broken.length === 0
    ? "all " + kept.length + " holding" : "BROKEN: " + broken.join(", "));
  Object.keys(kc.figures).forEach(function (k) {
    if (kept.indexOf(k) !== -1) return;
    var f = kc.figures[k];
    if (!f.n) return;
    row(k, f.n + " of " + f.of + " (" + f.pct + "%), ceiling " + kb.figures[k]);
  });
  row("measured", kc.generated_on);
} catch (e) {
  row("knowledge coverage", "missing - run npm run knowledge");
}

head("Structure");
var tg = themeGuardAnomalies();
row("theme-guard anomalies", tg.length + (tg.length ? " (" + tg.join(", ") + ")" : ""));
row("stale-path references", stalePaths());
var pc = unhandledChains();
// An upper bound, not a defect count: it cannot see across a function
// boundary, so a chain whose loader already folded the error away
// (App.tools.load, App.links.loadTitles) still lands in the last figure.
row("promise chains (assets/js)", pc.total + " total: " + pc.twoArg +
  " two-arg, " + pc.caught + " .catch, " + pc.checked + " error-checked, " +
  pc.bare.length + " without a visible handler");
row("docs/STATE.md lines", read("docs/STATE.md").split("\n").length + " (cap 40)");
console.log("");
