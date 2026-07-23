# Current state

Updated: 2026-07-23 (session)
Branch: claude/acquirer-services-roadmap-0867ue (task branch; merge to
main when the owner is happy with the board)

## In progress
Nothing in flight. This session shipped (code on the branch above, data
live in Supabase):
- Nested items stack in stage order under a workstream (Now/Next/Later,
  shorter spans first) in both Timeline and Cascade; new comparator
  childOrder; benchmarks in tests/unit/roadmap-child-order.test.js.
- Child bars/cards inherit the workstream's theme colour; a faint
  .rmv-theme-dot in the child's own theme flags a mismatch.
- Timeline layout split into roadmap-views-timeline.js (size budget).
- Data: workstream renamed "Acquirer Services and Fees" and retagged
  Acquiring; "Optional pricing lines" toggle made standalone under
  Products & Pricing; dropped duplicate per-line-default item deleted.

## Next steps
1. Owner eyeballs the board: family colour blocks, mismatch dots, child
   stacking; then merge the branch to main.
2. VALUE-CAPTURE session (docs/VALUE-CAPTURE.md) still pending -
   merchant_value/pxp_value empty across the roadmap.

## Open decisions
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
- State launches: US state-by-state vs broader region rollout. Placeholder.
