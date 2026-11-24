# Current state

Updated: 2026-11-24 (sprint 1 committed; practices written down)

## In progress
Developer-readiness run (developer started 16 Nov 2026). Azure DevOps
holds 4 Epics, 5 Features and 16 stories (#325985 to #326009); sprints
26-24 to 27-01 exist; sprint 2 onwards is DRAFTED. Decisions are
`work_notes` tagged `developer-readiness`, each with its undo. 26-24
closed 22 Nov with nothing done. 26-25 committed 24 Nov at 11 stories,
19 points, its capacity after two lost days (36d2de2d), all assigned;
pre-screening and PFAC stay in it uncommitted, 30 planned. Practices for
every sprint: CLAUDE.md (Working with the owner), docs/DEVOPS.md (Every
sprint, setup check), LPio note 4a427177.

## Next steps
1. Mid-sprint review Fri 27 Nov: setup check first; commit pre-screening
   or PFAC if vault access has landed; settle sprint 2 (29 of 24), size
   and push it before 4 Dec (docs/DEVOPS.md, Every sprint, step 7), which
   sets its board order (#325999 last). Before 7 Dec, add sprints 27-02
   and 27-03 with tools/ado/sprints.js, so two sprints stay ahead.
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
