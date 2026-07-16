# Roadmap process

How the roadmap is structured and grown over time. The roadmap is data
in Supabase, rendered by modules/roadmap/ and edited in the database (no
code change, no deploy). This file is the repeatable process and the
context repository for it; docs/ROADMAP.md covers the data model and the
Supabase working queries.

## The two-level taxonomy

Work is grouped as **themes over areas**:

- **Themes** (`roadmap_categories`) are the top-level workstreams the
  C-suite reads. There are 13: Core LaunchPad, Unity, Overhaul,
  Integrations, Screening/Contracting/Fulfilment, Partners & PFAC,
  Acquiring, APIs, Insights & Reporting, Automation & Approvals,
  Sales & Commercial, Admin & Operations, Products & Pricing.
- **Areas** (`work_areas`, `scope='product'`) are the finer development
  areas beneath a theme (`work_areas.category_id`), shared with the
  backlog and platform modules.
- A **roadmap item**'s own `category_id` is authoritative for where it
  renders; an area may feed more than one theme, and an item with no
  theme (e.g. US Market) renders as a standalone card.

Keep the theme set small and stable. A genuinely new workstream earns a
theme; most new work is an item under an existing theme, or a backlog
entry until it firms up. Add a theme by inserting a `roadmap_categories`
row and a matching `--rm-<key>` token pair + `.rm-cat-<key>` rule
(otherwise it renders in a neutral tint).

## Levels and layouts

One dataset, two independent controls. The **level** chooses the
audience/content; the **layout** chooses how it is drawn.

Levels: **Executive** (curated - Delivered plus `audience='exec'` items
and standalone bets; prints as the C-suite one-pager), **Team** (every
product item), **Backlog** (open feeder), **Parked** (de-scoped, reasoning
kept).

Layouts:

- **Timeline** (default) - a continuous Delivered | Now | Next | Later
  axis where each bar spans from its start band (`horizon`) through the
  band it runs across (`end_horizon`), so long activities visibly spill
  onward. Rows order by start band, then span length, then priority.
- **Cascade** - the same work as stacked stage bands; a spanning item
  appears under each band it covers.

An activity that is "current and next" is `horizon='now'`,
`end_horizon='next'`. Backlog and parked items carry `horizon`/
`end_horizon` too, so the whole list from idea to delivered lives on the
one timeline and can be re-ordered there.

## Audience: what the C-suite sees

`roadmap_items.audience` is the altitude axis:

- `exec` - also surfaces in the Executive view. Reserve it for delivered
  buckets and headline in-focus items; a handful per view, no specifics.
- `team` (default) - the full developer detail; hidden from Executive.

To hide an item from the C-suite, set `audience='team'`. To promote a
headline, set `audience='exec'`. It is one dataset filtered, never a copy.

## How work enters and moves

1. **Capture** everything supplied in chat per docs/WORKFLOW.md:
   verbatim to `work_documents`, distilled to `work_notes`, actionable to
   `backlog_items`. Nothing is lost.
2. **Promote** a backlog item to the roadmap by inserting a
   `roadmap_items` row (area, theme, status, horizon, priority) and
   linking the backlog item via `roadmap_item_id`.
3. **Prioritise** by editing `priority` (leave gaps of 10 so items slot
   between) and moving `horizon` (someday -> later -> next -> now) on
   evidence. Now stays sacred: three to five items.
4. **Deliver** by setting `status='done'`; it joins the Delivered
   buckets. **Park** by dropping the backlog item with a `resolution`
   sentence, so a decision is never lost.
5. **Record the reasoning** as a `work_notes` decision so movement never
   becomes informal drift.

## The refinement ritual

Roadmap refinement is done as a wave-by-wave conversation: the owner and
Claude work through clickable multiple-choice questions in waves, each
wave resolving one structural fork (taxonomy, audience, delivered,
views), then the agreed structure is applied as database edits and, where
the shape of the views changes, a repo change. The July 2026 refinement
(`work_documents`, kind `discussion`) is the worked template.

Cadence: revisit priorities and horizons each cycle; re-confirm the theme
set and the Executive audience selection when the portfolio shifts.
