# Current state

Updated: 2026-07-23 (session)
Branch: claude/roadmap-model-logic-2l2ukm (merged to main continuously)

## In progress
None committed in flight. The roadmap board is now bars-only with the
deliverable model landed (migration + code + docs, all merged):
- level=deliverable added; task/improvement children of workstreams
  auto-triaged to deliverables (migration 20260722190000, applied live).
- Board shows workstreams (bold) + nested/standalone work items as bars;
  deliverables are drawer-only (Work items vs Deliverables sections).
- Sweep fixes shipped: dept filter keeps a workstream via matching child
  (A1); custom-view unpick drops the subtree from exports + dims children
  (A2); print/PDF prints the current view, bars only (A3); cascade spans
  leave a slim continuation strip (A4). shareholder_visible retired in
  guidance (B4); tasks may nest or stand alone (B3).

Deliverable audit done (owner waves): Insights' 10 nested metrics and the
Oracle "organise builds" step became deliverables; Terminal financing
workstream moved to Later; other suspects kept as work items. Live-DB only,
recorded in work_notes.

## Next steps
1. VALUE-CAPTURE session (docs/VALUE-CAPTURE.md) - owner asked to resume
   this; merchant_value/pxp_value are empty across the roadmap. Run the
   ranked queue, fill workstreams first in clickable waves.
2. Owner eyeballs the live bars-only board and drawer sections.

## Open decisions
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
- State launches: US state-by-state vs broader region rollout. Placeholder.
