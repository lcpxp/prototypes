# Verification harness and working process

How every change to this repository is made, verified and recorded.
CLAUDE.md holds the short rules; this file holds the reasoning and
the step-by-step process. Zero dependencies: everything runs on the
Node.js built-in test runner and git.

## Commands

    npm run setup    once per fresh clone: wires hooks + commit template
    npm test         full suite: gates + behaviour benchmarks
    npm run map      regenerate docs/CODEMAP.md and llms.txt

## Permissions and the pre-commit hook

`.claude/settings.json` is committed and shared: an allow list that
pre-approves the routine commands of a session (npm/node, read-only and
write git, the search tools, a local http server, file reads/edits) and a
deny list that mechanically blocks the hard rules - reading config.js or
.env, force-pushing, `git add -f`, `rm -rf`. `.claude/settings.local.json`
is per-developer and gitignored for personal extras.

`.githooks/pre-commit` (wired by `npm run setup`) stays fast: it always
hard-blocks a staged config.js, but runs the check suite only when
code/content changed and the commit is not solely the checkpoint
(docs/STATE.md), and regenerates the codemap only when a rendered source
file (js/css/html) changed. CI runs the full suite on every push, so the
checkpoint commit stays instant without losing coverage.

## The loop for any change

1. Read docs/STATE.md for the current state; branch per
   CLAUDE.md (feat/x, fix/x, docs/x).
2. Before writing code, extend or add a benchmark in tests/ that
   defines "working" for the change (see below). Watch it fail.
3. Implement the smallest change that makes it pass.
4. Run npm test. Soft-limit warnings mean plan a split; hard
   failures mean stop and fix.
5. Commit small and atomic. The template prompts for Why and
   Verified; the pre-commit hook re-runs the gates and refreshes
   the codemap automatically.
6. End of session or low credits: overwrite the docs/STATE.md checkpoint
   first (it is left in flight only while work is unfinished), feature
   work second.

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
change's own commit and docs/STATE.md; do not mock Supabase in this
repo.

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
  exit plan. No source-file debt is currently listed; the former
  main.css monolith was split into the layered stylesheets.

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
2. docs/STATE.md - the fixed-size current state: what is half-done and
   exactly where, ordered next steps, open decisions. Overwritten each
   checkpoint, it is the resume prompt for the next session;
   docs/CHANGELOG.md records what changed for users.
3. Generated codemap diffs - because CODEMAP.md is committed, the
   history of the map is itself a structural audit trail.

## Security gates (mechanical, not advisory)

- Secret-shaped strings (JWTs, sb_secret_, live project URLs,
  private keys, GitHub/AWS tokens) fail the suite in any tracked
  file. Findings report file:line only, never the value.
- assets/js/core/config.js tracked = failure, and the pre-commit hook
  independently blocks it from being staged.
- Every table in supabase/schema/ must have RLS enabled and at
  least one policy in supabase/policies.sql in the same commit.
- seed.sql emails must be example.com/org/net.

If a real credential ever lands in a commit: rotate it in the
Supabase dashboard immediately. Rotation, not history rewriting, is
the remediation (this repo never rewrites published history).
