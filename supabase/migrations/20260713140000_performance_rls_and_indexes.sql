-- ------------------------------------------------------------------
-- Performance pass driven by the Supabase advisors:
--
--   auth_rls_initplan          auth.uid() and the helper functions in
--                              policies now run once per query (as an
--                              initplan) via scalar subselects, not
--                              once per row.
--   multiple_permissive_policies
--                              the admin "for all" policies overlapped
--                              the member read policies, so every
--                              select evaluated two policies. Admin
--                              writes are now split into insert/
--                              update/delete; reads stay on a single
--                              policy (has_module_access already
--                              admits admins).
--   unindexed_foreign_keys     covering indexes for every flagged
--                              foreign key.
--
-- Also adds dashboard_counts(): every dashboard card count in one
-- request, capped at 1001 rows per table so counting stays cheap no
-- matter how large the content tables grow.
-- ------------------------------------------------------------------

-- 1. Helper functions: read auth.uid() through an initplan.

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

-- 2. Content tables: one read policy, split admin write policies.
--    The loop keeps all eleven tables on an identical pattern.

do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('api_specs',            '(select public.has_module_access(''reference''))'),
      ('api_endpoints',        '(select public.has_module_access(''reference''))'),
      ('integrations',         '(select public.has_module_access(''integrations''))'),
      ('prototypes',           '(select public.has_module_access(''prototypes''))'),
      ('work_areas',           '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('roadmap_milestones',   '(select public.has_module_access(''roadmap''))'),
      ('roadmap_items',        '(select public.has_module_access(''roadmap''))'),
      ('roadmap_dependencies', '(select public.has_module_access(''roadmap''))'),
      ('work_documents',       '(select public.has_module_access(''backlog''))'),
      ('backlog_items',        '(select public.has_module_access(''backlog''))'),
      ('work_notes',           '(select public.has_module_access(''backlog''))')
    ) as v(tbl, read_expr)
  loop
    execute format('drop policy if exists "%s: members read" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins write" on public.%I',
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

-- 3. profiles: same consolidation, plus the own-row rules.

drop policy if exists "profiles: members read" on public.profiles;
drop policy if exists "profiles: users update own name" on public.profiles;
drop policy if exists "profiles: admins manage" on public.profiles;

create policy "profiles: members read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.has_module_access('users')));

-- One update policy: admins may change anything; users may edit their
-- own row but never their own role.
create policy "profiles: update own or admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (
    (select public.is_admin())
    or (id = (select auth.uid())
        and role = (select p.role from public.profiles p
                    where p.id = (select auth.uid())))
  );

create policy "profiles: admins insert"
  on public.profiles for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "profiles: admins delete"
  on public.profiles for delete
  to authenticated
  using ((select public.is_admin()));

-- 4. module_access: same consolidation.

drop policy if exists "module_access: users read own" on public.module_access;
drop policy if exists "module_access: admins manage" on public.module_access;

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

-- 5. Covering indexes for every foreign key the advisors flagged.

create index if not exists backlog_items_roadmap_item_idx
  on public.backlog_items (roadmap_item_id);
create index if not exists backlog_items_source_document_idx
  on public.backlog_items (source_document_id);
create index if not exists roadmap_dependencies_depends_on_idx
  on public.roadmap_dependencies (depends_on_id);
create index if not exists roadmap_items_milestone_idx
  on public.roadmap_items (milestone_id);
create index if not exists work_documents_area_idx
  on public.work_documents (area_id);
create index if not exists work_documents_supersedes_idx
  on public.work_documents (supersedes_id);
create index if not exists work_notes_backlog_item_idx
  on public.work_notes (backlog_item_id);
create index if not exists work_notes_roadmap_item_idx
  on public.work_notes (roadmap_item_id);

-- 6. dashboard_counts(): all card counts in one round trip. SECURITY
--    INVOKER, so RLS filters each count to what the caller may read.
--    Counts are capped at 1001 (the dashboard shows "1000+") so a
--    card never triggers a full scan of a large table. Keys mirror
--    the statTable values in assets/js/core/registry.js.

create or replace function public.dashboard_counts()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'api_specs',     (select count(*) from (select 1 from public.api_specs     limit 1001) c),
    'integrations',  (select count(*) from (select 1 from public.integrations  limit 1001) c),
    'prototypes',    (select count(*) from (select 1 from public.prototypes    limit 1001) c),
    'roadmap_items', (select count(*) from (select 1 from public.roadmap_items limit 1001) c),
    'backlog_items', (select count(*) from (select 1 from public.backlog_items limit 1001) c),
    'profiles',      (select count(*) from (select 1 from public.profiles      limit 1001) c)
  );
$$;

revoke execute on function public.dashboard_counts() from public, anon;
grant execute on function public.dashboard_counts() to authenticated;
