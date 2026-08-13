# Current state

Updated: 2026-08-13 (alignment programme planned and verified)

## In progress
Nothing mid-flight in code; 232 tests green. Instead, docs/plan/ holds
an eight-part programme planned against the supplied LaunchPad source
(API + Angular portal), the wave 4 review board, the live database and
this repo. Start at docs/plan/00-PROGRAMME.md: evidence base,
provenance ladder, sequencing, the five decisions. None of it started.

Verified, then re-verified in a pass that corrected fourteen figures:
- 552 routes (376 v1, 150 v2, 26 unversioned) from 51 controllers vs
  245 rows: 233 match, 12 wrong, 78 declared v2 scope variants, 22
  undeclared v1 mirrors, 219 absent. 56% accounted for.
- The link renderers express 2 of 49 entity-type pairs, so 4 live
  links render nowhere and the graph cannot grow.
- 20 orphan work_notes; 0 milestones and 0 phases behind live schema;
  work_item_dependencies documented but absent; 0 'styling' rows.

The API gap register is now 20-API-REFERENCE.md. Embeddings unchanged
and still not built.

## Next steps
1. Route extractor, coverage artefact, drift gate, then the 12 wrong
   reference rows (20-API-REFERENCE.md).
2. Entity-aware links and the shared detail panel (40-SURFACING.md),
   then the dashboard rebuild (50-DASHBOARD.md).
3. First code-review wave and the style load (10, 30).
4. Portal review waves (60), prototype ideas (70).
5. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.

## Open decisions
- The five in 00-PROGRAMME.md: reference scope, Unity grading,
  commented-out routes, removing milestones/phases, and whether a
  promoted finding creates or merges into a work item.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug at Luke's direction. The browser
  reads; every content change is made in a Claude session. Resolved.
