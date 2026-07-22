# Current state

Updated: 2026-07-22 (session)
Branch: claude/roadmap-model-logic-2l2ukm (merged to main continuously)

## In progress
None. This session confirmed the roadmap model with the owner (12
clickable answers) and applied the two deltas:
- Work Items view now expands each workstream's nested items under its
  bar/card by default; loose items interleave by priority, workstreams
  win ties. Workstreams/Categories/Backlog unchanged by design.
- Item drawer and JSON/CSV exports now surface the full stored context:
  details, type/effort/impact/priority, workstream + relates_to titles,
  requested_by, external_ref, tags, resolution (+date), work_notes
  decisions, and a generic row for any unhandled attributes key.
Also: exec board extracted to roadmap-views-exec.js and custom-view
benchmarks split out, per the size-budget exit plans.

## Next steps
1. Owner eyeballs the live board: Work Items expansion, drawer depth,
   and the priority-interleave ordering reading correctly.
2. Working session with the COO to turn the scoped work into delivery
   waves; resolve the held items below; owner repriorities the ~26 new
   items and promotes Payment Service fee configuration when teamed.
3. Consider the roadmap-detail.js split (exports to their own module)
   next time the drawer grows.

## Open decisions
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
- State launches: US state-by-state vs broader region rollout. Placeholder.
