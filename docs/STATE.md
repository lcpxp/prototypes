# Current state

Updated: 2026-08-09 (typed links live; C0-C6 done)

## In progress
Association, typed links and repo/DB truth, on branch
claude/roadmap-association-typed-links-qbnpns. Done: rule rewrites
(C0), doc restructure to one home per concept (C1), schema/DB
reconciliation and the parent_id cascade fix (C2), drift snapshot and
gate (C3), policies.sql made authoritative (C4), the typed link graph
(C5), and the 35-link backfill (C6). knowledge_links is live with 35
relates_to / proposed rows; relates_to_id is legacy, still read by the
front end.

App Review is live on main and still unproven; no wave has run yet.

## Next steps
1. C7 expose links on roadmap_searchable; C8 move drawer and exports
   onto them; C9 then drop relates_to_id (gated on 35/35 present).
2. C10-C11 pgvector plus embeddings on work_items, work_notes and
   product_capabilities, and the gte-small Edge Function.
3. C12 delete roadmap_find's 90-word stoplist for an IDF floor; C13
   calibration fixture and the fused scorer; C14 band recalibration.
4. C15 widen product_capabilities.kind; C16 CLAUDE.md, README,
   KNOWLEDGE-MODEL.md, codemap.
5. Owner waves: adjudicate the 35 proposed links (script in
   docs/ROADMAP-INTAKE.md), then the 39 unlinked near-pairs.
6. Run a real wave through /app-review; expect STALE_DAYS (14) to
   need tuning.

## Open decisions
- Supabase Edge Function + gte-small embeddings: AGREED 2026-08-09.
  Server-side, no key, 384 dims. Second exception after Inter.
- Two live rows block their duplicate_of links until the owner
  resolves them: "Currency Swap on summary page" (idea/next despite a
  duplicate resolution) and "Terminal financing admin toggles".
- evidence_confidence uses corroborated/inferred/truncated: a value
  called "confirmed" beside confirmed_by re-collapses rule 1.
- Inter via Google Fonts: AGREED. The one external stylesheet.
