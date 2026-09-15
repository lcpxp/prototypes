# Current state

Updated: 2026-09-15 (Now column repopulated, Sprint Roadmap built; on
branch claude/compassionate-planck-xl5uwl, not yet merged)

## In progress
Nothing blocking. Five priority workstreams sit in Now (23 rows, every
item under a workstream), 18 allocated across sprint slots 0-10 with
streams in flight running 2-3-2. The plan is UNANCHORED on purpose:
`sprint_plan.anchor_sprint` is null, so every surface reads Sprint +N.

## Next steps
1. **Anchor the plan** when the start date and resource are known: set
   `sprint_plan.anchor_sprint`, then `select sprint_plan_project();`.
   Everything resolves at once.
2. **Confirm the five drafted benefits and the 16 metrics.** Only the
   owner can - confirmed and owner_stated both mean he said so.
   `items.benefit_unconfirmed` is 79 of 92. Method: docs/VALUE-CAPTURE.md.
3. **Confirm the seven proposed links** this session recorded (see the
   knowledge-budget note on `links.proposed`).
4. The Experian commercial model is still unknown - six open
   integration_notes - and gates the screening cost case, not its build.

## Verification the repo cannot do for itself
- The two sprint views signed in: the axis reading Sprint +0 to +10, an
  external bar drawn as an outline, overlap hatching on shared edges,
  and a bar opening the existing drawer.
- Whether the first-cut mapping matches how the owner would sequence it.
  The shape is checked mechanically; the judgement is not.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- Pull versus push on the inbound onboarding API: now its own Now row,
  awaiting the COO session.
- Roadmap page weight is 39 of 40 requests. The next view replaces a
  sheet or raises the ceiling deliberately.
