# Current state

Updated: 2026-07-20 (session)
Branch: claude/person-modal-upload-delay-yu0sl7 (merged to main as it went)

## In progress
None. The signed-off work-model redesign shipped end to end and is live on
main. Bands stay Done/Now/Next/Later/Parked-Backlog (dates are a later
phase). Delivered this session, each a green commit merged to main:
- Foundation: roadmap_categories.owning_department (seeded) and
  work_items.relates_to_id (soft fix link). Migration 20260720130000.
- Backlog level mirrors the full backlog master list (nothing captured is
  invisible in the roadmap).
- Timeline sorts workstreams above standalone items.
- Playbook capture rules: every item gets an area; fixes are a standalone
  maintenance item soft-linked via relates_to_id; PRD -> workstream+items.
- Data: promoted the owner narrative initiatives to workstreams and
  scheduled them Now/Next/Later (work_notes decision recorded).
- View switch reworked to Workstreams (default) / Categories / Work Items /
  Backlog + Department filter; new Workstreams level (workstreams only,
  standalone hidden).
- Hide fixes toggle (drops standalone bug/task/improvement items).
- Department-keyed lane colours (Product blues, Ops greens, Finance
  violets, Sales magentas, Risk orange); workstream bars a stronger shade.

## Next steps
1. Real dates/quarters as a later phase (owner deferred; bands for now).
2. As new themes are added, set owning_department so the palette resolves.
3. Refine which items are workstreams vs standalone as the team reviews.

## Open decisions
- Fixes are derived (standalone + type bug/task/improvement); revisit an
  explicit `track` field only if the derivation proves fragile.
