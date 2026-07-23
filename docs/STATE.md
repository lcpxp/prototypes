# Current state

Updated: 2026-07-23 (session)
Branch: main (all 33 task branches verified merged or superseded,
2026-07-23; deletion blocked from the session - owner to prune them)

## In progress
Roadmap context enrichment (protocol in work_notes, 2026-07-22): fixed
context blocks in work_items.details, owner-confirmed in waves. Wave 1
done: 13 theme descriptions, 12 area descriptions, all 15 workstreams,
~26 items including all Now-band. Wave 2 remains (see next steps).

Shipped today (on main, data live in Supabase): nested items stack in
stage order under a workstream (childOrder, Timeline + Cascade;
tests/unit/roadmap-child-order.test.js); child bars/cards inherit the
workstream theme with a faint .rmv-theme-dot flagging a mismatched own
theme; Timeline split into roadmap-views-timeline.js; "Acquirer Services
and Fees" retagged Acquiring; "Optional pricing lines" toggle made
standalone under Products & Pricing; dropped duplicate deleted.

## Next steps
1. Context enrichment wave 2: questionnaire sections D and E -
   Next/Later items (Payment Service definition, merchant level
   separation, IVR meaning, partner org identities, 10 Insights
   children, bulk apply) and all backlog items; then spot-check by
   generating a user story from stored context alone; then fold the
   context template into ROADMAP-PLAYBOOK.md capture rules (owner nod).
2. VALUE-CAPTURE session (docs/VALUE-CAPTURE.md) still pending -
   merchant_value/pxp_value empty across the roadmap.
3. Owner eyeballs the live board: colour blocks, mismatch dots,
   child stacking.

## Open decisions
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
- State launches: US state-by-state vs broader region rollout. Placeholder.
