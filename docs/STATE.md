# Current state

Updated: 2026-11-10 (developer-readiness run: phase 1 done, phase 2 next)

## In progress
The developer-readiness run: a new developer starts Mon 16 Nov 2026 and
Sprint 1 is 26-25. Phase 1 (LPio foundation) is DONE and live: points on
stories, capacity in points, technical notes, `ado_profile`, the
screenshot register, the shared story renderer, `ado_push_payload`,
`v_sprint_ledger`, the hand-off checks, the owner UI, the push engine
(`tools/ado/engine.js`) and docs/DEVOPS.md, ESTIMATION.md, SCREENSHOTS.md.
Both LaunchPad zips are the 5 Oct 2026 snapshot; the code map was
re-verified line by line and is stored as a `work_documents` row.

## Next steps
1. **Phase 2 - reconcile the roadmap**: intake sweep since 10 Aug,
   Contract Adjustments overhaul, a "Fixes and front-end polish" Now
   stream, PFAC to Now, Inbound API around MVP1, the known-issues record,
   Multi-Tenancy at Later. Then `npm run knowledge` (the one red gate).
2. **Phase 3**: anchor at 26-25, capacity 24 (17 for 27-01), set
   `sprint_plan.code_snapshot`, re-map, `sprint_plan_sync_order()`.
3. **Phase 4**: code review, stories, estimates and mockups for sprints
   1-3; an independent re-check of every sprint 1 file and line.
4. **Phase 5**: the stale-item reconciliation and the sprint 1 payload.
5. **Phase 6**: the induction document and the developer pack.
6. **Phase 7**: the `/sprint-ready`, `/sprint-close`, `/sprint-status`
   and `/ado-push` commands; SPRINT-DELIVERY and SPRINTS updated to the
   new mapping, removing the superseded hand-off text.

## Blocked on the owner
- The Azure DevOps extract JSON never reached the session, so the stale
  reconciliation can only cover items the brief names.
- This branch is not merged: the site deploys from main.
- Enable leaked-password protection in Supabase Auth.
- Create the tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"` then
  `git push origin v0.1.0`.

## Open decisions
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
