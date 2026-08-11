# Current state

Updated: 2026-08-11 (nav Splunk link; roadmap board overhaul before it)

## In progress
Nothing mid-flight in code. Newest first:

- Nav bug icon opens the Splunk error sweep in a new tab. New
  portal_links table (schema + policies + migration + snapshot, drift
  gate green) holds host, search and display params, so no internal URL
  enters this public repo; assets/js/core/tools.js builds the URL.

- Roadmap board overhaul landed before it: 90-day Recently/Previously
  split with a previously_completed_at latch, roadmap-export.js split,
  Expand board and per-column collapse.

232 tests green (size/style/structure/drift gates).

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
