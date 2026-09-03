#!/usr/bin/env node
// ------------------------------------------------------------------
// scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt.
//
// The map answers "where is it", for an agent that would otherwise walk
// the tree or read whole files. It is built around the question actually
// asked, which is not "list every symbol": the previous version was 966
// lines, of which 624 were private helpers - ten different esc(), six
// el(), six day() - against 21 App.* entries. None of those were
// addressable: knowing that some file defines esc() at line 22 helps
// nobody. The public surface, grouped by area, is what gets used.
//
// Deterministic output (no timestamps) so diffs stay quiet.
// Run: npm run map   (the pre-commit hook also runs it)
// ------------------------------------------------------------------
"use strict";
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const quiet = process.argv.includes("--quiet");

const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .split("\n").filter(Boolean)
  .filter((f) => !["docs/CODEMAP.md", "llms.txt"].includes(f));

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

// Areas, in the order a reader meets them. Each carries the one line
// that says what the directory is for, so the map orients as well as
// locates. First match wins, so put the specific before the general.
const AREAS = [
  ["assets/js/core/", "Shared runtime. Loaded on every protected page in the order set by assets/js/core/includes.json."],
  ["assets/js/pages/", "Page modules, one directory per module, mirroring modules/. A file here attaches App.<camelCase(directory)>..."],
  ["assets/css/", "Stylesheets, loaded as a fixed stack: tokens, base, layout, components, pages, then page sheets. Every value comes from tokens.css."],
  ["modules/", "One folder per module, named for its registry key. Pages are shells; the logic is in assets/js/pages/."],
  ["supabase/migrations/", "Applied migrations. Immutable once run - never edited, never reflowed."],
  ["supabase/schema/", "Schema, one file per domain, run in lexical order."],
  ["supabase/", "Policies, seed data, Edge Functions, and the generated snapshot the drift gate reads."],
  ["tests/checks/", "Repo-wide gates. These encode the CLAUDE.md rules as executable checks, so they hold when prose is forgotten."],
  ["tests/unit/", "Behaviour benchmarks, mirroring assets/js/pages/."],
  ["tests/", "Shared fixtures and the budgets the gates read."],
  ["scripts/", "Generators: the codemap, the schema snapshot, coverage, knowledge, the audit."],
  ["docs/plan/", "Workstream records. Each keeps the account of where its plan was wrong, which is the part a later wave needs."],
  ["docs/sessions-archive/", "Closed session history. Read-only; its references describe the repo as it was."],
  ["docs/", "Architecture, security, design, and the operating protocols."],
  [".claude/", "Slash commands and the permission settings a session runs under."],
  [".github/", "CI: the test-and-deploy workflow."],
  ["", "Repository root."],
];

function areaOf(file) {
  return AREAS.find(([prefix]) => file.startsWith(prefix));
}

// A purpose for EVERY file type. The previous version left .json, .yml
// and every .claude/commands/*.md blank, and rendered CLAUDE.md's
// purpose as "CLAUDE.md".
function purposeOf(file, content) {
  const firstLine = (re, from) => {
    for (const line of (from || content).split("\n")) {
      const m = line.match(re);
      if (m && m[1].trim()) return m[1].trim();
    }
    return "";
  };
  let purpose = "";
  if (file.endsWith(".html")) {
    purpose = firstLine(/<title>([^<]+)<\/title>/);
  } else if (file.endsWith(".md")) {
    // Front-matter description first (the slash commands carry one),
    // then the first heading - unless the heading merely repeats the
    // filename, which tells a reader nothing.
    const described = firstLine(/^description:\s*(.+)$/);
    if (described) return described.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
    purpose = firstLine(/^#\s+(.+)/);
    const stem = path.basename(file, ".md");
    if (purpose.replace(/\.md$/, "") === stem) purpose = firstLine(/^>\s*(.+)/) || "";
  } else if (file.endsWith(".json")) {
    try {
      const parsed = JSON.parse(content);
      purpose = parsed.comment || parsed._comment || parsed.description || "";
    } catch (e) { purpose = ""; }
    if (!purpose) purpose = firstLine(/^\s*"[a-z-]*comment[a-z-]*":\s*"(.+?)"/i);
  } else if (file.endsWith(".yml") || file.endsWith(".yaml")) {
    purpose = firstLine(/^name:\s*(.+)$/) || firstLine(/^#\s*(.+)/);
  } else if (file.endsWith(".sql") || file.endsWith(".sh") || !path.extname(file)) {
    purpose = firstLine(/^(?:--|#)\s*(?!!)([^-#=].*)/);
  } else if (file.endsWith(".js") || file.endsWith(".css")) {
    purpose = firstLine(/^(?:\/\/|\/\*|\s\*)?\s*([a-zA-Z][^*/].*?)\s*(?:\*\/)?$/)
      .replace(/^-+\s*/, "");
  }
  // Header comments wrap, so a purpose cut at the first newline reads as
  // an unfinished sentence. Take the whole first sentence instead.
  if (purpose && !/[.!?]$/.test(purpose)) {
    const idx = content.indexOf(purpose);
    if (idx !== -1) {
      const tail = content.slice(idx, idx + 600)
        .split("\n")
        .map((l) => l.replace(/^\s*(?:\/\/|--|#|\*)\s?/, ""))
        .join(" ");
      const sentence = tail.match(/^(.{10,240}?[.!?])(\s|$)/);
      if (sentence) purpose = sentence[1];
    }
  }
  return purpose.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

// The public surface: what another file can call. Private helpers are
// listed under their own file, not in one global table where ten esc()
// rows compete for the same name.
function surfacesOf(file, content) {
  if (!file.endsWith(".js")) return [];
  const out = [];
  content.split("\n").forEach((line, i) => {
    const m = line.match(/^\s*(?:window\.)?App\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:\.([A-Za-z0-9_]+))?\s*=/);
    if (m) out.push({ name: "App." + m[1] + (m[2] ? "." + m[2] : ""), line: i + 1 });
  });
  return out;
}

const byArea = new Map(AREAS.map((a) => [a[0], []]));
const surfaces = [];
for (const file of files) {
  const content = read(file);
  const area = areaOf(file);
  byArea.get(area[0]).push({
    file, lines: content.split("\n").length, purpose: purposeOf(file, content),
  });
  for (const s of surfacesOf(file, content)) surfaces.push({ ...s, file });
}

let md = "# Code map\n\n";
md += "GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.\n\n";
md += "Where to start: **docs/NAVIGATION.md** answers \"I want to change X\".\n";
md += "This file answers \"where is it\".\n\n";

// The public surface first: it is the index that gets used.
md += "## Public surface\n\n";
md += "Everything one file can call in another. A surface in\n";
md += "`assets/js/pages/<module>/` is named for its directory, so\n";
md += "`App.appReviewRender` lives under `app-review/`.\n\n";
md += "| Surface | Defined in |\n|---|---|\n";
const seen = new Map();
for (const s of surfaces) {
  const key = s.name.split(".").slice(0, 2).join(".");
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push(`${s.file}:${s.line}`);
}
for (const key of [...seen.keys()].sort()) {
  const where = [...new Set(seen.get(key))];
  const shown = where.length > 2 ? [where[0] + ` (+${where.length - 1} more)`] : where;
  md += `| \`${key}\` | ${shown.join("<br>")} |\n`;
}

md += "\n## Files by area\n";
for (const [prefix, blurb] of AREAS) {
  const rows = byArea.get(prefix);
  if (!rows.length) continue;
  md += `\n### ${prefix || "(root)"}\n\n${blurb}\n\n`;
  md += "| File | Lines | Purpose |\n|---|---:|---|\n";
  for (const r of rows) {
    md += `| ${r.file.slice(prefix.length) || r.file} | ${r.lines} | ${r.purpose} |\n`;
  }
}

md += "\n## Conventions for agents\n\n";
md += "- Read docs/NAVIGATION.md, docs/STATE.md and CLAUDE.md before anything else.\n";
md += "- Jump via the file:line references above; read targeted ranges, not whole files.\n";
md += "- The core include order is assets/js/core/includes.json. The size budgets are\n";
md += "  tests/size-budget.json. Both are the one home for their numbers.\n";
md += "- The suite in tests/ is the definition of done.\n";

fs.writeFileSync(path.join(ROOT, "docs/CODEMAP.md"), md);

const llms = `# LPIO - LPIO (static shell of a project hub)

> Public repository holding only the structure, styling and rendering
> logic of LPIO, a login-gated project hub (dashboard, roadmap, API
> reference viewer, review boards, prototype gallery). All substantive
> content and credentials live in Supabase, never in this repo.

## Start here
- CLAUDE.md: operating rules for agent sessions (security rules are non-negotiable)
- docs/NAVIGATION.md: "I want to change X" -> the files to read
- docs/STATE.md: fixed-size current state; git log and docs/CHANGELOG.md are the history
- docs/CODEMAP.md: generated. The public App surface, then every file by area

## Architecture and process
- docs/ARCHITECTURE.md: how pages, guard and Supabase fit together
- assets/js/core/includes.json: the core script order, and why each is there
- docs/SECURITY.md: threat model and RLS approach
- docs/DESIGN.md: design system; all values from assets/css/tokens.css
- docs/HARNESS.md: test harness, benchmarks, size budgets, commit conventions

## Verification
- Run \`npm test\` (Node built-in test runner, zero dependencies)
- tests/checks/: security, structure, style, size and contract gates
- tests/unit/: behaviour benchmarks, mirroring assets/js/pages/
`;
fs.writeFileSync(path.join(ROOT, "llms.txt"), llms);

if (!quiet) {
  console.log(`Codemap: ${files.length} files, ${seen.size} public surfaces. ` +
    "Wrote docs/CODEMAP.md and llms.txt.");
}
