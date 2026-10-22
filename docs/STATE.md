# Current state

Updated: 2026-10-22 (run-on into Next shipped; three Unity items brought into Now)

## In progress
Seven workstreams in Now: 43 items across Sprints 1-5, synced to
`v_sprint_plan_order`, UNANCHORED on purpose. `v_sprint_plan_checks` holds
no `fix` rows: 28 `stories_drafted`, 5 `placement`, 3 `stories_missing`.
Spans follow the 22 Oct convention (note 6185d84c): Inbound and Risk run
into Next, the rest end in Now, Pricing and Contract show the run-on.

## Next steps
1. **Place the provisional rows** on the Sprint Roadmap: the three Unity
   items at Sprint 2, Payment Service fee configuration at Sprint 2 and
   MATCH at Sprint 4. Then write stories for the three Unity items.
2. **The owner's live review** of drafted stories, one stream at a time
   with `/sprint-stories confirm`.
3. **Paste the packs**: confirmed streams now, drafted ones after review.
   A DevOps id written back to `external_ref` freezes that row.
4. **Create the tag** `v0.1.0` - sessions cannot push tags: `git tag -a
   v0.1.0 ab0e78b -m "0.1.0"` then `git push origin v0.1.0`, or a release.
5. **Anchor the plan** when the start date is known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
6. **Owner confirmations**: 7 drafted benefits on the plan, 46 proposed
   links, and 13 open questions on plan rows (counts as of 1 Oct).
7. **Size seams**: `views-sprint.js` and `roadmap-detail.css` sit at 549
   of 550 - take the hide-mode split and the `.rmd-exec*` move first.
8. **Promise chains**: 17 have no visible handler (`npm run audit`).

## Verification the repo cannot do for itself
- Signed in on the live site: the run-on on Pricing and Contract, the three
  new Unity rows marked "Not yet placed", the stories section and its Copy
  buttons, and seven cards laid out as four and three.
- The first DevOps paste: whether the plain-text lists survive the fields.

## Open decisions
- SECURITY: leaked-password protection is still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
