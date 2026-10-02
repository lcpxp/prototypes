# Current state

Updated: 2026-10-01 (first stories run written; the owner's live review is next)

## In progress
Seven workstreams in Now: 39 items across Sprints 1-5, synced to
`v_sprint_plan_order`, UNANCHORED on purpose. All 46 plan rows hold
stories, 19 confirmed and 27 drafted; `v_sprint_plan_checks` shows only
the 27 `stories_drafted` rows and 1 `placement`.

## Next steps
1. **The owner's live review on the Sprint Roadmap**, as asked:
   - drafted stories: Unity, Risk, Pricing, Contract and the Inbound epic
     (corrected after review); confirm each with `/sprint-stories confirm`;
   - the fee configuration placement, provisional at Sprint 2;
   - EIT's two Sprint 1 rows are both exclusive though they run side by
     side by the owner's direction: `parallel` would describe them;
   - two new questions: fee types in scope, and the cutover order.
2. **Paste the packs**: confirmed streams now, drafted ones after review.
   A DevOps id written back to `external_ref` freezes that row.
3. **Create the tag** `v0.1.0` - sessions cannot push tags: `git tag -a
   v0.1.0 ab0e78b -m "0.1.0"` then `git push origin v0.1.0`, or a release.
4. **Anchor the plan** when the start date is known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
5. **Owner confirmations**: 7 drafted benefits on the plan, 46 proposed
   links, and 13 open questions on plan rows.
6. **Size seams**: `views-sprint.js` and `roadmap-detail.css` sit at 549
   of 550 - take the hide-mode split and the `.rmd-exec*` move first.
7. **Promise chains**: 17 have no visible handler (`npm run audit`).

## Verification the repo cannot do for itself
- Signed in on the live site: the stories section and its Copy buttons,
  the provisional outline, and seven cards laid out as four and three.
- The first DevOps paste: whether the plain-text lists survive the fields.

## Open decisions
- SECURITY: leaked-password protection is still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
