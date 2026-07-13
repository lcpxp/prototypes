-- ------------------------------------------------------------------
-- Applied to the live project on 2026-07-13 via the Supabase MCP
-- migration runner. Mirrored here for the record; schema.sql and
-- policies.sql remain the canonical full definitions for a fresh
-- project. New database changes get a new file in this folder and
-- the same change folded into the canonical files.
-- ------------------------------------------------------------------

-- Module access grants and function hardening.

-- 1. Per-user, per-module access. Absence of a row means allowed, so
-- new users and newly added modules start open; rows record explicit
-- toggles. Admins always have access via has_module_access().
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

alter table public.module_access enable row level security;

drop policy if exists "module_access: users read own" on public.module_access;
create policy "module_access: users read own"
  on public.module_access for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "module_access: admins manage" on public.module_access;
create policy "module_access: admins manage"
  on public.module_access for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Grant check used by content-table policies. SECURITY DEFINER so
-- it can read module_access without recursing through its policies.
create or replace function public.has_module_access(key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or not exists (
    select 1 from public.module_access
    where user_id = auth.uid() and module_key = key and not allowed
  );
$$;

revoke execute on function public.has_module_access(text) from public, anon;
grant execute on function public.has_module_access(text) to authenticated;

-- 3. Content reads now follow module grants. Writes stay admin-only.
drop policy if exists "api_specs: members read" on public.api_specs;
create policy "api_specs: members read"
  on public.api_specs for select
  to authenticated
  using (public.has_module_access('reference'));

drop policy if exists "api_endpoints: members read" on public.api_endpoints;
create policy "api_endpoints: members read"
  on public.api_endpoints for select
  to authenticated
  using (public.has_module_access('reference'));

drop policy if exists "prototypes: members read" on public.prototypes;
create policy "prototypes: members read"
  on public.prototypes for select
  to authenticated
  using (public.has_module_access('prototypes'));

drop policy if exists "profiles: members read all" on public.profiles;
drop policy if exists "profiles: members read" on public.profiles;
create policy "profiles: members read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.has_module_access('users'));

-- 4. Function hardening from security advisors: pin search_path and
-- stop SECURITY DEFINER functions being callable as anonymous RPCs.
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
