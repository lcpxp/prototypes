-- ------------------------------------------------------------------
-- Applied 2026-09-15. RLS for the four sprint and metric tables, in the
-- same shape as every other content table: members read behind the
-- owning module's grant, admins write.
--
-- Declarative home: supabase/policies.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('sprints',            '(select public.has_module_access(''roadmap''))'),
      ('sprint_plan',        '(select public.is_admin())'),
      ('work_item_sprints',  '(select public.has_module_access(''roadmap''))'),
      ('work_item_metrics',  '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))')
    ) as v(tbl, read_expr)
  loop
    execute format('drop policy if exists "%s: members read" on public.%I', entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins insert" on public.%I', entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins update" on public.%I', entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins delete" on public.%I', entry.tbl, entry.tbl);
    execute format('create policy "%s: members read" on public.%I
      for select to authenticated using (%s)', entry.tbl, entry.tbl, entry.read_expr);
    execute format('create policy "%s: admins insert" on public.%I
      for insert to authenticated with check ((select public.is_admin()))', entry.tbl, entry.tbl);
    execute format('create policy "%s: admins update" on public.%I
      for update to authenticated using ((select public.is_admin()))
      with check ((select public.is_admin()))', entry.tbl, entry.tbl);
    execute format('create policy "%s: admins delete" on public.%I
      for delete to authenticated using ((select public.is_admin()))', entry.tbl, entry.tbl);
  end loop;
end $$;
