---
description: Close a sprint - build the end-of-sprint summary from the read-back, apply what corroborates, recalibrate capacity, roll the plan and refresh platform knowledge
argument-hint: <sprint code, e.g. 26-25>
---

Close sprint $ARGUMENTS. The process is defined in
`docs/SPRINT-DELIVERY.md` Part B (the summary and how a relayed summary
is applied) and Part C (re-mapping and slippage), `docs/ESTIMATION.md`
(recalibrating capacity) and `docs/PLATFORM.md` (platform knowledge).
Read them and follow them; they are the definition, not a summary of one.

The owner hands over the sprint's read-back from Azure DevOps and fresh
code zips. The data is in Supabase (project ref `zlmkofbkobmhnslfnqsf`).

0. Azure DevOps: steps 9 to 11 of docs/DEVOPS.md, Every sprint. The
   read-back is step 9; unfinished work moves to the next sprint there.
1. Build the end-of-sprint summary: Delivered (Done, every criterion
   ticked), Progressed, Blocked, Slipped, Changed about the plan.
2. Class each line as corroborates, updates, contradicts or new. Apply
   the first two (status, progress, actual points); raise contradictions
   with the owner, never overwrite.
3. Recalibrate `capacity_points` from actuals and roll the plan; record
   the before and after in one `decision` note.
4. Update platform knowledge from the new code, linked to the delivered
   items: `product_capabilities`, `api_specs` and `api_endpoints`,
   `domain_terms`. Flag `tech_notes_stale` items.
5. Store the summary as a `work_documents` row of kind `sprint`, and take
   a snapshot of the rolled plan: `select sprint_plan_snapshot('<code> close');`.
