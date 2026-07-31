# Current state

Updated: 2026-07-30 (App Review merged to main)

## In progress
App Review is live on main and unproven: six tables
(supabase/schema/50_review.sql), select-only RLS so the portal
displays waves and never writes them, the wave list with a standing
watch list, the board, the drawer, a shared core/drawer.js, and
docs/APP-REVIEW.md plus /app-review as the session protocol. No wave
has run through it yet - the first is the test of whether the board
reads the way the owner works.

Copilot capture protocol complete: rounds 1 and 2 run and applied.
Live in Supabase: 19 work_notes, 4 domain_terms, 2
product_capabilities, 3 hollow rows filled, start_sprint 26-04.

## Next steps
1. Run a real wave through /app-review. Expect the do-now ordering
   and the staleness threshold (14 days, App.appReview.STALE_DAYS)
   to need tuning against real records.
2. Two roadmap-drift risks logged against their rows, unapplied
   pending owner: Terminal financing and Merchant Contributor.
3. Five unmatched sheet rows held as candidates, not created:
   Snowflake, CardStream plugins, Partner Oversight, Zendesk,
   "London & Zurich".
4. Sprint calendar derived (26-16 current) but not owner-confirmed;
   stamping items awaits that.
5. Owner reviews the 13 unlinked high-band pairs; top (0.982) looks
   like a duplicate. Then wire core_launchpad as a live owner.
6. Copilot round 3 when wanted; the brief is a work_notes decision.
7. Migrate the roadmap drawer onto core/drawer.js.

## Open decisions
- evidence_confidence uses corroborated/inferred/truncated: a value
  called "confirmed" beside confirmed_by re-collapses rule 1.
- ROADMAP-PLAYBOOK.md budget 360, COPILOT.md 260; exit plans in
  tests/size-budget.json.
- Inter via Google Fonts: AGREED. The one external stylesheet.
