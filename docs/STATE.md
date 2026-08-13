# Current state

Updated: 2026-08-13 (surfacing done; dashboard rebuilt)

## In progress
Nothing mid-flight. 399 tests green on main, npm run audit clean.
Programme is docs/plan/, start at 00-PROGRAMME.md. Landed since the
last checkpoint:

- The completeness contract is on every surface named in 40-SURFACING:
  roadmap drawer, platform card, both backlog modals, the user
  register and the review-board drawer. `App.detail.facts` gained
  `markup` (a caller's own row layout), `also` (columns one row
  already speaks for) and `multi` (a field emitting many rows).
  Buried columns found and fixed: capability tags, document
  supersedes_id, milestone_id, and four on review_applications.
- Dashboard rebuilt (50-DASHBOARD.md): seven grant-gated sections on
  one new RPC, `dashboard_summary()` (migration 20260813223937,
  additive). Spec cards name each gap rather than summing them - one
  figure would have read "3 gaps" against 196 undocumented routes.

## Next steps
1. First code-review wave and the style capability load (10, 30).
2. Portal review waves (60), then its dashboard card.
3. Prototype ideas (70).
4. Global search over the remaining sources (40-SURFACING).
5. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.

## Open decisions
- Four in 00-PROGRAMME.md: reference scope, Unity grading,
  commented-out routes, promoted-finding handling.
- Milestones/phases: LEFT ALONE, decided 13 Aug. Do not re-propose.
- Edge Function + gte-small: AGREED 9 Aug. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug. The browser reads; sessions write.
