# Current state

Updated: 2026-07-18 (session)
Branch: claude/ai-portal-backlog-roadmap-59pvcp

## In progress
- none. Roadmap/backlog overhaul complete: department-first Executive
  view, working Compact/Detailed on Team and Backlog (a Category -> Area
  -> item breakdown), sub-steps via work_items.parent_id shown as a
  checklist, progress de-emphasised (no board-level %), and Export CSV on
  the roadmap and backlog (App.csvFromRows + App.download in ui.js). The
  cascade family is split into roadmap-views-cascade.js. Schema: the
  parent_id migration is applied and mirrored in 30_work.sql; departments
  are backfilled on all product-scope items.

## Next steps
1. Owner: review and merge; the Pages deploy runs on merge to main, then
   verify the live Executive/Team/Backlog views, the sub-step drawer and
   both CSV exports there.
2. Data (Supabase, not the repo): Legal & Compliance owns no work yet;
   assign it when work lands. Grow the Front end backlog and the Unity
   sub-steps as they progress.
3. When next touching them, split the over-soft files with a size-budget
   exit plan (roadmap-views.js exec/breakdown builders, backlog.js CSV).

## Open decisions
- none

## Recent history
Run: git log --oneline -15
User-facing changes: docs/CHANGELOG.md
