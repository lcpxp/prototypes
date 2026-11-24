# Current state

Updated: 2026-11-24 (sprint 1 committed: 11 stories, 19 points)

## In progress
Developer-readiness run (developer started 16 Nov 2026). This week
(26-24) and sprint 1 (26-25) are in Azure DevOps: 4 Epics, 5 Features,
16 stories (#325985 to #326009). Sprints 26-24 to 27-01 exist and are in
`ado_profile.team_sprints`. Sprint 2 onwards is DRAFTED. Story rules:
docs/SPRINT-DELIVERY.md Part A; hand-off: docs/DEVOPS.md. Decisions are
`work_notes` tagged `developer-readiness`, each with its undo.
26-24 closed 22 Nov with nothing done. 26-25 committed 24 Nov at 11
stories, 19 of 24 points, all assigned (decision 3f2c6d0f; scripts 12
and 13). Pre-screening and PFAC moved to the top of 26-26: 40 of 24.

## Next steps
1. Sprint 2 (26-26): trim from 40 to capacity and size its drafted
   stories at the mid-sprint review Fri 27 Nov, then push before 4 Dec
   (docs/DEVOPS.md, Every sprint, step 7); the push also sets its board
   order (#325999 last). Sprints 27-02 and 27-03: script 7 sent 18 Nov.
2. Owner answers the three highlighted decisions on the PDF cover.
3. Sprint 2 needs one screening report mockup (MATCH).
4. Effort: owner reviews sizes with the developer; recalibrate at
   /sprint-close on three sprints (history note 618cc096).
5. Embeddings: `roadmap_embed_refresh(1, 3)`, small batches only.

## Blocked on the owner
- Developer access: Key Vault read and network access requested from the
  Azure admin 24 Nov (decision 33080952); the API cannot start without it.
- Small story for the PXP price sheet's percentage lines? (5 Oct report.)
- New Epics kept beside the 20 existing ones: re-parent later if wanted.
- Legal: the DaoPay approval clause wording; the per-MCC addenda list.
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- Keep the `LPio` tag and link-back on pushed items? The link is how a
  re-run finds what exists; dropping it needs another idempotency key.
