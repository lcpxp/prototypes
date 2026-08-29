// ------------------------------------------------------------------
// tests/checks/links.test.js - Internal references resolve.
//
// The repo cites its own files constantly: 332 references to docs/*.md
// alone, from CLAUDE.md, the skill commands, the gates' own string
// constants and the schema comments. A path that stops resolving costs
// a reader one wrong turn and produces no error anywhere.
//
// Two trees are excluded, and the exclusion is the point rather than a
// convenience: applied migrations are immutable once run (CLAUDE.md),
// and docs/sessions-archive/ is closed history. Both carry references
// to documents that no longer exist - docs/ROADMAP-PROCESS.md and
// docs/SESSIONS.md - and "fixing" either would mean editing a migration
// the database has already applied. They are wrong, they are supposed
// to stay wrong, and this gate must never ask for them to change.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read } = require("../lib/repo.js");

const IMMUTABLE = ["supabase/migrations/", "docs/sessions-archive/"];

// Documents that are gone and stay gone. The immutable trees cite them
// and cannot be edited to stop; this file names them to say so, and the
// workstream record explains why. Naming a missing file in order to
// document that it is missing must not itself register as a broken
// link - so the allowlist is explicit, and the second test below proves
// every entry is still absent AND still cited from an immutable tree,
// which is the only thing that justifies it being here.
const KNOWN_ABSENT = {
  "docs/ROADMAP-PROCESS.md": "supabase/migrations/",
  "docs/SESSIONS.md": "docs/sessions-archive/",
};

// Only paths that name a real area of the repo, so a code sample or a
// glob in prose cannot register as a broken link.
const REPO_PATH = new RegExp(
  "(?:docs|assets|modules|tests|scripts|supabase|\\.github|\\.claude)" +
  "/[A-Za-z0-9._/-]*[A-Za-z0-9]", "g");

const SEARCHABLE = [".md", ".js", ".json", ".html", ".sql", ".txt", ".yml"];

// Files the repo cites BECAUSE they must not exist here: the gitignored
// local overrides. CLAUDE.md, SECURITY.md, SETUP.md and the security
// gate all name assets/js/core/config.js on purpose - naming it is how
// the rule against committing it is stated. Read from .gitignore rather
// than restated, so the two cannot drift apart.
function deliberatelyAbsent() {
  return read(".gitignore")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.includes("*"))
    .map((line) => line.replace(/\/$/, ""));
}

function citingFiles() {
  return trackedFiles().filter((f) =>
    SEARCHABLE.some((ext) => f.endsWith(ext)) &&
    !IMMUTABLE.some((tree) => f.startsWith(tree)));
}

test("every repo path a tracked file cites resolves to a tracked file", () => {
  const tracked = new Set(trackedFiles());
  const dirs = new Set();
  for (const file of tracked) {
    const parts = file.split("/");
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/") + "/");
  }
  const absent = deliberatelyAbsent();
  const broken = [];
  for (const file of citingFiles()) {
    const src = read(file);
    for (const m of src.matchAll(REPO_PATH)) {
      const target = m[0];
      if (tracked.has(target)) continue;
      if (dirs.has(target) || dirs.has(target + "/")) continue;
      if (absent.includes(target)) continue;
      if (KNOWN_ABSENT[target]) continue;
      // A path with no extension that names a directory is a directory
      // reference; anything else has to be a file that exists.
      if (!/\.[a-z]{2,5}$/.test(target)) continue;
      const line = src.slice(0, m.index).split("\n").length;
      broken.push(`${file}:${line} -> ${target}`);
    }
  }
  assert.deepEqual(broken, [],
    "References to files that do not exist:\n" + broken.join("\n") +
    "\nEither the file moved and the citation did not, or the citation is a typo.");
});

test("the immutable trees are excluded on purpose, and still are", () => {
  // If this ever starts passing without the exclusion, the exclusion can
  // go. Until then it is load-bearing, and a future session must not
  // "tidy" it away and then edit an applied migration to satisfy it.
  for (const tree of IMMUTABLE) {
    assert.ok(trackedFiles().some((f) => f.startsWith(tree)),
      `${tree}: excluded but nothing is under it`);
  }
  for (const [missing, tree] of Object.entries(KNOWN_ABSENT)) {
    const cites = trackedFiles()
      .filter((f) => f.startsWith(tree))
      .some((f) => read(f).includes(missing));
    assert.ok(cites,
      `${tree} no longer cites ${missing}. If nothing under it cites a ` +
      "missing document any more, drop it from IMMUTABLE and let the gate " +
      "cover it - do not leave a dead exclusion behind.");
    assert.ok(!trackedFiles().includes(missing),
      `${missing} exists now, so the exclusion for ${tree} may be narrower than it was.`);
  }
});
