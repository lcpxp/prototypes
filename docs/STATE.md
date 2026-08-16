# Current state

Updated: 2026-08-16 (programme closed, nothing queued)

## In progress
Nothing. All eight workstreams in docs/plan/ are landed; 536 tests green
on main, `npm run audit` clean, 54 migrations in step with the snapshot.
Each plan file keeps its record of where it was wrong - that is the part
a later wave needs, and 80-LOAD-SPEED.md in particular records a
regression phase one shipped and how it was found.

## Next steps
Owner-supplied content is the only thing left, and it is not blocking.
docs/HANDOVER-CONTEXT.md is the claude.ai prompt for gathering it. Its
figures are the ones `npm run audit` shows and the knowledge gate holds,
so filling them lowers a ceiling that cannot climb back: 80 items with
no summary, 39 closed with no resolution, 20 orphaned notes, 110 links
still `proposed`, 14 ideas with no summary or value note.

## Verification the repo cannot do for itself
- The 25% load-speed target on COMPRESSED bytes. 80-LOAD-SPEED.md
  records 33.1% off every visit's data uncompressed and says plainly
  which number is a prediction. A DevTools run settles it.
- Re-embedding after a wave of roadmap edits: `select * from
  roadmap_embed_refresh();`. `embeddings.stale` is a gate figure held at
  zero, so the audit says when it is needed.

## Open decisions
- 00-PROGRAMME.md: Unity grading, commented-out routes,
  promoted-finding handling. Reference scope CLOSED 14 Aug.
- Milestones/phases LEFT ALONE and front-end writes CLOSED, 13 Aug.
- Embeddings CLOSED 16 Aug: landed, fitted, and its limit written down
  in docs/KNOWLEDGE-MODEL.md rather than rounded up.
