# Current state

Updated: 2026-09-23 (drawer opens on the current plan; review changes)

## In progress
Nothing blocking. Six workstreams sit in Now, 30 items allocated across
slots 0-4. The plan is UNANCHORED on purpose: `sprint_plan.anchor_sprint`
is null, so columns and the drawer read Sprint 1..N; slots stay
zero-indexed.

## Next steps
1. **Anchor the plan** when the start date and resource are known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
2. **Confirm what only the owner can.** Drafted: Contract Adjustments,
   and the Inbound API partner stage (partner-opportunity benefit,
   23 Sep). Proposed links: 44, three from 22 Sep. The merchant- and
   partner-opportunity clauses added to confirmed benefits on 23 Sep
   kept `confirmed` because the owner directed them.
3. **Answer the four technical questions** raised 23 Sep on the thinnest
   rows (Quote tool, historic pricing data, spreadsheet retirement,
   per-MCC addenda). They show under "Still open" in each drawer.
4. **Cut a release.** docs/CHANGELOG.md is near its 700 holding cap
   (tests/size-budget.json). Roll Unreleased into a dated heading, tag
   it, put the cap back to 600.
5. detail.js is at 563 past its 550 trigger: the next addition must
   move the details and notes parsers out first.

## Verification the repo cannot do for itself
- The sprint page signed in: a drawer opened from a bar and from a
  card, with notes loading after open ("Still open" fills in late).
- Whether each workstream's new "how" clause in its summary is the
  technical route the team actually intends.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- work_item_phases stays dormant: empty, but the drawer reads it.
