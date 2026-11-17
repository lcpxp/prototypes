# Current state

Updated: 2026-11-17 (developer-readiness run: phases 6 and 7 done)

## In progress
Developer-readiness run (developer started 16 Nov 2026); Sprint Roadmap
live from 26-24. Story context review done for 26-24 to 27-01: every
build story now carries its sets, values, file references and test
cases; the day-early date fault is first in 26-24. The check is standing
(docs/SPRINT-DELIVERY.md Part A, step 8) and flagged by size in
v_sprint_plan_checks. Induction and developer pack delivered; the sprint
routines are commands. Stories DRAFTED, no Azure
DevOps ids, nothing pushed. Glossary page and access-aware dashboard are
live on main; the branch merges to main as work lands. Decisions:
`work_notes` tagged `developer-readiness`, each with undo values.

## Next steps
1. Owner confirms the drafted stories, setup week first.
2. At push time, generate the mockups the stories need: the partner-type
   switches page and one screening report (MATCH).
3. **Phase 5**: `ado_profile.team_sprints`, then `/ado-push` once the
   sprints exist and stories are confirmed.
4. Answer the `ctx_` findings in v_sprint_plan_checks as each sprint
   comes within two sprints, in proportion to each story's size.
5. Inbound API deep review, then Sprint Roadmap snapshots.
6. Last: a visual review of the Sprint Roadmap as two images - this week
   with sprint 1, and sprint 2 with sprint 3.

## Blocked on the owner
- Azure DevOps: sprints 26-24 to 27-04 must exist and be selected.
- Legal: the DaoPay approval clause wording; the per-MCC addenda list
  (moved to Next until it arrives).
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
