# Current state

Updated: 2026-08-10 (API reference audited; inbound API framework built)

## In progress
Nothing mid-flight in code. Two threads, both data/next work:

1. LaunchPad API work - done this session, database only.
   - Portal API (spec 9080b0a1, v2.0): audited against source. Now 245
     endpoints in 16 tags (audit added 33 CRUD/read routes missed first
     pass; fixed 5 payloads), 9 topics, 0 duplicates/orphans.
   - Inbound Onboarding API (spec 11111111, v0.3.0-draft): built from a
     7-endpoint sketch to 29 endpoints in 9 groups + 7 topics. Models
     the lead concept, three ways in (complete submission / programmatic
     questionnaire / contributor link), triggers (screening, contracts,
     decision, fulfilment), and inbound conventions. Every route maps to
     a proven portal endpoint or carries a gap badge (8 badges, 7 gap
     themes). Still design-stage, not built.
   - Rippled: API-surface count 245; inbound capability refreshed; 4
     glossary terms (incl. Lead); 5 new gap question-notes.

2. Semantic recall (from before, NOT done): a reworded request still
   collapses High to Low and applies in silence. Embeddings not built.

## Next steps
1. Context-accumulation pass on both specs: work the gap register (portal
   "Open questions & context gaps"; inbound "Open questions and gaps" +
   the inbound gap question-notes), dropping badges as each is answered.
   Top blockers: prod B2C credential, machine credential, submit
   transition, webhook delivery, stable acquirer/product keys.
2. Embeddings: pgvector + embedding cols on work_items/notes/
   product_capabilities; Edge Function knowledge/index.ts (embed|find),
   gte-small, 384 dims. Add 'ts' to isTextFile the same commit.

## Open decisions
- Inbound spec 11111111 is the design home for the planned inbound API
  (design-stage). Confirm direction with owner if unexpected.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Two live rows block their duplicate_of links until resolved.
