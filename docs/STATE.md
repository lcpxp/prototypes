# Current state

Updated: 2026-08-13 (alignment programme planned; no code changed yet)

## In progress
Nothing mid-flight in code; 232 tests green. Instead,
docs/plan/ holds an eight-part programme planned against the supplied
LaunchPad source (API + Angular portal), the wave 4 review board, the
live database and this repo. Start at docs/plan/00-PROGRAMME.md: it
carries the evidence base, the provenance ladder, sequencing and the
five decisions needed. Nothing in it has been started.

Verified while planning:
- Reference vs code: 552 routes, 245 documented, 233 matching, 12 rows
  wrong, 100 covered by the scope-variant convention, 219 absent.
- Cross-type knowledge links render nowhere (roadmap.js omits
  from_type/to_type; platform.js resolves capability pairs only).
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
- Portal review board read-only, or admin write for disposition only
  (60). Ship read-only first.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
