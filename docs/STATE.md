# Current state

Updated: 2026-08-13 (phase 1 done; surfacing underway; self-audit clean)

## In progress
Nothing mid-flight. 310 tests green on main, npm run audit clean.
Programme is docs/plan/, start at 00-PROGRAMME.md. Landed:

- Route extractor, coverage artefact (npm run coverage), drift ratchet.
- Twelve wrong reference rows corrected: phantom 12 to 0, coverage
  56.3% to 60.5%, rows 245 to 256, absent 219 to 196.
- Knowledge links render for all 49 entity-type pairs; every type but
  `note` has an anchor, gated as reachable. One typed-block renderer;
  unknown kinds render generically. render-coverage gate: all 36 check
  constraints declare where they render.

An accuracy audit found seven issues, all fixed: two live renderer
defects (roleBadge printed "member" for any non-admin role;
blocker_scope 'record' had no flag), four wrong claims in the coverage
map, and a dead anchor (backlog never called deepLinkScroll). Unity
documents two resources twice ({id} and {numId}) - unresolvable
without a Unity source, so it is item 8 in its gap register.

## Next steps
1. The shared detail panel and App.detail.facts (40-SURFACING.md).
   Closes the one declared hole, knowledge_links.confidence, and
   enables the per-column half of the render gate.
2. Dashboard rebuild (50-DASHBOARD.md).
3. First code-review wave and the style capability load (10, 30).
4. Portal review waves (60), prototype ideas (70).
5. Embeddings: pgvector, knowledge/index.ts, gte-small, 384 dims.

## Open decisions
- Four of the five in 00-PROGRAMME.md: reference scope, Unity grading,
  commented-out routes, promoted-finding handling. Removing the empty
  milestones/phases schema is agreed in the plan but NOT done - it is
  destructive and wants an explicit go-ahead.
- Edge Function + gte-small: AGREED 2026-08-09. No key, 384 dims.
- Front-end writes: CLOSED 13 Aug. The browser reads; sessions write.
