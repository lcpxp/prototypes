# Setup and day-to-day use

How to stand up a working copy of the hub. The repo is the static
shell; everything dynamic comes from a Supabase project you own.

## First-time setup

1. Create a Supabase project at supabase.com (free tier is fine).
2. In the Supabase SQL editor, run in order: supabase/schema.sql,
   then supabase/policies.sql, then optionally supabase/seed.sql for
   sample content.
3. Copy assets/js/core/config.example.js to assets/js/core/config.js
   and fill in the Project URL and anon public key from Project
   settings, API. config.js is gitignored; never commit it.
4. In the Supabase dashboard, Authentication then Users, add your
   first user (email and password, auto-confirm on). Then in the SQL
   editor promote it:
   update public.profiles set role = 'admin' where email = 'you@example.com';
5. Serve the folder with any static server, for example:
   python3 -m http.server 8000
   and open http://localhost:8000. Sign in with the user from step 4.

In Supabase Auth settings, enable leaked password protection and keep
self-service signup disabled; accounts are created by admins only.

## Day-to-day use

- Reference material: edit rows in the api_specs and api_endpoints
  tables in Supabase. The viewer reflects changes on reload with no
  commits or deploys.
- Prototypes: add a page under modules/prototypes/ plus a registry
  row in the prototypes table. The gallery and dashboard pick it up.
- Users and access: manage accounts in the Supabase dashboard;
  roles and per-module access from the users module in the hub.

## Hosting

Any static host works (GitHub Pages, Netlify, Vercel). The only
per-environment artefact is assets/js/core/config.js, created by hand
from config.example.js and never committed. Add the deployed URL to
the Supabase auth redirect allow-list (Authentication, then URL
configuration).
