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

function row(label, value) { console.log("  " + String(label).padEnd(30) + value); }
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

// 2. Files over their soft budget with no documented exception.
function overSoft() {
  var out = [];
  trackedFiles().forEach(function (f) {
    if (budget.generated.includes(f)) return;
    if (f.startsWith("docs/sessions-archive/")) return;
    if (budget.exceptions[f]) return;
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

// 4. HTML pages whose inline theme guard count is not exactly one.
function themeGuardAnomalies() {
  return trackedFiles()
    .filter(function (f) { return f.endsWith(".html"); })
    .map(function (f) {
      var n = (read(f).match(/localStorage\.getItem\("theme"\)/g) || []).length;
      return n === 1 ? null : f + " (" + n + ")";
    })
    .filter(Boolean);
}

// 5. Approximate .then/.catch balance in the shipped JS.
function thenBalance() {
  var thens = 0, catches = 0;
  trackedFiles()
    .filter(function (f) { return f.startsWith("assets/js/") && f.endsWith(".js"); })
    .forEach(function (f) {
      var c = read(f);
      thens += (c.match(/\.then\(/g) || []).length;
      catches += (c.match(/\.catch\(/g) || []).length;
    });
  return { thens: thens, catches: catches };
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

var t = testTotals();
console.log("LPio audit");
head("Tests");
row("pass / fail / total", t.pass + " / " + t.fail + " / " + t.tests);

head("Size");
var os = overSoft();
row("over soft, no exception", os.length);
os.forEach(function (f) { row("", f); });

head("Security");
var mp = tablesMissingPolicy();
row("schema tables missing policy", mp.length + (mp.length ? " (" + mp.join(", ") + ")" : ""));

head("Structure");
var tg = themeGuardAnomalies();
row("theme-guard anomalies", tg.length + (tg.length ? " (" + tg.join(", ") + ")" : ""));
row("stale-path references", stalePaths());
var tb = thenBalance();
row(".then / .catch (assets/js)", tb.thens + " / " + tb.catches);
row("docs/STATE.md lines", read("docs/STATE.md").split("\n").length + " (cap 40)");
console.log("");
