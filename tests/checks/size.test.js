// ------------------------------------------------------------------
// tests/checks/size.test.js - File size budgets.
// Keeps every file cheap for a single agent "read file" action.
// Budgets and rationale live in tests/size-budget.json.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { trackedFiles, read } = require("../lib/repo.js");
const budget = require("../size-budget.json");

test("all files are inside their line budgets", () => {
  const failures = [];
  const warnings = [];
  for (const file of trackedFiles()) {
    if (budget.generated.includes(file)) continue;
    const rule = budget.byExtension[path.extname(file)];
    if (!rule) continue;
    const lines = read(file).split("\n").length;
    const exception = budget.exceptions[file];
    const hard = exception ? exception.hard : rule.hard;
    if (lines > hard) {
      failures.push(`${file}: ${lines} lines (hard limit ${hard}). Split it before extending.` +
        (exception ? ` Note: ${exception.note}` : ""));
    } else if (!exception && lines > rule.soft) {
      warnings.push(`${file}: ${lines} lines (soft limit ${rule.soft}). Plan a split.`);
    }
  }
  for (const w of warnings) console.warn("WARN " + w);
  assert.deepEqual(failures, [], "Files over hard size limits:\n" + failures.join("\n"));
});
