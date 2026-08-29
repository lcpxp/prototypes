# Current state

Updated: 2026-08-29 (refactor workstream, phases 0-4 and 6 landed)

## In progress
docs/plan/90-REFACTOR.md is the workstream record and the resume point.
Landed on main, each verified in a browser against a worktree of the
pre-refactor tree: the surface/include gates, the dead theme guard
removed from 24 pages, roadmap-detail.js and roadmap.js unfrozen
(App.roadmapDetailValues, App.roadmapPrefs, App.store), the size budget
rebuilt (41 exceptions -> 1 + 15 acknowledgements), the esc() dead null
checks and the audit's misreading .then/.catch metric, and the two
database-to-style gates. 563 tests green, audit clean.

## Next steps
Phase 5 is the one left with real blast radius: nest assets/js/pages/
(50 flat files) per module and mirror it in tests/unit/, merging the
renames into the same move so every file moves once. 63 script srcs, 36
hardcoded paths in tests/scripts, the vm loader lists and the COVERAGE
map all move with them. Then phases 7 (includes.json manifest, the stale
CLAUDE.md map, HARNESS.md's wrong md budget) and 8 (codemap rebuild, a
navigation guide, per-page asset budget).

## Verification the repo cannot do for itself
- The harness is a session tool in the scratchpad, not in the repo: a
  fixture-backed Supabase stub plus Chromium, comparing 34 screenshots,
  three golden exports and a behaviour transcript against a git worktree
  of the pre-refactor commit. It has to be rebuilt to re-verify.
- A real signed-in pass over the app-review board with coloured triage
  rows: the colour_token path now has a gate, but only a browser proves
  the rows are still coloured.

## Open decisions
- Should daopay-admin-tool.js (7,935 B) and send-tool.js (8,257 B) load
  on all 23 protected pages, or only inside the DaoPay prototype? Both
  render a nav icon, so dropping them is a visible change and is the
  owner's call. ~16KB uncompressed per page load.
