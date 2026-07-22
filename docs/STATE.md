# Current state

Updated: 2026-07-22 (session)
Branch: claude/coo-priority-scoping-bwpjua

## In progress
None. COO priority scoping is written to the roadmap, plus two system
capabilities:
- Business area associations: work_items.associated_departments text[];
  the department filter matches owner OR association; drawer + exports
  carry it. Migration 20260722160000.
- Workstream reschedule cascade: roadmap_move_workstream(id, horizon)
  shifts a workstream and its direct children by the same band delta,
  preserving offsets/span (soft-linked items stay put). Migration
  20260722170000; canonical op in the playbook.

Granular re-filing done: Partner onboarding flows is now a workstream
with Xolvis/VFS as low-priority Later children; the provisioning trio are
un-nested Later items soft-linked to Unity integration.

## Next steps
1. Working session with the COO to turn this into delivery waves; resolve
   the held items: onboarding API pull-vs-push, and the State launches
   placeholder scope.
2. Owner reviews the ~26 new items and repriorities; promote Payment
   Service fee configuration when a team is assigned.
3. Merge this branch to main once reviewed; deploy is automatic.

## Open decisions
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
- State launches: US state-by-state vs broader region rollout. Placeholder.
