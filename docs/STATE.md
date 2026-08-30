# Current state

Updated: 2026-08-30 (refactor workstream closed; sense check logged below)

## In progress
Nothing. docs/plan/90-REFACTOR.md is the record: fifteen commits, CI and
the Pages deploy green on every one, 573 tests, audit clean, snapshot
untouched, and no user-visible change - verified against a worktree of
the pre-refactor tree across 28 pages, all pixel-identical.

## Next steps
Owner-supplied content stays the only queued content work
(docs/HANDOVER-CONTEXT.md). Three small code items, none urgent:
1. `roadmap_move_workstream` and `work_item_embed_text` do not pin
   `set search_path = public`; the other 16 functions do and Supabase
   flags both. Needs a migration, so it is the owner's call.
2. `copy()` and `fallback()` are byte-identical in core/send-tool.js and
   core/daopay-admin-tool.js - the last duplication in shipped JS.
3. Three of the fifteen acknowledged over-soft files are worth splitting
   (components.css, roadmap-views.css, roadmap.css); the seams are in
   tests/size-budget.json and the rest are deliberate.

## Verification the repo cannot do for itself
- A signed-in pass over an app-review wave with coloured triage rows:
  a gate proves each colour_token has its pair, only a browser proves
  the rows are coloured.

## Open decisions
- SECURITY, open since 2026-07 and until now only in the read-only
  archive: leaked-password protection is still disabled in Supabase
  Auth, confirmed live. Owner action, dashboard only.
- `is_admin`, `own_role` and `has_module_access` are SECURITY DEFINER
  and executable by authenticated users. Each returns only the caller's
  own access, so this reads as intentional - record it as accepted.
- Rename lcpxp/prototypes to lcpxp/lpio? Nothing in-code depends on the
  name; GitHub redirects. Raised 2026-07, never carried forward.
- Should daopay-admin-tool.js and send-tool.js (~16KB together) load on
  all 23 pages or only in the DaoPay prototype? Both draw a nav icon, so
  dropping them is visible. Six times what this refactor added.
