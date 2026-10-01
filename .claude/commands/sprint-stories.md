---
description: Prepare the Sprint Roadmap for its sprint - order and readiness checks, user stories and acceptance criteria drafted and confirmed per workstream, then the packs for Azure DevOps and the company roadmap
argument-hint: [all | <workstream> | check | pack | confirm <workstream or item>]
---

Prepare the Sprint Roadmap for its sprint. The process is defined in
`docs/SPRINT-DELIVERY.md`: Part A for stories - where they live, how much
to write, how they are written, confirmed and frozen, and the pack - Part
C for how work gets on and off the plan, Part D for the order and the
readiness checks. Read it and follow it; it is the definition, not a
summary of one. Anything new that surfaces is contextualised per
`docs/ROADMAP-INTAKE.md` before it becomes a row.

The data is in Supabase (project ref `zlmkofbkobmhnslfnqsf`); drive the
run through the Supabase MCP.

Run it in this order:

1. **Order and readiness first.** `select * from v_sprint_plan_checks;`.
   If it shows any `order` rows, read the order as it stands from
   `v_sprint_plan_order`, run `select sprint_plan_sync_order();`, record
   the before and after in one `work_notes` decision, and report it in
   one line. The Now column and the Sprint Roadmap then list the work in
   the same order.
2. **The scope is the plan.** Only the items in `v_sprint_plan_items` and
   the streams in `v_sprint_plan_streams` - Now work. Decline anything
   else and say why: stories are written for sprint work only.
3. **Raise the `fix` rows** before drafting - a thin row, a dependency, a
   row off the belt, a slot over its bounds. Never patch one silently:
   ask, or report it as what blocks the stories.
4. **Pull the sources** for each stream, as Part A lists them, including
   its open notes, its existing stories and `external_ref`.
5. **Draft** each stream to Part A. Re-check drafted stories against the
   current summary and details. Leave confirmed and frozen stories alone
   unless the owner asks.
6. **Review per stream**: one `AskUserQuestion` question per stream, up
   to four per call, the preview carrying the exact text to be written.
   Options: "Confirm as written", "Keep as draft", "Change something".
   Stories become `confirmed` only because the owner chose that option -
   never on a session's own judgement.
7. **Write** through the MCP: `user_stories` and `stories_status`
   together, then one `decision` note for the run naming what was
   written. Where a set is overwritten, the previous JSON goes in that
   note; it is the undo.
8. **Print both packs**, each in its own code block so it copies exactly:
   `select sprint_story_pack(null, 'roadmap');` then
   `select sprint_story_pack(null, 'devops');`. Save both to one file in
   the scratchpad and send it to the owner.

`$ARGUMENTS`:

- `all`, or nothing: the whole plan.
- `<workstream>`: one stream, matched by title; steps 1 to 3 still run
  over the whole plan, because the order is the whole plan's.
- `check`: steps 1 to 3 only - the order and what the plan still needs.
- `pack`: step 8 only.
- `confirm <workstream or item>`: set `confirmed` only on the owner's
  explicit words in this session, quoted in the decision note.

Keep real merchant, partner and staff detail out of the repo: the stories
live in Supabase and leave through the pack, never through a file in git.
