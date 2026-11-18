---
description: Get a sprint ready before it starts - checks clean, items ready, load and pull-forward list set, payload built, start-of-sprint summary written
argument-hint: <sprint code, e.g. 26-25>
---

Get sprint $ARGUMENTS ready. The process is defined in
`docs/SPRINT-DELIVERY.md` (Part A for stories and the completeness check,
Part B for the start-of-sprint summary, Part C for the plan, Part D for
the order), `docs/DEVOPS.md` for Ready and the payload, and
`docs/ESTIMATION.md` for capacity and the pull-forward list. Read them and
follow them; they are the definition, not a summary of one.

The data is in Supabase (project ref `zlmkofbkobmhnslfnqsf`); drive the
run through the Supabase MCP.

1. `select * from v_sprint_plan_checks where slot = <slot of the sprint>;`
   and clear every `fix` row, or report what blocks it. Run
   `select sprint_plan_sync_order();` if an `order` row shows.
2. Every item in the sprint is Ready (docs/DEVOPS.md): confirmed stories,
   points on the scale, verified technical notes, the `ctx_` findings
   answered in proportion to each story's size.
3. Points against capacity (`v_sprint_plan_load`): loaded full, with an
   ordered pull-forward list.
4. Build the payload for the sprint: `select ado_push_payload(null, '<sprint code>');`.
5. Take a snapshot of the plan: `select sprint_plan_snapshot('<code> start');`.
6. Write the start-of-sprint summary as a `work_documents` row of kind
   `sprint`, linked `about` each stream, ending with a one-line sprint
   goal for Azure DevOps.

Report in one short block: ready or not, what blocks it, the sprint goal.
