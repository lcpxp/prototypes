# Current state

Updated: 2026-11-22 (26-24 closed; sprint 1 planning on 23 Nov)

## In progress
Developer-readiness run (developer started 16 Nov 2026). This week
(26-24) and sprint 1 (26-25) are in Azure DevOps: 4 Epics, 5 Features,
16 stories (#325985 to #326009). Sprints 26-24 to 27-01 exist and are in
`ado_profile.team_sprints`. Sprint 2 onwards is DRAFTED. Story rules:
docs/SPRINT-DELIVERY.md Part A; hand-off: docs/DEVOPS.md. Decisions are
`work_notes` tagged `developer-readiness`, each with its undo.
Stories corrected in Azure DevOps 20 Nov (all 16 in step). 26-24 closed
22 Nov with nothing done: week-one items top of 26-25 (30 of 24 points),
#325999 to 26-26 (29 of 24). Script 11 mirrors it in Azure DevOps.

## Next steps
1. Sprint 2 (26-26): stories drafted with the step 10 rules for the
   mid-sprint review Fri 27 Nov, pushed before 4 Dec (docs/DEVOPS.md,
   Every sprint, step 7). Sprints 27-02 and 27-03: script 7 sent 18 Nov.
2. Owner answers the three highlighted decisions on the PDF cover.
3. Sprint 2 needs one screening report mockup (MATCH).
4. Effort: owner reviews sizes with the developer; recalibrate at
   /sprint-close on three sprints (history note 618cc096).
5. Embeddings: `roadmap_embed_refresh(1, 3)`, small batches only.

## Blocked on the owner
- PFAC stage diagrams: not found in LPio or the repo; check S1-07/S1-08.
- Small story for the PXP price sheet's percentage lines? (5 Oct report.)
- New Epics kept beside the 20 existing ones: re-parent later if wanted.
- Legal: the DaoPay approval clause wording; the per-MCC addenda list.
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- Keep the `LPio` tag and link-back on pushed items? The link is how a
  re-run finds what exists; dropping it needs another idempotency key.
