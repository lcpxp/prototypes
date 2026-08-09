# Current state

Updated: 2026-08-09 (LaunchPad API reference rebuilt from source)

## In progress
Nothing mid-flight in code. Two open threads, both data/next work:

1. LaunchPad API reference overhaul - done this session, database only.
   Rebuilt spec 9080b0a1 (LaunchPad Partner Portal API) to v2.0 from the
   PartnerPortal source: 16 tags, 9 topics, 212 endpoints, merchant-first
   model, three-tenant scoping, new management/order/provisioning/
   fulfilment surfaces; historic draft-era routes removed. The generic
   sample spec 11111111 is now "LaunchPad Inbound Onboarding API
   (planned)", design-stage. Rippled: 3 technical/planned capabilities,
   11 glossary terms, 6 question notes, 5 typed links; v1.1 load record
   superseded. Gaps flagged as endpoint badges + the "Open questions &
   context gaps" topic + work_notes(kind question).

2. Semantic recall (from before, NOT done): a reworded request still
   collapses High to Low and applies in silence. Embeddings not built.

## Next steps
1. Context-accumulation pass on the API reference: work the "Open
   questions & context gaps" register (13 items) - prod B2C, machine
   credential, contributor link, question schema, business-size field -
   dropping the assumption/unverified/gap badges as each is answered.
2. Embeddings: pgvector + embedding cols on work_items/notes/
   product_capabilities; Edge Function knowledge/index.ts (embed|find),
   gte-small, 384 dims. Add 'ts' to isTextFile the same commit.
3. Calibration fixtures + weighted blend, never RRF (KNOWLEDGE-MODEL.md).
4. Owner waves: proposed links, unlinked near-pairs, empty product areas.

## Open decisions
- Onboarding spec: sample 11111111 repurposed to the planned Inbound
  Onboarding API (design-stage); the generic demo stays in seed.sql.
  Decided by execution 2026-08-09; confirm with owner if unexpected.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Two live rows block their duplicate_of links until resolved.
