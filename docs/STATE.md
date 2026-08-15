# Current state

Updated: 2026-08-14 (reference closed, wave 3 done, audit clean)

## In progress
482 tests green on main; `npm run audit` clean, 0 files over soft
without an exit plan. Programme is docs/plan/, start at
00-PROGRAMME.md. Closed this session: 20-API-REFERENCE.md (392 rows,
552 of 552 routes, every drift figure capped at 0) and code-review
wave 3 (the glossary held; the journey model did not - CR3-02).

## Next steps
1. **80-LOAD-SPEED.md.** Baseline measured and written into the plan:
   dropping `details` and the notes fetch takes 166,054 of 772,987
   uncompressed bytes - **21.5%, under the 25% target**. Compressed
   share is likely higher; the DevTools run settles it. Build not
   started; wants a fresh session for the migration, board view, lazy
   drawer and skeleton, both export paths and the backlog modal.
2. **Embeddings.** Blocked on the decision below.

## The embeddings decision
Design settled in docs/KNOWLEDGE-MODEL.md; `vector` 0.8.2 available,
not installed. Two things stop a session finishing it alone. The
BACKFILL needs a path: the Edge Function computes vectors, something
must write 268, a chat session cannot carry them and the function
cannot write without elevated rights. `pg_net` is the clean answer and
adding an extension is an owner decision. The RESCALE must be fitted:
gte-small cosines sit at 0.70-0.80 for unrelated text, so the affine
floor and ceiling need labelled pairs. Guessing is what it forbids.

## Owner passes
docs/HANDOVER-CONTEXT.md is the claude.ai prompt: 14 blank prototype
ideas, 80 items with no summary, 20 orphan notes, 110 proposed links,
who consumes Metrics and ShoppingCart, any Unity source, next areas.

## Open decisions
- 00-PROGRAMME.md: Unity grading, commented-out routes,
  promoted-finding handling. Reference scope CLOSED 14 Aug.
- Milestones/phases LEFT ALONE and front-end writes CLOSED, 13 Aug.
