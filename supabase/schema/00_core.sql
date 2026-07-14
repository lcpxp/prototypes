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
