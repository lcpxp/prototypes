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
- A **work item**'s own `category_id` is authoritative for where it
  renders; when unset it inherits its area's theme. An area may feed
  more than one theme, and an item with no theme renders under General.

Keep the theme set small and stable. A genuinely new workstream earns a
theme; most new work is an item under an existing theme, or a backlog
entry until it firms up. Add a theme by inserting a `roadmap_categories`
row and a matching `--rm-<key>` token pair + `.rm-cat-<key>` rule
(otherwise it renders in a neutral tint).

## Levels and layouts

One dataset (`work_items`), two independent controls. The **level**
chooses the altitude/content; the **layout** chooses how it is drawn.

Levels:

- **Executive** - a theme rollup of active work: one lane per theme, no
  item titles, so it stays a high-level overview. Every theme with
  active work appears automatically, so it is always complete and cannot
  drift. Prints as the C-suite one-pager.
- **Team** - the same active work at item level (every product item on
  the now/next/later horizons, plus delivered when shown).
- **Backlog** - the full list: active, parked (far-future) and
  delivered, on one axis, with the Parked column shown.

Layouts:

- **Timeline** (default) - a continuous Delivered | Now | Next | Later |
  Parked axis where each bar spans from its start band (`horizon`)
  through the band it runs across (`end_horizon`), so long activities
  visibly spill onward. Rows order by start band, then span length, then
  priority. Team and Executive show up to Later; Backlog adds Parked.
- **Cascade** - the same work as stacked stage bands; a spanning item
  appears under each band it covers.

An activity that is "current and next" is `horizon='now'`,
`end_horizon='next'`. Every item - active, parked or delivered - carries
`horizon`/`end_horizon`, so the whole list from idea to delivered lives
on the one timeline and can be re-ordered there.

## What the C-suite sees

The Executive view needs no per-item tagging. It rolls **active** work
(horizon now/next/later) up by theme and shows every theme that has any,
so it is complete by construction - a curated list silently dropping an
item cannot happen. To keep work off the executive rollup, park it
(`horizon='someday'`) or deliver it (`status='done'`); to raise a
theme's profile, give it active work. It is one dataset projected, never
a copy.

## How work enters and moves

1. **Capture** everything supplied in chat per docs/WORKFLOW.md:
   verbatim to `work_documents`, distilled to `work_notes`, actionable
   to `work_items` (horizon defaults to `someday` - an unscheduled
   candidate). Nothing is lost.
2. **Schedule** a candidate onto the roadmap by setting its `horizon` to
   `later`, `next` or `now`, with a `category_id` (or an area whose
   theme it should inherit) so it lands in the right lane. No copy.
3. **Prioritise** by editing `priority` (leave gaps of 10 so items slot
   between) and moving `horizon` (someday -> later -> next -> now) on
   evidence. Now stays sacred: three to five items.
4. **Deliver** by setting `status='done'`; it joins the Delivered zone.
   **Park** by setting `horizon='someday'` (or `status='dropped'`) with a
   `resolution` sentence, so a decision is never lost.
5. **Record the reasoning** as a `work_notes` decision so movement never
   becomes informal drift.

## Optional delivery detail (PXP alignment)

Beyond placement, an item can carry light-touch delivery detail for the
KPI-portal alignment - all optional and never shown on the board except
dates:

- **Progress**: a coarse `progress` (0-100) rendered as a subtle bar,
  moved by conversation (docs/SPRINTS.md), not precise tracking.
- **Sprints**: `start_sprint` / `end_sprint` codes (e.g. `26-16`) held
  alongside the horizon band. Talk in sprints and the ruleset in
  docs/SPRINTS.md translates to bands.
- **Statuses**: `prd_status` and `project_status`, the KPI portal's own
  pickers, distinct from the internal `status` lifecycle.
- **Phases**: `work_item_phases` rows (Discovery, Build, Certification,
  Launch), each with a quarter, dates and per-date TBC flags.
- **Attributes**: a jsonb bag (team, vertical, customer, region,
  resources, cost, merchant/PXP value, blockers, PRD link) held for
  record and the JSON export only.

The detail drawer shows all of it; the toolbar **Export JSON** emits the
KPI-portal-ready output, and the drawer's per-item Export JSON does the
same for one item.

## The refinement ritual

Roadmap refinement is done as a wave-by-wave conversation: the owner and
Claude work through clickable multiple-choice questions in waves, each
wave resolving one structural fork (taxonomy, horizons, delivered,
views), then the agreed structure is applied as database edits and, where
the shape of the views changes, a repo change. The July 2026 refinement
(`work_documents`, kind `discussion`) is the worked template.

Cadence: revisit priorities and horizons each cycle; re-confirm the theme
set when the portfolio shifts.
