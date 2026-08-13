# Rebuilding the dashboard

**BUILT 2026-08-13.** What follows is the plan as written, with
corrections where the build found the figures or the shape wrong.
See the closing section for what actually landed.

The dashboard was built when the hub was a set of modules with row
counts. It is now a roadmap, a knowledge base, an API reference, a
review system and a prototype registry, and the landing page says
almost none of that.

What it shows today: eight module cards (five carrying a count), a
delivery meter reading "N of M delivered", and eight rows of recent
activity ordered by `updated_at`. Everything on it is true and almost
none of it answers "what is happening".

What it should answer, in order, without a click:

1. What is being worked on now, and what is next?
2. What reference material exists, and how complete is it?
3. Is a review running, and what does it need from me?
4. What do we know, and where are the holes?
5. What are the tools, and what is each for?

## Design constraints

Not negotiable, from docs/DESIGN.md and docs/ARCHITECTURE.md:

- Tokens only. No hex, no pixel sizes, no font stacks outside
  `tokens.css`. No emoji, no decorative icons, no gradients.
- Mobile-first; usable at 360px; every horizontal overflow scrolls
  inside its own container.
- Sentence case everywhere. Empty states name the exact table to write
  to.
- One round trip for counts. The dashboard has never fanned out into
  per-module requests and must not start.
- Every section is gated by the viewer's module grants: a member with
  no roadmap grant sees no roadmap strip, and the page does not leave
  a hole where it would have been.
- Structural devices encode something true. A progress bar means
  progress; a colour means a theme that exists in
  `roadmap_categories`.

## The sections, in order

### 1. Now and next

The headline. A compact two-band strip - **Now** and **Next** - built
from `work_items` where `level = 'workstream'`, ordered by theme then
priority.

Each workstream reads as one row: theme colour rail, title, a progress
bar, the assignee, and a count of open children. Clicking it opens the
roadmap module with that item's drawer already open - `App.itemHref`
already builds that link, so this is a link, not a new view.

Rules that keep it a summary rather than a second roadmap:

- Workstreams only. Items and deliverables never appear here.
- Now shows all of them; Next caps at six with "and N more" linking to
  the roadmap's Next band. Measured at build time: **8 workstreams sit
  at `now` and 16 at `next`** (excluding dropped), of which 6 and 1 are
  done with nothing open, so the strip renders **2 at now and 15 at
  next** - Now is short and Next needs the cap. The plan's earlier
  "2 and 18" counted the dropped and done rows into Next.
- A workstream with no open children and status done drops out; it
  belongs in Delivered, on the roadmap.
- Blocked workstreams sort first within their band and say so. One
  item is `blocked` today; when that number grows, this is where it
  should be impossible to miss.
- The existing delivery meter moves into this section's header as a
  single line - "68 of 266 delivered, 14 in progress" - rather than
  sitting alone above the page.

Later and Someday are deliberately absent. The dashboard answers "now
and next"; the roadmap answers everything.

### 2. API reference

One card per spec, from `api_specs`, ordered by family then title:

- title, version, status badge, family label;
- endpoint count and tag count;
- **coverage** - the figure from `supabase/reference-coverage.json`
  (20-API-REFERENCE.md), read as a static asset, not a query: "56% of
  552 routes accounted for, 12 to correct". For a spec with no source to
  compare against, it reads "not verifiable against source" rather
  than a fake percentage;
- open gaps - the count of `gap` and `unverified` badges;
- a link into the spec, and secondary links to its topic list.

This is the "quick links to the API reference material" ask, done as
information rather than as a shortcut: the link is worth more when it
carries the state of what it links to.

### 3. Reviews

Two review systems will exist: application review (waves of merchant
triage) and portal review (60-PORTAL-REVIEW.md). One section, one card
each, shown only when a wave is open:

- wave name, state, opened date;
- for a portal wave: areas walked of total, findings open, fixes
  awaiting verification;
- for an application wave: needs-action, ongoing and settled counts;
- the single next action, in words - "12 areas still to walk" or "7
  fixes waiting on your verification".

When no wave is open, one line offering to start one, naming the
command that does it.

### 4. Knowledge

A quiet section, three figures and the gaps:

- capabilities by maturity - live, partial, planned, exploratory;
- glossary terms, journey stages, source documents;
- the top three gaps from the platform page's Coverage panel, worded
  as work: "4 product areas have no capability recorded", "6
  capabilities have no source document", "0 styling rows recorded".

The gap lines link into the platform page. A gap should be something
to fill, not something to discover - that is already the platform
page's principle, and the dashboard is where it gets seen.

### 5. Tools

The "toolbar" ask. Today the nav carries a theme switch, a search box,
one Splunk bug icon from `portal_links`, and the acquirer send tool -
all of them icons with tooltips, none of them explained anywhere.

The dashboard gets a tools grid: one card per tool, each with a name,
one sentence saying what it does and when to use it, and the target as
a real link. Cards are built from `portal_links` rows, so adding a
tool stays a database insert and the target never enters this
repository. Two rows need adding to make the section honest - the send
tool and the search - and `portal_links` needs one nullable column,
`description`, to carry the sentence. That is a schema change: schema
file, policy check, migration, snapshot, one commit.

The nav keeps its icons. This is the explained version, not a
replacement.

### 6. Modules

The existing card grid, kept but demoted: smaller cards, below the
substance, still the complete list of what exists and still gated by
grants. Counts stay - they are cheap and occasionally useful - but
they stop being the headline.

### 7. Recent activity

Kept, with three fixes: include work notes and review findings as
sources, show what changed rather than only that something did (type
and title are there; add the status or kind), and link through
`App.itemHref` to the row rather than to the module index. Three of
the five current sources link to a module index, which is a click
away from useful.

## Data: one RPC

`dashboard_counts()` becomes `dashboard_summary()` - one
`security invoker` function returning one jsonb object, so RLS filters
every figure to what the caller may read and the page still makes one
round trip.

    create or replace function public.dashboard_summary()
    returns jsonb language sql stable set search_path = public as $$
      select jsonb_build_object(
        'counts',      <the existing capped counts>,
        'delivery',    <the existing work_items breakdown>,
        'workstreams', (
          select coalesce(jsonb_agg(w order by w->>'horizon', w->>'priority'), '[]'::jsonb)
          from (
            select jsonb_build_object(
              'id', wi.id, 'title', wi.title, 'horizon', wi.horizon,
              'status', wi.status, 'progress', wi.progress,
              'assignee', wi.assignee, 'theme', rc.key,
              'open_children', (
                select count(*) from public.work_items c
                where c.parent_id = wi.id and c.status not in ('done','dropped'))
            ) as w
            from public.work_items wi
            left join public.roadmap_categories rc on rc.id = wi.category_id
            where wi.level = 'workstream'
              and wi.horizon in ('now','next')
              and wi.status <> 'dropped'
            limit 60
          ) s),
        'specs',       <id, title, version, status, family, endpoint count>,
        'knowledge',   <capabilities by maturity, terms, stages, docs>,
        'reviews',     <open wave summaries>
      );
    $$;

Notes on keeping it cheap: every subquery is capped, the workstream
subquery is bounded at 60 rows and the child count uses the existing
`work_items (parent_id, sort_order)` index, and nothing reads a heavy
jsonb column. Grants and the `revoke ... from anon` line go in
`policies.sql` in the same commit, as
`tests/checks/security.test.js` requires.

Keep `dashboard_counts()` until nothing calls it, then remove it in
its own commit.

## Repository changes

| File | Change |
|---|---|
| `dashboard.html` | New section scaffold, seven regions with headings and empty states. Budget: 250 soft, 400 hard - it will land near 150 |
| `assets/js/pages/dashboard.js` | Fetch and orchestrate; keep under the 300 soft budget by splitting |
| `assets/js/pages/dashboard-strip.js` | The now/next builder - pure, data in, HTML out, unit tested |
| `assets/js/pages/dashboard-cards.js` | Spec cards, tool cards, knowledge figures |
| `assets/css/dashboard.css` | New page sheet, loaded after the five core sheets |
| `assets/js/core/registry.js` | No change expected; if a section needs a new module key it goes here first |
| `supabase/schema/90_dashboard.sql` | `dashboard_summary()` |
| `supabase/schema/20_portal.sql` | `portal_links.description` |
| `tests/unit/dashboard-strip.test.js` | Band ordering, the cap, blocked-first, done-drops-out, empty state |

Builders are pure and load in a Node vm for testing, the same pattern
`roadmap-detail.js` uses. No DOM in a builder.

## What not to build

- No charts. There is nothing here a bar of colour explains better
  than a number and a label, and `dataviz` work would be decoration.
- No vanity metrics. "266 work items" is not an achievement; "68
  delivered, 14 in progress, 1 blocked" is a state.
- No customisation, no drag-and-drop, no saved layouts. One good
  default beats a preference nobody sets.
- No auto-refresh. The page is read on arrival; a stale figure is
  better than a moving one.

## Done when

- The landing page answers all five questions above without a click.
- One RPC, capped, `security invoker`, with its policy line.
- Every section is grant-gated and degrades to nothing rather than to
  an error or an empty frame.
- Every builder has a unit benchmark; `npm test` green; a changelog
  line under Unreleased.
- The tools section explains every tool the nav carries, from rows.

## What landed, 2026-08-13

Seven sections, in the order above, all seven grant-gated and all
seven hidden rather than emptied when the grant is missing.

- `dashboard_summary()` (migration `20260813223937`) returns counts,
  the delivery split, the workstreams, the specs, the knowledge
  figures with their gaps, and any **active** wave. Two round trips,
  not one: the RPC, and the `portal_links` read the nav already makes -
  `App.tools.load()` is now memoised so the nav and the tools grid
  share one fetch rather than issuing two.
- **Coverage got more honest than the plan asked for.** Summing the
  gaps into one figure would have printed "3 gaps to close" on a spec
  with **196 undocumented routes**, because the badge counts are small
  and the absent count is not. The card now names each: routes not
  documented, rows with no route, undeclared mirrors, gaps flagged,
  rows unverified. A spec with no source still reports its badges -
  it cannot be graded, but its gaps are real work.
- **The tools section is external tools only.** The plan said to add
  rows for the send tool and the search, but `portal_links` is
  documented as "one row per icon button the nav offers as a link out
  to an external tool", and the send and DaoPay tools are in-portal
  consoles, not links out. Putting them in that table would have made
  the table mean two things. The section header says "the external
  tools the nav carries" instead of overclaiming.
- `roadmap-themes.css` is new: the `.rm-cat-*` accent map, split out of
  `roadmap.css` so the strip's 3px theme rail does not require shipping
  the whole board stylesheet to the landing page.
- Recent activity gained work notes as a source and now shows each
  row's status or kind, with every link through `App.itemHref`.

Still open from this plan: the portal-review card (60-PORTAL-REVIEW.md
has to exist first), and the plan's "secondary links to a spec's topic
list", which would be a second link on a card that is already a link.
