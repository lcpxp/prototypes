# Current state

Updated: 2026-09-16 (Sprint roadmap moved to its own page and recoloured)

## In progress
Nothing blocking. Five priority workstreams sit in Now (23 rows, every
item under a workstream), 18 allocated across sprint slots 0-10 with
streams in flight running 2-3-2. The plan is UNANCHORED on purpose:
`sprint_plan.anchor_sprint` is null, so every surface reads Sprint +N.

The sprint views now live at modules/sprints/ rather than as two levels
on the roadmap board. They still render with the roadmap's own builders
over the same .rmv-tl grid, and every bar opens the roadmap drawer.

## Next steps
1. **Anchor the plan** when the start date and resource are known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
   Every column, code and date resolves from those two statements.
2. **Confirm what only the owner can.** Five drafted benefits, sixteen
   metrics and seven proposed links were written this session. An
   assistant may never set `confirmed` or `owner_stated`, so these fall
   in a review pass, not a build one. Method: docs/VALUE-CAPTURE.md.
3. The Experian commercial model is still unknown - six open
   integration_notes - and gates the screening cost case, not its build.
4. The COO pull-versus-push decision is now its own Now row, allocated
   to the slot before the lead endpoints are built.

## Verification the repo cannot do for itself
- The sprint page signed in: five stream colours reading apart at a
  glance, the axis running Sprint +0 to +10 without a scrollbar hiding
  the near sprints, external bars drawn as outlines, and a bar opening
  the roadmap drawer.
- Whether the first-cut mapping matches how the owner would sequence it.
  The shape is checked mechanically; the judgement is not.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- work_item_phases stays dormant: empty, but the drawer reads it, and it
  is a finer axis than sprint allocation rather than a rival to it.
