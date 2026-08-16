# Current state

Updated: 2026-08-16 (load-speed closed, embeddings next)

## In progress
536 tests green on main; `npm run audit` clean. Programme is
docs/plan/, start at 00-PROGRAMME.md. Closed: 20-API-REFERENCE.md (392
rows, 552 of 552 routes, every drift figure capped at 0), the knowledge
gate, and 80-LOAD-SPEED.md - the board reads `work_items_board`, prose
and notes load per drawer, all three board-wide exports fetch what they
write. 33.1% off every visit's data, 18.8% off a first-ever cold load.

## Next steps
1. **Embeddings**, below - the last queued item.
2. Optional: the DevTools run that settles the compressed saving.
   80-LOAD-SPEED.md records the uncompressed figures and says plainly
   which number is a prediction.

## Embeddings: decided, deferred, not owner-blocked
DECIDED 15 Aug, the session's call: enable `vector` and `pg_net`, have
Postgres call the Edge Function and write back, so no vector crosses a
chat session and no elevated key is needed. The rescale does NOT need
the owner. docs/KNOWLEDGE-MODEL.md holds 14 labelled items from the
replayed 2026-07-27 batch; fit the affine floor and ceiling to them.
Blend calibrated scores into `roadmap_find` by weight, not rank fusion;
no HNSW under ~5,000 rows.

## Owner passes
docs/HANDOVER-CONTEXT.md is the claude.ai prompt. Its figures are the
ones `npm run audit` shows and the knowledge gate holds, so filling
them lowers a ceiling that cannot climb back.

## Open decisions
- 00-PROGRAMME.md: Unity grading, commented-out routes,
  promoted-finding handling. Reference scope CLOSED 14 Aug.
- Milestones/phases LEFT ALONE and front-end writes CLOSED, 13 Aug.
