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
  documents (the board's Print or save as PDF action).
- Sprint planning workspace in the style of a lightweight Notion
  board, plus imports and summaries from DevOps sprint data.
- Downloadable reference material alongside the API viewer.
- Dashboards and insights: overview and ordering.
- An LLM-backed ask feature over the hub's own material.
- A structured data repository for future plans, PRDs and intents.

All of it remotely hosted and securely accessible from anywhere, with
content in Supabase rather than in this public repo.

## The roadmap board and its data

modules/roadmap/ renders a three-zone board from the roadmap tables.
The zones are not stored; they derive from each item's own fields, so
moving an item between zones is a plain field edit:

- Delivered: roadmap_items.status = 'done'.
- Horizon: roadmap_items.horizon = 'someday' (and not done).
- In focus and prioritised: everything else, ordered by priority
  ascending (lower number = higher up), with a proportional bar.

Tables (all under supabase/schema/30_work.sql, RLS in policies.sql):

- work_areas: the shared taxonomy. scope 'product' is the LaunchPad
  product roadmap; scope 'portal' is the hub's own development. The
  board's Product / Portal / All control filters on this.
- roadmap_categories: the themed colour lanes (Unity, API,
  Self-Service, Insights, Operational, Auto-Approval). key, label,
  description, sort_order. Colour per key lives in tokens.css
  (.rm-cat-<key> plus --rm-<key> tokens); a new category with no
  token renders in a neutral tint until one is added.
- roadmap_items: the work. Beyond the columns above, category_id
  points at a lane, and presentation shapes how an active item reads
  on the track:
  - sequenced: a plain upcoming item (no state label).
  - current: the single current-focus item.
  - ongoing: runs continuously (bar reaches the right edge).
  - wind: wrapping up.
  - bridge: points to the next horizon.
  Delivered and horizon tiles ignore presentation and category.
- roadmap_milestones, roadmap_dependencies: named targets and
  item-to-item ordering, for future timeline and waterfall views.

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
