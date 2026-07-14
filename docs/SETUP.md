# Setup and day-to-day use

The app ships with the public Supabase config built into
assets/js/core/supabase.js, so it runs and deploys with no
configuration step. This doc covers viewing it, running it locally,
and standing up your own backend.

## Viewing the deployed site

Every push to main runs the tests and, if green, publishes the site
to GitHub Pages (.github/workflows/deploy.yml). The deploy's URL shows
on the workflow run and in the repo's Pages settings. Nothing to
configure: the first run enables Pages automatically.

## Running locally

Serve the folder with any static server, for example:

    python3 -m http.server 8000

then open http://localhost:8000. It uses the built-in public config,
so sign in works immediately with a valid account.

To point a local build at a DIFFERENT Supabase project, copy
assets/js/core/config.example.js to assets/js/core/config.js and fill
in that project's URL and anon key. config.js is gitignored, loads
before supabase.js when present, and overrides the built-in config.
Never commit it.

## Standing up your own Supabase backend

1. Create a Supabase project at supabase.com (free tier is fine).
2. In the SQL editor, run the files in supabase/schema/ in lexical
   order, then supabase/policies.sql, then optionally
   supabase/seed.sql. Apply
   later changes from supabase/migrations/ in filename order.
3. Put the new project's URL and anon key into supabase.js (or a local
   config.js for testing before you commit).
4. Authentication then Users: add your first user (auto-confirm on),
   then promote it in the SQL editor:
   update public.profiles set role = 'admin' where email = 'you@example.com';
5. In Auth settings, enable leaked password protection and keep
   self-service signup disabled; accounts are created by admins only.

## Day-to-day use

- Reference material: edit rows in the api_specs and api_endpoints
  tables in Supabase. The viewer reflects changes on reload with no
  commits or deploys.
- Prototypes: add a page under modules/prototypes/ plus a registry
  row in the prototypes table. The gallery and dashboard pick it up.
- Users and access: manage accounts in the Supabase dashboard; set
  roles and per-module access from the users module in the hub.
