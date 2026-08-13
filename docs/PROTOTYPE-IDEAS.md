# Prototype ideas and plans

How an idea for a prototype is captured, prioritised, planned and
promoted. The `/prototype-idea` command wraps the capture half.
Schema: `future_prototypes` in `supabase/schema/20_portal.sql`. Pages:
`modules/prototypes/ideas.html`, with a strip on the gallery.

The table keeps its name. These are prototypes intended and not yet
built, which is what `future_prototypes` says.

## Capture is one line

    /prototype-idea "<name>" - <one line of why>

That writes a row at `idea` status with the line in `note` and
`requested_by` set. **Nothing else is required.** A capture that
demands a plan is a capture that does not happen, and the whole value
of this is that an idea can be recorded mid-conversation without
breaking the conversation.

Before writing, look for a duplicate the way docs/ROADMAP-INTAKE.md
requires - against existing ideas **and** against existing prototypes,
because "we already built that" is the most useful thing a capture can
report back.

## The lifecycle

| `status` | Means |
|---|---|
| `idea` | The inbox. Captured, not yet sorted |
| `shortlisted` | Survived a review pass. Has a priority and an effort |
| `planned` | Has plan blocks written against it |
| `building` | A page exists; no `prototypes` row yet |
| `promoted` | It is a real prototype. `promoted_prototype_id` set |
| `dropped` | Closed with a reason, kept |

Nothing is ever deleted. The database refuses a `promoted` row with no
prototype and a `dropped` row with no resolution, so "closed with a
reason and an undo" is a constraint rather than a convention.

## Review is a pass, not a ritual

Run it when the inbox is worth sorting. For each `idea` row: shortlist
it with a priority and an effort, or drop it with a reason. For each
`shortlisted` row: write the plan blocks, or leave it shortlisted. End
with one line saying what changed.

`priority` is banded by tens, the same reading `work_items.priority`
uses, so P1 means the same thing on both boards.

**`value_note` is the field that matters.** What building it would
prove or unblock. It is what stops a list of fourteen becoming a list
of forty nobody triages, and it is the one field worth insisting on at
shortlist time.

## The plan lives in `blocks`

Typed blocks, drawn by the shared renderer
(`assets/js/core/blocks.js`), so a new kind of plan content needs no
schema change and cannot be silently dropped. The blocks worth writing:

- **Screens** - what the prototype shows, as a `values` or `kv` block.
- **Data needed** - the fields and where their shapes come from.
- **Scope** and **out of scope** - the second is the more useful.
- **Open questions** - anything the plan is guessing at.
- **Built from** - see below. Write this one every time.

## Built from: why this comes after the knowledge load

A prototype is accurate when there is something to be accurate *to*.
Three sources exist now and none of them require opening the LaunchPad
repository:

- the **styling rows** (`product_capabilities`, kind `styling`) - the
  design system as recorded facts, enough to build a screen that looks
  right;
- the **capabilities** - what the platform actually does, graded, so a
  prototype does not invent behaviour;
- the **reference** - endpoints, parameters and response shapes, so
  mock data carries the right fields with the right names.

Every plan carries a **built-from** block naming the capability keys,
styling row keys and endpoint ids it draws on, and promotion writes
those as `knowledge_links`. Two things follow, and both are the point:

- a prototype's panel can show what it was built from, so a reader
  knows whether to trust it;
- when a capability changes or an endpoint is corrected, the graph
  names every prototype now out of date. That is the drift signal, and
  it costs nothing once the links exist.

## Promotion builds the prototype

1. Create the page under `modules/prototypes/`, following the script
   include order in CLAUDE.md.
2. Insert the `prototypes` registry row.
3. Set the idea's `status = 'promoted'`, `promoted_prototype_id` and a
   `resolution` line.
4. Write the links: `prototype -> capability` (`about`) for what it
   demonstrates, `prototype -> endpoint` (`relates_to`) for the API it
   mocks.

## Operations

**Capture**

    insert into future_prototypes (name, note, requested_by)
    values ('<name>', '<one line of why>', '<who>')
    returning id;

**Shortlist**

    update future_prototypes
    set status = 'shortlisted', priority = <band * 10>, effort = '<small|medium|large>',
        summary = '<one line>', value_note = '<what it would prove>',
        area_id = (select id from work_areas where key = '<area key>')
    where id = '<idea id>';

**Write the plan**

    update future_prototypes
    set status = 'planned', blocks = '[...]'::jsonb
    where id = '<idea id>';

Run the block check in docs/PLATFORM.md afterwards: a typed block with
the wrong key name renders an empty shell and raises no error.

**Promote**

    update future_prototypes
    set status = 'promoted', promoted_prototype_id = '<prototype id>',
        resolution = '<what was built, and where>'
    where id = '<idea id>';

`resolved_at` is stamped by a trigger; do not set it by hand.

**Drop** - the resolution is required by the schema

    update future_prototypes
    set status = 'dropped', resolution = '<why this is not worth building>'
    where id = '<idea id>';

## The backfill

The fourteen rows that predate this carry a name and nothing else.
They need a summary, an area, a value note, a priority and a status -
and those are judgements, not facts that can be derived, so they are
the owner's to make in the first review pass. Anything already
obsolete is `dropped` with the reason, never deleted.
