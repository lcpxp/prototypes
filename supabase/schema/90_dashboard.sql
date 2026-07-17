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
    'work_items',    (select count(*) from (select 1 from public.work_items    limit 1001) c),
    -- Roadmap delivery split for the dashboard progress meter, using the
    -- same derived rules the roadmap views apply (delivered = status
    -- done; parked = not done and (horizon someday or status dropped);
    -- active = the rest). Capped at 1001 rows like the counts above.
    'work_items_breakdown', (
      select jsonb_build_object(
        'total',     count(*),
        'delivered', count(*) filter (where status = 'done'),
        'parked',    count(*) filter (where status <> 'done' and (horizon = 'someday' or status = 'dropped')),
        'active',    count(*) filter (where status <> 'done' and not (horizon = 'someday' or status = 'dropped'))
      )
      from (select status, horizon from public.work_items limit 1001) w
    ),
    'product_capabilities', (select count(*) from (select 1 from public.product_capabilities limit 1001) c),
    'profiles',      (select count(*) from (select 1 from public.profiles      limit 1001) c)
  );
$$;
