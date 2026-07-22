-- ------------------------------------------------------------------
-- policies.sql - Row Level Security. Run AFTER the files in
-- supabase/schema/ (lexical order).
--
-- This file is the security boundary of the whole portal. The anon
-- key in the browser is only safe because these policies exist:
--
--   * Unauthenticated visitors can read and write NOTHING.
--   * Signed-in users can read content tables their module grants
--     allow, plus the user list.
--   * Only admins (profiles.role = 'admin') can write.
--
-- If a table is ever added without enabling RLS and adding policies,
-- its contents are exposed to anyone with the anon key. Treat any
-- new table as public until this file covers it.
--
-- Performance rules baked into every policy here (enforced by
-- tests/checks/perf.test.js):
--   * auth.uid() and the helper functions are always wrapped in a
--     scalar subselect - (select auth.uid()) - so Postgres evaluates
--     them once per query, not once per row.
--   * No "for all" policies. Admin writes are separate insert/update/
--     delete policies so a select only ever evaluates one permissive
--     policy. Reads already admit admins via has_module_access.
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
    where id = (select auth.uid()) and role = 'admin'
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
    where user_id = (select auth.uid()) and module_key = key and not allowed
  );
$$;

revoke execute on function public.has_module_access(text) from public, anon;
grant execute on function public.has_module_access(text) to authenticated;

-- The caller's own role. SECURITY DEFINER because policies on
-- profiles cannot subselect profiles - that recurses through the
-- table's own RLS.
create or replace function public.own_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke execute on function public.own_role() from public, anon;
grant execute on function public.own_role() to authenticated;

-- Internal functions must not be callable as API RPCs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Content tables. All follow one pattern, applied by the loop below:
-- a single read policy gated on the owning module's grant, and
-- admin-only insert/update/delete policies.
-- ---------------------------------------------------------------

alter table public.api_specs               enable row level security;
alter table public.api_endpoints           enable row level security;
alter table public.api_tags                enable row level security;
alter table public.api_topics              enable row level security;
alter table public.integrations            enable row level security;
alter table public.prototypes              enable row level security;
alter table public.future_prototypes       enable row level security;
alter table public.work_areas              enable row level security;
alter table public.roadmap_categories      enable row level security;
alter table public.roadmap_milestones      enable row level security;
alter table public.work_documents          enable row level security;
alter table public.work_items              enable row level security;
alter table public.work_item_phases        enable row level security;
alter table public.work_item_dependencies  enable row level security;
alter table public.work_notes              enable row level security;
alter table public.product_capabilities    enable row level security;

do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('api_specs',            '(select public.has_module_access(''reference''))'),
      ('api_endpoints',        '(select public.has_module_access(''reference''))'),
      ('api_tags',             '(select public.has_module_access(''reference''))'),
      ('api_topics',           '(select public.has_module_access(''reference''))'),
      ('integrations',         '(select public.has_module_access(''integrations''))'),
      ('prototypes',           '(select public.has_module_access(''prototypes''))'),
      ('future_prototypes',    '(select public.has_module_access(''prototypes''))'),
      -- work_areas and work_items are shared: readable behind either
      -- the roadmap or the backlog grant, since both modules read them
      -- (the roadmap board and the backlog table are two views of the
      -- same work_items rows).
      ('work_areas',             '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('roadmap_categories',     '(select public.has_module_access(''roadmap''))'),
      ('roadmap_milestones',     '(select public.has_module_access(''roadmap''))'),
      ('work_documents',         '(select public.has_module_access(''backlog''))'),
      ('work_items',             '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('work_item_phases',       '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('work_item_dependencies', '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('work_notes',             '(select public.has_module_access(''backlog''))'),
      ('product_capabilities', '(select public.has_module_access(''platform''))')
    ) as v(tbl, read_expr)
  loop
    execute format('drop policy if exists "%s: members read" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins write" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins insert" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins update" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins delete" on public.%I',
      entry.tbl, entry.tbl);
    execute format('create policy "%s: members read" on public.%I
      for select to authenticated using (%s)',
      entry.tbl, entry.tbl, entry.read_expr);
    execute format('create policy "%s: admins insert" on public.%I
      for insert to authenticated with check ((select public.is_admin()))',
      entry.tbl, entry.tbl);
    execute format('create policy "%s: admins update" on public.%I
      for update to authenticated using ((select public.is_admin()))
      with check ((select public.is_admin()))',
      entry.tbl, entry.tbl);
    execute format('create policy "%s: admins delete" on public.%I
      for delete to authenticated using ((select public.is_admin()))',
      entry.tbl, entry.tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- profiles: everyone reads their own row; the user list needs the
-- users module grant. Users may edit their own row but never their
-- own role; admins may change anything.
-- ---------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles: members read all" on public.profiles;
drop policy if exists "profiles: members read" on public.profiles;
drop policy if exists "profiles: users update own name" on public.profiles;
drop policy if exists "profiles: admins manage" on public.profiles;
drop policy if exists "profiles: update own or admin" on public.profiles;
drop policy if exists "profiles: admins insert" on public.profiles;
drop policy if exists "profiles: admins delete" on public.profiles;

create policy "profiles: members read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.has_module_access('users')));

create policy "profiles: update own or admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (
    (select public.is_admin())
    or (id = (select auth.uid()) and role = (select public.own_role()))
  );

create policy "profiles: admins insert"
  on public.profiles for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "profiles: admins delete"
  on public.profiles for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------
-- module_access: users see their own grants; only admins write.
-- ---------------------------------------------------------------

alter table public.module_access enable row level security;

drop policy if exists "module_access: users read own" on public.module_access;
drop policy if exists "module_access: admins manage" on public.module_access;
drop policy if exists "module_access: admins insert" on public.module_access;
drop policy if exists "module_access: admins update" on public.module_access;
drop policy if exists "module_access: admins delete" on public.module_access;

create policy "module_access: users read own"
  on public.module_access for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "module_access: admins insert"
  on public.module_access for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "module_access: admins update"
  on public.module_access for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "module_access: admins delete"
  on public.module_access for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------
-- dashboard_counts() (defined in schema/90_dashboard.sql) is the one read RPC:
-- callable by signed-in users only, never by anon.
-- ---------------------------------------------------------------

revoke execute on function public.dashboard_counts() from public, anon;
grant execute on function public.dashboard_counts() to authenticated;

-- ---------------------------------------------------------------
-- After running this file, promote your own account to admin:
--
--   update public.profiles set role = 'admin'
--   where email = 'you@example.com';
-- ---------------------------------------------------------------
