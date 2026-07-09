#!/usr/bin/env bash
# ==================================================================
# setup-harness.sh - One-shot bootstrap for the prototypes repo.
#
# Run once from the repo root in GitHub Codespaces (or any shell
# with git + Node 18+). Safe to re-run: every step is idempotent.
#
# What it installs (zero runtime or dev dependencies):
#   1. Security remediation: untracks assets/js/config.js, fixes
#      the missing .gitignore rule.
#   2. Test harness: node --test benchmark suite under tests/
#      (security gates, structure gates, style gates, size budgets,
#      functional unit benchmarks).
#   3. tests/size-budget.json: researched max-file-size policy.
#   4. scripts/gen-codemap.js: generates docs/CODEMAP.md + llms.txt
#      so crawling AI can locate files/symbols without reading them.
#   5. Git hygiene: pre-commit hook (.githooks/) and commit
#      template (.gitmessage) for audit trails.
#   6. docs/HARNESS.md: the ongoing working process.
#   7. Patches CLAUDE.md (marker-delimited section) and prepends a
#      checkpoint to docs/SESSIONS.md recording the decision.
# ==================================================================
set -euo pipefail

say()  { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
note() { printf '   %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ -f CLAUDE.md ] && [ -d supabase ] && [ -d assets/js ] \
  || die "Run this from the repo root (CLAUDE.md not found)."
command -v git  >/dev/null || die "git is required."
command -v node >/dev/null || die "Node.js 18+ is required."
node -e 'process.exit(parseInt(process.versions.node,10)>=18?0:1)' \
  || die "Node.js 18+ is required (found $(node -v))."

# ------------------------------------------------------------------
say "1/9 Security remediation: config.js"
# ------------------------------------------------------------------
if ! grep -qx 'assets/js/config.js' .gitignore; then
  # The comment existed but the actual rule was missing.
  awk '{print} /^# Local configuration containing Supabase keys/ && !done {print "assets/js/config.js"; done=1}' \
    .gitignore > .gitignore.tmp && mv .gitignore.tmp .gitignore
  note "Added assets/js/config.js to .gitignore (rule was missing)."
fi
if git ls-files --error-unmatch assets/js/config.js >/dev/null 2>&1; then
  git rm --cached --quiet assets/js/config.js
  note "UNTRACKED assets/js/config.js (local copy kept)."
  note "It was committed to a public repo: ROTATE the Supabase keys."
else
  note "config.js is not tracked. OK."
fi

# ------------------------------------------------------------------
say "2/9 Design-token fix (main.css hard-coded hex)"
# ------------------------------------------------------------------
if grep -q 'color: #ffffff;' assets/css/main.css; then
  sed -i 's/color: #ffffff;/color: var(--surface);/' assets/css/main.css
  note "main.css: #ffffff -> var(--surface) (DESIGN.md compliance)."
else
  note "No hard-coded hex in main.css. OK."
fi

# ------------------------------------------------------------------
say "3/9 package.json (scripts only, zero dependencies)"
# ------------------------------------------------------------------
cat > package.json <<'PKG_EOF'
{
  "name": "lpio-hub",
  "private": true,
  "description": "LPio / LaunchPad IO - static shell of a login-gated project hub. Content lives in Supabase.",
  "scripts": {
    "test": "node --test \"tests/**/*.test.js\"",
    "test:checks": "node --test \"tests/checks/*.test.js\"",
    "map": "node scripts/gen-codemap.js",
    "setup": "git config core.hooksPath .githooks && git config commit.template .gitmessage && echo hooks+template configured"
  }
}
PKG_EOF
note "npm test / npm run map / npm run setup available."

# ------------------------------------------------------------------
say "4/9 Test harness: tests/"
# ------------------------------------------------------------------
mkdir -p tests/lib tests/checks tests/unit

cat > tests/lib/repo.js <<'LIB_EOF'
// ------------------------------------------------------------------
// tests/lib/repo.js - Shared helpers for the benchmark suite.
// Operates on git-tracked files only, so local scratch and the
// gitignored config.js are never scanned or leaked into output.
// ------------------------------------------------------------------
"use strict";
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function isTextFile(rel) {
  return /\.(js|css|html|md|sql|json|txt|sh|patch|gitignore|gitmessage)$/.test(rel)
    || /(^|\/)\.(gitignore|gitmessage)$/.test(rel);
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

module.exports = { ROOT, trackedFiles, read, isTextFile, lineOf };
LIB_EOF

cat > tests/checks/security.test.js <<'SEC_EOF'
// ------------------------------------------------------------------
// tests/checks/security.test.js - Security gates.
// Enforces CLAUDE.md "Non-negotiable security rules" mechanically:
// no credential-shaped strings in tracked files, config.js never
// tracked, every Supabase table has RLS enabled plus policies.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read, isTextFile, lineOf } = require("../lib/repo.js");

const SECRET_PATTERNS = [
  { name: "JWT-shaped token (Supabase keys are JWTs)",
    re: /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9]+/g },
  { name: "Live Supabase project URL",
    re: /https?:\/\/[a-z0-9]{15,}\.supabase\.co/g },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY/g },
  { name: "GitHub token", re: /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,})/g },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/g },
];

test("no gitignored config file is tracked", () => {
  const files = trackedFiles();
  assert.ok(!files.includes("assets/js/config.js"),
    "assets/js/config.js is tracked. Run: git rm --cached assets/js/config.js " +
    "and rotate the Supabase keys immediately (repo is public).");
});

test("no credential-shaped strings in any tracked file", () => {
  const offences = [];
  for (const file of trackedFiles()) {
    if (!isTextFile(file)) continue;
    const content = read(file);
    for (const { name, re } of SECRET_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(content)) !== null) {
        offences.push(`${file}:${lineOf(content, m.index)} matches "${name}"`);
      }
    }
  }
  assert.deepEqual(offences, [],
    "Credential-shaped content found (values not printed):\n" + offences.join("\n"));
});

test("every table in schema.sql has RLS enabled and at least one policy", () => {
  const schema = read("supabase/schema.sql");
  const policies = read("supabase/policies.sql");
  const tables = [...schema.matchAll(/create table if not exists public\.(\w+)/gi)]
    .map((m) => m[1]);
  assert.ok(tables.length > 0, "No tables found in supabase/schema.sql");
  for (const t of tables) {
    assert.match(policies,
      new RegExp(`alter table public\\.${t} enable row level security`, "i"),
      `Table "${t}" has no RLS enable statement in policies.sql. ` +
      "A table without RLS is publicly readable via the anon key.");
    assert.match(policies,
      new RegExp(`create policy[\\s\\S]{0,200}?on public\\.${t}`, "i"),
      `Table "${t}" has RLS but no policy in policies.sql.`);
  }
});

test("seed data uses only generic example addresses", () => {
  const seed = read("supabase/seed.sql");
  const emails = [...seed.matchAll(/[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/gi)]
    .map((m) => m[1].toLowerCase())
    .filter((d) => !/(^|\.)example\.(com|org|net)$/.test(d));
  assert.deepEqual(emails, [],
    "seed.sql contains non-example email domains: " + emails.join(", "));
});
SEC_EOF

cat > tests/checks/structure.test.js <<'STRUCT_EOF'
// ------------------------------------------------------------------
// tests/checks/structure.test.js - Page structure gates.
// Enforces the CLAUDE.md front-end rules: script include order on
// protected pages, data-root on nested pages, guard.js absent from
// the login page, robots noindex everywhere.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read } = require("../lib/repo.js");

const LOGIN_PAGE = "index.html";

function htmlPages() {
  return trackedFiles().filter((f) => f.endsWith(".html"));
}
function protectedPages() {
  return htmlPages().filter((f) => f !== LOGIN_PAGE);
}
function scriptSrcs(content) {
  return [...content.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
}

test("protected pages include scripts in the required order", () => {
  for (const page of protectedPages()) {
    const prefix = page.includes("/")
      ? "../".repeat(page.split("/").length - 1) : "";
    const srcs = scriptSrcs(read(page));
    const required = [
      /@supabase\/supabase-js/,
      new RegExp(`^${prefix}assets/js/config\\.js$`),
      new RegExp(`^${prefix}assets/js/supabase\\.js$`),
      new RegExp(`^${prefix}assets/js/guard\\.js$`),
      new RegExp(`^${prefix}assets/js/ui\\.js$`),
    ];
    let cursor = -1;
    for (const re of required) {
      const idx = srcs.findIndex((s, i) => i > cursor && re.test(s));
      assert.ok(idx > cursor,
        `${page}: missing or out-of-order script matching ${re}. Order found: ${srcs.join(", ")}`);
      cursor = idx;
    }
    // CLAUDE.md asks for a page module after ui.js, but static pages
    // (e.g. silos/) legitimately omit one. Warn, do not fail.
    if (srcs.length === cursor + 1) {
      console.warn(`WARN ${page}: no page module after ui.js (static page?).`);
    }
  }
});

test("pages below the repo root set data-root on <body>", () => {
  for (const page of protectedPages().filter((p) => p.includes("/"))) {
    assert.match(read(page), /<body[^>]*\sdata-root="/,
      `${page}: nested page must set data-root on <body> (see guard.js).`);
  }
});

test("login page uses auth.js and never loads guard.js", () => {
  const srcs = scriptSrcs(read(LOGIN_PAGE));
  assert.ok(srcs.some((s) => s.endsWith("assets/js/auth.js")),
    "index.html must load assets/js/auth.js");
  assert.ok(!srcs.some((s) => s.endsWith("guard.js")),
    "index.html must not load guard.js (it would redirect the login page).");
});

test("every page is marked noindex", () => {
  for (const page of htmlPages()) {
    assert.match(read(page), /name="robots"[^>]*content="noindex"/,
      `${page}: missing <meta name="robots" content="noindex">.`);
  }
});
STRUCT_EOF

cat > tests/checks/style.test.js <<'STYLE_EOF'
// ------------------------------------------------------------------
// tests/checks/style.test.js - Design-system gates.
// Enforces DESIGN.md/CLAUDE.md: all colour values come from
// assets/css/tokens.css (no hex literals elsewhere) and no emojis
// anywhere in tracked content.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read, lineOf } = require("../lib/repo.js");

const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

test("no hex colour literals outside tokens.css", () => {
  const offences = [];
  const scan = trackedFiles().filter((f) =>
    (f.endsWith(".css") || f.endsWith(".html") || f.endsWith(".js")) &&
    f !== "assets/css/tokens.css");
  for (const file of scan) {
    const content = read(file);
    let m;
    HEX.lastIndex = 0;
    while ((m = HEX.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const line = content.slice(lineStart, content.indexOf("\n", m.index));
      if (/href=|url\(#|getElementById|querySelector/.test(line)) continue;
      offences.push(`${file}:${lineOf(content, m.index)} "${m[0]}" - use a var(--token) from tokens.css`);
    }
  }
  assert.deepEqual(offences, [], "Hard-coded colours found:\n" + offences.join("\n"));
});

test("no emojis in any tracked file", () => {
  const offences = [];
  for (const file of trackedFiles()) {
    if (!/\.(js|css|html|md|sql|json|txt)$/.test(file)) continue;
    const content = read(file);
    let m;
    EMOJI.lastIndex = 0;
    while ((m = EMOJI.exec(content)) !== null) {
      offences.push(`${file}:${lineOf(content, m.index)}`);
    }
  }
  assert.deepEqual(offences, [], "Emoji found at:\n" + offences.join("\n"));
});
STYLE_EOF

cat > tests/size-budget.json <<'BUDGET_EOF'
{
  "comment": "Line budgets per file type. soft = warning (plan a split); hard = test failure (split before extending). Grounded in published agent-workflow guidance: source files ~500 lines max so a single read stays cheap; agent-facing docs ~200-300 lines because instruction adherence degrades as context grows.",
  "byExtension": {
    ".js":   { "soft": 300, "hard": 500 },
    ".css":  { "soft": 300, "hard": 500 },
    ".html": { "soft": 250, "hard": 400 },
    ".sql":  { "soft": 300, "hard": 500 },
    ".md":   { "soft": 200, "hard": 300 }
  },
  "generated": ["docs/CODEMAP.md", "llms.txt", "skeleton.patch"],
  "exceptions": {
    "assets/css/main.css": {
      "hard": 650,
      "note": "Pre-harness monolith at 585 lines. Refactor task: split into base.css, components.css, pages.css, each under 300 lines, then remove this exception."
    },
    "docs/SESSIONS.md": {
      "hard": 1000,
      "note": "Rolling log. When it passes 600 lines, move entries older than 30 days to docs/sessions-archive/YYYY-MM.md."
    },
    "docs/HARNESS.md": {
      "hard": 400,
      "note": "Process reference, read on demand rather than every session."
    }
  }
}
BUDGET_EOF

cat > tests/checks/size.test.js <<'SIZE_EOF'
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
SIZE_EOF

cat > tests/unit/ui.test.js <<'UI_EOF'
// ------------------------------------------------------------------
// tests/unit/ui.test.js - Functioning benchmarks for assets/js/ui.js.
// Pins the exact behaviour of the shared UI helpers, especially
// App.escape, which every dynamic render depends on for XSS safety.
// Loads the browser IIFE in a Node vm with a minimal window shim.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function loadApp() {
  const sandbox = {
    location: { pathname: "/dashboard.html" },
    navigator: {},
    setTimeout,
    document: {
      addEventListener() {},
      getElementById() { return null; },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/ui.js"), sandbox, { filename: "ui.js" });
  return sandbox.App;
}

test("App.escape neutralises every HTML-significant character", () => {
  const App = loadApp();
  assert.equal(
    App.escape(`<script>alert("x&y")</script>'`),
    "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;&#39;"
  );
});

test("App.escape handles null, undefined and non-strings", () => {
  const App = loadApp();
  assert.equal(App.escape(null), "");
  assert.equal(App.escape(undefined), "");
  assert.equal(App.escape(0), "0");
  assert.equal(App.escape(false), "false");
});

test("App.methodBadge renders known methods and escapes output", () => {
  const App = loadApp();
  assert.equal(App.methodBadge("get"), '<span class="badge get">GET</span>');
  assert.equal(App.methodBadge("DELETE"), '<span class="badge delete">DELETE</span>');
});

test("App.methodBadge gives unknown methods no styling class", () => {
  const App = loadApp();
  assert.equal(App.methodBadge("<img>"), '<span class="badge ">&lt;IMG&gt;</span>');
});

test("App.statusBadge lowercases and escapes", () => {
  const App = loadApp();
  assert.equal(App.statusBadge("Draft"), '<span class="badge draft">draft</span>');
});
UI_EOF
note "tests/lib, tests/checks (4 gate suites), tests/unit (behaviour benchmarks)."

# ------------------------------------------------------------------
say "5/9 Codemap generator: scripts/gen-codemap.js + llms.txt"
# ------------------------------------------------------------------
mkdir -p scripts
cat > scripts/gen-codemap.js <<'MAP_EOF'
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
  .filter((f) => !["docs/CODEMAP.md", "llms.txt", "skeleton.patch"].includes(f));

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
md += "- Read this map, docs/SESSIONS.md (latest checkpoint) and CLAUDE.md before anything else.\n";
md += "- Jump to symbols with the file:line references above; read targeted ranges, not whole files.\n";
md += "- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.\n";

fs.writeFileSync(path.join(ROOT, "docs/CODEMAP.md"), md);

const llms = `# LPio - LaunchPad IO (static shell of a project hub)

> Public repository holding only the structure, styling and rendering
> logic of LPio, a login-gated project hub (dashboard, API reference
> viewer, prototype gallery, project silos). All substantive content
> and credentials live in Supabase, never in this repo.

## Start here
- CLAUDE.md: operating rules for agent sessions (security rules are non-negotiable)
- docs/SESSIONS.md: rolling session log; latest checkpoint = current state of work
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
MAP_EOF
chmod +x scripts/gen-codemap.js

# ------------------------------------------------------------------
say "6/9 Git hygiene: pre-commit hook + commit template"
# ------------------------------------------------------------------
mkdir -p .githooks
cat > .githooks/pre-commit <<'HOOK_EOF'
#!/usr/bin/env bash
# Pre-commit gate. Fast (<2s), zero dependencies.
# 1. Hard-blocks committing the local config file.
# 2. Runs the check suites (security, structure, style, size).
# 3. Regenerates the codemap so navigation aids never go stale.
set -euo pipefail

if git diff --cached --name-only --diff-filter=AMC | grep -qx "assets/js/config.js"; then
  echo "BLOCKED: assets/js/config.js is staged. It must never be committed."
  exit 1
fi

if ! node --test "tests/checks/*.test.js" >/dev/null 2>&1; then
  echo "BLOCKED: check suite failed. Run 'npm test' to see details."
  exit 1
fi

node scripts/gen-codemap.js --quiet
git add docs/CODEMAP.md llms.txt
HOOK_EOF
chmod +x .githooks/pre-commit

cat > .gitmessage <<'MSG_EOF'
# <type>: <imperative summary, max 60 chars>
# types: feat fix docs test refactor chore
#
# Why:
# -
#
# Verified:
# - npm test green
# -
#
# Refs: docs/SESSIONS.md checkpoint / issue link if any
MSG_EOF

git config core.hooksPath .githooks
git config commit.template .gitmessage
note "Hooks live in-repo (.githooks). Fresh clones run: npm run setup"

# ------------------------------------------------------------------
say "7/9 Process documentation: docs/HARNESS.md"
# ------------------------------------------------------------------
cat > docs/HARNESS.md <<'HARNESS_EOF'
# Verification harness and working process

How every change to this repository is made, verified and recorded.
CLAUDE.md holds the short rules; this file holds the reasoning and
the step-by-step process. Zero dependencies: everything runs on the
Node.js built-in test runner and git.

## Commands

    npm run setup    once per fresh clone: wires hooks + commit template
    npm test         full suite: gates + behaviour benchmarks
    npm run map      regenerate docs/CODEMAP.md and llms.txt

## The loop for any change

1. Read the latest checkpoint in docs/SESSIONS.md; branch per
   CLAUDE.md (feat/x, fix/x, docs/x).
2. Before writing code, extend or add a benchmark in tests/ that
   defines "working" for the change (see below). Watch it fail.
3. Implement the smallest change that makes it pass.
4. Run npm test. Soft-limit warnings mean plan a split; hard
   failures mean stop and fix.
5. Commit small and atomic. The template prompts for Why and
   Verified; the pre-commit hook re-runs the gates and refreshes
   the codemap automatically.
6. End of session or low credits: write the SESSIONS.md checkpoint
   first, feature work second.

## What counts as a functioning benchmark

A benchmark is a test that pins observable behaviour, not
implementation detail:

- tests/unit/ - behaviour of JS modules (example: ui.test.js pins
  the exact output of App.escape, the XSS boundary). One file per
  module: tests/unit/<module>.test.js.
- tests/checks/ - repo-wide invariants (security, structure, style,
  size). These encode the CLAUDE.md rules as executable checks, so
  they hold even when an agent forgets the prose.

Definition of done for a feature now includes: its benchmark exists
and passes, and no gate regressed. Browser-only behaviour (auth
redirects, live Supabase queries) is verified manually against the
checklist in the SESSIONS.md entry that introduced it; do not mock
Supabase in this repo.

## File size policy (researched)

Budgets live in tests/size-budget.json and are enforced by
tests/checks/size.test.js.

- Source files (js/css/sql): soft 300 lines, hard 500. Published
  agent-workflow guidance converges on keeping modules a few
  hundred lines so one read-file action captures a whole module
  cheaply; this repo's own CLAUDE.md already targeted 500.
- HTML pages: soft 250, hard 400. Pages are shells; logic belongs
  in assets/js modules.
- Agent-facing docs (md): soft 200, hard 300. Instruction-following
  measurably degrades as always-loaded context grows; guidance for
  CLAUDE.md-class files is ~200 lines or less, with detail split
  into on-demand docs like this one (progressive disclosure).
- Exceptions are explicit, listed in the JSON with a note and an
  exit plan. Current debt: assets/css/main.css (585 lines) is due
  a split into base/components/pages.

When a file crosses its soft limit: finish the current task, then
schedule a split as its own refactor commit before the file is
extended again.

## Navigation aids for crawling AI

- docs/CODEMAP.md - generated table of every tracked file with line
  count and purpose, plus a JS symbol index with file:line targets.
  Agents should jump via the map and read targeted ranges instead
  of whole files.
- llms.txt - repo-root entry point following the llms.txt
  convention: what the project is and which documents to read, in
  priority order.
- Both are generated. Never hand-edit; the pre-commit hook keeps
  them current.

## Audit trail

Three layers, cheapest first:

1. Commit messages - imperative subject plus Why and Verified
   fields from .gitmessage. This is the per-change record.
2. docs/SESSIONS.md - per-session checkpoints: what finished, what
   is half-done and exactly where, ordered next steps, open
   decisions. This is the resume prompt for the next session.
3. Generated codemap diffs - because CODEMAP.md is committed, the
   history of the map is itself a structural audit trail.

## Security gates (mechanical, not advisory)

- Secret-shaped strings (JWTs, sb_secret_, live project URLs,
  private keys, GitHub/AWS tokens) fail the suite in any tracked
  file. Findings report file:line only, never the value.
- assets/js/config.js tracked = failure, and the pre-commit hook
  independently blocks it from being staged.
- Every table in supabase/schema.sql must have RLS enabled and at
  least one policy in supabase/policies.sql in the same commit.
- seed.sql emails must be example.com/org/net.

If a real credential ever lands in a commit: rotate it in the
Supabase dashboard immediately. Rotation, not history rewriting, is
the remediation (this repo never rewrites published history).
HARNESS_EOF
note "docs/HARNESS.md written."

# ------------------------------------------------------------------
say "8/9 Patch CLAUDE.md and docs/SESSIONS.md"
# ------------------------------------------------------------------
if grep -q '<!-- harness:start -->' CLAUDE.md; then
  awk '/<!-- harness:start -->/{skip=1} !skip{print} /<!-- harness:end -->/{skip=0}' \
    CLAUDE.md > CLAUDE.md.tmp && mv CLAUDE.md.tmp CLAUDE.md
fi
cat >> CLAUDE.md <<'CLAUDE_EOF'

<!-- harness:start -->
## Verification harness

- Commands: `npm run setup` (once per clone), `npm test` (full
  suite), `npm run map` (regenerate codemap). Zero dependencies;
  Node built-in test runner.
- Definition of done now includes: a benchmark in tests/ covers the
  change and the whole suite is green. Gates in tests/checks/
  enforce the security, structure, style and size rules above
  mechanically; the pre-commit hook runs them.
- File size budgets: tests/size-budget.json (js/css soft 300 hard
  500; html 250/400; md 200/300). Over soft = schedule a split;
  over hard = split before extending. Exceptions are listed in the
  JSON with an exit plan.
- Navigation: read docs/CODEMAP.md (generated file + symbol index)
  and jump to file:line rather than reading whole files. llms.txt
  is the entry point for external crawlers. Never hand-edit either.
- Full process and rationale: docs/HARNESS.md.
<!-- harness:end -->
CLAUDE_EOF
note "CLAUDE.md: harness section (re)written between markers."

if ! grep -q '2026-07-09 - Test harness and security remediation' docs/SESSIONS.md; then
  awk '{print} /^## Log$/ && !done {print ""; print "## 2026-07-09 - Test harness and security remediation"; print "Branch: feat/test-harness"; print "Completed:"; print "- SECURITY: assets/js/config.js was tracked in this public repo"; print "  (.gitignore had the comment but not the rule). Untracked it,"; print "  fixed .gitignore. Keys must be rotated; old values remain in"; print "  git history, rotation is the remediation."; print "- Zero-dependency test harness (node --test): security, structure,"; print "  style and size gates in tests/checks/; behaviour benchmarks in"; print "  tests/unit/ (ui.js App.escape and badges pinned)."; print "- Size budgets in tests/size-budget.json; main.css 585 lines"; print "  listed as explicit debt with an exit plan."; print "- Generated navigation: docs/CODEMAP.md + llms.txt via"; print "  scripts/gen-codemap.js, refreshed by the pre-commit hook."; print "- Git hygiene: .githooks/pre-commit, .gitmessage template,"; print "  npm run setup for fresh clones. docs/HARNESS.md process doc."; print "- Fixed hard-coded #ffffff in main.css to var(--surface)."; print "In progress:"; print "- None."; print "Next steps:"; print "1. Rotate the Supabase anon key (Dashboard, Settings, API) and"; print "   recreate assets/js/config.js locally from config.example.js."; print "2. Commit this work on feat/test-harness and merge to main."; print "3. Schedule the main.css split (base/components/pages) per"; print "   tests/size-budget.json exception note."; print "Open decisions:"; print "- Owner approval recorded here: tooling limited to Node built-ins"; print "  and git only; no npm packages added (CLAUDE.md dependency rule)."; done=1}' \
    docs/SESSIONS.md > docs/SESSIONS.md.tmp && mv docs/SESSIONS.md.tmp docs/SESSIONS.md
  note "SESSIONS.md: checkpoint recorded (audit trail + dependency decision)."
fi

# ------------------------------------------------------------------
say "9/9 Generate codemap and run the full suite"
# ------------------------------------------------------------------
node scripts/gen-codemap.js
node --test "tests/**/*.test.js" 2>&1 | tail -n 12 || die "Suite failed. Fix before committing (see output above)."

say "DONE - manual actions required"
cat <<'SUMMARY_EOF'
1. ROTATE the Supabase keys now (Supabase Dashboard > Settings >
   API). config.js was committed to a PUBLIC repo; the old key is
   in git history forever, so rotation is the only real fix.
2. Recreate assets/js/config.js locally from config.example.js
   with the NEW key. It stays gitignored and the hook blocks it.
3. Review changes, then commit on a branch:
     git checkout -b feat/test-harness
     git add -A
     git commit            (template opens; fill Why / Verified)
     git push -u origin feat/test-harness
4. Every future clone/Codespace: run  npm run setup  once.
5. Ongoing process: docs/HARNESS.md.
SUMMARY_EOF
