# Current state

Updated: 2026-09-17 (Sprint roadmap overhauled; live on main)

## In progress
Nothing blocking. Five workstreams sit in Now (23 rows, every item under
one), 18 allocated across slots 0-10, streams in flight running 2-3-2.
The plan is UNANCHORED on purpose: `sprint_plan.anchor_sprint` is null,
so columns read Sprint 1..N and say so; slots stay zero-indexed. Board
and cards are two modules now and two sheets.

## Next steps
1. **Anchor the plan** when the start date and resource are known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
   Every column, code and date resolves from those two statements.
2. **Regenerate the schema snapshot.** Stale for v_sprint_plan_streams:
   15 columns recorded, 19 live, missing `summary` and the three audience
   fields the 2026-09-16 migration added. Checked: the only drifted view,
   and supabase/schema/ already declares them, so `npm run snapshot` then
   `--write`. The sprint contract can then claim `pxp_staff_value`.
3. **Cut a release.** docs/CHANGELOG.md hit its 600-line cap and could
   not take a line, so the cap is raised as a HOLDING MEASURE only
   (tests/size-budget.json). Roll Unreleased into a dated heading, tag
   it, and put the cap back to 600.
4. **Confirm what only the owner can.** Drafted benefits, metrics and
   links wait: an assistant may never set `confirmed` or `owner_stated`.
5. Pricing engine overhaul carries NO metrics; its card shows the empty
   state. Experian's commercial model is still unknown and gates the
   screening cost case, not its build.

## Verification the repo cannot do for itself
- The sprint page signed in, on the projector: five stream colours
  reading apart at a glance, and a bar opening the roadmap drawer.
- Whether the mapping matches how the owner would sequence it.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- work_item_phases stays dormant: empty, but the drawer reads it.
