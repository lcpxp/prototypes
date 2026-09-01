# Current state

Updated: 2026-09-01 (benefit, attribution and the drawer all landed)

## In progress
Nothing blocking. The five-step plan in docs/plan/100-PRESENTATION-READINESS.md
is done: migration, re-attribution, association sweep, benefit content,
drawer change. 101 is the decisions register, 102 the working rules, 105
the measured position to re-run, 110 the content standard.

## Next steps
1. Confirm the drafted benefit. 66 rows carry one and every single one is
   `drafted` - nothing has been checked by the owner. The count of
   confirmed against drafted is the honest measure to close on.
2. Three workstreams carry a recorded question instead of a benefit
   (Fulfilment, Operations / TechOps, CRM): no summary, details, notes or
   links to draft from, so anything written would have been invention.
3. Later and Someday items carry no benefit yet - out of the three-day cut.
4. Deferred with reasons in 100: the departments table and stored rank,
   the registry-to-table conversion, and gates for benefit coverage.

## Verification the repo cannot do for itself
- A signed-in app-review wave with coloured triage rows; compressed load
  speed against the Pages URL.
- The drawer rendering the benefit panel in a browser: unit tests prove
  the HTML, only a browser proves it reads well.
- The six-department filter walk: what a department expected and cannot
  see, and what it can see and would disown.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- items.closed_without_resolution is 40 of 294, at its ceiling.
- Pull versus push on the inbound onboarding API: unresolved with the COO,
  both positions recorded on the row.
- core_launchpad as a seventh owner: documented in the playbook, never
  added to the constraint. PFAC carries the intent on its row.
