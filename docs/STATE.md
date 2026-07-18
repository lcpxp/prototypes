# Current state

Updated: 2026-07-18 (session end)
Branch: claude/lpio-refactor-search-optimise-t990at

## In progress
- none. The maintenance, optimisation and search refactor is complete:
  theme-guard fix, deferred scripts, the search upgrade with item
  deep-linking, the inline-style and size gates, the schema baseline,
  the permission policy and slimmer hook, App.notice error states, this
  STATE.md replacing the log, and the changelog and audit. All committed
  and pushed; npm test 90/90 and npm run audit clean.

## Next steps
1. Owner: review and merge this branch; the GitHub Pages deploy runs on
   merge to main, so verify the live dashboard, roadmap and keyboard-only
   search there afterwards.
2. Owner, data-only in Supabase (not the repo): assign departments to the
   ~50 live work_items; the mechanism already ships.
3. When next touching them, split the over-soft files that carry a
   size-budget exit plan (components.css, roadmap-views.js, others).

## Open decisions
- none

## Recent history
Run: git log --oneline -15
User-facing changes: docs/CHANGELOG.md
