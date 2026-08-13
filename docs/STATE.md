# Current state

Updated: 2026-08-13 (phase 1 of the alignment programme shipped)

## In progress
Nothing mid-flight. 277 tests green. The programme is docs/plan/;
start at 00-PROGRAMME.md. Phase 1 (ground truth) and the first of
phase 2 have landed on main:

- scripts/extract-routes.js: the route inventory, seven normalisation
  rules, 12 benchmarks against synthetic fixtures. Reproduces 552
  routes / 51 controllers from the supplied snapshot.
- supabase/reference-coverage.json + npm run coverage: counts and a
  digest only, no paths. tests/checks/reference-drift.test.js is a
  ratchet against tests/reference-budget.json and fails both ways.
- The twelve wrong reference rows corrected. phantom 12 to 0,
  coverage 56.3% to 60.5%, rows 245 to 256, absent 219 to 196.
- assets/js/core/links.js: knowledge links render for all 49 entity
  type pairs, not two. Destinations for note/term/stage/document/area
  are still missing, so those render as name plus type.

## Next steps
1. The shared detail panel and App.blocks (40-SURFACING.md), including
   the anchors that give terms, stages and documents a destination.
2. Dashboard rebuild (50-DASHBOARD.md).
3. First code-review wave and the style capability load (10, 30).
4. Portal review waves (60), prototype ideas (70).
5. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.

## Open decisions
- Four of the five in 00-PROGRAMME.md remain: reference scope, Unity
  grading, commented-out routes, and whether a promoted finding
  creates or merges into a work item. Removing the empty
  milestones/phases schema is agreed in the plan but not yet done -
  it is a destructive migration and wants an explicit go-ahead.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug at Luke's direction. The browser
  reads; every content change is made in a Claude session.
