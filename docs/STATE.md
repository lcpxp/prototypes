# Current state

Updated: 2026-11-18 (first Azure DevOps load prepared)

## In progress
Developer-readiness run (developer started 16 Nov 2026); Sprint Roadmap
live from 26-24. The owner's 18 Nov review is applied: delivery order
set within each sprint (sequence_position), the date repair moved to
Next, DaoPay split in the owner's order, EIT tracking rebuilt on the
existing hourly job, Orders tab and timeline, and decisions moved off
Azure DevOps onto the stories they gate (docs/SPRINT-DELIVERY.md Part A,
Writing them). Stories DRAFTED, no Azure DevOps ids, nothing pushed.
Snapshots: work_documents kind sprint. Decisions: `work_notes` tagged
`developer-readiness` on the run's decision log, each with undo values.

## Next steps
1. Owner runs the sprint file (tools/ado/sprints.js with the profile):
   plan, then fix the mistaken 25-30 into 26-24, then apply for 26-24
   to 27-01. Hand-back: the team_sprints line; set
   `ado_profile.team_sprints` from it.
2. Owner runs the preflight rehearsal
   (`ado_push_payload(null, '26-25', true)`, 17 stories); fix any FAIL.
3. Owner's final review, then confirms this week and sprint 1 in words;
   set those items confirmed, build `ado_push_payload(null, '26-25')`
   and print the push file. Receipt back: `ado_receipt_apply`.
4. Owner answers the three highlighted decisions on the PDF cover.
5. Sprint 2 push: one screening report mockup (MATCH); answer `ctx_`
   findings as each sprint comes within two sprints.

## Blocked on the owner
- Legal: the DaoPay approval clause wording; the per-MCC addenda list.
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- The push tags items `LPio` and links each back to its LPio row: keep,
  or use a neutral tag and drop the link? The link is how a re-run finds
  what exists, so dropping it needs another idempotency key.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
