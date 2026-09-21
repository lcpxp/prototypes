# Current state

Updated: 2026-09-21 (Sprint roadmap re-mapped, widened to six streams)

## In progress
Nothing blocking. Six workstreams sit in Now, 25 items allocated across
slots 0-4, streams in flight running 2-3-2-2-1. The plan is UNANCHORED
on purpose: `sprint_plan.anchor_sprint` is null, so columns read
Sprint 1..N and say so; slots stay zero-indexed.

## Next steps
1. **Anchor the plan** when the start date and resource are known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
   Every column, code and date resolves from those two statements.
2. **Confirm what only the owner can.** Contract Adjustments is
   `benefit_status = 'drafted'` and its link to Contract Management
   Features is `proposed`. The four benefits rewritten on 21 Sep kept
   the `confirmed` they held, because the owner dictated the substance.
3. **Cut a release.** docs/CHANGELOG.md sits at 634 against a cap
   raised to 700 as a HOLDING MEASURE (tests/size-budget.json). Roll
   Unreleased into a dated heading, tag it, put the cap back to 600.
4. `scope` and `scale_notes` are set on the six sprint workstreams
   only. Everything else is null and `{}` and renders as nothing -
   correct, but the Product Roadmap reads neither field yet.
5. Pricing engine overhaul carries NO metrics; its card shows the
   empty state. Experian's commercial model is still unknown and gates
   the screening cost case, not its build.

## Verification the repo cannot do for itself
- The sprint page signed in, on the projector: six stream colours
  reading apart, the scope chips, and the Priority scale toggle.
- Whether the Sprint 5 contract set is the right MVP cut, and whether
  the two rows moved out of Contract Management Features were the only
  necessary ones.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- work_item_phases stays dormant: empty, but the drawer reads it.
