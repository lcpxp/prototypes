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

## The roadmap home and its views

modules/roadmap/ renders one home over the same `work_items` rows via
two independent controls: a **level** (altitude/content) and a **layout**
(how it is drawn). Nothing is stored per view; each cell derives from an
item's own fields, so moving or extending an item is a plain field edit.
The process and taxonomy rules live in docs/ROADMAP-PROCESS.md.

Levels (switch labels in brackets where they differ):

- **Workstreams** - the strategic gantt: workstream bars only, nested
  items collapsed until Detailed, loose items and fixes never shown.
- **Executive [Categories]** - a department-first rollup of active work:
  each department, the categories it owns and their item counts. Always
  complete, cannot drift. Prints as the C-suite one-pager.
- **Team [Work Items]** - the granular expansion: every product item on
  the now/next/later horizons (plus delivered when shown), with each
  workstream's nested items listed under its bar by default.
- **Backlog** - the full list: active, parked (far-future) and
  delivered, with the Parked column shown.

Layouts:

- **Timeline** (default) - a continuous **Delivered | Now | Next | Later |
  Parked** axis. Each item's bar spans from `horizon` (its start band)
  through `end_horizon` (the band it runs through), so a long activity
  visibly spills across columns. Rows order by start band, then priority
  (bugs sink first; workstreams win priority ties, so at default
  priorities they and their items lead the band unless a loose item is
  deliberately promoted), then span length (longer runs sink lower).
  Team and Executive show up to Later; Backlog adds the Parked
  column, so the whole list from idea to delivered sits on one axis.
- **Cascade** - the same work as stacked stage bands; an item that spans
  Now -> Next appears under both the Now and the Next band.

A **Hide delivered** toggle drops delivered work (and the Delivered
column/band) from any view. It is a view-only preference kept in
localStorage; it changes nothing in the database.

Level and layout persist in the URL hash (`#team/cascade`) and
localStorage, so a shared link opens the same view. The roadmap renders
product scope only; portal work (`work_areas.scope='portal'`) stays in
the backlog module.

Download PDF (or Ctrl+P) prints the Executive view as a condensed A4
landscape one-pager: theme descriptions drop, tiles tighten, theme
colour survives. A "Data as of <date>" line (max updated_at) dates every
export. Chrome, Edge and Firefox preselect landscape; Safari ignores the
size hint, so a print-only line reminds the reader to pick it by hand.

### Item detail, progress and export

- Every item is clickable and opens a right-hand **detail drawer** with
  everything stored against the row: summary and long-form details,
  statuses, type/effort/impact/priority, its workstream and any
  soft-linked (relates_to) item resolved to titles, real dates, sprints,
  delivery phases (with any TBC dates), the `attributes` (unrecognised
  keys still render as generic rows, so nothing is stored-but-invisible),
  business value notes, the closing resolution, and the item's
  work_notes decisions (when the viewer has backlog access) - plus an
  **Export JSON** action for that one item carrying the same context.
- A **Detailed view** toggle drills every level down: the Executive
  rollup lists each category's items under its owning department, and Team
  and Backlog expand into a Category -> Area -> item breakdown with each
  item's sub-step checklist. Each item is clickable through to the drawer.
  It is a view-only localStorage preference, like Hide delivered.
- Each item carries a coarse **progress** bar (0-100 snapped to
  checkpoints), rendered subtly on bars and cards. It is set by
  conversation, not precise tracking (see docs/SPRINTS.md).
- **Export JSON** on the toolbar produces the AI-optimised,
  KPI-portal-ready roadmap output: one streamlined record per product
  item (resolved theme and band, statuses, progress, dates, sprints,
  phases and attributes), with empty fields omitted.
- **Export CSV** (toolbar, and the backlog page) writes one row per item
  with a stable leading column set plus an `attr_<key>` column for every
  attributes key, derived dynamically so a new field needs no code change.

Tables (all under supabase/schema/30_work.sql, RLS in policies.sql):

- work_areas: the shared taxonomy. scope 'product' is the LaunchPad
  product roadmap; scope 'portal' is the hub's own development.
  category_id nests an area under a theme (the two-level taxonomy). The
  roadmap reads product only; the scope column still serves the backlog
  and platform modules.
- roadmap_categories: the 13 themes (Core LaunchPad, Unity, Overhaul,
  Integrations, Screening/Contracting/Fulfilment, Partners & PFAC,
  Acquiring, APIs, Insights & Reporting, Automation & Approvals,
  Sales & Commercial, Admin & Operations, Products & Pricing). key,
  label, description, sort_order, and shareholder_visible (false marks a
  whole theme - Core LaunchPad, fixes - as internal-only for the
  shareholder-facing `roadmap_current` query below). Colour
  per key lives in tokens.css (.rm-cat-<key> plus --rm-<key> tokens); a new
  theme with no token renders in a neutral tint until one is added. Items
  with no theme render as standalone cards.
- work_items: roadmap and backlog work in one table - every view is a
  projection of these rows. status 'done' is Delivered; horizon 'someday'
  or status 'dropped' is Parked (far-future); the rest is Active, banded
  by horizon. category_id points at a theme (or the item inherits its
  area's theme), horizon is the START band and end_horizon the band it
  runs THROUGH (null = start band only), and presentation supplies the
  Now card's state label:
  - sequenced: a plain item (no state label).
  - current: the single current-focus item.
  - ongoing: runs continuously.
  - wind: wrapping up.
  - bridge: points to the next horizon.
  The state label shows on Now cards only; Next, Later, Parked and
  delivered items ignore presentation.
  work_items also carries optional, light-touch PXP fields, none shown on
  the board except dates: progress (0-100), prd_status and project_status
  (the KPI portal's own pickers, distinct from status), start_sprint /
  end_sprint codes (docs/SPRINTS.md), and an attributes jsonb bag
  (pnl_vertical, team, region, customer, resources, cost, merchant_value,
  pxp_value, blockers, prd_link, legacy_priority_tags). It also carries an
  optional department (the owning business function, which the Executive
  view groups by), a level (workstream = a presentable high-level container
  such as "Self Service API"; item = a standalone or nested piece) and an
  optional parent_id linking a sub-step to its workstream (one level;
  children nest under the parent, never placed as their own bars). A
  workstream renders as its own bar; the Work Items level lists its
  children beneath the bar by default, while the Workstreams gantt keeps
  them collapsed until Detailed. See docs/ROADMAP-PLAYBOOK.md.
- work_item_phases: optional Discovery / Build / Certification / Launch
  phases per item, each with a quarter, start/end dates and per-date TBC
  flags. Absent for high-level items; surfaced in the detail drawer.
- roadmap_milestones, work_item_dependencies: named targets and
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

The point of holding the roadmap in Supabase is that any Claude chat with
Supabase access (project ref zlmkofbkobmhnslfnqsf) can read and overhaul it
without touching the repo. The operating manual for that - the model, every
field, the copy-paste operations, the quick-capture recipe and the review
ritual - is **docs/ROADMAP-PLAYBOOK.md**; the `/roadmap` and `/roadmap-add`
commands wrap it. A cold session reads the playbook, then
`select * from roadmap_current;` (the whole roadmap joined and
human-readable) plus open `work_notes`, and makes changes as ordinary
`work_items` updates. Writes need the admin role, which the MCP/service
context has; the browser page is read-only, and after a change the board and
any snapshot reflect it on reload.

Keep real merchant, partner and staff detail out of the repo: the roadmap
content lives only in Supabase. seed.sql carries generic samples only. Record
decisions taken while reworking the roadmap as work_notes so the reasoning is
durable.
