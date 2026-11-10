# Estimation

How work on the Sprint Roadmap is sized, and what a sprint holds. The
one home for the scale, the optimism rule and the capacity routine.

Public repo, so this file is **process only**: no capacity figure, no
team size, no item. The numbers live in `sprint_plan` and on the
stories themselves.

Estimates have been allowed since 10 Nov 2026. Before that the plan
carried sprint spans and nothing else; docs/SPRINT-DELIVERY.md Part C
says what still never reaches a stakeholder's view.

## What is sized

**A story.** A story is the unit a developer delivers and the owner
tests, and it is the unit Azure DevOps holds (docs/DEVOPS.md), so it is
the unit that carries the number. Each `user_stories[n]` holds:

| Key | Meaning |
| --- | --- |
| `points` | The published estimate. |
| `points_low`, `points_high` | The defensible range behind it. |

An **item's** points are the sum of its stories' points. That sum is
taken in one place, `work_item_points()`, and the views carry it
(`v_sprint_plan_items.points`). `work_items.estimate_drivers` records
why: the drivers below and anything specific to the item.
`work_items.effort` - small, medium, large - stays as the roadmap's
coarse size for work that has no stories yet.

Only **developer work** is sized: an allocation that is neither
external nor `parallel`. Discovery and decisions the owner runs consume
no points.

## The scale

Fibonacci: **1, 2, 3, 5, 8**. Anything bigger is split into stories
that each fit. `v_sprint_plan_checks` reports a story with no points, or
with points off the scale, as `estimate_missing`.

The scale is anchored, not abstract. Four to six well-understood
delivered backlog items, one or two at each value, are kept as a
`work_notes` `fact` tagged `estimation-anchor`; a new estimate is made
by comparison with them. Refresh the anchors when the team or the way
it works changes.

## Drivers

Read the code first (docs/SPRINT-DELIVERY.md Part A, technical notes).
Then weigh:

- **layers touched** - API, portal, database, an integration;
- **the number of code areas** the change reaches;
- **new code or a change** to code that exists and is understood;
- **external dependency or waiting** - another team, a third party;
- **test surface** - what has to be proved, and what could regress;
- **unknowns** - anything the review could not settle.

Produce a range - low, likely, high - for the person doing the work
with the tools they actually use.

## The optimism rule

Publish the **low end**: the scale value at, or just above, the
defensible floor of the range. Someone sizing the same story
independently should find the published number at the very bottom of
their own range, never below it. If the honest low end looks
implausibly small, use the next value up.

Never pad. A padded estimate multiplied across a plan tells a reader
the work is impossible; an optimistic one that slips is corrected by
the next recalibration.

## Where the numbers go

- The range and the drivers stay in LPio, on owner surfaces.
- Only each story's points go to Azure DevOps, as Effort.
- Stakeholder views show sprints, never points.

## Capacity

`sprint_plan.capacity_points` is what one sprint holds.
`sprint_plan.capacity_overrides` holds a different figure for a sprint
that is not a full one - a short sprint over public holidays - keyed by
sprint code. `v_sprint_plan_load` sums planned points against it per
sprint; an item spanning several sprints spreads its points evenly.

After every sprint, at the close (docs/SPRINT-DELIVERY.md Part B):

1. Read the points actually delivered from the sprint read-back.
2. Set `capacity_points` from recent actuals, not from hope.
3. Record the old and new figure in a `decision` note. That note is the
   undo.

Each sprint also carries a short, ordered **pull-forward list**: the
next ready stories beyond its capacity, so a sprint that goes faster
than planned never stalls waiting for a plan.
