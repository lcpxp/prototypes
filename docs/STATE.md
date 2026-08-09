# Current state

Updated: 2026-08-09 (typed links shipped; semantic recall outstanding)

## In progress
Association, typed links and repo/DB truth, on branch
claude/roadmap-association-typed-links-qbnpns. Shipped: the rule
rewrites, the doc restructure to one home per concept, schema/DB
reconciliation, the drift gate, the typed link graph with its 35-link
backfill, the front end on links, relates_to_id dropped, the stoplist
pruned, the widened knowledge kinds and docs/KNOWLEDGE-MODEL.md.
204 tests green; 39 migrations, files in step with the ledger.

NOT done, and it is the piece that fixes the headline problem:
semantic recall. A reworded request still collapses from High to Low
and applies in silence ("customer birthday displaying a day earlier"
scores 0.265 against the row it duplicates).

App Review is live on main and still unproven; no wave has run yet.

## Next steps
1. Embeddings (plan C10): pgvector, plus embedding / embedded_at /
   embedding_hash on work_items, work_notes and product_capabilities.
   Input text = the same corpus roadmap_find scores, truncated to
   2000 chars. Staleness is FLAGGED, never blanked.
2. Edge Function (C11): supabase/functions/knowledge/index.ts, modes
   embed and find, using new Supabase.ai.Session('gte-small').
   Add 'ts' to isTextFile in tests/lib/repo.js in the SAME commit so
   the secret scanner covers it. pgmq + pg_cron + pg_net; the function
   URL and key come from vault BY NAME, never inline.
3. Calibration (C13-C14): tests/fixtures/intake-pairs.json with two
   rewordings per duplicate, then fit weights and the semantic
   floor/ceiling. Weighted blend, never RRF - see KNOWLEDGE-MODEL.md.
4. Owner waves: adjudicate the 35 proposed links (grouped script in
   docs/ROADMAP-INTAKE.md), then the 39 unlinked near-pairs.
5. Run a real wave through /app-review.

## Open decisions
- Edge Function + gte-small embeddings: AGREED 2026-08-09. Server-side,
  no key, 384 dims. Second exception after Inter.
- Two live rows block their duplicate_of links until the owner resolves
  them: "Currency Swap on summary page" (idea/next despite a duplicate
  resolution) and "Terminal financing admin toggles".
- Inter via Google Fonts: AGREED. The one external stylesheet.
