# Security model

This repository is public. This document defines what that means and
what keeps the portal's content private anyway.

## The boundary is the database, not the login page

Anyone can read every file in this repo, view the page source, and see
the Supabase project URL and anon key once config.js is deployed. None
of that is a secret:

- The anon key is designed to be shipped to browsers. On its own it
  grants only what Row Level Security policies allow.
- With RLS enabled and the policies in supabase/policies.sql applied,
  an unauthenticated holder of the anon key can read and write
  nothing. A signed-in member can read content but not change it.
  Only admins can write.

The login page is a front door for people. RLS is the lock. Never rely
on the JavaScript guard for security; it is a user-experience feature
that redirects people to sign in, and nothing more.

## What must never enter the repo

- The service_role key, under any circumstances. It bypasses RLS
  entirely. It belongs in the Supabase dashboard and nowhere else.
- assets/js/config.js (gitignored). Even though the anon key is not
  secret, keeping config out of git keeps environments clean and keeps
  the habit unambiguous.
- Real merchant names, live internal endpoint URLs, credentials,
  personal data, or realistic payloads containing any of these. All of
  that belongs in database rows, which RLS protects.
- Screenshots or logs that reveal any of the above.

If sensitive material is ever committed, rotating the exposed value is
mandatory; deleting the commit is not enough, because forks, clones
and caches persist.

## Rules for every new table

1. Enable RLS in the same change that creates the table.
2. Write explicit policies in supabase/policies.sql: who can select,
   who can write, always scoped to authenticated, with admin checks
   through the is_admin() function.
3. Assume a table with no policies is world-readable via the anon key,
   because with RLS off, it is.

## Account and access practice

- Accounts are created by an admin in the Supabase dashboard
  (Authentication, then Users, then Add user). Self-service signup is
  not offered by the portal and should remain disabled in the
  Supabase auth settings for this project.
- Grant the admin role sparingly, via SQL:
  update public.profiles set role = 'admin' where email = '...';
- Remove leavers in the Supabase dashboard; the profile row cascades.
- Use strong, unique passwords for the Supabase account itself and
  enable MFA on it. The dashboard account is the real crown jewels.

## Residual risks to keep in mind

- Content is only as private as the weakest RLS policy. Review
  policies.sql whenever the schema changes.
- Members can read everything members can read; there is no
  per-document access control in this skeleton. If that is ever
  needed, it becomes new RLS policy work, not front-end work.
- The repo being public means its structure, table names and rendering
  logic are visible. That is accepted by design; nothing in structure
  alone should be sensitive.
