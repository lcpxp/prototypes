# Current state

Updated: 2026-08-14 (reference scope settled by measurement)

## In progress
480 tests green on main, audit clean. Programme is docs/plan/, start
at 00-PROGRAMME.md. Landed: scripts/extract-calls.js resolves all 401
portal call sites by evaluating the URL expressions, and the coverage
generator now derives called/uncalled/gap/stale_docs every run, with a
gate holding the "no portal consumer" badge equal to it in both
directions. That closed open decision 1: the portal calls 411 of 552
routes, 342 already documented, so the writing job is **69 rows, not
196**. The other 127 are features nothing calls. Lists in
20-API-REFERENCE.md.

## Next steps
1. Write the 69 called-but-undocumented rows (AdminMerchant 21,
   Merchant 16, PartnerUsers 6, then the smaller families). Lower the
   `gap` ceiling in tests/reference-budget.json as each lands.
2. Register the 127 uncalled routes, badged, graded verified-code with
   the consumer left as an open question. Webhook receivers are NOT
   consumer-less: their caller is a third party.
3. Record the 405 defect: the portal deletes an onboarding flow at a
   path AcquirerOnboardingFlowsController does not serve. Review
   finding plus a linked roadmap item.
4. Then: code-review wave 3 (glossary, journey stages), housekeeping,
   embeddings (pgvector, gte-small, 384 dims), and 80-LOAD-SPEED.md
   (added 14 Aug, deliberately last).

## Owner passes, not derivable here
Backfill the fourteen prototype ideas; resolve the 18 review-area
pairs naming work items that no longer exist. A context-gathering
handover prompt for a claude.ai session is owed at the end.

## Open decisions
- 00-PROGRAMME.md: Unity grading, commented-out routes,
  promoted-finding handling. Reference scope CLOSED 14 Aug.
- Milestones/phases: LEFT ALONE, decided 13 Aug. Do not re-propose.
- Front-end writes: CLOSED 13 Aug. The browser reads; sessions write.
