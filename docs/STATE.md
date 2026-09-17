# Current state

Updated: 2026-09-17 (Sprint roadmap overhauled for the room it is read in)

## In progress
Nothing blocking. Five priority workstreams sit in Now (23 rows, every
item under a workstream), 18 allocated across sprint slots 0-10 with
streams in flight running 2-3-2. The plan is UNANCHORED on purpose:
`sprint_plan.anchor_sprint` is null, so columns read Sprint 1..N and say
so; the slots behind them stay zero-indexed. Sprint views live at
modules/sprints/ over the roadmap's .rmv-tl grid, and the board and its
cards are two modules now (views-sprint.js, views-sprint-cards.js).

## Next steps
1. **Anchor the plan** when the start date and resource are known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
   Every column, code and date resolves from those two statements.
2. **Cut a release.** docs/CHANGELOG.md hit its 600-line cap exactly and
   could not take a line, so the cap is raised as a HOLDING MEASURE only
   (tests/size-budget.json). Roll Unreleased into a dated heading, tag
   it, and put the cap back to 600.
3. **Confirm what only the owner can.** Drafted benefits, metrics and
   proposed links are waiting: an assistant may never set `confirmed` or
   `owner_stated`. Method: docs/VALUE-CAPTURE.md.
4. Pricing engine overhaul carries NO metrics, so its card shows the
   empty state. Record them, or accept the gap deliberately.
5. The Experian commercial model is still unknown and gates the
   screening cost case, not its build.

## Verification the repo cannot do for itself
- The sprint page signed in, on the projector: five stream colours
  reading apart at a glance, and a bar opening the roadmap drawer.
- Whether the first-cut mapping matches how the owner would sequence it.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- work_item_phases stays dormant: empty, but the drawer reads it, and it
  is a finer axis than sprint allocation rather than a rival to it.
