# Azure DevOps hand-off

How ready work leaves the Sprint Roadmap for Azure DevOps, how the push
is verified, and how the two stay associated afterwards.

Public repo, so this file is **process only**. The organisation, the
project, the team, every id and every field reference live in the
`ado_profile` row in Supabase and nowhere in git; the engine in
`tools/ado/engine.js` holds none of them either.

Companions, one job each, cited rather than restated:

- **docs/SPRINT-DELIVERY.md** - how stories, criteria and technical
  notes are written (Part A), the sprint summaries and the close routine
  (Part B), the mapping (Part C) and the order (Part D).
- **docs/ESTIMATION.md** - the scale and how a story is sized.
- **docs/SCREENSHOTS.md** - the images a backlog item carries.
- **docs/SPRINTS.md** - the calendar and what sprints are called.

## The contract

The Product Roadmap holds intent, the Sprint Roadmap holds when, and
Azure DevOps holds delivery state. There is **one association per
story** and no synchronisation beyond the routines in this file.
Anything kept in step in two places eventually disagrees in both.

The developer works in Azure DevOps alone, so **every backlog item
stands on its own**: what to do, why, where in the code, and how to
prove it works. It carries nothing confidential - no partner
commercials, no internal politics, no names of external individuals.

## Mapping

| Sprint Roadmap | Azure DevOps | Rule |
| --- | --- | --- |
| Roadmap category | **Epic** | Created when a category first has pushed work. Title is the label, description the category's. Never edited by script afterwards. |
| Workstream on the plan | **Feature**, child of its category's Epic | Created with its first pushed story. |
| Story (`user_stories[n]`) | **Product Backlog Item**, or **Bug** when the item's `type` is `bug`; child of the Feature | One story, one backlog item. Never merged or split. |
| Work item | none | The allocation unit. Its stories share its sprint. |
| Deliverable | a story on its parent item | As docs/SPRINT-DELIVERY.md Part A. |
| Task | never created from here | The developer's own breakdown. |

Epics and Features that existed before this mapping stay as history.
New work is never parented to them. The types a push may never use are
listed in `ado_profile.forbidden_types`: they sit on no backlog.

**What is pushed.** Developer work only: a story whose item has an
allocation that is neither external nor `parallel`
(`v_sprint_plan_items.is_build`). Discovery, decisions and
conversations the owner runs stay on the roadmap.

## Field standard

`sprint_story_fields()` derives every field once
(`supabase/schema/38_sprint_handoff.sql`); the text pack and the push
payload both read it, so they cannot disagree. Fields are named here as
the form shows them; `ado_profile.fields` maps each to its reference.

**Backlog item**

| Field | From | Rule |
| --- | --- | --- |
| Title | the story's title | Imperative, readable alone on a board card. |
| Description | the story | Three lines: the role, "I want", "So that". A story that will not split is a check failure. |
| Purpose | the story's own `purpose` line, else the first sentence of the item's benefit, else the story's outcome | Never a placeholder. |
| Scope | the story's own `scope` line, else the item's `summary` | One bullet. `work_items.scope` is not read: it says whether a stream ends. |
| Out of scope | `Out of scope:` lines in `details`, then each sibling story as "Covered separately" | Blank if none. |
| Acceptance criteria | the story's criteria, verbatim | A checklist, one box per criterion. |
| Clarifications | open `question` notes on the item | A checklist, one unticked line each. Only the checklist is written, never the plain box beside it. |
| Dependencies | `blocks` links into the item | "Needs: title (#id)". |
| Technical implementation details | the story's own technical notes, else the item's | Under the heading "Suggested approach (code snapshot date): confirm or challenge in refinement". |
| Effort | the story's points | docs/ESTIMATION.md. |
| Area | `ado_profile` | The team's area. |
| Iteration | the item's start sprint | Only if that sprint exists and is selected for the team; otherwise the root, with the sprint named in preflight. Azure DevOps owns it after the push. |
| State, Priority, Value area | the process defaults | Never chosen per item. |
| Tags | | `LPio` and nothing else. |
| Parent | the stream's Feature | Mandatory. |
| Link back | a hyperlink to the item's drawer | Its comment, `LPio <item id>#<n>`, is the idempotency key. |
| Attachments | the screenshot register | Images linked `about` the item. |

A **Bug** carries its title, criteria, technical notes and effort the
same way, and puts what happens, what should and the story in the repro
steps. It has no Purpose or Scope.

A **Feature** carries the workstream's title, its summary and epic
story as the description, the epic's outcomes as a plain list, and the
first and last sprint dates of the stream. An **Epic** carries the
category's label and description.

**Never written:** who it is assigned to, the plain assumptions box,
business value, profit-and-loss and strategic fields, the release
version, the authorisation and operations groups, the risk assessment,
Tasks, and any state but the first.

## Ready and Done

**Ready** - a backlog item may be committed to a sprint when:

- its stories are confirmed, pushed, and verify showed no differences;
- Purpose and Scope are real, and the criteria count is within the cap
  docs/SPRINT-DELIVERY.md Part A sets;
- its technical notes are verified against the current code snapshot;
- it has an estimate on the scale;
- its parent and dependencies are linked;
- it has no unticked clarification.

**Done** - when:

- every criterion is ticked in Azure DevOps;
- the owner has tested it on QA;
- the pull request is merged and linked;
- the release version is set to the sprint code;
- the risk assessment is completed for anything that reached production.

## The checks

`v_sprint_plan_checks` (`supabase/schema/39_sprint_checks.sql`) says
what is not ready, one row per finding, with the sprint it belongs to.

| Severity | Checks |
| --- | --- |
| `fix` | `ado_story_shape`, `ado_criteria_count`, `ado_no_purpose`, `ado_no_category`, `ado_sprint_missing`, `ado_changed`, `estimate_missing`, `tech_notes_stale` |
| `confirm` | `ado_not_pushed`, `ado_open_clarifications` |
| `write` | `ado_no_stream_feature` |

`ado_sprint_missing` clears when the sprint exists in Azure DevOps, is
selected for the team, and is listed in `ado_profile.team_sprints`.

## The payload

    select ado_push_payload();              -- the whole plan
    select ado_push_payload('<id>');        -- one workstream or one item

Rendering lives in the database. The payload holds confirmed stories
with no Azure DevOps id, every field already rendered, with their
Features and Epics; anything that cannot go is listed under `held_back`
with the reason. A session never builds field markup and never retypes
a story. The rendering rules, for the record:

- the description is cut at ", I want " and ", so that ";
- criteria and clarifications are one checklist block each line;
- Purpose is one block; Scope, Out of scope, Dependencies and a
  Feature's outcomes are bulleted lists;
- technical notes are headed paragraphs and lists: a line ending in a
  colon is a heading, a line starting "- " is a list item;
- `&`, `<` and `>` are escaped; everything else passes through.

Images travel as data. The payload lists each image registered `about`
an item by its path; the session preparing the push adds the content of
every image it holds, so the engine fetches nothing from outside Azure
DevOps. A session cannot read the private bucket, so an image it does
not hold is named in the plan and attached by the owner
(docs/SCREENSHOTS.md).

## The engine

`tools/ado/engine.js` is pasted into the browser console on a page of
the target project and runs as the signed-in user. It is data-free and
unit-tested against a mocked Azure DevOps
(`tests/unit/ado-engine.test.js`). A session cannot reach Azure DevOps,
so every call below is one the owner runs after seeing the plan.

| Call | What it does |
| --- | --- |
| `preflight` | Read-only. Checks the payload against its profile; the types and every field reference; that no forbidden type is used; that the criteria field is drawn by the checklist control; that the target sprints exist and are selected for the team; the team's area; parent types; and what LPio has already created - a matching link back becomes "skip (exists)". |
| `push` | Prints the plan and asks once. Validates every create first, then creates in order: missing Epics, Features, backlog items in Sprint Roadmap order with parent, link back and attachments, then Predecessor links for `blocks`. Adds only, never bypassing a rule. Stops at the first failure; a re-run skips what exists. |
| `verify` | Read-only. Re-reads every written field - whitespace normalised, tick markup stripped, so a ticked criterion is not a difference - and checks the parent and the link back. Must show zero differences straight after a push. |
| `cleanup` | Applies a reconciliation the owner has signed off. Each change applies only if the item is still at the revision the plan was made against. |
| `update` | The one-off correction: as `cleanup`, and only for items still in their first state. |
| `sprint` | Read-only. What a sprint holds, for the sprint close: state, effort, criteria and how many are ticked, pull request links. No names. |

`push` downloads `ado-push-receipt-<date>.json` and copies it to the
clipboard. Each entry holds the LPio key, the id, type, revision, hash
and outcome.

## Write-back and freezing

The owner hands the receipt back and the session runs:

    select ado_receipt_apply('<receipt json>'::jsonb);

It writes each story's `ado` entry (`id`, `type`, `rev`, `pushed_at`,
`hash`), the Feature id onto its workstream's `attributes.ado`, and
each Epic id into `ado_profile.epic_ids`. The session records the push
as one `decision` note per stream.

**A story with an id is frozen.** A later change in LPio shows as
`ado_changed` and is reported as a difference to make in Azure DevOps,
never written over what was pushed. The one exception is `update`, for
items still in their first state whose revision has not moved.

## Before the first push

Three one-off steps, each the owner's to run or request:

1. **Sprints.** A project administrator creates the sprints the plan
   uses; the owner selects them for the team. Then list them in
   `ado_profile.team_sprints`.
2. **Reconcile what is stale.** Open items left in finished sprints,
   unscheduled or without a parent are grouped in short tables, each
   with one recommendation: superseded by a roadmap row, wanted and not
   on the roadmap (intake), wanted and on it (link its id, never
   re-push), or close. Changes run only through `cleanup`.
3. **Ready and Done** go to the team's wiki and the board's column
   definitions, from the section above.
