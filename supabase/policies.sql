-- ------------------------------------------------------------------
-- policies.sql - Row Level Security. Run AFTER schema.sql.
--
-- This file is the security boundary of the whole portal. The anon
-- key in the browser is only safe because these policies exist:
--
--   * Unauthenticated visitors can read and write NOTHING.
--   * Signed-in users can read specs, endpoints, prototypes and the
--     user list.
--   * Only admins (profiles.role = 'admin') can write.
--
-- If a table is ever added without enabling RLS and adding policies,
-- its contents are exposed to anyone with the anon key. Treat any
-- new table as public until this file covers it.
-- ------------------------------------------------------------------

-- Admin check. SECURITY DEFINER so the lookup on profiles does not
-- recurse through profiles' own RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Module grant check used by content-table policies. Absence of a
-- module_access row means allowed; admins always pass. SECURITY
-- DEFINER so the lookup does not recurse through RLS.
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

-- Internal functions must not be callable as API RPCs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles: members read all" on public.profiles;
drop policy if exists "profiles: members read" on public.profiles;
create policy "profiles: members read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.has_module_access('users'));

drop policy if exists "profiles: users update own name" on public.profiles;
create policy "profiles: users update own name"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists "profiles: admins manage" on public.profiles;
create policy "profiles: admins manage"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- api_specs
-- ---------------------------------------------------------------

alter table public.api_specs enable row level security;

drop policy if exists "api_specs: members read" on public.api_specs;
create policy "api_specs: members read"
  on public.api_specs for select
  to authenticated
  using (public.has_module_access('reference'));

drop policy if exists "api_specs: admins write" on public.api_specs;
create policy "api_specs: admins write"
  on public.api_specs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- api_endpoints
-- ---------------------------------------------------------------

alter table public.api_endpoints enable row level security;

drop policy if exists "api_endpoints: members read" on public.api_endpoints;
create policy "api_endpoints: members read"
  on public.api_endpoints for select
  to authenticated
  using (public.has_module_access('reference'));

drop policy if exists "api_endpoints: admins write" on public.api_endpoints;
create policy "api_endpoints: admins write"
  on public.api_endpoints for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- integrations
-- ---------------------------------------------------------------

alter table public.integrations enable row level security;

drop policy if exists "integrations: members read" on public.integrations;
create policy "integrations: members read"
  on public.integrations for select
  to authenticated
  using (public.has_module_access('integrations'));

drop policy if exists "integrations: admins write" on public.integrations;
create policy "integrations: admins write"
  on public.integrations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- prototypes
-- ---------------------------------------------------------------

alter table public.prototypes enable row level security;

drop policy if exists "prototypes: members read" on public.prototypes;
create policy "prototypes: members read"
  on public.prototypes for select
  to authenticated
  using (public.has_module_access('prototypes'));

drop policy if exists "prototypes: admins write" on public.prototypes;
create policy "prototypes: admins write"
  on public.prototypes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- roadmap tables: one pattern for all four, keyed to the roadmap
-- module grant for reads, admin-only writes.
-- ---------------------------------------------------------------

alter table public.roadmap_areas enable row level security;

drop policy if exists "roadmap_areas: members read" on public.roadmap_areas;
create policy "roadmap_areas: members read"
  on public.roadmap_areas for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_areas: admins write" on public.roadmap_areas;
create policy "roadmap_areas: admins write"
  on public.roadmap_areas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.roadmap_milestones enable row level security;

drop policy if exists "roadmap_milestones: members read" on public.roadmap_milestones;
create policy "roadmap_milestones: members read"
  on public.roadmap_milestones for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_milestones: admins write" on public.roadmap_milestones;
create policy "roadmap_milestones: admins write"
  on public.roadmap_milestones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.roadmap_items enable row level security;

drop policy if exists "roadmap_items: members read" on public.roadmap_items;
create policy "roadmap_items: members read"
  on public.roadmap_items for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_items: admins write" on public.roadmap_items;
create policy "roadmap_items: admins write"
  on public.roadmap_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.roadmap_dependencies enable row level security;

drop policy if exists "roadmap_dependencies: members read" on public.roadmap_dependencies;
create policy "roadmap_dependencies: members read"
  on public.roadmap_dependencies for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_dependencies: admins write" on public.roadmap_dependencies;
create policy "roadmap_dependencies: admins write"
  on public.roadmap_dependencies for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- module_access
-- ---------------------------------------------------------------

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

-- ---------------------------------------------------------------
-- After running this file, promote your own account to admin:
--
--   update public.profiles set role = 'admin'
--   where email = 'you@example.com';
-- ---------------------------------------------------------------
