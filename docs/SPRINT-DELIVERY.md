# Sprint delivery

What happens to a work item once it reaches the Now column: how it
becomes a DevOps package a developer can pick up, how a sprint is
summarised at each end, and how the whole Now column is mapped across
sprints.

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

Allocation is always **relative**: `slot` 0 is Sprint +0. A real sprint
code exists only once `sprint_plan.anchor_sprint` is set, which is a
single deliberate act:

    update sprint_plan set anchor_sprint = '<YY-NN>' where key = 'default';
    select sprint_plan_project();

Until then every surface says Sprint +N, and nothing invents a date.

---

# Part A - Now to a DevOps package

## When

An item reaches `horizon = 'now'` and takes an allocation. That is the
trigger, and it is the only one: an item still at Next is not ready to
be provisioned, and an allocated item with no package is work nobody can
start.

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
| `work_item_sprints` | the sprint, the span, and whether an external party gates it |

**Acceptance criteria already recorded in `details` are lifted verbatim.**
Where a row carries dated criteria that someone agreed, re-deriving them
loses the agreement, which was the valuable part. Write new criteria only
where none exist.

## The package

One roadmap item becomes one DevOps **parent**, with user stories as its
children. This is the only place developer-ready decomposition is
allowed - the roadmap itself stays high level, and an item that has been
broken into tasks on the board has been broken in the wrong place.

Fields, in the shape the existing backlog exports use:

    Parent            the DevOps parent, or blank for the parent itself
    Title             imperative and specific
    State             New
    Effort            blank unless the team has sized it
    Iteration Path    <TeamProject>\Sprint <YY-NN>
    Team Project      the DevOps project
    Dependencies      the DevOps ids of anything that blocks it

Generate titles rather than retyping them: the exports already in
`work_documents` carry typos that survived into the sprint because
someone typed each line.

## User stories

    As a <role>, I want <behaviour>, so that <outcome>.

- **Role** comes from the benefit field the value sits in - the staff
  audience, the partner's staff, or the merchant. docs/VALUE-CAPTURE.md
  already requires every granular line to carry a role and a behaviour,
  precisely because this is what they become.
- **Behaviour** comes from the benefit sentence.
- **Outcome** comes from the metric, stated as the thing that stops
  happening. Never state a duration or a capacity figure (see Part C).

## Acceptance criteria

Observable conditions, never implementation. Each one is something a
tester can check without reading the code. Where the item names a
failure that fires today, one criterion is that it stops firing.

## Keeping the two associated

Write the DevOps id back to `work_items.external_ref` - the column
already exists, already renders in the drawer as "External ref", and
docs/WORKFLOW.md already names it as the home for a ticket reference. Do
not invent a second field.

Record the packaging as a `work_notes` row with `kind = 'decision'`.

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
4. **Apply** the corroborations and updates. Take anything genuinely new
   through docs/ROADMAP-INTAKE.md before it becomes a row - a relayed
   line is exactly the kind of "add" that is really an update to
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
   `min_concurrent_streams` and `max_concurrent_streams`.

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

`over_capacity` or `over_concurrency` true on any row means the mapping
is wrong, not that the bound is. Fix the mapping.

## Re-mapping when the belt shifts

1. Retire the affected allocations - set `retired_at` and a `resolution`.
   They are never deleted; the reason a slot changed is the part a later
   reader needs.
2. Re-run the rules above.
3. Record the delta as a `work_notes` `decision`. A re-map is a decision,
   not a refresh.

## Slippage

An external party moving is `slip_slots`, not a re-map. The allocation
and its `blocks` dependents move; nothing else does. Re-map only when the
slip breaks a dependency or empties a slot.

## Durations

Sprint spans are the only unit that appears anywhere a person reads:
"spans Sprint +0 to Sprint +2". No day counts, no hour counts, no
developer-days, no velocity - not on a bar, not in a tooltip, not in a
drawer, not in an export, not in a sprint summary. The planning constants
exist to produce the mapping, not to be published with it.
