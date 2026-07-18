#!/usr/bin/env node
// ------------------------------------------------------------------
// scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt.
// Both files are machine-oriented navigation aids: a crawling AI
// (or a fresh Claude Code session) reads the map instead of the
// tree, and jumps straight to file:line for symbols.
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

function firstLineMatching(content, re) {
  for (const line of content.split("\n")) {
    const m = line.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return "";
}

function purposeOf(file, content) {
  if (file.endsWith(".html")) return firstLineMatching(content, /<title>([^<]+)<\/title>/);
  if (file.endsWith(".md")) return firstLineMatching(content, /^#\s+(.+)/);
  if (file.endsWith(".sql") || file.endsWith(".sh"))
    return firstLineMatching(content, /^(?:--|#)\s*(?!!)([^-#=].*)/);
  if (file.endsWith(".js") || file.endsWith(".css"))
    return firstLineMatching(content, /^(?:\/\/|\/\*|\s\*)?\s*([a-zA-Z][^*/].*?)\s*(?:\*\/)?$/)
      .replace(/^-+\s*/, "");
  return "";
}

function symbolsOf(file, content) {
  if (!file.endsWith(".js")) return [];
  const out = [];
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    let m;
    if ((m = line.match(/^\s*(?:window\.)?(App\.\w+)\s*=\s*(?:async\s*)?function/))) {
      out.push({ name: m[1], line: i + 1 });
    } else if ((m = line.match(/^\s*(?:async\s+)?function\s+(\w+)/))) {
      out.push({ name: m[1] + "()", line: i + 1 });
    }
  });
  return out;
}

let md = "# Code map\n\n";
md += "GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.\n";
md += "Purpose: lets an agent locate any file or symbol from this single\n";
md += "document instead of walking the tree or reading whole files.\n\n";
md += "| File | Lines | Purpose |\n|---|---:|---|\n";

const symbolRows = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(ROOT, file), "utf8");
  const lines = content.split("\n").length;
  md += `| ${file} | ${lines} | ${purposeOf(file, content).replace(/\|/g, "\\|")} |\n`;
  for (const s of symbolsOf(file, content)) {
    symbolRows.push(`| ${s.name} | ${file}:${s.line} |`);
  }
}

md += "\n## JavaScript symbol index\n\n| Symbol | Location |\n|---|---|\n";
md += symbolRows.join("\n") + "\n";
md += "\n## Conventions for agents\n\n";
md += "- Read this map, docs/STATE.md (current state) and CLAUDE.md before anything else.\n";
md += "- Jump to symbols with the file:line references above; read targeted ranges, not whole files.\n";
md += "- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.\n";

fs.writeFileSync(path.join(ROOT, "docs/CODEMAP.md"), md);

const llms = `# LPio - LaunchPad IO (static shell of a project hub)

> Public repository holding only the structure, styling and rendering
> logic of LPio, a login-gated project hub (dashboard, API reference
> viewer, prototype gallery). All substantive content and credentials
> live in Supabase, never in this repo.

## Start here
- CLAUDE.md: operating rules for agent sessions (security rules are non-negotiable)
- docs/STATE.md: fixed-size current state; git log and docs/CHANGELOG.md are the history
- docs/CODEMAP.md: generated index of every file, its size, purpose and JS symbols

## Architecture and process
- docs/ARCHITECTURE.md: how pages, guard, and Supabase fit together
- docs/SECURITY.md: threat model and RLS approach
- docs/DESIGN.md: design system; all values from assets/css/tokens.css
- docs/HARNESS.md: test harness, benchmarks, size budgets, commit conventions

## Verification
- Run \`npm test\` (Node built-in test runner, zero dependencies)
- tests/checks/: security, structure, style and size gates
- tests/unit/: functioning benchmarks pinning module behaviour
`;
fs.writeFileSync(path.join(ROOT, "llms.txt"), llms);

if (!quiet) console.log(`Codemap: ${files.length} files indexed, ${symbolRows.length} symbols. Wrote docs/CODEMAP.md and llms.txt.`);
