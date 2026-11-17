---
description: Print the Azure DevOps push - the engine and the payload with its hash - for the owner to run in the browser console
argument-hint: [workstream or item id]
---

Prepare the Azure DevOps push for ${ARGUMENTS:-the whole plan}. The
hand-off is defined in `docs/DEVOPS.md`: the payload, the engine, the
checks it runs first and the write-back. Read it and follow it; it is
the definition, not a summary of one.

1. Clear the hand-off rows in `v_sprint_plan_checks` first; a push with
   a `fix` row open is refused.
2. Build the payload in Supabase (project ref `zlmkofbkobmhnslfnqsf`):
   `select ado_push_payload();` or `select ado_push_payload('<id>');`.
3. Print `tools/ado/engine.js` and the payload with its hash, ready to
   paste. The owner runs it; this session never reaches Azure DevOps.
4. When the receipt comes back, apply it as docs/DEVOPS.md says, which
   writes each id to `work_items.external_ref` and freezes the stories.
