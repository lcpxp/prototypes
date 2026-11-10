# Current state

Updated: 2026-11-10 (developer-readiness run in flight, phase 1 of 7)

## In progress
The developer-readiness run: a new developer starts Mon 16 Nov 2026 and
Sprint 1 is 26-25. Phase 1 (LPio foundation) is part-done:
- DONE and committed: the two size seams (`views-sprint-hide.js`,
  `roadmap-exec.css`).
- APPLIED LIVE, schema files not yet updated: migration
  `sprint_points_and_technical_notes` (capacity in points, story points,
  technical notes). It dropped `v_sprint_plan_checks`, which the next
  migration recreates - until then that view does not exist live.

## Next steps
1. **Recreate `v_sprint_plan_checks`** with the new ADO and estimate
   checks, then `ado_profile`, the `screenshots` register, the shared
   story renderer, `ado_push_payload` and `v_sprint_ledger`.
2. **Bring `supabase/schema/` in step** with the applied migrations, run
   `npm run snapshot`, and get `npm test` green.
3. **Owner UI**: points against capacity on the sprint page; estimate,
   technical notes and screenshots in the drawer.
4. **Phases 2-7** as the run's brief sets them out: reconcile the
   roadmap, anchor the plan at 26-25, make sprints 1-3 ready, the Azure
   DevOps push engine, the developer's first week, the rolling loop.

## Blocked on the owner
- No attachments reached the session: both LaunchPad code zips and the
  Azure DevOps extract are missing. Code re-verification, mockups and the
  item-by-item stale reconciliation wait on them.
- Enable leaked-password protection in Supabase Auth.
- Create the tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"` then
  `git push origin v0.1.0`.

## Open decisions
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
