---
description: Answer a question about past, current or future sprints from the sprint ledger and the sprint documents
argument-hint: [question]
---

Answer: $ARGUMENTS

The sprint record is defined in `docs/SPRINT-DELIVERY.md` (Part B for
summaries, Part C for the plan) and the calendar in `docs/SPRINTS.md`.
Read them and follow them; they are the definition, not a summary of one.

The data is in Supabase (project ref `zlmkofbkobmhnslfnqsf`).
`v_sprint_ledger` has one row per item per sprint, with planned and
actual points, Azure DevOps ids and outcome; `v_sprint_plan_items` and
`v_sprint_plan_load` hold what is planned; `work_documents` of kind
`sprint` hold the narrative. Answer from those, in plain words, and say
plainly where the record has no answer. Never state an outcome the
ledger does not hold.
