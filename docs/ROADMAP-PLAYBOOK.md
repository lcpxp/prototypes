# Roadmap playbook

The single operating manual for the roadmap. If you are an AI (or a person)
about to add, update, review or present roadmap work, read this file and you
have everything: the model, every field, the copy-paste operations, the
quick-capture recipe and the review ritual. The one companion you will
reach for is docs/ROADMAP-CONTEXT.md: the contextualisation protocol in
full, with copy-paste SQL for every outcome. Deeper rendering detail is in
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

`roadmap_current` is the *board* view: it carries no `summary`, `details`,
`relates_to_id` or `resolution`, so comparing a new request against it can
only ever be a title match. For that, use `roadmap_searchable` (every row,
including done and dropped, with the text and a computed `is_hollow`) and
`roadmap_find(query)`, ranking candidates across all four text columns:

    select title, score, status, horizon, is_hollow
      from roadmap_find('currency swap on the summary page');

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
| `department` | six business functions (sales_commercial, operations_onboarding, product_technology, finance_revenue, legal_compliance, risk_underwriting) plus core_launchpad | null | single accountable owner; core_launchpad = the platform itself, not a business function (see Ownership) |
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

## Ownership: one accountable owner, many associations

One owner per item (`department`); every other interested function is an
association tag (`associated_departments`). The filter matches owner OR tag, so
tags give visibility without diluting accountability - never give two owners,
add a tag. Owners are the six business functions plus `core_launchpad` ("Core
LaunchPad"): use it when an item IS the core product (merchant onboarding into
PXP) and no business function owns it (Acquirer-only, Merchant Profile, currency
conversion). It is not `product_technology` - Core LaunchPad = which platform
the work is, product_technology = who engineers it, carried as a default tag on
Core LaunchPad items. Otherwise the driving function owns: operations_onboarding
owns onboarding, screening, CRM and automation and stays a distinct owner (tag
other functions, never merge into one big Operations). Making core_launchpad
a live owner still needs a schema CHECK, a tokens.css colour and the
department filter; until then it is the classification rule, in data only.

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

- **Set a product area for correct theming, not for visibility.** The
  board and exports now show every item EXCEPT work explicitly filed in a
  'portal' area (the portal's own internal development); an item with no
  area still appears, grouped under General. Setting `area_id` is what
  places an item in the right theme lane and Detailed grouping, so still
  set it, resolved by key, to the product area whose theme matches the
  item's category: `(select id from work_areas where key='insights-analytics')`.
- **`relates_to_id` is the general "related but distinct" mechanism.** Any
  time work is genuinely its own item but sits beside something else, soft-
  link it. Unlike `parent_id` it does not roll up onto the gantt and does
  not promote what it points at, so it costs nothing to record and it is
  how the next session learns that two pieces of work touch. Reach for it
  by default, not only for bugs; the outcome is `ASSOCIATE` in
  docs/ROADMAP-CONTEXT.md.
- **A task or fix can nest or stand alone - your judgement.** It may be a
  nested work item under a workstream (a real step of that work), a
  standalone item, or a deliverable (drawer-only detail). Nothing forbids a
  task nesting. The MAINTENANCE track is one worked example of the soft
  link above: a one-line bug you want visible but attributed without
  lighting up a strategic workstream. Keep it STANDALONE, soft-link the
  workstream via `relates_to_id`, and tag department, category and area:

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

## Contextualising new work

New work is placed against what already exists, never written blind. The
lookup is unconditional - it does not wait for the request to be phrased as
an update, because the commonest failure is an add that is really an
improvement to a row already there. Full procedure and copy-paste SQL for
every outcome: docs/ROADMAP-CONTEXT.md.

1. **Understand.** Name the surface, the actor, the behaviour and any
   scheduling word - those are the search handles. If the request
   enumerates three or more pieces of work, it is a `SPLIT`/`UMBRELLA`
   candidate: ask, whatever the scores say. A heading matches everything
   weakly and nothing strongly, so no score will catch it.
2. **Gather.** `roadmap_find` on the headline and again on the full
   request; take the better score per candidate. Search includes `done`
   and `dropped` - parked is not gone. Add one narrow search on the rarest
   handle over parked work; `REVIVE` cases score low by construction.
3. **Band.** The band decides whether to speak at all:

   | Band | Score | Behaviour |
   | --- | --- | --- |
   | High | >= 0.65 | Present the candidate, recommend an outcome, apply on one click |
   | Medium | 0.40 - 0.65 | Present as options with the distinction spelled out; recommend, and say what would make it the other way |
   | Low | 0.22 - 0.40 | Apply as new. Mention the neighbour in one line - do not ask |
   | None | < 0.22 | Apply silently. Report one line |

   A low-band match never generates a question; restraint is a feature. A
   **hollow** candidate (`is_hollow`) in the medium band is a strong
   `ENRICH` signal - hollow rows attract re-raises.
4. **Recommend.** Always lead with one recommended outcome and its
   reasoning, then the alternatives: `NEW`, `ENRICH`, `MERGE`, `PROMOTE`,
   `REVIVE`, `ASSOCIATE`, `SPLIT`, `UMBRELLA`, `UNRELATED`. Never a bare
   list - that moves the work back onto the owner. When the request is
   better described than the row it matches, the description moves onto
   the existing row: the owner's words are the asset.
5. **Apply and record.** For anything other than `NEW`, write a
   `work_notes` decision so the judgement is inherited, not re-derived.
   Nothing is deleted - rows close with `status`, a `resolution` and a
   back-link - so state the undo in the confirmation line.

## Quick capture / quick edit ("add X" / "update Y")

A one-line request in chat should apply in one pass, not a research project:

1. Contextualise (above). The outcome it returns drives everything below.
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

## Contextual synchronisation (both ways)

The roadmap and the platform knowledge base are two views of one reality and
must be kept in step, in BOTH directions, on every review and material edit.
The context lives in `product_capabilities`, `domain_terms`,
`journey_stages`, `integrations` and `work_notes` of kind `'fact'` - see
docs/PLATFORM.md.

- **Context -> roadmap.** Before proposing or confirming a change, pull the
  context for the item's `area_id` and let it sharpen the item: a summary, a
  dependency, a term it assumes, the lifecycle stage it touches, the
  capability it extends. Offer these as concrete assertions to APPLY.
- **Roadmap -> context.** When work moves - promoted, delivered, dropped,
  rescoped - ask what it changes about the platform: a capability now live
  or partial, a new integration, a term or stage that shifted.
- **The golden rule: every assertion is owner-validated**, both directions,
  as a clickable choice rather than a wall of text. Nothing lands on the
  AI's own authority. Record what was confirmed: a `work_notes` decision,
  plus provenance (source and date) on any context row.

## The review ritual ("let's go through the roadmap", or /roadmap)

A tight, clickable pass. Each wave is one AskUserQuestion with options you
pre-compute from the data; each answer maps to a specific write above.

- **Wave 0 - Orient** (no question): read `roadmap_current`; show Now and
  Next, what changed since last review (max `updated_at`), and the counts.
  Load the platform context for the areas in play (Contextual
  synchronisation). Add two standing lines from the search surface: any
  **hollow rows** in those areas, and any **high-band pair already in the
  data** and not linked (both queries in docs/ROADMAP-CONTEXT.md). Report
  them; ask nothing here.
- **Wave 1 - Now integrity**: for each Now item, on track / done / slipping /
  drop -> `status`, `progress`, `horizon`.
- **Wave 2 - Capacity**: Now holds whatever is genuinely in flight - there
  is no cap on how many items or workstreams sit there. Promote Next items
  on evidence -> `horizon='now'`; demote when confidence drops.
- **Wave 3 - New capture**: "anything new?" -> contextualise each line, and
  the batch against itself as well as against history. Come back ONCE: the
  clean items applied, the flagged ones grouped into a single pass. If they
  would all land with `department`, `category_id` and `relates_to_id` null,
  offer the classification in that same pass.
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
- **Nothing is written blind**: every new item is placed against what
  already exists first (Contextualising new work), at review as well as at
  capture - the duplicates found in July were both already in the data.
- **Hollow rows attract re-raises**: a row with no `summary` and no
  `details` gets re-requested by someone who cannot see it is covered.
  Fill them while the area is in hand (`roadmap_searchable.is_hollow`).
- **Keep context in step**: every review and material edit syncs both ways
  with the platform knowledge base (Contextual synchronisation, docs/
  PLATFORM.md) - source context into the work, feed delivery back into the
  context - and every synced assertion is owner-validated before it lands.
- **Public repo**: real merchant, partner and staff detail lives only in
  Supabase, never in git, seed.sql, commit messages or docs. All DOM output
  goes through `App.escape`.
