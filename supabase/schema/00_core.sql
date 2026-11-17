-- ------------------------------------------------------------------
-- 00_core.sql - Users, access grants and shared plumbing. The schema
-- is split per domain; run the files in supabase/schema/ in lexical
-- order, then policies.sql, then (optionally) seed.sql.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- profiles: one row per portal user, extends Supabase auth.users.
-- Created automatically by trigger when a user is added.
-- ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  -- Every new account starts restricted: it sees Platform, Integrations
  -- and the API reference and nothing else until an admin grants more
  -- on the Users page. Written in the same statement as the profile, so
  -- there is no moment when a new account can read everything.
  -- has_module_access() in policies.sql reads these rows.
  -- The explicit denials repeat what the '*' row already says, for
  -- page code built before 2026-11-17, which reads denials only and
  -- would otherwise list those modules in the nav (the data stays
  -- hidden either way).
  insert into public.module_access (user_id, module_key, allowed)
  values (new.id, '*', false),
         (new.id, 'platform', true),
         (new.id, 'integrations', true),
         (new.id, 'reference', true),
         (new.id, 'roadmap', false),
         (new.id, 'sprints', false),
         (new.id, 'backlog', false),
         (new.id, 'app-review', false),
         (new.id, 'portal-review', false),
         (new.id, 'prototypes', false),
         (new.id, 'users', false)
  on conflict (user_id, module_key) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Shared updated_at trigger function.
-- ---------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- module_access: per-user, per-module grants. Module keys come from
-- assets/js/core/registry.js. Absence of a row means allowed, so new
-- users and newly added modules start open; rows record explicit
-- toggles made on the users page. Admins always have access.
-- ---------------------------------------------------------------

create table if not exists public.module_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_key text not null,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

drop trigger if exists module_access_updated_at on public.module_access;
create trigger module_access_updated_at
  before update on public.module_access
  for each row execute function public.set_updated_at();

-- dashboard_counts() lives in 90_dashboard.sql: it selects from
-- tables across every domain, so it must run after all of them.
