# Current state

Updated: 2026-10-01 (the sprint belt is live; the first stories run is next)

## In progress
Seven workstreams sit in Now: 39 items across slots 0-4, in the order
`v_sprint_plan_order` holds (synced 1 Oct). UNANCHORED on purpose
(`sprint_plan.anchor_sprint` is null), so the board reads Sprint 1..N.
`v_sprint_plan_checks` shows one `placement` and 46 `stories_missing` rows.

## Next steps
1. **Write the first stories** with `/sprint-stories all`: seven epics,
   one owner review per stream, both packs pasted into DevOps and the
   company roadmap, then the DevOps ids written back to `external_ref`.
2. **Confirm or move the one provisional placement**: Payment Service
   fee configuration, placed automatically at slot 1.
3. **Anchor the plan** once the start date and resource are known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
4. **Owner confirmations**: 7 drafted benefits on the plan (the six
   Unity steps and the fee configuration), and 47 proposed links.
5. **Open questions**: 11 on plan rows, four of them raised 23 Sep on
   the thinnest rows (Quote tool, historic pricing data, retiring the
   spreadsheet, per-MCC addenda).
6. **Size seams**: `views-sprint.js` and `roadmap-detail.css` are at 549
   of 550, so take the hide-mode split and the `.rmd-exec*` move before
   adding anything. `SPRINT-DELIVERY.md` is at 398 of 400.
7. **Promise chains**: 17 have no visible handler (`npm run audit`).

## Verification the repo cannot do for itself
- Signed in on the live site: the drawer's stories section and its Copy
  buttons, the provisional outline on the board, and seven cards laid
  out as four and three.
- The first DevOps paste: whether the pack's plain-text lists survive
  the Description and Acceptance Criteria fields.

## Open decisions
- SECURITY: leaked-password protection is still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
