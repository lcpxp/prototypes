# Current state

Updated: 2026-11-25 (sprint plan re-mapped; MVP live; pre-screening split)

## In progress
Developer-readiness run (developer started 16 Nov 2026). Azure DevOps
holds 4 Epics, 5 Features and 16 stories (#325985 to #326009); sprints
26-24 to 27-01 exist; sprint 2 onwards is DRAFTED. Decisions are
`work_notes` tagged `developer-readiness`, each with its undo. 26-25
committed 24 Nov at 11 stories, 19 points (36d2de2d), all assigned;
pre-screening and PFAC stay in it uncommitted. Practices: CLAUDE.md
(Working with the owner), docs/DEVOPS.md (Every sprint), note 4a427177.
The 25 Nov re-map is live (69b34957; MVP narrowed in 54e280d5): Payment
Service and Unity from 26-26, Risk ahead of PFAC, EIT's build closed,
8 items tagged mvp, MVP line on main. Pre-screening is two items in 26-25
(eedf45b0); at the read-back match #326006 by id: its link names the check.

## Next steps
1. Mid-sprint review Fri 27 Nov: setup check first; commit pre-screening
   or PFAC if vault access has landed; settle sprint 2 at 29 of 24 (the
   non-MVP 5 points - hidden characters, Simple Fees, term length - move
   first), size and push it before 4 Dec (docs/DEVOPS.md, Every sprint,
   step 7; #325999 last). Before 7 Dec add sprints 27-02 and 27-03.
2. 27-01 holds 25 of 17 points; 27-02 has 20 build items, 19 unsized.
3. Owner answers the three highlighted decisions on the PDF cover. Sprint
   2 needs one screening report mockup (MATCH).
4. Effort: owner reviews sizes with the developer; recalibrate at
   /sprint-close (618cc096). Embeddings: `roadmap_embed_refresh(1, 3)`.

## Blocked on the owner
- Developer access: Key Vault read and network access requested 24 Nov
  (decision 33080952); the API cannot start without it.
- PXP price sheet percentage lines story? DaoPay approval clause; per-MCC
  addenda list; re-parent the new Epics later if wanted; enable Supabase
  leaked-password protection; tag v0.1.0 at ab0e78b and push the tag.

## Open decisions
- Keep the `LPio` tag and link-back on pushed items (the re-run key)?
- Company roadmap (KPI portal): on hold; brief 49ecdef5, scratch/kpi/.
