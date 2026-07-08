# Architecture

How the portal fits together. Read alongside SECURITY.md.

## The shape of the system

The repository is a static site: HTML pages, two stylesheets and a set
of small JavaScript modules. There is no build step and no server-side
code. Supabase provides everything dynamic: authentication, the user
register, API specs, endpoint detail and the prototype registry.

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
3. dashboard.html is the hub: counts, recent spec activity, and routes
   into the reference viewer, prototype gallery and user register.
4. reference.html renders the selected spec from the database.
5. prototypes/index.html renders the prototype registry as cards that
   link to prototype pages stored in the same directory.

## JavaScript module order

Each protected page loads scripts in a fixed order, each attaching to
a shared window.App namespace:

    supabase CDN client   provides window.supabase
    config.js             gitignored; defines window.APP_CONFIG
    supabase.js           creates App.db, or renders a setup notice
    guard.js              App.requireAuth promise, App.onAuthed(fn)
    ui.js                 nav rendering, App.escape, badges, copy
    <page module>         waits on App.onAuthed before fetching

Page modules never fetch before authentication resolves, and never
insert unescaped strings into the DOM.

## Data model

Four tables, defined in supabase/schema.sql:

- profiles: one row per user, created by trigger on signup, carrying
  email, display name and role (admin or member).
- api_specs: one row per spec, with title, version, status and an
  optional full OpenAPI 3 document in a JSONB column.
- api_endpoints: one row per endpoint (method, path, tag, summary,
  description, params, request and response examples, sort order),
  linked to a spec. This is the primary editing surface.
- prototypes: registry rows (title, description, path, status, tags)
  that drive the gallery and dashboard.

The reference viewer prefers api_endpoints rows and falls back to
parsing the spec JSONB when a spec has no endpoint rows, so a whole
OpenAPI document can be pasted in as a starting point and broken out
into rows later.

## Updating content

Day-to-day updates to reference material are database edits made in
the Supabase dashboard: no commits, no deploys, and nothing sensitive
enters git history. The repo changes only when structure, styling or
rendering behaviour changes.

## Hosting

Any static host works: GitHub Pages, Netlify, Vercel, or opening the
files locally. The only per-environment artefact is assets/js/config.js,
which is created by hand from config.example.js and never committed.
For hosted deployments, add the deployed URL to the Supabase auth
redirect allow-list (Authentication, then URL configuration).
