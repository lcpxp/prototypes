# Roadmap playbook

The single operating manual for the roadmap. If you are an AI (or a person)
about to add, update, review or present roadmap work, read this file and you
have everything: the model, every field, the copy-paste operations, the
quick-capture recipe and the review ritual. Deeper rendering detail is in
docs/ROADMAP.md; taxonomy rationale in docs/ROADMAP-PROCESS.md; intake in
docs/WORKFLOW.md; sprints in docs/SPRINTS.md. You rarely need them.

The roadmap is data in Supabase (project ref `zlmkofbkobmhnslfnqsf`),
rendered read-only by modules/roadmap/. Editing is a database write through
the Supabase MCP/service context - no repo change, no deploy. Writes need
the admin role under RLS; the browser page is read-only.

## The model in one screen

Four concepts, two of them just labels:

- **Theme** (`roadmap_categories`, 13 of them) - the top workstream lane the
  C-suite reads (Unity, Acquiring, APIs, Insights ...). A classifier.
- **Department** (`work_items.department`) - the business function that owns
  the work. A classifier. Both are just tags on an item; neither is a container.
- **Workstream** (`work_items` with `level='workstream'`) - a presentable
  high-level container ("Self Service API", "Unity integration"). Renders as
  its own bar; its sub-items nest under it and collapse to a checklist/count
  when Detailed is off. A workstream is always top-level (never nested).
- **Item** (`work_items` with `level='item'`) - the granular work. Either
  **standalone** (no parent - renders as its own bar, just like a workstream)
  or **nested** (its `parent_id` is a workstream - shows in that workstream's
  checklist, never as its own bar).

`work_areas` is a separate, internal **filing** taxonomy (intake, notes,
documents). It is NOT the presentation hierarchy - do not confuse a filing
area with a workstream. Set an item's `area_id` for filing/scope; set its
`level`/`parent_id` for presentation.

Everything is one table (`work_items`) projected into views, so moving work
is a single field edit and never a copy:
Delivered = `status='done'`; Parked = `horizon='someday'` or
`status='dropped'`; Active = the rest (horizon now/next/later).

## See the whole roadmap in one query

    select * from roadmap_current;                       -- everything, human-readable
    select * from roadmap_current where scope='product'  -- the product board
      and horizon in ('now','next','later') and status not in ('done','dropped');
    select * from roadmap_current where shareholder_visible and coalesce(type,'')<>'bug';

`roadmap_current` joins theme, workstream (parent) title, filing area and
department for you. Read it first, every session, before proposing changes.
Then read open `work_notes` (status='active') for the areas in play.

## Field reference (work_items)

The columns you operate. Set only what you know; the rest have safe defaults.

| Field | Values | Default | On the board |
| --- | --- | --- | --- |
| `title` | text | - | yes |
| `level` | workstream, item | item | container vs item |
| `parent_id` | a workstream's id | null | nests under it |
| `category_id` | a `roadmap_categories` id (theme) | null | theme lane |
| `department` | sales_commercial, operations_onboarding, product_technology, finance_revenue, legal_compliance, risk_underwriting | null | exec grouping (single build owner) |
| `associated_departments` | text[] of the same department keys | `{}` | business area associations: extra departments that want visibility without owning; the department filter matches owner OR association |
| `horizon` | now, next, later, someday | someday | start band |
| `end_horizon` | now, next, later, someday | null | spans to this band |
| `status` | idea, planned, in_progress, blocked, done, dropped | idea | done=Delivered |
| `presentation` | sequenced, current, ongoing, wind, bridge | sequenced | Now card label |
| `priority` | integer, gaps of 10 | 100 | row order |
| `progress` | 0-100 (coarse) | 0 | subtle bar |
| `type` | consideration, feature, functionality, bug, improvement, task | null | bug hidden from shareholders |
| `area_id` | a `work_areas` id (filing) | null | scope, Detailed grouping |
| `summary` | text (Now-grade only) | null | card summary |
| `effort` / `impact` | small/medium/large, low/medium/high | null | drawer |
| `start_sprint` / `end_sprint` | `NN-NN` (e.g. 26-16) | null | drawer (docs/SPRINTS.md) |
| `resolution` | text | null | closing note (park/drop) |

Items are never deleted. Close with `status='done'` or `'dropped'` plus a
`resolution`; `resolved_at` is stamped by trigger. Reopening clears it.

## Canonical operations (copy-paste, resolve ids by key/title)

    -- Add a workstream (a high-level container)
    insert into work_items (title, level, category_id, department, horizon, status, priority)
    values ('Self Service API', 'workstream',
            (select id from roadmap_categories where key='apis'),
            'product_technology', 'now', 'in_progress', 25);

    -- Add an item under a workstream (a sub-step)
    insert into work_items (title, level, parent_id, category_id, horizon, status, priority)
    values ('Add site endpoint', 'item',
            (select id from work_items where title='Self Service API' and level='workstream'),
            (select id from roadmap_categories where key='apis'), 'now', 'planned', 10);

    -- Add a standalone item (candidate; sits in Backlog until scheduled)
    insert into work_items (title, category_id, horizon, status, priority)
    values ('Refund webhook', (select id from roadmap_categories where key='apis'),
            'someday', 'idea', 100);

    update work_items set priority=15 where title='Inbound API';         -- reprioritise
    update work_items set horizon='now' where title='Inbound API';       -- schedule
    update work_items set horizon='now', end_horizon='next' where ...;   -- span columns
    update work_items set status='done' where title='Add site endpoint'; -- deliver
    update work_items set horizon='someday', resolution='Deferred: no capacity'
      where title='Returns handling';                                    -- park (keep the reason)
    update work_items set progress=50 where title='Self Service API';     -- nudge progress
    update work_items set associated_departments='{operations_onboarding}'
      where title='Unity integration';                                   -- add a business area association

    -- Record the reasoning so a move is never informal drift
    insert into work_notes (kind, body, work_item_id)
    values ('decision', 'Promoted Inbound API to Now: partner deadline confirmed',
            (select id from work_items where title='Inbound API'));

## Capture rules that keep work visible and classed

- **Every item needs a product area.** The board and exports show only
  items whose area scope is 'product'; an item with no area (or a 'portal'
  area) shows only in the Backlog master list. Always set `area_id`,
  resolved by key, to the product area whose theme matches the item's
  category: `(select id from work_areas where key='insights-analytics')`.
- **Small fixes are the maintenance track.** A one-line bug or task is a
  STANDALONE item - never a child of a workstream, since nesting rolls up
  and lights that workstream up on the strategic gantt. Tag its
  department, category and area, and soft-link the workstream it relates
  to via `relates_to_id` so it is attributable without appearing under it:

      insert into work_items (title, type, level, category_id, area_id,
        department, relates_to_id, horizon, status)
      values ('Acquirer selection screen renders empty', 'bug', 'item',
        (select id from roadmap_categories where key='acquiring'),
        (select id from work_areas where key='screening-workflow-automation'),
        'product_technology',
        (select id from work_items where title='Acquirer management' and level='workstream'),
        'someday', 'idea');

  Standalone fixes stay off the Workstreams/Exec view and never promote
  their related workstream; they surface in Work Items, the Backlog and
  the Fixes filter.
- **A PRD becomes a workstream + child items.** Create one workstream and
  nest its steps under it (parent_id), parked ('someday') until scheduled.
- **owning_department on a theme** sets its colour family (department hue
  -> workstream shade -> item); set it when you add a theme.

Add a theme only for a genuinely new workstream lane: insert a
`roadmap_categories` row, then a `--rm-<key>` token pair and a `.rm-cat-<key>`
rule in assets/css/tokens.css (else it renders neutral). Set
`shareholder_visible=false` for internal lanes (Core, fixes).

## Quick capture / quick edit ("add X" / "update Y")

A one-line request in chat should apply in one pass, not a research project:

1. Read `roadmap_current` (and, if updating, find the row by title).
2. Decide add vs update. Infer `category_id` (theme), `parent_id` (does it
   belong under a named workstream?), `department` and `horizon` from the
   words. Default `horizon='someday'` unless a scheduling word ("now",
   "this sprint", "next", "urgent") is present.
3. If exactly one critical field is genuinely ambiguous (which workstream? or
   now vs someday?), ask ONE clickable question (AskUserQuestion). Otherwise
   apply silently.
4. Apply the insert/update, then report one line: what changed and where it
   now sits. Record a `work_notes` decision only when the reasoning matters.

## The review ritual ("let's go through the roadmap", or /roadmap)

A tight, clickable pass. Each wave is one AskUserQuestion with options you
pre-compute from the data; each answer maps to a specific write above.

- **Wave 0 - Orient** (no question): read `roadmap_current`; show Now and
  Next, what changed since last review (max `updated_at`), and the counts.
- **Wave 1 - Now integrity**: for each Now item, on track / done / slipping /
  drop -> `status`, `progress`, `horizon`.
- **Wave 2 - Capacity**: keep Now sacred (3-5 items). Offer Next items to
  promote -> `horizon='now'`; demote when confidence drops.
- **Wave 3 - New capture**: "anything new?" -> the quick-capture recipe.
- **Wave 4 - Confirm**: summarise the edits, write one `work_notes` decision,
  stop. This is the 2-5 minute core.

Only after the core, offer deeper waves as further clickable options:
reprioritise within a theme; review Later bets; revive parked/someday; scope
a workstream into items; rebalance departments; delivered cleanup; and
shareholder-ready export prep before a meeting.

## Rules that keep it trustworthy

- **Now stays sacred**: 3-5 items. A long Now is weak prioritisation.
- **Detail decays by column**: Now items are spec'd (summaries), Next are
  validated problems, Later are one-line bets. Do not over-write Later rows.
- **Never lose a decision**: every move gets a `resolution` and/or a
  `work_notes` decision row.
- **Public repo**: real merchant, partner and staff detail lives only in
  Supabase, never in git, seed.sql, commit messages or docs. All DOM output
  goes through `App.escape`.
