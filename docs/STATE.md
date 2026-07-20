# Current state

Updated: 2026-07-20 (session)
Branch: main (via claude/roadmap-review-process-l3dhpm)

## In progress
- none. Roadmap review process + workstream model + custom presentation
  view shipped. work_items.level names a 'workstream' (a presentable
  high-level container; its sub-items nest via parent_id and collapse
  when Detailed is off) vs an 'item'; roadmap_categories.shareholder_visible
  hides internal themes; the roadmap_current view is the one-query snapshot.
  The board gained Shareholder view, Custom view (per-row PDF/export picker)
  and a workstream marker. docs/ROADMAP-PLAYBOOK.md is the single operating
  manual; /roadmap and /roadmap-add wrap it. Migration
  20260720000000_workstreams_and_visibility applied live.

## Next steps
1. Use /roadmap for the regular review and /roadmap-add for one-line
   capture; let the playbook be the entry point for any AI.
2. As internal themes accrue (bugs/fixes), set their
   shareholder_visible=false so the Shareholder view stays clean.
3. Mark further coarse items level='workstream' as they are scoped.

## Open decisions
- Only 'core' is shareholder_visible=false so far; extend to any future
  internal/fix theme rather than adding a per-item audience flag.

## Recent history
Run: git log --oneline -15
User-facing changes: docs/CHANGELOG.md
