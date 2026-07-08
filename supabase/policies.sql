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

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles: members read all" on public.profiles;
create policy "profiles: members read all"
  on public.profiles for select
  to authenticated
  using (true);

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
  using (true);

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
  using (true);

drop policy if exists "api_endpoints: admins write" on public.api_endpoints;
create policy "api_endpoints: admins write"
  on public.api_endpoints for all
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
  using (true);

drop policy if exists "prototypes: admins write" on public.prototypes;
create policy "prototypes: admins write"
  on public.prototypes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------
-- After running this file, promote your own account to admin:
--
--   update public.profiles set role = 'admin'
--   where email = 'you@example.com';
-- ---------------------------------------------------------------
