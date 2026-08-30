# Verification harness and working process

How every change to this repository is made, verified and recorded.
CLAUDE.md holds the short rules; this file holds the reasoning and
the step-by-step process. Zero dependencies: everything runs on the
Node.js built-in test runner and git.

## Commands

    npm run setup    once per fresh clone: wires hooks + commit template
    npm test         full suite: gates + behaviour benchmarks
    npm run map      regenerate docs/CODEMAP.md and llms.txt
    npm run audit    one-screen health report, knowledge decay included
    npm run knowledge  print the SQL behind the knowledge gate

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

**The numbers live in tests/size-budget.json and nowhere else.** Read
them there. They were restated in this file for months, and the copy
here had drifted: it named a markdown cap the JSON had already moved
past, so a session reading this document planned a split the gate did
not want. Quoting them again, even to warn about quoting them, would
repeat the mistake.

What the numbers mean:

- Over soft: record an `acknowledged` entry. It is a DECISION not to
  split, naming both the seam and the TRIGGER that would change it - a
  line count to revisit at, the release that folds it, or never. It
  cannot raise a cap, so the only way past hard is to actually split.
  The gate rejects an entry with no seam, one with no trigger, and one
  whose file has come back under soft.
- The trigger requirement exists because the first version of these
  read as queued tasks. They aged into a backlog nobody worked and
  nobody re-judged, which is how a limit ends up with 41 exceptions.
- Splitting is not free and the decision has to price it. There is no
  build step, so shedding part of a stylesheet or a page module adds an
  HTTP request to every page that loads it. On 2026-08-30 all fifteen
  over-soft files were re-judged on that basis and none was worth
  splitting; each sits at least 120 lines under its hard cap.
- Over hard: split before extending.
- An `exception` is a DIFFERENT cap with the reason for it, not a
  bigger one. docs/STATE.md is the case that matters, and its cap is
  tighter than its extension's.
- Immutable trees - applied migrations, the sessions archive - are
  exempt as a class, with the reason recorded once.

The caps sit where the repo actually settled. The previous, tighter
numbers produced 41 per-file exceptions across 39 files, each with an
exit plan nobody took: a registry of exemptions rather than a
constraint.

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

## The knowledge gate

Three gates check structure - that a vocabulary is documented, that a
stored value renders, that the reference matches the code. None of
them notices CONTENT decaying: a note that lost its anchor, a term
whose source was dropped, a closed item whose resolution went missing.
Those matter most to whoever supplies the content, because the promise
they rely on is that what they say does not get lost.

`npm run knowledge` prints the SQL; a session with Supabase access runs
it and writes `supabase/knowledge-coverage.json` - counts only, never a
title or a body, the same trick the reference and schema artefacts use.
`tests/checks/knowledge-drift.test.js` ratchets it against
`tests/knowledge-budget.json`.

Five figures are at zero and their ceilings are held at zero, so
raising one instead of fixing the rows fails the build: every glossary
term has a definition and a source, every journey stage has a source,
every source document has a digest, and no finding claims a promotion
with nothing behind it. The rest are the honest backlog, and
`docs/HANDOVER-CONTEXT.md` is the session that closes them.

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
