# Current state

Updated: 2026-07-22 (session)
Branch: claude/coo-priority-scoping-bwpjua

## In progress
None. COO priority scoping written to the roadmap, plus a new business
area associations capability:
- Schema: work_items.associated_departments text[] (constrained to the
  department keys, GIN indexed); roadmap_current recreated with the new
  column and security_invoker restated. Migration 20260722160000 in the
  repo; applied live. Front-end: department filter now matches owner OR
  association (roadmap-views.byDepartment); drawer shows Business areas;
  CSV/JSON exports carry business_areas. Tests green (113).
- Roadmap content: 26 COO-sourced work_items (requested_by='COO'), key
  clash decisions recorded in work_notes (PS fees Next->Later, terminal
  financing kept parked at 75%, PCI kept Later, blacklist revived,
  onboarding API left unchanged pending Luke's session).

## Next steps
1. Working session with the COO to turn this into delivery waves;
   resolve the two held items: onboarding API pull-vs-push model, and
   the "State launches" placeholder scope.
2. Owner reviews the 26 new items on the board and prunes/repriorities;
   promote Payment Service fee configuration when a team is assigned.
3. Merge this branch to main once reviewed; deploy is automatic.

## Open decisions
- Onboarding API: pull model (COO) vs existing push/static-submission
  scoping. Held, no change applied yet.
- State launches: US state-by-state vs broader region rollout. Captured
  as a placeholder to confirm.
