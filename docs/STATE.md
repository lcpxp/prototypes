# Current state

Updated: 2026-11-18 (first Azure DevOps push done)

## In progress
Developer-readiness run (developer started 16 Nov 2026). This week
(26-24) and sprint 1 (26-25) are in Azure DevOps: 4 Epics, 5 Features
and 16 stories, #325985 to #326009, receipt applied, stories frozen
(later LPio changes show as `ado_changed`). Sprints 26-24 to 27-01 exist
and are in `ado_profile.team_sprints`. Sprint 2 onwards is DRAFTED.
Story rules from the owner's reviews are in docs/SPRINT-DELIVERY.md
Part A (step 10, Proportion) and docs/DEVOPS.md (development only).
Decisions: `work_notes` tagged `developer-readiness` on the run's
decision log, each with undo values; one push note per stream.

## Next steps
1. Sprint 2 (26-26): stories drafted with the step 10 rules for the
   mid-sprint review Fri 27 Nov, then pushed before 4 Dec (docs/DEVOPS.md,
   Every sprint, step 7). Sprints 27-02 and 27-03: script 7 sent 18 Nov.
2. Owner answers the three highlighted decisions on the PDF cover.
3. Refresh embeddings once Supabase compute allows
   (`select roadmap_embed_refresh();` failed on a worker limit 18 Nov).
4. Sprint 2 needs one screening report mockup (MATCH).
5. Effort: owner reviews sizes with the developer; recalibrate capacity at
   /sprint-close, on three sprints (history note 618cc096).

## Blocked on the owner
- PFAC stage diagrams: not found in LPio or the repo; check S1-07/S1-08.
- Small story for the PXP price sheet's percentage lines? (5 Oct report.)
- New Epics kept beside the 20 existing ones: re-parent later if wanted.
- Legal: the DaoPay approval clause wording; the per-MCC addenda list.
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- The push tags items `LPio` and links each back to its LPio row: keep,
  or use a neutral tag and drop the link? The link is how a re-run finds
  what exists, so dropping it needs another idempotency key.
