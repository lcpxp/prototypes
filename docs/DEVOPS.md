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
| Out of scope | `Out of scope:` lines in `details`: only what a developer might otherwise do | Blank if none. Sibling stories are not listed; they sit under the same Feature. |
| Acceptance criteria | the story's criteria, verbatim | A checklist, one box per criterion. |
| Dependencies | `blocks` links into the item from other developer work | "Needs: title (#id)". Work outside development - a decision, an agreement, another team's build - is never written here; it stays in LPio and the story packs. |
| Technical implementation details | the story's own technical notes, else the item's | Under the heading "Suggested approach (code snapshot date): confirm or challenge in refinement". |
| Effort | the story's points | docs/ESTIMATION.md. |
| Area | `ado_profile` | The team's area. |
| Iteration | the item's start sprint | Only if that sprint exists and is selected for the team; otherwise the root, with the sprint named in preflight. Azure DevOps owns it after the push. |
| State, Priority, Value area | the process defaults | Never chosen per item. |
| Tags | | `LPio` and nothing else. |
| Parent | the stream's Feature | Mandatory. |
| Link back | a hyperlink to the item's drawer | Its comment, `LPio <item id>#<n>`, is the idempotency key. |
| Attachments | the screenshot register | Images linked `about` the item. |

A **Bug** is written the way the team's bugs already are: its title,
criteria and effort as fields, and everything else in the repro steps -
what happens (the item's summary, so it is written as the fault as it
shows today), where (the story's scope, when it has its own), the story,
then any development dependency and the suggested approach. It has no
Purpose or Scope.

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
- a small fix closes on the developer's evidence; anything bigger is
  tested by the owner, largely on production once released;
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
    select ado_push_payload(null, '26-25'); -- sprints up to 26-25 only
    select ado_push_payload(null, '26-25', true);  -- preview: drafted too

A push normally names its last sprint, so stories confirmed for later
sprints wait for their own push. A preview treats drafted stories as
confirmed and is marked `preview`: preflight rehearses it against Azure
DevOps before the owner confirms, and `push` refuses it.

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
| `preflight` | Read-only. Checks the payload against its profile; the types and every field reference; that no forbidden type is used; that the criteria field is drawn by the checklist control; that the target sprints exist and are selected for the team; the team's area; that the team works bugs as requirements, so a bug lands on the backlog beside backlog items, and shows the Epics and Features backlogs; parent types; and what LPio has already created - a matching link back becomes "skip (exists)". |
| `push` | Prints the plan and asks once. Validates every create first, then creates in order: missing Epics, Features, backlog items in delivery order (sprint, then `sequence_position`, docs/SPRINT-DELIVERY.md Part D) with parent, link back and attachments, then Predecessor links for `blocks`. Adds only, never bypassing a rule. Stops at the first failure; a re-run skips what exists. |
| `verify` | Read-only. Re-reads every written field - whitespace normalised, tick markup stripped, so a ticked criterion is not a difference - and checks the parent and the link back. Must show zero differences straight after a push. |
| `cleanup` | Applies a reconciliation the owner has signed off. Each change applies only if the item is still at the revision the plan was made against. |
| `update` | The one-off correction: as `cleanup`, and only for items still in their first state. |
| `sprint` | Read-only. What a sprint holds, for the sprint close: state, effort, criteria and how many are ticked, pull request links. No names. |

`tools/ado/survey.js` is the third paste, read-only like `preflight`:
it reads the project's existing Epics, Features, backlog items and
Bugs and reports how each type is written - fields used, picklist
values, the headings long fields use, title shape, parents and a few
samples - with every person removed. A session reads it before the
first push, and whenever the team's conventions may have moved, so
what is pushed matches the work already there.

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

## Every sprint

The whole round for one sprint in Azure DevOps, in order: nothing a
sprint needs is left to memory. /sprint-ready runs steps 1 to 5 and
/sprint-close steps 9 to 11.

Capacity is planned in points, in LPio (docs/ESTIMATION.md). Hours
capacity on the Capacity tab is not set: Tasks are the developer's own
breakdown, and Azure DevOps measures that capacity only against task
hours. The burndown runs on Effort instead, so it needs only the days
off.

Before the sprint starts:

1. **Sprints ahead.** The sprint and the two after it exist and are
   selected for the team: `sprints.js` `plan`, then `apply` for any
   missing, and their codes added to `ado_profile.team_sprints`.
2. **Short sprints.** Public holidays and leave are in
   `sprint_plan.capacity_overrides`.
3. **Stories.** Checks clear, every item Ready, payload, preflight, push,
   then the receipt applied (/ado-push).
4. **Verify.** `verify` shows zero differences, and the read-back
   (`sprint`) shows nothing in the sprint that LPio did not put there.
5. **Days off.** The sprint's Capacity tab carries the team's public
   holidays and the developer's leave, so the burndown's ideal line is
   right.

During the sprint:

6. The developer assigns a story to himself when he starts it, and
   moves it to Done when it meets Done (below). Nothing is assigned in
   advance, so the board shows what is really in progress.
7. **Next sprint pushed by mid-sprint.** Steps 3 and 4 run for the next
   sprint by the middle Friday of the one before, so pulling a story
   forward is moving it on the board, not waiting for a push.
8. A story that will not finish is said early and moves to the next
   sprint.

At the close (the sprint's last day):

9. **Read-back.** `sprint` for the code, handed to /sprint-close.
10. **Unfinished work** moves to the next sprint in Azure DevOps, and
    LPio rolls the plan to match.
11. **Recalibrate** capacity from what reached Done (docs/ESTIMATION.md).

## Before the first push

Five one-off steps, each the owner's to run or request:

1. **Sprints.** `tools/ado/sprints.js` creates each sprint the plan
   uses as "Sprint <code>" under `iteration_root`, with the dates in
   docs/SPRINTS.md, and selects it for the team: `plan` is read-only,
   `apply` asks once and adds only. A sprint that already exists with
   other dates, or a sprint whose dates overlap one, is reported and
   left alone. `plan` first lists every iteration the project holds and
   which one Azure DevOps counts today in, so the calendar is checked
   against the project before anything is added. A sprint made by
   mistake is turned into the right one with `fix`: moved into
   `iteration_root`, renamed and dated, keeping the work items in it.
   The result of `apply` names the codes; the session lists them in
   `ado_profile.team_sprints`.
   `tests/unit/ado-sprints.test.js` holds it to that.
2. **Reconcile what is stale.** Open items left in finished sprints,
   unscheduled or without a parent are grouped in short tables, each
   with one recommendation: superseded by a roadmap row, wanted and not
   on the roadmap (intake), wanted and on it (link its id, never
   re-push), or close. Changes run only through `cleanup`.
3. **Ready and Done** go to the team's wiki and the board's column
   definitions, from the section above.
4. **Run preflight.** It checks every item's fields against its type,
   so a field the form lacks is named before anything is created.
5. **Burndown on Effort.** The team dashboard's Sprint Burndown widget
   sums Effort on backlog items and bugs, so it reads in points without
   Tasks or hours capacity (Every sprint, above).
