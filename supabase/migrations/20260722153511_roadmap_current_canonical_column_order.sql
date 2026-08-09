-- ------------------------------------------------------------------
-- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations.
-- Applied to the live project on 2026-07-22 through the MCP, but its
-- file was never committed, so supabase/schema/ described a database
-- the repo could not rebuild. Body verbatim as applied; it matches the
-- roadmap_current definition in supabase/schema/30_work.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

drop view if exists public.roadmap_current;
create view public.roadmap_current
  with (security_invoker = on) as
  select
    wi.id,
    wi.title,
    wi.level,
    (wi.parent_id is not null) as is_child,
    parent.title              as workstream_title,
    rc.key                    as theme_key,
    rc.label                  as theme_label,
    coalesce(rc.shareholder_visible, false) as shareholder_visible,
    wa.title                  as filing_area,
    wa.scope                  as scope,
    wi.department,
    wi.associated_departments,
    wi.type,
    wi.status,
    wi.horizon,
    wi.end_horizon,
    wi.presentation,
    wi.priority,
    wi.progress,
    wi.start_sprint,
    wi.end_sprint,
    wi.updated_at
  from public.work_items wi
  left join public.work_items parent    on parent.id = wi.parent_id
  left join public.roadmap_categories rc on rc.id = wi.category_id
  left join public.work_areas wa         on wa.id = wi.area_id
  order by rc.sort_order nulls last, wi.priority, wi.sort_order;

grant select on public.roadmap_current to anon, authenticated;
