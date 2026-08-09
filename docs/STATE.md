# Current state

Updated: 2026-08-09 (typed links shipped; semantic recall outstanding)

## In progress
Association, typed links and repo/DB truth, on branch
claude/roadmap-association-typed-links-qbnpns. Shipped: the rule
rewrites, the doc restructure to one home per concept, schema/DB
reconciliation, the drift gate, the typed link graph with its 35-link
backfill, the front end on links, relates_to_id dropped, the stoplist
pruned, widened knowledge kinds, docs/KNOWLEDGE-MODEL.md. 204 tests
green; 39 migrations, files in step with the ledger.

NOT done, and it is the piece that fixes the headline problem:
semantic recall. A reworded request still collapses High to Low and
applies in silence ("customer birthday displaying a day earlier"
scores 0.265 against the row it duplicates).

## Next steps
1. Embeddings: pgvector, plus embedding / embedded_at /
   embedding_hash on work_items, work_notes, product_capabilities.
   Input = the corpus roadmap_find scores, cut to 2000 chars.
   Staleness is FLAGGED, never blanked.
2. Edge Function: supabase/functions/knowledge/index.ts, modes embed
   and find, new Supabase.ai.Session('gte-small'). Add 'ts' to
   isTextFile in tests/lib/repo.js in the SAME commit so the secret
   scanner covers it. pgmq + pg_cron + pg_net; function URL and key
   from vault BY NAME, never inline.
3. Calibration: tests/fixtures/intake-pairs.json, two rewordings per
   duplicate; fit weights and the semantic floor/ceiling. Weighted
   blend, never RRF - see docs/KNOWLEDGE-MODEL.md.
4. Owner waves: the 35 proposed links (script in ROADMAP-INTAKE.md),
   then the 39 unlinked near-pairs.

## Open decisions
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Two live rows block their duplicate_of links until resolved:
  "Currency Swap on summary page", "Terminal financing admin toggles".
- Inter via Google Fonts: AGREED. The one external stylesheet.
