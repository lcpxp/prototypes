# Current state

Updated: 2026-09-01 (presentation readiness landed; benefit awaiting confirmation)

## In progress
Nothing blocking. Business benefit is a real column with a checked type
and a drafted/confirmed state, the drawer renders it above the fact grid,
department attribution and associations have been reworked across the
roadmap, and every workstream and Now/Next item carries a benefit.

## Next steps
1. **Confirm the drafted benefit.** All 66 are `drafted` - written by an
   assistant, checked by nobody. `items.benefit_unconfirmed` in
   `npm run audit` is the figure to drive down, and it is the one that
   stops coverage being mistaken for confidence. Method:
   docs/VALUE-CAPTURE.md.
2. Three workstreams carry a `work_notes` question instead of a benefit -
   no summary, details, notes or links to draft from, so writing one
   would have been invention. They need the owner.
3. Later and Someday items have no benefit yet (85 of 151 open rows).
4. Not built, and deliberately: a departments table with a stored rank,
   and moving the department vocabulary out of registry.js. The rank is
   never rendered, and one department is filtered at a time, so neither
   blocks anything.

## Verification the repo cannot do for itself
- A signed-in app-review wave with coloured triage rows; compressed load
  speed against the Pages URL.
- The benefit panel read in a browser: unit tests prove the HTML, only a
  person proves it reads well.
- The six-department filter walk: what a department expected and cannot
  see, and what it can see and would disown. Only a person sees the second.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- items.closed_without_resolution is 40 of 294, at its ceiling.
- Pull versus push on the inbound onboarding API: unresolved with the COO,
  both positions recorded on the row.
