# Current state

Updated: 2026-08-14 (API reference complete, 100% against the code)

## In progress
482 tests green on main, audit clean. Programme is docs/plan/, start
at 00-PROGRAMME.md. 20-API-REFERENCE.md is now CLOSED: 392 rows, all
552 code routes accounted for, 0 phantom, 0 absent, 0 gap, 0
undeclared mirrors, every one capped at 0 in tests/reference-budget.json.
scripts/extract-calls.js resolves all 401 portal call sites, and the
"no portal consumer" badge is held equal to the derived figure in both
directions by tests/checks/reference-drift.test.js.

## Next steps
1. Code-review wave 3: glossary terms and journey stages against the
   onboarding-flow step definitions. Only the most required actions.
2. Housekeeping: over-soft files with exit plans, re-verify, prune.
3. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.
4. 80-LOAD-SPEED.md, added 14 Aug, deliberately last.

## Owner passes, not derivable here
A context-gathering handover prompt for a claude.ai session with the
Supabase connector is at docs/HANDOVER-CONTEXT.md. It covers, with
counts measured 14 Aug: 14 prototype ideas with no summary, area or
value note; 80 work items with no summary; 20 work notes anchored to
nothing; 110 knowledge links still proposed; 38 of 39 review areas
never walked; the 151 Unity endpoints that cannot be graded without a
source; and who, if anyone, consumes Metrics, ShoppingCart and
MerchantApplicationsProducts.

## Open decisions
- 00-PROGRAMME.md: Unity grading, commented-out routes,
  promoted-finding handling. Reference scope CLOSED 14 Aug.
- Milestones/phases: LEFT ALONE, decided 13 Aug. Do not re-propose.
- Front-end writes: CLOSED 13 Aug. The browser reads; sessions write.
