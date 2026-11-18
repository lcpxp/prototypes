# Current state

Updated: 2026-11-18 (owner review of the drafted stories applied)

## In progress
Developer-readiness run (developer started 16 Nov 2026); Sprint Roadmap
live from 26-24. The owner's 18 Nov review is applied: delivery order
set within each sprint (sequence_position), the date repair moved to
Next, DaoPay split in the owner's order, EIT tracking rebuilt on the
existing hourly job, Orders tab and timeline, and decisions moved off
Azure DevOps onto the stories they gate (docs/SPRINT-DELIVERY.md Part A,
Writing them). Stories DRAFTED, no Azure DevOps ids, nothing pushed.
Snapshots before and after are in work_documents (kind sprint).
Decisions: `work_notes` tagged `developer-readiness`, on the run's
decision log document, each with undo values.

## Next steps
1. Owner confirms the drafted stories, this week first (the 18 Nov
   preview PDFs mirror the Azure DevOps fields).
2. Owner answers the three highlighted decisions: inbound caller
   identity, Unity service identity, and EIT GetShippingData on live.
3. At push time, generate the mockups the stories need: the partner-type
   switches page and one screening report (MATCH).
4. **Phase 5**: `ado_profile.team_sprints`, then `/ado-push` once the
   sprints exist and stories are confirmed.
5. Answer the `ctx_` findings in v_sprint_plan_checks as each sprint
   comes within two sprints, in proportion to each story's size.

## Blocked on the owner
- Azure DevOps: sprints 26-24 to 27-04 must exist and be selected.
- Legal: the DaoPay approval clause wording; the per-MCC addenda list.
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- The push tags items `LPio` and links each back to its LPio row: keep,
  or use a neutral tag and drop the link? The link is how a re-run finds
  what exists, so dropping it needs another idempotency key.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
