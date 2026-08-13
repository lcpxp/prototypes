# Current state

Updated: 2026-08-13 (phase 1 done, phase 2 surfacing underway)

## In progress
Nothing mid-flight. 297 tests green on main. The programme is
docs/plan/; start at 00-PROGRAMME.md. Landed so far:

- Route extractor, coverage artefact (npm run coverage) and the drift
  ratchet against tests/reference-budget.json.
- The twelve wrong reference rows corrected: phantom 12 to 0, coverage
  56.3% to 60.5%, rows 245 to 256, absent 219 to 196.
- Knowledge links render for all 49 entity-type pairs, and every type
  except `note` now has an anchor to open. `note` has none by design.
- One typed-block renderer; an unknown kind renders generically
  instead of vanishing.
- tests/checks/render-coverage.test.js: all 36 check constraints must
  declare where they render. One hole is named -
  knowledge_links.confidence displays nowhere.

## Next steps
1. The shared detail panel, App.detail.facts with known-fields plus
   overflow (40-SURFACING.md), which also closes the confidence hole
   and enables the per-column half of the gate.
2. Dashboard rebuild (50-DASHBOARD.md).
3. First code-review wave and the style capability load (10, 30).
4. Portal review waves (60), prototype ideas (70).
5. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.

## Open decisions
- Four of the five in 00-PROGRAMME.md remain: reference scope, Unity
  grading, commented-out routes, and whether a promoted finding
  creates or merges into a work item. Removing the empty
  milestones/phases schema is agreed in the plan but NOT done: it is a
  destructive migration and wants an explicit go-ahead.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug at Luke's direction. The browser
  reads; every content change is made in a Claude session.
