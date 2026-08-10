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

Do not confuse a workstream with a filing area: the workstream is the
presentation container, the filing area is the internal taxonomy that
intake, notes and documents share. An item's `level`/`parent_id` place it
for presentation; its `area_id` files it. The full field reference and the
operations that move work between these live in docs/ROADMAP-PLAYBOOK.md.

## How work enters and moves

1. **Capture** everything supplied in chat per docs/WORKFLOW.md:
   verbatim to `work_documents`, distilled to `work_notes`, actionable
   to `work_items` (horizon defaults to `someday` - an unscheduled
   candidate). Nothing is lost. Contextualise before writing:
   docs/ROADMAP-INTAKE.md.
2. **Schedule** a candidate onto the roadmap by setting its `horizon` to
   `later`, `next` or `now`, with a `category_id` (or an area whose
   theme it should inherit) so it lands in the right lane. No copy.
3. **Prioritise** by editing `priority` (leave gaps of 10 so items slot
   between) and moving `horizon` (someday -> later -> next -> now) on
   evidence.
4. **Deliver** by setting `status='done'`; it joins the Delivered zone.
   **Park** by setting `horizon='someday'` (or `status='dropped'`) with a
   `resolution` sentence, so a decision is never lost.
5. **Record the reasoning** as a `work_notes` decision so movement never
   becomes informal drift.

The discipline that keeps this trustworthy - Now sized to real capacity,
detail decaying by column, movement on evidence - is in
docs/ROADMAP-REVIEW.md, alongside the ritual that applies it.

## The roadmap home and its views

modules/roadmap/ renders one home over the same `work_items` rows via
two independent controls: a **level** (altitude/content) and a **layout**
(how it is drawn). Nothing is stored per view; each cell derives from an
item's own fields, so moving or extending an item is a plain field edit.

Levels (switch labels in brackets where they differ):

- **Workstreams** - the strategic gantt: workstream bars only, nested
  items collapsed until Detailed, loose items and fixes never shown.
- **Executive [Categories]** - a department-first rollup of active work:
  each department, the categories it owns and their item counts. Always
  complete, cannot drift. Prints as the C-suite one-pager.
- **Team [Work Items]** - the granular view: every product work item on
  the now/next/later horizons (plus delivered when shown), as bars, with a
  workstream's nested work items indented beneath it. Deliverables never
  appear here - they live in the drawer.
- **Backlog** - the full list as bars: active, parked (far-future) and
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

The Delivered zone splits into two columns: **Recently completed** (shipped
within a rolling **90-day** window, read from `resolved_at`, falling back to
`updated_at` for rows closed before that stamp existed) and **Previously
completed** (older deliveries). A `previously_completed_at` timestamp is a
one-way **latch** that pins a delivery to Previously completed regardless of
age, so a closeout wave files as history the moment it lands instead of
sitting in Recently for the whole window; clearing the column back to null
is the undo. The latch is a database edit (see docs/ROADMAP-PLAYBOOK.md);
the drawer surfaces it as a "Moved to Previously completed" row.

A **Hide delivered** toggle drops delivered work (and both Delivered
columns/bands) from any view. It is a view-only preference kept in
localStorage; it changes nothing in the database.

An **Expand board** toggle (the arrows-out control) widens the Timeline so
every column keeps its full width and the board scrolls sideways rather than
compressing to fit the viewport - room to read long titles and dense spans.
Like Hide delivered and Detailed view, it is a view-only localStorage
preference.

**Collapsing a column:** click any column header to take that band off the
board. It drops the work that begins there and, on the Timeline, shrinks the
column to a thin labelled seam so the remaining columns share the reclaimed
width; the Cascade collapses the band to just its struck heading. Click the
seam (or struck heading) again to bring the column back - and if every column
is collapsed the header row stays put, so the board is never a dead end.
Every column collapses this way - Previously and Recently completed, Now,
Next, Later and Parked - and it is a view-only localStorage preference.

Level and layout persist in the URL hash (`#team/cascade`) and
localStorage, so a shared link opens the same view. The roadmap renders
product scope only; portal work (`work_areas.scope='portal'`) stays in
the backlog module.

Download PDF (or Ctrl+P) prints the view currently on screen, condensed to
A4 landscape: theme descriptions drop, tiles tighten, theme colour
survives, checklists never print (bars only). The Categories view is the
recommended C-suite one-pager to print. A "Data as of <date>" line (max
updated_at) dates every export. Chrome, Edge and Firefox preselect
landscape; Safari ignores the size hint, so a print-only line reminds the
reader to pick it by hand.

### Item detail, progress and export

- Every item is clickable and opens a right-hand **detail drawer** with
  everything stored against the row: summary and long-form details,
  statuses, type/effort/impact/priority, its workstream and any
  soft-linked (relates_to) item resolved to titles, real dates, sprints,
  delivery phases (with any TBC dates), the `attributes` (unrecognised
  keys still render as generic rows, so nothing is stored-but-invisible),
  business value notes, the closing resolution, and the item's
  work_notes decisions (when the viewer has backlog access). A workstream
  also lists its nested **work items** (each clickable through to its own
  drawer) and its **deliverables** in separate sections; a work item lists
  its deliverables. Plus an **Export JSON** action for that one item
  carrying the same context (work items and deliverables included).
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
  optional parent_id linking a child to its parent (one bar level:
  workstream -> work item). level is workstream (a bold container bar),
  item (a work item bar, indented when nested under a workstream) or
  deliverable (drawer-only detail, never a bar). By position, any child of
  a work item is a deliverable whatever its stored level. See
  docs/ROADMAP-PLAYBOOK.md.
- work_item_phases: optional Discovery / Build / Certification / Launch
  phases per item, each with a quarter, start/end dates and per-date TBC
  flags. Absent for high-level items; surfaced in the detail drawer.
- roadmap_milestones, work_item_dependencies: named targets and
  item-to-item ordering, for future timeline and waterfall views.

## Working the roadmap with an AI assistant (Supabase access)

The point of holding the roadmap in Supabase is that any Claude chat with
Supabase access (project ref zlmkofbkobmhnslfnqsf) can read and overhaul it
without touching the repo. A cold session reads
**docs/ROADMAP-PLAYBOOK.md** for the model, fields and operations, then
`select * from roadmap_current;` plus open `work_notes`, and makes changes
as ordinary `work_items` updates. Before writing any row it contextualises
per **docs/ROADMAP-INTAKE.md**; a full pass over the board follows
**docs/ROADMAP-REVIEW.md**. The `/roadmap-add` and `/roadmap` commands wrap
those two.

Writes need the admin role, which the MCP/service context has; the browser
page is read-only, and after a change the board and any snapshot reflect it
on reload.

Keep real merchant, partner and staff detail out of the repo: the roadmap
content lives only in Supabase. seed.sql carries generic samples only. Record
decisions taken while reworking the roadmap as work_notes so the reasoning is
durable.
