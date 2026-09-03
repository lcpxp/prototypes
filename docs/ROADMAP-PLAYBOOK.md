# Roadmap playbook

The operating manual for the roadmap: the model, every field, the
copy-paste operations and the quick-capture recipe. Read this and you can
place, move and close work correctly.

Three companions, one job each. Read the one you need:

- **docs/ROADMAP-INTAKE.md** - the contextualisation protocol. How a new
  request is placed against what already exists, the confidence bands (stated
  there and nowhere else) and the SQL for every outcome. Read it before
  writing any row.
- **docs/ROADMAP-REVIEW.md** - the review ritual, wave by wave.
- **docs/ROADMAP.md** - the two-level taxonomy, the levels and layouts, and
  how the board renders.

Sprints are in docs/SPRINTS.md; document and note intake in docs/WORKFLOW.md.

The roadmap is data in Supabase (project ref `zlmkofbkobmhnslfnqsf`),
rendered read-only by modules/roadmap/. Editing is a database write through
the Supabase MCP/service context - no repo change, no deploy. Writes need
the admin role under RLS; the browser page is read-only.

## The model in one screen

Five concepts, two of them just labels. The board shows only BARS -
workstreams and work items; everything finer lives in the drawer.

- **Theme** (`roadmap_categories`, 13 of them) - the top workstream lane the
  C-suite reads (Merchant Portal, Acquiring, APIs, Insights ...). A classifier.
- **Department** (`work_items.department`) - the business function that owns
  the work. A classifier. Both are just tags on an item; neither is a container.
- **Workstream** (`work_items` with `level='workstream'`) - a presentable
  high-level container ("Self Service API", "Merchant Portal integration"). Renders as
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

`roadmap_current` is the *board* view: it carries no `summary`, `details`,
`links` or `resolution`, so comparing a new request against it can
only ever be a title match. For that, use `roadmap_searchable` (every row,
including done and dropped, with the text and a computed `is_hollow`) and
`roadmap_find(query)`, ranking candidates across all four text columns:

    select title, score, status, horizon, is_hollow
      from roadmap_find('currency swap on the summary page');

Banding that score is the intake protocol's job: docs/ROADMAP-INTAKE.md.

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
| `department` | six business functions: sales_commercial, operations_onboarding, product_technology, finance_revenue, legal_compliance, risk_underwriting | null | the single accountable owner (see Ownership) |
| `associated_departments` | text[] of the same department keys | `{}` | business area associations: extra departments that want visibility without owning; the department filter matches owner OR association |
| `assignee` / `support_assignee` | text | null | named delivery owner and an optional second; drawer and timeline bar |
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
| `business_benefit` | text | null | WHY the row exists; drawer panel above the fact grid (docs/VALUE-CAPTURE.md) |
| `benefit_type` | cost_removed, failure_prevented, revenue_enabled, revenue_retained, decision_enabled, obligation_met, defect_cost | null | the shape of the benefit, so it can be queried and not only read |
| `benefit_status` | drafted, confirmed | null | required whenever `business_benefit` is set; drafted renders with a visible marker |
| `pxp_staff_value` / `partner_staff_value` / `merchant_value` | text | null | who feels it. All optional, and an empty merchant reading is usually CORRECT |
| `sales_route` | direct, partner | null | Acquirer staff onboarding, or a partner's staff doing it |
| `resolution` | text | null | closing note (park/drop) |
| `previously_completed_at` | timestamptz | null | delivered latch: pins a done item to Previously completed (see below) |

Items are never deleted. Close with `status='done'` or `'dropped'` plus a
`resolution`; `resolved_at` is stamped by trigger. Reopening clears it.

Delivered work splits into Recently and Previously completed by a 90-day
freshness window on `resolved_at`. `previously_completed_at` overrides that:
null means derive from the window; a timestamp latches the row to Previously
completed regardless of age. It is set by hand (never a trigger), and
clearing it back to null is the undo.

## Ownership: one accountable owner, many associations

**`department` means accountable for the outcome, tested by where the
benefit lands.** Not who engineers it - Product and Technology builds
everything, so "who does the work" makes the field a constant, and a
constant cannot sort, filter or present. Where accountability is
genuinely arguable, the tiebreak is whose day changes when it ships.

One owner per item; every other interested function is an association tag
(`associated_departments`). The filter matches owner OR tag, and pulls
parents and children through, so a tag on a workstream gives that
department the whole block - never give two owners, and never repeat a
tag on every child that a parent already carries.

Product and Technology owns two things, not one: the platform, and the
other products LP both sells and integrates with (Merchant Portal, the KPI
portal). Defects are theirs wherever they sit - a defect's owner is
whoever repairs it, not whoever trips over it - with the area's owner
tagged.

A seventh owner, `core_launchpad`, is NOT live: it has no entry in the
check constraint, the registry or tokens.css. Do not use it. If it is
ever wanted, it needs all three in one change.

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
    -- + 2 Next). Linked (knowledge_links) items stay put. Use this for
    -- "move workstream X to now/next/later" instead of editing each row.
    select roadmap_move_workstream(
      (select id from work_items where title='Insights' and level='workstream'), 'now');
    update work_items set status='done' where title='Add site endpoint'; -- deliver
    -- Latch a delivery to Previously completed (file a closeout as history
    -- now rather than waiting out the 90-day window); set null to undo.
    update work_items set previously_completed_at=now()
      where status='done' and resolved_at < '2026-08-10';                -- latch to Previously
    update work_items set previously_completed_at=null
      where title='Add site endpoint';                                   -- undo the latch
    update work_items set horizon='someday', resolution='Deferred: no capacity'
      where title='Returns handling';                                    -- park (keep the reason)
    update work_items set progress=50 where title='Self Service API';     -- nudge progress
    update work_items set associated_departments='{operations_onboarding}'
      where title='Merchant Portal integration';                                   -- add a business area association

    -- Record the reasoning so a move is never informal drift
    insert into work_notes (kind, body, work_item_id)
    values ('decision', 'Promoted Inbound API to Now: partner deadline confirmed',
            (select id from work_items where title='Inbound API'));

## Capture rules that keep work visible and classed

- **Set a product area for correct theming, not for visibility.** The
  board and exports now show every item EXCEPT work explicitly filed in a
  'portal' area (the portal's own internal development); an item with no
  area still appears, grouped under General. Setting `area_id` is what
  places an item in the right theme lane and Detailed grouping, so still
  set it, resolved by key, to the product area whose theme matches the
  item's category: `(select id from work_areas where key='insights-analytics')`.
- **Record relationships as typed links.** Any time work is genuinely its
  own item but sits beside something else, link it. Unlike `parent_id` a
  link does not roll up onto the gantt and does not promote what it points
  at, so it costs nothing to record and it is how the next session learns
  that two pieces of work touch. `relates_to` is the general "related but
  distinct" mechanism - reach for it by default, not only for bugs. The
  eight kinds and their SQL are in docs/ROADMAP-INTAKE.md.
- **A task or fix can nest or stand alone - your judgement.** It may be a
  nested work item under a workstream (a real step of that work), a
  standalone item, or a deliverable (drawer-only detail). Nothing forbids a
  task nesting. The MAINTENANCE track is one worked example of the link
  above: a one-line bug you want visible but attributed without lighting
  up a strategic workstream. Keep it STANDALONE, link the workstream with
  `relates_to`, and tag department, category and area:

      with fix as (
        insert into work_items (title, type, level, category_id, area_id,
          department, horizon, status)
        values ('Acquirer selection screen renders empty', 'bug', 'item',
          (select id from roadmap_categories where key='acquiring'),
          (select id from work_areas where key='screening-workflow-automation'),
          'product_technology', 'someday', 'idea')
        returning id)
      insert into knowledge_links (from_type, from_id, to_type, to_id, kind, confidence)
      select 'work_item', fix.id, 'work_item',
             (select id from work_items where title='Acquirer management' and level='workstream'),
             'relates_to', 'confirmed'
        from fix;

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

1. **Contextualise first** - docs/ROADMAP-INTAKE.md, unconditionally,
   whether the request is phrased as an add or an update. The commonest
   failure is an add that is really an improvement to a row already there.
   The outcome it returns drives everything below.
2. Infer `category_id` (theme), `parent_id` (does it belong under a named
   workstream?), `department` and `horizon` from the words. Default
   `horizon='someday'` unless a scheduling word ("now", "this sprint",
   "next", "urgent") is present. Judge the `level`: a headline area is a
   `workstream`; real roadmap-visible work is an `item`; a step-grade line
   inside a bigger piece ("publish the spec", "write the migration") is a
   `deliverable` (drawer-only).
3. Ask only what the band calls for, plus at most ONE clickable
   `AskUserQuestion` where a critical field is genuinely ambiguous (which
   workstream? now vs someday?). None and Low bands apply silently, which
   is most requests.
4. Apply the outcome, then report one line: what changed, where it now
   sits, and how to reverse it.
