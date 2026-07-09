# LPio - LaunchPad IO

LPio is a public repository that acts as a top-level project hub for
developer material, guidance, prototypes and independent workstreams.
It provides a central place to store, share and work on material while
letting each area live in its own silo when needed. This repository is
public by design and therefore contains only structure, styling and
rendering logic. All substantive content (API specs, endpoints, users,
the prototype registry) lives in Supabase behind Row Level Security.
See docs/SECURITY.md before committing anything.

## Layout

    index.html            Login (entry point)
    dashboard.html        Post-login hub
    reference.html        API reference viewer ("swagger")
    users.html            User register
    silos/                Central project-silo index and standalone silo pages
    prototypes/           Prototype pages and gallery
    assets/css/           tokens.css (design tokens), main.css
    assets/js/            Auth, guard, UI and page modules
    supabase/             schema.sql, policies.sql, seed.sql
    docs/                 ARCHITECTURE, SECURITY, SESSIONS, DESIGN

Working in this repo with Claude Code? Read CLAUDE.md first; it is
binding.

## Setup

1. Create a Supabase project at supabase.com (free tier is fine).
2. In the Supabase SQL editor, run in order:
   supabase/schema.sql, then supabase/policies.sql, then optionally
   supabase/seed.sql for sample content.
3. Copy assets/js/config.example.js to assets/js/config.js and fill in
   the Project URL and anon public key from Project settings, API.
   config.js is gitignored; never commit it.
4. In the Supabase dashboard, Authentication then Users, add your
   first user (email and password, auto-confirm on). Then in the SQL
   editor promote it:
   update public.profiles set role = 'admin' where email = 'you@example.com';
5. Serve the folder with any static server, for example:
   python3 -m http.server 8000
   and open http://localhost:8000. Sign in with the user from step 4.

## Day-to-day use

Reference material is updated by editing rows in the api_specs and
api_endpoints tables in Supabase; the viewer reflects changes on
reload with no commits or deploys. Prototypes are pages added under
prototypes/ plus a registry row in the prototypes table.

## Documentation

- docs/ARCHITECTURE.md - how the pieces fit together
- docs/SECURITY.md - the security model and hard rules
- docs/SESSIONS.md - session log, checkpoint and resume templates
- docs/DESIGN.md - binding visual and writing standards
- CLAUDE.md - operating rules for Claude Code sessions
