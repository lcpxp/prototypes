# Current state

Updated: 2026-08-30 (refactor workstream closed, sense-check items done)

## In progress
Nothing. docs/plan/90-REFACTOR.md is the record: nineteen commits, CI and
the Pages deploy green on every one, 575 tests, audit clean, snapshot in
step at 56 migrations. No user-visible change - verified against a
worktree of the pre-refactor tree across 28 pages, all pixel-identical,
plus both console-tool dialogs driven end to end.

## Next steps
Owner-supplied content is the only queued work, and the backlog is much
smaller than it was: items.no_summary is 6 of 292 (was 80 of 268), and
notes.orphaned, ideas.no_summary and ideas.no_value_note are all 0.
docs/HANDOVER-CONTEXT.md still covers what is left. Every ceiling that
was beaten has been tightened to lock the gain in.

## Verification the repo cannot do for itself
- A signed-in pass over an app-review wave with coloured triage rows:
  a gate proves each colour_token has its pair, only a browser proves
  the rows are coloured.
- Compressed load speed against the Pages URL. Uncompressed per-page
  weight is now ratcheted in tests/page-weight-budget.json and is 21
  requests lighter than before this workstream began.

## Open decisions
- SECURITY: leaked-password protection is still disabled in Supabase
  Auth, confirmed live. Owner action, dashboard only - it is the one
  advisor finding this session could not fix from here.
- Rename lcpxp/prototypes to lcpxp/lpio? Nothing in-code depends on the
  name; GitHub redirects. Raised 2026-07, still open.
- items.closed_without_resolution is 40 of 292 and rose past its old
  ceiling. One row was recovered; the rest need the owner, and some are
  recoverable from git or from notes.
