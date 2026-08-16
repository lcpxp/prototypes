# Current state

Updated: 2026-08-15 (reference closed, knowledge gate landed)

## In progress
507 tests green on main; `npm run audit` clean. Programme is
docs/plan/, start at 00-PROGRAMME.md. Closed: 20-API-REFERENCE.md (392
rows, 552 of 552 routes, every drift figure capped at 0), code-review
wave 3 (glossary held, journey model did not - CR3-02), and the
knowledge gate that holds content integrity as a ratchet.

## Next steps
1. **80-LOAD-SPEED phase 2.** Phase 1 landed: notes load when a drawer
   opens, worth 63,098 bytes (8.2%) and one request; lazy-detail.js is
   the reusable mechanism. Phase 2 is `details`, 102,956 more (13.3%),
   21.5% total against a 25% target - the plan states that plainly.
   ORDER MATTERS: fix the two board-wide CSV exports FIRST. Both
   `flattenItem` and `backlog.js:187` write `details` for every row, so
   taking it off page load first leaves a window where every export
   silently loses a column. Verified, not assumed.
2. **Embeddings**, below.

## Embeddings: decided, deferred, not owner-blocked
DECIDED 15 Aug, the session's call: enable `vector` and `pg_net`, have
Postgres call the Edge Function and write back, so no vector crosses a
chat session and no elevated key is needed. The rescale does NOT need
the owner - correcting what this file said on 14 Aug.
docs/KNOWLEDGE-MODEL.md holds 14 labelled items from the replayed
2026-07-27 batch; fit the affine floor and ceiling to them.

## Owner passes
docs/HANDOVER-CONTEXT.md is the claude.ai prompt. Its figures are the
ones `npm run audit` shows and the knowledge gate holds, so filling
them lowers a ceiling that cannot climb back.

## Open decisions
- 00-PROGRAMME.md: Unity grading, commented-out routes,
  promoted-finding handling. Reference scope CLOSED 14 Aug.
- Milestones/phases LEFT ALONE and front-end writes CLOSED, 13 Aug.
