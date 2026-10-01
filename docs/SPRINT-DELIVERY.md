# Sprint delivery

What happens to a work item once it reaches the Now column: how its
stories and acceptance criteria are written and handed to DevOps, how a
sprint is summarised at each end, how the whole Now column is mapped
across sprints, and how the two roadmaps are kept in one order.

Public repo, so this file is **process only** - no item titles, no
benefit text, no sprint contents, no names, no addresses. The material
lives in Supabase (project ref `zlmkofbkobmhnslfnqsf`). A worked example
in here would be the one thing that cannot be published.

Three companions, one job each, cited rather than restated:

- **docs/SPRINTS.md** - the calendar. Codes, dates, the distance-to-band
  table and the progress checkpoints are stated there and nowhere else.
- **docs/VALUE-CAPTURE.md** - how a benefit and its metrics are written.
- **docs/ROADMAP-PLAYBOOK.md** - the fields and the canonical operations;
  **docs/ROADMAP-INTAKE.md** for contextualising anything new.

## The two roadmaps, in one paragraph

The **Product Roadmap** bands work by horizon and answers what is being
done, in what order. The **Sprint Roadmap** takes the Now column and
answers when, against whose capacity. One rule joins them: an item is on
the Sprint Roadmap if it has a live row in `work_item_sprints`, and it
may only have one while `horizon = 'now'`. The Now column is therefore a
conveyor belt - work enters, is allocated, is delivered, and leaves.

Allocation is always **relative**: `slot` 0 is the plan's first sprint,
which every surface labels "Sprint 1" - the slot is zero-indexed and only
its label counts from one. A real sprint code exists only once
`sprint_plan.anchor_sprint` is set, which is a single deliberate act:

    update sprint_plan set anchor_sprint = '<YY-NN>' where key = 'default';
    select sprint_plan_project();

Until then every surface says Sprint N, and nothing invents a date.

---

# Part A - Stories, acceptance criteria and the DevOps hand-off

The one home for user stories and acceptance criteria. The
`/sprint-stories` command runs it; it does not restate it.

## When

For work on the Sprint Roadmap and only for it, before its sprint
starts, when the owner asks. An item reaching Now is on the plan at once
(Part C), its stories area empty. Work at Next is not written for:
stories written early go stale before they are used.

## What gets pulled

Read these before writing anything:

| Source | What it supplies |
| --- | --- |
| `summary` | the one-line what |
| `details` | the why, the history, and any acceptance criteria already agreed |
| `blocks` / `relates_to` in `knowledge_links` | sequence, and what must not be broken |
| `source_document_id`, and documents linked `about` | the original material |
| `business_benefit`, `pxp_staff_value`, `partner_staff_value`, `merchant_value` | the role and the behaviour each story is written from |
| `work_item_metrics` | the number the story's outcome is measured by |
| open `work_notes` | the questions a story must not answer by guessing |

## Where they live

`work_items.user_stories` holds an array of `{title, story, criteria[]}`
and `stories_status` says `drafted` or `confirmed`; one is never set
without the other. A workstream holds its epic; a work item holds its own
stories; a deliverable's content becomes a story on its parent item. The
database refuses an empty or runaway set (`work_item_stories_valid`);
how much to write is the judgement below.

## How much to write

- **A workstream:** exactly one epic story, with 3-5 outcome criteria.
- **A work item:** 1-3 stories, each with 2-5 criteria. An item with
  deliverables takes one story per deliverable instead, up to five.
- **Titles** are imperative and ten words at most.

More than this is bloat: a story that needs eight criteria is two stories,
and an item that needs five stories is two items.

## Writing them

    As a <role>, I want <behaviour>, so that <outcome>.

- **Role** comes from the benefit field the value sits in - the staff
  audience, the partner's staff, or the merchant. It is always a person;
  for work between systems it is the person whose work changes, never
  "the system".
- **Behaviour** comes from the benefit sentence; **outcome** from the
  metric, stated as the thing that stops happening. A story's outcome may
  come from its workstream's benefit by parentage (docs/VALUE-CAPTURE.md).
- **Criteria** are one sentence each: observable, testable without
  reading code, never an implementation. Where the item names a failure
  that fires today, one criterion is that it stops firing.
- **Criteria already agreed in `details` are lifted verbatim.** Where a
  row carries dated criteria someone agreed, re-deriving them loses the
  agreement, which was the valuable part.
- An open question becomes a `work_notes` question, never a criterion.
- No durations, no capacity figures, no internal shorthand (Part C,
  Durations).

## Confirming and freezing

- Stories stay `drafted` until the owner confirms them in as many words,
  one stream at a time. Confirmed stories change only at the owner's
  request.
- Overwriting a story set records the previous JSON in that run's
  `decision` note: it is the undo.
- Once `external_ref` holds the DevOps id, the stories are frozen. A
  later change is reported as a difference to make in DevOps, not
  written over what was pasted.

## The pack

    select sprint_story_pack(null, 'devops');
    select sprint_story_pack(null, 'roadmap');

A workstream's or an item's id in place of null gives one stream or one
item. The drawer's copy buttons call the same function, so every copy
matches. Copy the pack; never retype it - the exports in `work_documents`
carry typos that reached a sprint because someone typed each line.

- **Azure DevOps**: a workstream is an **Epic**, a work item a
  **Feature**, a story a **User Story**; the criteria go in the User
  Story's Acceptance Criteria field. Each block carries its Parent, its
  Iteration ("Sprint N" until the plan is anchored, the real code after),
  who builds it when that is not the team, and what it depends on. State
  is New; Effort stays blank unless the team has sized it.
- **The company roadmap**: per stream, its sprints, its summary, the epic
  story and its outcomes.

## Keeping the two associated

Write the DevOps id back to `work_items.external_ref`, the home
docs/WORKFLOW.md already names for a ticket reference - never a second
field - and record the hand-off as a `work_notes` `decision`.

## What is deliberately not carried across

`horizon`, `priority`, `sort_order`, `presentation`, benefit prose,
metrics, typed links and the roadmap's own vocabulary. DevOps carries
delivery state; the roadmap carries intent. Two systems, one association,
no synchronisation - anything that has to be kept in step in two places
will eventually disagree in both.

---

# Part B - Sprint summaries

## Start of sprint

Sections, in order:

1. **Sprint** - the code and its dates, from `App.sprints` (docs/SPRINTS.md).
2. **Streams in flight** - the workstreams with an allocation covering
   this slot.
3. **Entering** - items whose allocation starts here.
4. **Continuing** - items whose span covers this slot and started earlier.
5. **Externally gated** - items with an `external_party_id`, and the
   `external_status` of each.
6. **Not in this sprint** - what a reader might expect and will not get,
   with the reason. This section is the one that prevents the summary
   being read as a promise.

## End of sprint

1. **Delivered** - `status` moved to `done`.
2. **Progressed** - the `progress` checkpoint moved, and to what.
3. **Blocked** - what, and by whom.
4. **Slipped** - which allocations moved, by how many slots, and why.
5. **Changed about the plan** - anything that altered the mapping itself.

## Turning a relayed summary into an optimised one

The owner's account arrives as bullets with status sub-bullets, at mixed
altitude, sometimes ahead of the board and sometimes behind it. The
procedure:

1. **Strip the status sub-bullets.** They are working notes, not content.
2. **Restructure** into a headline list plus one sentence per item.
3. **Reconcile every line against the board** and classify it:
   **corroborates**, **updates**, **contradicts**, or **new**.
4. **Apply** the corroborations and updates. Take anything new through
   docs/ROADMAP-INTAKE.md first - a relayed "add" is often an update to
   something already tracked.
5. **Raise the contradictions; never resolve them silently.** Where the
   account and the board disagree, the disagreement is the finding. Say
   which is which and leave it to the owner.

## Partial information

Write what is known. For the rest, write a `work_notes` row with
`kind = 'question'` anchored to the item. Never infer a status: a
plausible status is indistinguishable from a checked one once it is in
the field, and the summary is what people plan against.

## Storage and effects

The summary is a `work_documents` row with `kind = 'sprint'`, linked
`about` to each workstream it touches.

It may update: `status`, `progress` (to a checkpoint - the values are in
docs/SPRINTS.md), `work_item_sprints.slip_slots` and `external_status`.

It may never set `benefit_status = 'confirmed'` or a metric's
`confidence = 'owner_stated'`. Both mean the owner said so, in as many
words, and a summary is not that.

---

# Part C - Mapping the Now column across sprints

Run this whenever the Now column changes. It is deterministic enough
that a session with no memory of the last one should land in the same
place.

## Getting on and off the belt is automatic

A trigger on `work_items` - `work_items_sprint_intake`, in
`supabase/schema/37_sprint_delivery.sql` - keeps the conveyor-belt rule
true without anyone remembering to:

- **Joining.** A work item (`level = 'item'`) under a workstream gets a
  live allocation the moment it reaches Now, by whatever route: a
  promotion, its workstream moving, an insert, a re-parent or a
  re-level. It goes at the end of its own stream - sharing the last slot
  the stream reaches, `overlappable`, span 1 - or, when the stream is not
  on the plan yet, in the first slot after the last one in use.
  Appending never displaces work already placed.
- **Provisional until placed.** That allocation carries
  `placement = 'provisional'`, and the board marks it "Not yet placed"
  on both tabs. A mapping pass under the rules below confirms or moves it,
  with the reason in `note`:

      update work_item_sprints
         set slot = <n>, span = <n>, overlap = '<...>',
             placement = 'planned', note = '<why this slot>'
       where work_item_id = '<id>' and retired_at is null;

- **Leaving.** Demoted, dropped, or no longer a work item under a
  workstream: the live allocation retires with a `resolution` saying
  which. To undo a mistaken move, move the item back - it rejoins
  provisionally, and the retired row still holds the slot it had.
- **Done keeps its allocation**, as the record of the sprint the work was
  delivered in. The board's view already leaves it out.

A deliverable is never allocated; it is drawn as part of its item. A
change to a workstream alone is caught by the checks (Part D).

## The inputs

    select * from v_sprint_plan_items order by priority, slot;
    select * from v_sprint_plan_load;
    select * from sprint_plan;

`sprint_plan` holds the planning constants. Read them from there; they
are not restated in this file, and they are never rendered on any
surface.

## The rules, in order

1. **Eligible set**: `horizon = 'now'`, `status not in ('done','dropped')`.
2. **Order** by workstream `priority`, then item `priority`.
3. **Dependencies**: nothing starts before everything that `blocks` it has
   ended. `blocks` in `knowledge_links` is the only dependency mechanism
   - the old dependency table was dropped, and a second one would be two
   answers to one question.
4. **Capacity**: no slot carries more `exclusive` PXP-consuming items
   than `capacity_dev_equivalents`. `parallel` and `overlappable` work
   rides alongside and is not counted, and an allocation with an
   `external_party_id` consumes nothing at all.

   Read the cap as *substantial builds running at once*, never as *items
   per sprint*. A roadmap item is not a sprint of work for one person -
   most are a fraction of one, and several landing together is the
   ordinary case. Counting every item against the cap is what turns a
   fortnight of work into a quarter of plan, which is a drafting error,
   not a fact about the work.
5. **Concurrency**: streams in flight per slot stay between
   `min_concurrent_streams` and `max_concurrent_streams`. The bound is the
   owner's to set: lifting it is a decision, recorded as a `work_notes`
   `decision` with the owner's reason, never a way to make a mapping
   pass.

   Concurrency belongs to STREAMS, not to items. Two or three streams
   running side by side is the shape being aimed at; a stream's own items
   run in sequence behind each other, because the thing that starts an
   item is the one before it finishing. A later stream may wait for an
   earlier one to finish entirely - that is a legitimate and often
   preferable shape, and it reads far better than everything starting at
   once and nothing finishing.
6. **Overlap**: an `overlappable` item may share its first slot with the
   previous item's last, and its last with the next item's first. An
   `exclusive` item may not. A `parallel` item is unconstrained. Use the
   property for what it says: `exclusive` is for a substantial build that
   wants its own run, not a default.
7. **Span**: **one slot, unless the work itself argues otherwise.** That
   is the default and it should stay the common case. A longer span needs
   a reason you can name - an external party's pace, a decision that must
   land first, a genuinely large build - and `effort` is an input to that
   judgement, not a formula for it. Several items of one stream finishing
   inside one sprint is the expected outcome, not an optimistic one.

   The failure mode is padding: a span nobody can justify, multiplied
   across eighteen items, is a plan that tells a reader the work is
   impossible. If you cannot say why an item needs a second sprint, it
   does not need one.
8. **Externally-gated work** is allocated where it is expected regardless
   of capacity, marked external, and the widening around it is sized to
   absorb it. Done properly, a slip **tightens** the plan rather than
   stretching it, because the capacity held for it is released to the
   streams either side.

## Checking the result

    select * from v_sprint_plan_load;
    select * from v_sprint_plan_checks;

`over_capacity` or `over_concurrency` true on any row means the mapping
is wrong, not that the bound is. Fix the mapping. The checks view lists
everything else the plan still needs (Part D); after a mapping pass it
should hold no `fix` rows.

## Re-mapping when the belt shifts

1. Retire the affected allocations - set `retired_at` and a `resolution`.
   They are never deleted; the reason a slot changed is the part a later
   reader needs. An item still in Now is off the plan from that moment
   until step 2 gives it a new allocation.
2. Re-run the rules above.
3. Record the delta as a `work_notes` `decision`. A re-map is a decision,
   not a refresh.
4. Bring the Now column into the new order (Part D).

## Slippage

An external party moving is `slip_slots`, not a re-map. The allocation
and its `blocks` dependents move; nothing else does. Re-map only when the
slip breaks a dependency or empties a slot.

## Durations

Sprint spans are the only unit that appears anywhere a person reads:
"Sprints 1 to 3", as the board prints it. No day counts, no hour counts, no
developer-days, no velocity - not on a bar, not in a tooltip, not in a
drawer, not in an export, not in a sprint summary. The planning constants
exist to produce the mapping, not to be published with it.

---

# Part D - Keeping the two roadmaps in one order

The Sprint Roadmap orders streams by the sprint they start in, and a
stream's items by sprint, then sequence. That order is the master. The
Product Roadmap's Now column follows it, so the board a stakeholder sees
and the column the owner plans from never list the same work in two
orders.

- `v_sprint_plan_order` states the order once, as a rank in gaps of 10.
- `select sprint_plan_sync_order();` writes that rank onto `priority`
  and `sort_order` for every row on the plan and returns how many rows
  changed. Rows off the plan are never touched. Run it after any re-map,
  and whenever the checks below show an `order` row.
- Before running it, read the order as it stands:

      select level, title, priority, sort_order, sprint_rank
        from v_sprint_plan_order order by workstream_id, sprint_rank;

  and record the before and after in one `work_notes` `decision`. That
  note is the undo.
- Do not hand-edit `priority` on a row that is on the plan. Change the
  plan - its slot or sequence - and sync. The sprint decides the order.

The roadmap page's Now band orders by priority (docs/ROADMAP.md,
Layouts), so after a sync it reads in sprint order.

## Before a sprint

    select * from v_sprint_plan_checks;

One row per finding, worst first. The severity says who answers it:

- **fix** - corrected before anything is drafted, and raised rather
  than patched silently: `order`, the rows off the belt (`unplaced`,
  `stream_empty`, `stream_not_now`, `not_an_item`), `dependency`,
  `thin` and `load`.
- **confirm** - the owner says so, in as many words: a slot the intake
  trigger chose (`placement`), stories drafted and not yet confirmed
  (`stories_drafted`).
- **write** - stories not yet written (`stories_missing`).

A plan ready for its sprint shows no `fix` and no `confirm` rows.
