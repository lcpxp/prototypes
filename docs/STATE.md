# Current state

Updated: 2026-07-28 (session)
Branch: main is trunk; roadmap contextualisation merged and pushed there.

## In progress
Roadmap intake contextualisation is complete and live. New in Supabase:
roadmap_searchable (every work_items row, no status filter, with the
text columns, relates_to and a computed is_hollow) and roadmap_find -
IDF-weighted token overlap plus pg_trgm, damped for short queries.
Bands calibrated against the 2026-07-27 batch: 0.65 / 0.40 / 0.22.
Protocol in docs/ROADMAP-CONTEXT.md, summarised in the playbook; both
/roadmap commands and docs/WORKFLOW.md route through it.
roadmap_current and the board are untouched.

Daopay user-role demo unchanged and still ready for another wave
(modules/prototypes/daopay/).

## Next steps
1. Owner reviews the 13 unlinked high-band pairs the sweep found; the
   top one (0.982) looks like a genuine duplicate. Not yet acted on.
2. Fill hollow rows (roadmap_searchable.is_hollow) in Now.
3. Next wave of prototype adjustments from the owner.
4. Roadmap context enrichment wave 2: Next/Later + backlog items.
5. Wire core_launchpad as a live owner: schema CHECK, tokens.css colour,
   department filter.
6. Drawer follow-ups: drawer LINKS relates_to but cannot SET it (needs a
   write path/RLS); same for inherited area notes and Tier 3 schema.

## Open decisions
- ROADMAP-PLAYBOOK.md size budget raised to 360 (was 300) so
  contextualisation could live in the single manual. Exit plan in
  tests/size-budget.json: split the review ritual out. Owner may
  prefer that split now.
- UMBRELLA is detected from the request's shape, not from a score - a
  heading matches everything weakly and nothing strongly.
- Inter via Google Fonts: AGREED. The one external stylesheet.
- Contracts table Type/Status split: built the screenshot's way; confirm.
