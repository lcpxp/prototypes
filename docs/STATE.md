# Current state

Updated: 2026-08-13 (portal review built; four of seven plan files done)

## In progress
Nothing mid-flight. 424 tests green on main, npm run audit clean.
Programme is docs/plan/, start at 00-PROGRAMME.md. Landed since the
last checkpoint:

- Portal review as a feature (60): schema, the 39-area map as data,
  three read-only pages, docs/PORTAL-REVIEW.md and /portal-review.
  Migrations 20260813230545 and 20260813233000, both additive.
- Code-review wave 1 (10, 30): fifteen styling capability rows, six
  work notes, twelve links. Three places where the written rules and
  the code disagree are recorded as such.
- Dashboard rebuilt (50); completeness contract on every surface (40).

## Next steps
1. Prototype ideas and plans area (70) - the last unbuilt plan file.
2. First real portal-review wave: 18 of the board's area/roadmap
   pairs named work items that no longer exist, and only a wave
   against the live roadmap can resolve them.
3. Global search over the remaining sources (40-SURFACING).
4. Further code-review waves (10) - wave 1 covered styling only.
5. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.

## Open decisions
- Four in 00-PROGRAMME.md: reference scope, Unity grading,
  commented-out routes, promoted-finding handling.
- Milestones/phases: LEFT ALONE, decided 13 Aug. Do not re-propose.
- Edge Function + gte-small: AGREED 9 Aug. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug. The browser reads; sessions write.
