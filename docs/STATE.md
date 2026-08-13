# Current state

Updated: 2026-08-13 (all seven programme plan files built)

## In progress
Nothing mid-flight. 440 tests green on main, npm run audit clean.
Programme is docs/plan/, start at 00-PROGRAMME.md. Every plan file
from 10 to 70 has a "what landed" section recording where the build
corrected the plan. Landed since the last checkpoint:

- Prototype ideas and plans (70): twelve columns on
  future_prototypes, an ideas board, a gallery strip that points at
  it, docs/PROTOTYPE-IDEAS.md and /prototype-idea. Migration
  20260813234500, additive.
- Portal review (60), dashboard (50), knowledge wave 1 (10, 30),
  surfacing (40).

## Next steps
1. The two owner passes the build deliberately left: backfill the
   fourteen prototype ideas, and resolve the 18 review-area/roadmap
   pairs naming work items that no longer exist. Both are judgements,
   not derivations.
2. Global search over the remaining sources (40-SURFACING).
3. Further code-review waves (10) - wave 1 covered styling only.
4. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.

## Open decisions
- Four in 00-PROGRAMME.md: reference scope, Unity grading,
  commented-out routes, promoted-finding handling.
- Milestones/phases: LEFT ALONE, decided 13 Aug. Do not re-propose.
- Edge Function + gte-small: AGREED 9 Aug. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug. The browser reads; sessions write.
