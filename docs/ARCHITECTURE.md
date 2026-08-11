# Architecture

How the portal fits together. Read alongside SECURITY.md.

## The shape of the system

The repository is a static site: HTML pages, two stylesheets and a set
of small JavaScript modules. There is no build step and no server-side
code. Supabase provides everything dynamic: authentication, the user
register, API specs, endpoint detail and the prototype registry.

LPio is the overarching project shell. It is designed so that different
streams of work can live as discrete modules (for example, the API
reference viewer, the prototype gallery, or the roadmap) while still
being discoverable from one hub.

The consequence of this split is the core design rule: the repo can be
public because it contains only structure and rendering logic. All
substance lives behind Supabase Row Level Security.

## Page flow

1. index.html is the only unguarded page. It signs users in with
   Supabase email and password auth, then redirects to the dashboard.
   If a session already exists, it redirects immediately.
2. Every other page includes guard.js, which checks for a session
   before anything renders and bounces unauthenticated visitors back
   to index.html.
3. dashboard.html is the hub: module cards, counts and recent spec
   activity, all rendered from the module registry.
4. Each module lives in its own folder under modules/ with an
   index.html: modules/reference/ (the spec viewer),
   modules/integrations/ (the integration overview and detail
   modals), modules/prototypes/ (the gallery plus the prototype
   pages themselves), modules/platform/ (what Launchpad is and does
   today), modules/roadmap/ (the roadmap view), modules/backlog/
   (rolling work items and ingested source material) and
   modules/users/ (the user and access register).

## JavaScript module order

Each protected page loads scripts in a fixed order, each attaching to
a shared window.App namespace:

    supabase CDN client   provides window.supabase
    core/supabase.js      creates App.db from the built-in public config
    core/registry.js      App.registry: modules, tables, roles
    core/guard.js         App.requireAuth promise, App.onAuthed(fn)
    core/ui.js            nav rendering, App.escape, badges, copy
    core/search.js        App.search: the nav's global search
    core/tools.js         App.tools: the nav's links out to external
                          tools, built from portal_links rows
    pages/<module>.js     waits on App.onAuthed before fetching

supabase.js carries the public project URL and anon key, so the site
works with no configuration. An optional, gitignored core/config.js
may define window.APP_CONFIG before supabase.js to override them for a
local build against a different project.

The registry is the single source of truth for what the hub contains.
Navigation and dashboard cards are generated from it, so adding a
module is one registry entry plus its folder, never edits to per-page
markup.

Page modules never fetch before authentication resolves, and never
insert unescaped strings into the DOM.

## Data model

Defined in supabase/schema/ (one file per domain, run in lexical order), in four groups:

Identity and access:

- profiles: one row per user, created by trigger on signup, carrying
  email, display name and role (admin or member).
- module_access: per-user, per-module grants keyed by the module
  keys in assets/js/core/registry.js. Absence of a row means
  allowed; admins always have access. Read policies on the content
  tables consult these grants via has_module_access(), and guard.js
  mirrors them in the UI (nav filtering plus a dashboard redirect
  for denied modules).

Reference:

- api_specs: one row per spec, with title, version, status, family,
  an optional full OpenAPI 3 document in a JSONB column, plus
  spec-level material: servers (environments and base URLs), auth
  (the scheme as flat label/value pairs, rendered verbatim) and
  contact. family (launchpad, unity, integration, other) groups
  specs into distinct reference sites mirrored in
  App.registry.specFamilies.
- api_endpoints: one row per endpoint (method, path, tag, summary,
  description, params, request headers, request example, a response
  catalogue with per-status examples, typed summary-row badges,
  auth_required and deprecated flags, notes, sort order), linked to
  a spec. method 'query' documents name-addressed read operations
  (GraphQL, RPC). This is the primary editing surface.
- api_tags: per-spec tag catalogue giving each endpoint group a
  description and an explicit position, so areas can mirror a
  runbook instead of alphabetical order. Uncatalogued tags still
  render, first-seen, without a blurb.
- api_topics: ordered narrative sections per spec (overview,
  conventions, runbooks, accepted values, gap registers) as typed
  jsonb blocks the viewer renders generically; unknown block kinds
  are skipped so content can lead the code.

The reference viewer prefers api_endpoints rows and falls back to
parsing the spec JSONB when a spec has no endpoint rows, so a whole
OpenAPI document can be pasted in as a starting point and broken out
into rows later. Every column beyond method and path is optional:
sparse rows render cleanly, so material can be imported minimally
and enriched in place. Endpoints load in two phases - a lean list
renders the whole page, then heavy columns hydrate per endpoint on
first expand (or one batch for expand-all) - so large specs stay
fast. Base URLs, auth details and endpoint payloads
are data in Supabase, never content in this public repo; the seeded
Merchant Onboarding sample (supabase/seed.sql) is the worked
template showing every field populated with generic values.

Catalogues:

- integrations: one row per third-party service connected to
  Launchpad, driving the overview table and detail modals. The
  detail JSONB column holds flat label/value pairs rendered
  verbatim, so recording a new fact is a database edit.
- prototypes: registry rows (title, description, path, status, tags)
  that drive the gallery and dashboard.

Work management (see docs/WORKFLOW.md for the working protocol):

- work_areas: the single shared taxonomy of development areas, with
  scope separating product feature areas from the portal's own. Work
  items, documents and notes all reference it, so swimlanes and
  groupings can never disagree.
- roadmap_categories: the themed colour lanes for the roadmap board.
  key, label, description and order live here; colour per key lives
  in tokens.css, so lanes are data an admin or an AI assistant can
  edit while colour stays in the design system.
- work_items: roadmap and backlog work in ONE table - considerations,
  features, functionality, bugs, improvements and tasks alike - linked
  to an area and optionally a category, milestone and source document,
  with status, horizon (now/next/later/someday), end_horizon, a
  presentation state (sequenced/current/ongoing/wind/bridge), priority,
  effort, impact, tags and optional dates. Every view derives from these
  fields: Delivered is status 'done'; Parked is horizon 'someday' or
  status 'dropped'; Active is the rest, banded by horizon. The Executive
  view rolls Active work up by theme (always complete), Team shows it
  item by item, Backlog shows everything. Never deleted; closing an item
  (done/dropped) stamps resolved_at by trigger, so the live view and the
  historic record are the same table. See docs/ROADMAP.md for the
  AI-assistant working protocol.
- roadmap_milestones: named target points, optionally dated.
- work_item_dependencies: item-to-item ordering for waterfall and
  dependency views.
- work_documents: material supplied during working sessions (PRDs,
  roadmaps, backlog lists, DevOps pastes, sprint summaries, and now
  platform product-knowledge overviews - kind 'platform'), kept
  verbatim with a distilled summary and supersede chains.
- work_notes: atomic distilled records (decisions, facts, risks,
  questions, actions) linked to whatever they concern.

Platform knowledge (supabase/schema/40_platform.sql; see
docs/PLATFORM.md for the working protocol):

- product_capabilities: the durable, queryable description of what
  Launchpad is and does today, distinct from work intake (things to
  do) and reference (the API surface). Hangs off work_areas (scope
  'product') so capability sections, roadmap swimlanes and backlog
  groups agree; source_document_id links back to the verbatim
  work_documents row. kind classifies each row (overview, value,
  capability, glance); maturity (live, partial, planned,
  exploratory) is the today-vs-planned axis the roadmap is read
  against; verified stays false until the owner confirms a row
  against the real build state. blocks reuses the api_topics typed
  block vocabulary, so new facts about a capability are a data edit,
  never a code change.

Every roadmap and backlog rendering (list, timeline, swimlanes,
waterfall, exported snapshots) reads these same rows, so
reprioritising or rescheduling is always a data change, never a
code change.

Application review (50_review.sql, docs/APP-REVIEW.md):

- review_waves: one wave per point-in-time review of the merchant
  application estate (draft, active, closed). carried_from_wave_id
  links a wave to the one whose watch list it inherited.
- review_applications: one row per LaunchPad application in a wave.
  Three separate columns hold three separate things and are never
  collapsed: launchpad_status (external truth), triage_category (our
  judgement), and confirmed_at/confirmed_by (a human's decision about
  our own review, applicable to any row whatever its category).
- review_evidence: the mail trail a classification rests on.
  is_truncated marks a source that cut off mid-sentence; signal types
  what an entry means (approval, decline, delivery_failure, request)
  so contradictions are found structurally rather than by matching
  words in prose. Screenshots are never persisted - screenshot_ref is
  a human-written locator, never a URL.
- review_revisions: every change to a classification, written by
  trigger rather than by the caller, so it cannot be skipped.
- launchpad_statuses, triage_categories: lookups that carry behaviour
  as well as labels. age_meaningful decides whether a record's age is
  a staleness signal at all (it is false for Application In Progress,
  where a dormant draft may sit for months with nothing handed to us);
  requires_note forces a real message onto Pending Further Information;
  group_key drives the needs-action / ongoing / settled split.

This module is READ ONLY in the browser: policies.sql grants select and
nothing else, and every write happens in a Claude Code session over the
service connection. Age, group membership, the three-way split, the
do-now ordering and duplicate detection are all derived at render time
and never stored.

## Schema and migrations

Two representations of the same database, kept in step:

- supabase/schema/ is the canonical, readable definition - one file per
  domain (00_core, 10_reference, 20_portal, 30_work, 40_platform,
  90_dashboard), run in lexical order. Read this to understand the
  current shape.
- supabase/migrations/ is the applied history - timestamped files the
  live project has already run, in order.

The baseline policy: every schema change updates BOTH in the same commit
- the readable definition in schema/ and a new timestamped migration the
  live project applies. Never edit a migration that has been applied; a
  correction is a new migration. schema/ must always equal the net effect
  of all migrations, so where a later migration supersedes earlier tables
  (the roadmap_items and backlog_items tables were unified into work_items
  by 20260716140000_unify_work_items), the old migrations stay untouched
  as history and schema/ reflects only the current state.
  tests/checks/security.test.js enforces that every table declared in
  schema/ has RLS enabled and a policy in policies.sql - a table without
  them is publicly readable via the anon key.

## Performance

The portal is built to stay fast as the Supabase content grows.
These rules hold for all new work; tests/checks/perf.test.js
enforces the mechanical ones.

- RLS policies wrap auth.uid() and the helper functions in scalar
  subselects - (select auth.uid()) - so Postgres evaluates them once
  per query instead of once per row. No "for all" policies: admin
  writes are separate insert/update/delete policies so a select only
  evaluates one permissive policy.
- Every foreign key that policies or pages filter on has a covering
  index (supabase/schema/).
- The dashboard reads all card counts through one dashboard_counts()
  RPC, capped at 1001 rows per table, so counting never scans a
  large table and never fans out into per-module requests.
- guard.js caches the user's role and module grants in
  sessionStorage; navigation renders immediately and the grants
  revalidate in the background.
- Pages fetch only the columns they render, leave heavy jsonb
  columns (api_specs.spec, work_documents.content) to on-demand
  queries, and issue independent queries in parallel.
- Every page pins the supabase-js CDN script to an exact version
  (immutable caching) and preconnects to the CDN and Supabase
  origins before the first request needs them.

## Updating content

Day-to-day updates to reference material are database edits made in
the Supabase dashboard: no commits, no deploys, and nothing sensitive
enters git history. The repo changes only when structure, styling or
rendering behaviour changes.

## Hosting

The canonical deployment is GitHub Pages, published by
.github/workflows/deploy.yml on every push to main after the tests
pass. Because the public config is built into supabase.js, the
deployed static site works with no per-environment artefact. Any other
static host (Netlify, Vercel, or opening the files locally) works the
same way.

For hosted deployments, add the deployed URL to the Supabase auth
redirect allow-list (Authentication, then URL configuration).
