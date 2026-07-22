-- ------------------------------------------------------------------
-- 20260722160000_work_item_associated_departments.sql
--
-- Business area associations for work_items.
--
-- work_items.department names the single business function that OWNS
-- (builds) the item. associated_departments is an additional set of
-- department keys that also want visibility of the item without owning
-- it. Filtering the board by a department now matches owner OR
-- association, so an "Operations" view surfaces every item Operations
-- cares about, whatever its primary categorisation.
--
-- Values reuse the department key vocabulary (see work_items.department
-- and App.registry.departments). Same table, so existing work_items RLS
-- covers the new column; no policy change is needed. Idempotent.
--
-- The view is dropped and recreated (not create-or-replace) so its
-- security_invoker option is restated explicitly and can never be lost.
-- ------------------------------------------------------------------

alter table public.work_items
  add column if not exists associated_departments text[] not null default '{}';

alter table public.work_items
  drop constraint if exists work_items_associated_departments_check;
alter table public.work_items
  add constraint work_items_associated_departments_check
  check (associated_departments <@ array['sales_commercial', 'operations_onboarding',
    'product_technology', 'finance_revenue', 'legal_compliance',
    'risk_underwriting']::text[]);

create index if not exists work_items_associated_departments_idx
  on public.work_items using gin (associated_departments);

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
