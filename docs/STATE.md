# Current state

Updated: 2026-08-09 (platform page shows everything; recall outstanding)

## In progress
Knowledge layer overhaul, merged to main. Shipped: rule rewrites, docs
to one home per concept, schema/DB reconciliation, the drift gate, the
typed link graph with its 35-link backfill, front end on links,
relates_to_id dropped, stoplist pruned, widened knowledge kinds,
docs/KNOWLEDGE-MODEL.md, and the Platform page now rendering all 102
knowledge rows (was 18) with a Coverage panel naming the gaps.
215 tests green; 39 migrations in step with the ledger.

NOT done, and it is what fixes the headline problem: semantic recall.
A reworded request still collapses High to Low and applies in silence
("customer birthday displaying a day earlier" scores 0.265 against the
row it duplicates).

## Next steps
1. Embeddings: pgvector, plus embedding / embedded_at /
   embedding_hash on work_items, work_notes, product_capabilities.
   Input = the corpus roadmap_find scores, cut to 2000 chars.
   Staleness is FLAGGED, never blanked.
2. Edge Function: supabase/functions/knowledge/index.ts, modes embed
   and find, new Supabase.ai.Session('gte-small'). Add 'ts' to
   isTextFile in tests/lib/repo.js the SAME commit (secret scanner).
   pgmq + pg_cron + pg_net; function URL and key from vault BY NAME.
3. Calibration: tests/fixtures/intake-pairs.json, two rewordings per
   duplicate. Weighted blend, never RRF - see KNOWLEDGE-MODEL.md.
4. Owner waves: the 35 proposed links (script in ROADMAP-INTAKE.md),
   the 39 unlinked near-pairs, and the 10 empty product areas the
   Coverage panel lists.
5. Use `affects` / `about`: unused, so cards show no roadmap context.

## Open decisions
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Two live rows block their duplicate_of links until resolved:
  "Currency Swap on summary page", "Terminal financing admin toggles".
- Inter via Google Fonts: AGREED. The one external stylesheet.
