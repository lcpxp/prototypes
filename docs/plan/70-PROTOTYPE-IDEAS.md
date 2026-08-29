# Prototype ideas and plans

**BUILT 2026-08-13.** Schema, board, gallery strip, protocol and
command all landed. What the build changed is at the end.

The prototypes module holds five registered prototypes and a
fourteen-row "Future prototypes" strip. The strip is the right idea
with three columns: `name`, `note`, `sort_order`. There is no way to
say how important an idea is, what it would prove, what it would
contain, whether it has been shortlisted, or what happened to it.

This workstream turns that strip into a place to think: capture an
idea in one line during any session, review the list, prioritise it,
write a plan against it, and promote the ones worth building into
prototypes that are accurate because they were built from recorded
knowledge rather than from memory.

## What exists

- `prototypes` - `title`, `description`, `path`, `status`
  (draft/live/deprecated), `tags`. Five rows, driving the gallery, the
  dashboard count and global search. Pages live under
  `modules/prototypes/`.
- `future_prototypes` - `name`, `note`, `sort_order`. Fourteen rows,
  rendered as a plain table under a "Future prototypes" heading by
  `assets/js/pages/gallery.js`, with `App.futurePrototypesTable` as a
  pure builder and a unit benchmark already in place.

Keep the table name. `future_prototypes` is accurate - these are
prototypes intended and not yet built - and renaming it would touch
the registry, the gallery, its test and the snapshot for no reader
benefit. The columns change; the name does not.

## The columns to add

One migration, with `supabase/schema/20_portal.sql` and the snapshot
in the same commit.

    alter table public.future_prototypes
      add column summary text,
      add column status text not null default 'idea'
        check (status in ('idea', 'shortlisted', 'planned',
                          'building', 'promoted', 'dropped')),
      add column priority integer not null default 100,
      add column effort text check (effort in ('small','medium','large')),
      add column value_note text,
      add column area_id uuid references public.work_areas (id)
        on delete set null,
      add column blocks jsonb not null default '[]'::jsonb,
      add column tags text[] not null default '{}',
      add column requested_by text,
      add column promoted_prototype_id uuid
        references public.prototypes (id) on delete set null,
      add column resolution text,
      add column resolved_at timestamptz;

Each column earning its place:

- **`summary`** - one line, so the list reads without opening
  anything. `note` stays as the longer thought, unchanged, so the
  fourteen existing rows keep their content and lose nothing.
- **`status`** - the lifecycle. `idea` is the inbox; `shortlisted`
  means it survived a review pass; `planned` means it has a plan
  written; `building` means a page exists but is not registered;
  `promoted` means it is a real `prototypes` row; `dropped` closes it
  with a reason.
- **`priority`** and **`effort`** - what a prioritisation pass
  produces. Priority mirrors `work_items.priority`: an integer, banded
  by tens, so the same reading applies.
- **`value_note`** - what building it would prove or unblock. The
  single most useful field, and the one that stops a list of fourteen
  becoming a list of forty nobody triages.
- **`area_id`** - the shared taxonomy, so an idea files against the
  same areas as roadmap work and platform capability. Fourteen
  unfiled ideas cannot be read against anything.
- **`blocks`** - the plan, as typed blocks rendered by the shared
  renderer from 40-SURFACING.md: screens, data needed, scope, out of
  scope, open questions, built-from. New kinds of plan content need no
  schema change and cannot be dropped silently.
- **`promoted_prototype_id`**, **`resolution`**, **`resolved_at`** -
  the undo. An idea closes with a status, a reason and a back-link,
  exactly as CLAUDE.md requires of rows. Nothing is deleted.

A trigger stamps `resolved_at` when status moves to `promoted` or
`dropped`, mirroring `set_work_item_resolution` in
`supabase/schema/30_work.sql`. Policies: browser reads behind the
`prototypes` grant; writes are separate insert/update policies for the
service connection only. RLS is already enabled on the table and the
new columns inherit it.

## Two link entity types

    insert into link_entity_types (key, table_name, label, sort_order)
    values ('prototype', 'prototypes', 'Prototype', 110),
           ('prototype_idea', 'future_prototypes', 'Prototype idea', 120);

With those, an idea or a prototype joins the graph:

| Link | Reading |
|---|---|
| prototype_idea → work_item | `relates_to` - the roadmap work this would inform |
| prototype_idea → capability | `about` - the capability being prototyped |
| prototype → capability | `about` - what this prototype demonstrates |
| prototype → endpoint | `relates_to` - the API surface it mocks |
| prototype_idea → prototype_idea | `duplicate_of`, `part_of` - the list deduplicates itself |

## The pages

**`modules/prototypes/index.html`** keeps the gallery and keeps a
short "Ideas and plans" strip - the top five by priority, with a count
and a link through. The strip stays because the gallery is where
someone lands, and an idea list nobody sees is the burying problem
again.

**`modules/prototypes/ideas.html`** is the board. Grouped by status
with `shortlisted` and `planned` leading, filterable by area, effort
and tag. Each row: priority band, title, summary, area, effort, and
counts of links out. Opening one gives the five-zone panel from
40-SURFACING.md - identity, narrative, facts, structure (the plan
blocks), context (links, and the prototype it became).

Page module split, to stay inside budget and keep builders testable:
`assets/js/pages/ideas/ideas.js` for fetch and wiring,
`assets/js/pages/ideas/render.js` for pure builders, with unit
benchmarks alongside `tests/unit/gallery-future.test.js`.

## Capture and review

**Capture is one line, at any moment.** `/prototype-idea "<name>" -
<one line of why>`. It writes a row at `idea` status with `note` and
`requested_by`, does the duplicate lookup docs/ROADMAP-INTAKE.md
requires against existing ideas *and* existing prototypes, and reports
back what it found. Nothing else - a capture that demands a plan is a
capture that does not happen.

**Review is a pass, not a ritual.** Run it when the inbox is worth
sorting. For each `idea` row: shortlist it with a priority and an
effort, or drop it with a reason. For each `shortlisted` row: write
the plan blocks, or leave it shortlisted. The pass ends with a
one-line statement of what changed.

**Promotion builds the prototype.** When an idea is picked up:

1. Create the page under `modules/prototypes/`, following the script
   include order in CLAUDE.md.
2. Insert the `prototypes` registry row.
3. Set the idea's `status = 'promoted'`, `promoted_prototype_id`, and
   a `resolution` line.
4. Write the links: prototype → the capabilities it demonstrates,
   prototype → the endpoints it mocks.

## Accuracy - the point of doing this after the knowledge load

The owner's ask is for prototypes that are "properly aligned and
accurate". That is not a matter of care; it is a matter of having
something to be accurate *to*. After 30-KNOWLEDGE.md lands, a
prototype has three sources it can be built from without guessing:

- the **styling rows** - the LaunchPad design system as fifteen
  recorded facts, enough to build a screen that looks right without
  opening the LaunchPad repository;
- the **capabilities** - what the platform actually does, graded, so a
  prototype does not invent behaviour;
- the **reference** - the endpoints, their parameters and their
  response shapes, so mock data has the right fields with the right
  names.

Make that explicit rather than hoping for it. Every plan carries a
**built-from** block naming the capability keys, styling row keys and
endpoint ids it draws on, and the promotion step writes those as
links. Two things follow:

- A prototype's panel can show what it was built from, so a reader
  knows whether to trust it.
- When a capability changes or an endpoint is corrected, the link
  graph names every prototype now out of date. That is the drift
  signal, and it costs nothing once the links exist.

Add a line to the platform page's Coverage panel: prototypes with no
built-from links. A prototype nobody can trace is a prototype nobody
should trust.

## Backfill

The fourteen existing rows need one pass: a summary, an area, a value
note, a priority and a status. Half an hour of work, and it turns a
list into something reviewable. Do it as part of the first review
pass, not as a separate exercise, and record any that are already
obsolete as `dropped` with the reason rather than deleting them.

## Done when

- An idea can be captured in one line, mid-conversation, without
  breaking the conversation.
- The list can be prioritised and read against areas, effort and
  value.
- A plan lives against an idea in typed blocks that render without a
  code change.
- Promotion creates the prototype, links it, and closes the idea with
  a resolution and a back-link.
- Every prototype records what it was built from, and the platform
  Coverage panel names the ones that do not.

## What landed, 2026-08-13

Everything above except the backfill and the Coverage-panel line.

- **Schema** (migration `20260813234500`): the twelve columns, with
  two constraints the plan implied and the database now enforces - a
  `promoted` idea must name its prototype, a `dropped` one must carry
  a resolution. `resolved_at` is stamped by a trigger and cleared when
  an idea reopens, so the date always means "closed on".
- **The gallery strip changed shape.** The plan said keep a short
  strip; the old builder rendered every row as a two-column table.
  Fourteen rows on the page somebody lands on was the burying problem
  in miniature, so the strip is now the top five by priority with an
  honest "N open ideas in all" and a link through.
- **`linkEntities` gained a `page` field.** An anchored entity used to
  be assumed to live on its module's `index.html`; the ideas board is
  `ideas.html`. The gate that checks an anchor is reachable now looks
  at the named page, which is what caught this.
- **`prototype` is routed, not anchored.** A prototype has a page of
  its own, so `App.itemHref` builds its whole address - the same case
  as `work_item`, and the anchor gate now names both rather than
  special-casing one.

Left, and both are the owner's rather than a session's:

- **The backfill.** The fourteen rows carry a name and nothing else. A
  summary, an area, a value note and a priority are judgements, not
  facts that can be derived, so inventing them would be exactly the
  inference-written-as-fact this programme keeps refusing. They are
  the first review pass.
- **The Coverage-panel line** for prototypes with no built-from links.
  It should wait until at least one prototype has them, or it will
  read as a five-item defect list on the day it ships.
