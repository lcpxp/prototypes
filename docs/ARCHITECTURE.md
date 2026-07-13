# Architecture

How the portal fits together. Read alongside SECURITY.md.

## The shape of the system

The repository is a static site: HTML pages, two stylesheets and a set
of small JavaScript modules. There is no build step and no server-side
code. Supabase provides everything dynamic: authentication, the user
register, API specs, endpoint detail and the prototype registry.

LPio is the overarching project shell. It is designed so that different
streams of work can live as discrete silos (for example, a portal mock,
a standalone tool prototype, or a set of swagger-style reference files)
while still being discoverable from one hub.

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
   pages themselves), modules/roadmap/ (the roadmap view) and
   modules/users/ (the user and access register).
5. silos/index.html is the central entry to project-specific
   workstreams. Each silo can be its own folder or page and can be
   linked from here.

## JavaScript module order

Each protected page loads scripts in a fixed order, each attaching to
a shared window.App namespace:

    supabase CDN client   provides window.supabase
    core/supabase.js      creates App.db from the built-in public config
    core/registry.js      App.registry: modules, tables, roles
    core/guard.js         App.requireAuth promise, App.onAuthed(fn)
    core/ui.js            nav rendering, App.escape, badges, copy
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

Defined in supabase/schema.sql, in four groups:

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

- api_specs: one row per spec, with title, version, status, family
  and an optional full OpenAPI 3 document in a JSONB column. family
  (launchpad, unity, integration, other) groups specs into distinct
  reference sites: the Launchpad API (inbound flows plus
  Unity-initiated actions) and the Unity Merchant Portal API are the
  two primary families, mirrored in App.registry.specFamilies.
- api_endpoints: one row per endpoint (method, path, tag, summary,
  description, params, request and response examples, sort order),
  linked to a spec. This is the primary editing surface.

The reference viewer prefers api_endpoints rows and falls back to
parsing the spec JSONB when a spec has no endpoint rows, so a whole
OpenAPI document can be pasted in as a starting point and broken out
into rows later.

Catalogues:

- integrations: one row per third-party service connected to
  Launchpad, driving the overview table and detail modals. The
  detail JSONB column holds flat label/value pairs rendered
  verbatim, so recording a new fact is a database edit.
- prototypes: registry rows (title, description, path, status, tags)
  that drive the gallery and dashboard.

Roadmap:

- roadmap_areas: development areas (swimlanes), each with a stable
  key, title and sort order.
- roadmap_items: the work itself, linked to an area and optionally a
  milestone, with status, horizon (now/next/later/someday),
  priority, effort, impact, tags and optional dates so non-dated
  roadmaps stay first-class.
- roadmap_milestones: named target points, optionally dated.
- roadmap_dependencies: item-to-item ordering for waterfall and
  dependency views.

Every roadmap rendering (list, timeline, swimlanes, waterfall,
exported snapshots) reads these same rows, so reprioritising or
rescheduling is always a data change, never a code change.

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
