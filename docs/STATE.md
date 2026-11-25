# Current state

Updated: 2026-11-25 (company roadmap mapped; extraction script ready)

## In progress
Developer-readiness run (developer started 16 Nov 2026). Azure DevOps
holds 4 Epics, 5 Features and 16 stories (#325985 to #326009); sprints
26-24 to 27-01 exist; sprint 2 onwards is DRAFTED. Decisions are
`work_notes` tagged `developer-readiness`, each with its undo. 26-25
committed 24 Nov at 11 stories, 19 points (36d2de2d), all assigned;
pre-screening and PFAC stay in it uncommitted. Practices: CLAUDE.md
(Working with the owner), docs/DEVOPS.md (Every sprint), note 4a427177.
Company roadmap (KPI portal): model, rules and a draft of eight Turing
rows in LPio work_documents 49ecdef5; the read-only extraction script and
brief are in scratch/kpi/, which git ignores.

## Next steps
1. Mid-sprint review Fri 27 Nov: setup check first; commit pre-screening
   or PFAC if vault access has landed; settle sprint 2 (29 of 24), size
   and push it before 4 Dec (docs/DEVOPS.md, Every sprint, step 7; #325999
   last). Before 7 Dec, add sprints 27-02 and 27-03 (tools/ado/sprints.js).
2. Owner runs scratch/kpi/extract.js on the portal and attaches its file;
   then settle the rows. Import script only on "Make my import script".
3. Owner answers the three highlighted decisions on the PDF cover.
4. Sprint 2: one screening report mockup (MATCH). Effort: owner reviews
   sizes with the developer; recalibrate at /sprint-close (618cc096).
   Embeddings: `roadmap_embed_refresh(1, 3)`, small batches only.

## Blocked on the owner
- Developer access: Key Vault read and network access requested 24 Nov
  (decision 33080952); the API cannot start without it.
- PXP price sheet percentage lines story? DaoPay approval clause; per-MCC
  addenda list; re-parent the new Epics later if wanted; enable Supabase
  leaked-password protection; tag v0.1.0 at ab0e78b and push the tag.

## Open decisions
- Keep the `LPio` tag and link-back on pushed items (the re-run key)?
- Company roadmap (49ecdef5): LaunchPad channel; ask the portal team to
  set Turing up; eight rows; Q1 2027 launch windows.
