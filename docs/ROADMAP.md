# Roadmap

Future direction for the hub, plus the working guide for the roadmap
board. Coarse, repo-level direction lives here; the live, prioritised
roadmap is data in Supabase, rendered by modules/roadmap/ and edited
in the database (no code change, no deploy).

## Primary focus

- Prototype development with Claude Code, from small pieces of
  functionality to full like-for-like portal replicas with new
  features.
- API reference material hosted online, maintained in Supabase.

## Planned modules and features

- Roadmap management, with variants: non-dated, high level, focused,
  broad, detailed with swimlanes. Exportable snapshots as PDF-style
  documents (the board's Download PDF action prints a condensed A4
  landscape one-pager).
- Sprint planning workspace in the style of a lightweight Notion
  board, plus imports and summaries from DevOps sprint data.
- Downloadable reference material alongside the API viewer.
- Dashboards and insights: overview and ordering.
- An LLM-backed ask feature over the hub's own material.
- A structured data repository for future plans, PRDs and intents.

All of it remotely hosted and securely accessible from anywhere, with
content in Supabase rather than in this public repo.

## The roadmap board and its data

modules/roadmap/ renders a lane x horizon grid from the roadmap
tables. The grid is not stored; every cell derives from an item's own
fields, so moving an item is a plain field edit:

- Rows are the roadmap_categories lanes (one per theme).
- Columns are the horizon: Now, Next and Later, where Later absorbs
  both horizon 'later' and horizon 'someday'.
- Density decays left to right: Now cards carry a summary and a state
  label, Next cards a clamped one-line summary, Later items are
  title-only chips.
- Delivered (roadmap_items.status = 'done') leaves the grid and
  collapses into a "Delivered - N" disclosure below it; it prints
  expanded. History earns a count, not board real estate.
- Empty lane x column cells render blank; the whitespace is itself
  information (nothing planned there).

The board renders product scope only. Portal work (the hub's own
development, work_areas.scope = 'portal') is tracked in the backlog and
does not appear on the roadmap. There is no scope toggle; the page
hard-filters to product.

Download PDF (or Ctrl+P) prints a condensed A4 landscape one-pager:
summaries drop, cards become one-line entries, lane colour and the
legend survive. Chrome, Edge and Firefox preselect landscape; Safari
ignores the size hint, so a print-only line reminds the reader to pick
landscape by hand. A "Data as of <date>" line (max updated_at across
items) dates every export.

Tables (all under supabase/schema/30_work.sql, RLS in policies.sql):

- work_areas: the shared taxonomy. scope 'product' is the LaunchPad
  product roadmap; scope 'portal' is the hub's own development. The
  roadmap reads product only; the scope column still serves the
  backlog and platform modules.
- roadmap_categories: the themed colour lanes (Unity, API,
  Self-Service, Insights, Operational, Auto-Approval). key, label,
  description, sort_order. Colour per key lives in tokens.css
  (.rm-cat-<key> plus --rm-<key> tokens); a new category with no
  token renders in a neutral tint until one is added. Items with no
  category collapse into a final "General" lane.
- roadmap_items: the work. Beyond the columns above, category_id
  points at a lane, horizon places the item in a column, and
  presentation supplies the Now card's state label:
  - sequenced: a plain item (no state label).
  - current: the single current-focus item.
  - ongoing: runs continuously.
  - wind: wrapping up.
  - bridge: points to the next horizon.
  The state label shows on Now cards only; Next, Later and delivered
  items ignore presentation.
- roadmap_milestones, roadmap_dependencies: named targets and
  item-to-item ordering, for future timeline and waterfall views.

## Working the board: Now-Next-Later discipline

The format only stays trustworthy if the data is worked this way:

- Now stays sacred: three to five items maximum. Now represents
  actual capacity, not aspiration; a long Now column is weak
  prioritisation, and the whole board should read in a scroll or two.
- Detail decays by column: Now items are spec'd solutions with
  summaries, Next items are validated problems, Later items are
  one-line bets. Do not write Now-grade summaries for Later rows.
- Movement is intentional: promote Later to Next to Now on evidence,
  demote when confidence drops, and record the reasoning as a
  work_notes row so movement never becomes informal drift.

## Working the roadmap with an AI assistant (Supabase access)

The point of holding the roadmap in Supabase is that any Claude chat
with Supabase access (project ref zlmkofbkobmhnslfnqsf) can read and
overhaul it without touching the repo. A cold session should:

1. Read the current roadmap in one query, in board order:

       select wa.scope, rc.key as lane, ri.presentation,
              ri.status, ri.horizon, ri.priority, ri.title, ri.summary
       from roadmap_items ri
       join work_areas wa on wa.id = ri.area_id
       left join roadmap_categories rc on rc.id = ri.category_id
       order by wa.scope, ri.priority, ri.sort_order;

   Then read work_notes (status 'active') and open backlog_items for
   the areas in play, per docs/WORKFLOW.md, before proposing changes.

2. Make changes as ordinary updates. Common edits:
   - Reprioritise: update roadmap_items set priority = ... . Leave
     gaps (10, 20, 30) so items can be slotted between.
   - Mark delivered: set status = 'done'. It moves to the Delivered
     zone on the next page load.
   - Send to the horizon: set horizon = 'someday'.
   - Change the focus item: set presentation = 'current' on the new
     one and 'ongoing'/'sequenced' on the old.
   - Add an item: insert with area_id (a work_areas row), an optional
     category_id, status, horizon, presentation and priority.
   - Add a lane: insert into roadmap_categories; add matching
     --rm-<key> tokens and a .rm-cat-<key> rule for a bespoke colour,
     otherwise it renders neutral.

3. Writes need the admin role under RLS. Editing through the Supabase
   MCP/service context applies directly; the browser page is
   read-only. After a change, the board and any snapshot reflect it
   on reload.

Keep real merchant, partner and staff detail out of the repo: the
roadmap content lives only in Supabase. seed.sql carries generic
samples only. Record decisions taken while reworking the roadmap as
work_notes so the reasoning is durable.
