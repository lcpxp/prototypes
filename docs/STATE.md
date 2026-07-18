# Current state

Updated: 2026-07-18 (mid-session checkpoint)
Branch: claude/lpio-refactor-search-optimise-t990at

## In progress
- The maintenance, optimisation and search refactor (the session that
  introduced this file). Phases 1-7 are committed and pushed; Phase 8
  (this STATE.md replacing the SESSIONS log) is landing now. Phase 8.5
  (changelog + `npm run audit`) and Phase 9 (closeout) remain.

## Next steps
1. Phase 8.5: add docs/CHANGELOG.md and scripts/audit.js (`npm run audit`).
2. Phase 9 closeout: `npm run map`, confirm the Pages deploy is green,
   exercise search by keyboard on the deployed site, then overwrite this
   file to "In progress: none".
3. Owner, data-only in Supabase (not the repo): assign departments to the
   ~50 live work_items; the mechanism already ships.

## Open decisions
- none

## Recent history
Run: git log --oneline -15
User-facing changes: docs/CHANGELOG.md
