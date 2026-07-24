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

Five concepts, two of them just labels. The board shows only BARS -
workstreams and work items; everything finer lives in the drawer.

- **Theme** (`roadmap_categories`, 13 of them) - the top workstream lane the
  C-suite reads (Unity, Acquiring, APIs, Insights ...). A classifier.
- **Department** (`work_items.department`) - the business function that owns
  the work. A classifier. Both are just tags on an item; neither is a container.
- **Workstream** (`work_items` with `level='workstream'`) - a presentable
  high-level container ("Self Service API", "Unity integration"). Renders as
  its own bar (bold); needs no children to count as a big-ticket item.
  Always top-level (never nested). Can carry both work items and
  deliverables.
- **Work item** (`work_items` with `level='item'`) - legitimate,
  roadmap-visible work. Either **standalone** (no parent - its own bar) or
  **nested** (its `parent_id` is a workstream - a bar indented under it, on
  the Work Items and Backlog levels). Standalone items interleave with
  workstreams by `priority`; workstreams win ties, so at default priorities
  they lead their band unless an item is deliberately promoted.
- **Deliverable** (`work_items` with `level='deliverable'`) - drawer-only
  detail: the things a piece of work produces. NEVER a bar. It lists in its
  parent's drawer under "Deliverables". Its parent may be a workstream or a
  work item. By POSITION, any child of a work item is treated as a
  deliverable whatever its stored level, so a work item's children never
  clutter the board.

One bar level of nesting only: workstream -> work item. A large standalone
workstream can hold deliverables directly with no sub-items - none of that
appears on the board, only when the workstream is clicked.

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

`roadmap_current` joins theme, workstream (parent) title, filing area and
department for you. Read it first, every session, before proposing changes.
Then read open `work_notes` (status='active') for the areas in play.

`shareholder_visible` is LEGACY: the Workstreams view is now the
shareholder-facing surface (workstreams only, fixes and loose items
excluded), so there is no need to set the flag on new work. It still exists
on `roadmap_categories` and in `roadmap_current`; leave it alone.

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

    -- Add a nested work item under a workstream (an indented bar on the
    -- Work Items and Backlog levels)
    insert into work_items (title, level, parent_id, category_id, horizon, status, priority)
    values ('Add site endpoint', 'item',
            (select id from work_items where title='Self Service API' and level='workstream'),
            (select id from roadmap_categories where key='apis'), 'now', 'planned', 10);

    -- Add a deliverable (drawer-only detail; NEVER a bar). Parent may be a
    -- workstream or a work item; children of a work item are deliverables by
    -- position, so the level is belt-and-braces there.
    insert into work_items (title, level, parent_id, category_id, status)
    values ('Publish OpenAPI spec', 'deliverable',
            (select id from work_items where title='Self Service API' and level='workstream'),
            (select id from roadmap_categories where key='apis'), 'planned');

    -- Add a standalone item (candidate; sits in Backlog until scheduled)
    insert into work_items (title, category_id, horizon, status, priority)
    values ('Refund webhook', (select id from roadmap_categories where key='apis'),
            'someday', 'idea', 100);

    update work_items set priority=15 where title='Inbound API';         -- reprioritise
    update work_items set horizon='now' where title='Inbound API';       -- schedule
    update work_items set horizon='now', end_horizon='next' where ...;   -- span columns

    -- Reschedule a WHOLE workstream and cascade to its child items in one
    -- call: shifts the workstream and every direct child by the same band
    -- delta, keeping their relative offsets and the workstream's span
    -- (Next->Later with 2 Next + 2 Later children -> Now->Next with 2 Now
    -- + 2 Next). Soft-linked (relates_to_id) items stay put. Use this for
    -- "move workstream X to now/next/later" instead of editing each row.
    select roadmap_move_workstream(
      (select id from work_items where title='Insights' and level='workstream'), 'now');
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
- **A task or fix can nest or stand alone - your judgement.** It may be a
  nested work item under a workstream (a real step of that work), a
  standalone item, or a deliverable (drawer-only detail). Nothing forbids a
  task nesting. What follows is the pattern for the MAINTENANCE track only:
  a one-line bug that you want visible but attributed without lighting up a
  strategic workstream. There, keep it STANDALONE and soft-link the
  workstream it relates to via `relates_to_id` (nesting would roll up onto
  the gantt; the soft link does not). Tag its department, category and area:

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
rule in assets/css/tokens.css (else it renders neutral).

## Quick capture / quick edit ("add X" / "update Y")

A one-line request in chat should apply in one pass, not a research project:

1. Read `roadmap_current` (and, if updating, find the row by title).
2. Decide add vs update. Infer `category_id` (theme), `parent_id` (does it
   belong under a named workstream?), `department` and `horizon` from the
   words. Default `horizon='someday'` unless a scheduling word ("now",
   "this sprint", "next", "urgent") is present. Judge the `level`: a
   headline area is a `workstream`; real roadmap-visible work is an `item`;
   a step-grade line inside a bigger piece ("publish the spec", "write the
   migration") is a `deliverable` (drawer-only). When a captured line is
   clearly step-grade under a named parent, file it as a deliverable.
3. If exactly one critical field is genuinely ambiguous (which workstream? or
   now vs someday?), ask ONE clickable question (AskUserQuestion). Otherwise
   apply silently.
4. Apply the insert/update, then report one line: what changed and where it
   now sits. Record a `work_notes` decision only when the reasoning matters.

## Contextual synchronisation (both ways)

The roadmap and the platform knowledge base are two views of one reality and
must be kept in step, in BOTH directions, on every review and material edit.
The platform context lives in `product_capabilities` (what exists today, by
maturity), `domain_terms` (the glossary), `journey_stages` (the onboarding
lifecycle), `integrations`, and platform facts in `work_notes` (kind
`'fact'`) - see docs/PLATFORM.md. Treat it as the source you enrich work
from, and the record your delivered work keeps current.

- **Context -> roadmap (source and enrich).** Before proposing or confirming
  a work-item or workstream change, pull the context for its area (the
  `product_capabilities`, `domain_terms` and `journey_stages` for its
  `area_id`, plus open facts) and let it sharpen the item: a summary, a
  dependency, a term it assumes, the lifecycle stage it touches, the
  capability it extends. Offer these as concrete assertions to APPLY.
- **Roadmap -> context (feed back).** When work moves - promoted, delivered,
  dropped, rescoped - ask what it changes about the platform itself: a
  capability now live or partial, a new integration, a term or lifecycle
  stage that shifted, a problem now solved. Offer those as updates to the
  context store (a `product_capabilities` maturity bump, a new fact, a term).
- **The golden rule: every assertion is owner-validated.** Nothing is written
  to a work item OR to the context store on the AI's own authority. Each
  applied-or-planned assertion, both directions, is put to the owner to
  confirm, correct or reject - as a clickable choice, not a wall of text -
  before it lands. Record what was confirmed: a `work_notes` decision, and
  provenance (source and date) on any context row.

## The review ritual ("let's go through the roadmap", or /roadmap)

A tight, clickable pass. Each wave is one AskUserQuestion with options you
pre-compute from the data; each answer maps to a specific write above.

- **Wave 0 - Orient** (no question): read `roadmap_current`; show Now and
  Next, what changed since last review (max `updated_at`), and the counts.
  Also load the platform context for the areas in play (Contextual
  synchronisation) so it is in hand for the waves that follow.
- **Wave 1 - Now integrity**: for each Now item, on track / done / slipping /
  drop -> `status`, `progress`, `horizon`.
- **Wave 2 - Capacity**: Now holds whatever is genuinely in flight - there
  is no cap on how many items or workstreams sit there. Promote Next items
  on evidence -> `horizon='now'`; demote when confidence drops.
- **Wave 3 - New capture**: "anything new?" -> the quick-capture recipe.
- **Wave 4 - Context sync** (always, both ways): from the context loaded in
  Wave 0, put forward as clickable validation (a) context->item enrichments
  that sharpen items in play, and (b) item->context updates implied by this
  session's moves and deliveries. Apply only what the owner confirms; skip
  the wave only when there is genuinely nothing to sync, and say so.
- **Wave 5 - Confirm**: summarise the edits, write one `work_notes` decision,
  record any confirmed context updates with provenance, then stop. This is
  the 2-5 minute core.

Only after the core, offer deeper waves as further clickable options:
reprioritise within a theme; review Later bets; revive parked/someday; scope
a workstream into items; rebalance departments; delivered cleanup; and
shareholder-ready export prep before a meeting.

## Rules that keep it trustworthy

- **Now reflects what is genuinely in flight**: size it to real capacity,
  not a fixed count - there is no cap on the number of items or workstreams
  in Now.
- **Detail decays by column**: Now items are spec'd (summaries), Next are
  validated problems, Later are one-line bets. Do not over-write Later rows.
- **Never lose a decision**: every move gets a `resolution` and/or a
  `work_notes` decision row.
- **Keep context in step**: every review and material edit syncs both ways
  with the platform knowledge base (Contextual synchronisation, docs/
  PLATFORM.md) - source context into the work, feed delivery back into the
  context - and every synced assertion is owner-validated before it lands.
- **Public repo**: real merchant, partner and staff detail lives only in
  Supabase, never in git, seed.sql, commit messages or docs. All DOM output
  goes through `App.escape`.
