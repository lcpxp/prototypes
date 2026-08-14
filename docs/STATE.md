# Current state

Updated: 2026-08-13 (surfacing complete; all seven plan files built)

## In progress
Nothing mid-flight. 450 tests green on main, npm run audit clean.
Programme is docs/plan/, start at 00-PROGRAMME.md. Every plan file
from 10 to 70 carries a "what landed" section recording where the
build corrected the plan. Landed since the last checkpoint:

- Global search now reaches the narrative content: six sources became
  fourteen. Results window the matched text and land on the row, never
  a module index. That closes 40-SURFACING.
- Code-review wave 2: ten technical capability rows, ten links, two
  work notes. Corrected two plan claims (signals are past halfway;
  eight guards, not three roles) and explained the 53-vs-51 controller
  gap - two controllers are commented out entirely.

## Next steps
1. The two owner passes the build deliberately left: backfill the
   fourteen prototype ideas, and resolve the 18 review-area/roadmap
   pairs naming work items that no longer exist. Both are judgements,
   not derivations.
2. Further code-review waves (10): domain terms and journey stages
   against the onboarding-flow step definitions. Waves 1 and 2 covered
   styling and architecture.
3. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.
4. Backlog notes against documents, and the platform Coverage line for
   prototypes with no built-from links (both wait on content).

## Open decisions
- Four in 00-PROGRAMME.md: reference scope, Unity grading,
  commented-out routes, promoted-finding handling.
- Milestones/phases: LEFT ALONE, decided 13 Aug. Do not re-propose.
- Edge Function + gte-small: AGREED 9 Aug. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug. The browser reads; sessions write.
