-- ------------------------------------------------------------------
-- 90_dashboard.sql - Cross-domain functions. Runs last because the
-- function body references tables from every schema file.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- dashboard_counts: every dashboard card count in one round trip
-- instead of one request per module. SECURITY INVOKER, so RLS
-- filters each count to what the caller may read. Counts are capped
-- at 1001 (the dashboard shows "1000+") so a card never triggers a
-- full scan of a large table. Keys mirror the statTable values in
-- assets/js/core/registry.js; extend this function when a module
-- gains a statTable. Grants live in policies.sql.
-- ---------------------------------------------------------------

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
