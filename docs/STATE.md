# Current state

Updated: 2026-08-10 (roadmap board: 90-day window, latch, wide + collapse)

## In progress
Nothing mid-flight in code. The roadmap board overhaul is done and on main:
- Delivered work splits Recently/Previously on a 90-day window, with a
  previously_completed_at latch (schema + 2 recovered migrations + snapshot;
  drift gate green). Drawer and KPI JSON/CSV exports carry it.
- roadmap.js split: the export dropdown moved to roadmap-export.js.
- Expand board (wide, sideways scroll) and per-column collapse (any column
  clicks to a labelled seam, neighbours reclaim the width, never a dead end).
- Delivered bars/cards keep their theme as a solid dot.
222 tests green (size/style/structure/drift gates).

Two data/next threads carry over from before (both database, not code):

1. LaunchPad API reference - context-accumulation pass still open: work the
   "Open questions & context gaps" register (13 items), dropping the
   assumption/unverified/gap badges as each is answered.
2. Semantic recall (NOT done): a reworded request still collapses High to
   Low and applies in silence. Embeddings not built.

## Next steps
1. Context-accumulation pass on the API reference (13-item gap register).
2. Embeddings: pgvector + embedding cols on work_items/notes/
   product_capabilities; Edge Function knowledge/index.ts (embed|find),
   gte-small, 384 dims. Add 'ts' to isTextFile the same commit.
3. Calibration fixtures + weighted blend, never RRF (KNOWLEDGE-MODEL.md).
4. Owner waves: proposed links, unlinked near-pairs, empty product areas.

## Open decisions
- Hand over workstream: CLOSED 10 Aug at Luke's direction (status done,
  resolution + decision note, 0 open children). Resolved.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Two live rows block their duplicate_of links until resolved.
