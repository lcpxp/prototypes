// ------------------------------------------------------------------
// tests/checks/size.test.js - File size budgets.
// Keeps every file cheap for a single agent "read file" action.
// Budgets and rationale live in tests/size-budget.json.
//
// Three states, not two:
//   under soft            fine, nothing to say
//   over soft, ACKNOWLEDGED   allowed, and the entry must name the seam
//                             it splits on next
//   over soft, unacknowledged warns, and npm run audit counts it
//   over hard             fails, whatever else is recorded
//
// The acknowledgement replaces the old per-file `hard` override. Those
// overrides had grown to 41 entries across 39 files - a registry of
// exemptions rather than a constraint - because raising one file's cap
// was easier than saying where it splits. An acknowledgement cannot
// raise a cap, so the only way past `hard` is to actually split.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { trackedFiles, read } = require("../lib/repo.js");
const budget = require("../size-budget.json");

const EXEMPT_TREES = Object.keys(budget["exempt-trees"] || {});

function budgeted() {
  return trackedFiles().filter((file) => {
    if (budget.generated.includes(file)) return false;
    if (EXEMPT_TREES.some((tree) => file.startsWith(tree))) return false;
    return Boolean(budget.byExtension[path.extname(file)]);
  });
}

function linesOf(file) {
  return read(file).split("\n").length;
}

test("no file is over its hard limit", () => {
  const failures = [];
  for (const file of budgeted()) {
    const rule = budget.byExtension[path.extname(file)];
    const exception = budget.exceptions[file];
    const hard = exception ? exception.hard : rule.hard;
    const lines = linesOf(file);
    if (lines > hard) {
      failures.push(`${file}: ${lines} lines (hard limit ${hard}). Split it ` +
        "before extending." + (exception ? ` Note: ${exception.note}` : "") +
        (budget.acknowledged[file] ? ` Seam: ${budget.acknowledged[file].seam}` : ""));
    }
  }
  assert.deepEqual(failures, [], "Files over hard size limits:\n" + failures.join("\n"));
});

test("every file over soft is acknowledged, and names where it splits", () => {
  // A warning nobody records is a warning nobody acts on. Acknowledging
  // costs one line and forces the question "where would this split?" to
  // be answered while the file is still fresh in someone's head.
  const unacknowledged = [];
  for (const file of budgeted()) {
    const rule = budget.byExtension[path.extname(file)];
    if (linesOf(file) <= rule.soft) continue;
    if (budget.exceptions[file] || budget.acknowledged[file]) continue;
    unacknowledged.push(`${file}: ${linesOf(file)} lines (soft ${rule.soft})`);
  }
  for (const line of unacknowledged) console.warn("WARN over soft, unacknowledged - " + line);
  assert.deepEqual(unacknowledged, [],
    "Files over their soft limit with nothing recorded:\n" + unacknowledged.join("\n") +
    "\nAdd an `acknowledged` entry to tests/size-budget.json naming the seam " +
    "it splits on, or split it now.");
});

test("an acknowledgement names a seam, and is not a stale one", () => {
  const problems = [];
  for (const [file, entry] of Object.entries(budget.acknowledged)) {
    if (!trackedFiles().includes(file)) {
      problems.push(`${file}: acknowledged but no longer in the repo`);
      continue;
    }
    if (!entry.seam || entry.seam.length < 20) {
      problems.push(`${file}: an acknowledgement must say where the file splits next`);
      continue;
    }
    // ...and WHEN. Every one of these was once an "exit plan" that read
    // as a queued task, so they aged into a backlog nobody worked and
    // nobody re-judged. A decision names its own trigger: a line number
    // to revisit at, a release, or never - and "never" has to be said
    // out loud rather than left implied by silence.
    const trigger = /\b\d{3}\b|\bnever\b|\brelease\b|\bhard cap\b|\brevisit\b|\bdo not split\b/i;
    if (!trigger.test(entry.seam)) {
      problems.push(`${file}: the acknowledgement says where it splits but not ` +
        "when. Name the line count to revisit at, the release that folds it, " +
        "or say never - an intention with no trigger is how these became stale.");
    }
    const rule = budget.byExtension[path.extname(file)];
    if (rule && linesOf(file) <= rule.soft) {
      problems.push(`${file}: back under its soft limit (${linesOf(file)} <= ` +
        `${rule.soft}); drop the acknowledgement rather than carrying it`);
    }
  }
  assert.deepEqual(problems, [], "Acknowledgement problems:\n" + problems.join("\n"));
});

test("an exception is a different cap, with the reason for it", () => {
  // Exceptions exist for files whose right limit is not their extension's.
  // docs/STATE.md is the case that matters: its cap is TIGHTER, and that
  // is the whole point of the file.
  for (const [file, entry] of Object.entries(budget.exceptions)) {
    assert.ok(trackedFiles().includes(file),
      `${file}: has an exception but is not in the repo`);
    assert.equal(typeof entry.hard, "number", `${file}: an exception must set a hard cap`);
    assert.ok(entry.note && entry.note.length > 20,
      `${file}: an exception must carry the reason its cap differs`);
  }
});

test("every exempt tree says why it is exempt", () => {
  for (const [tree, reason] of Object.entries(budget["exempt-trees"] || {})) {
    assert.ok(reason && reason.length > 20,
      `${tree}: an exempt tree must carry the reason, not just the path`);
    assert.ok(trackedFiles().some((f) => f.startsWith(tree)),
      `${tree}: exempted but nothing in the repo is under it`);
  }
});
