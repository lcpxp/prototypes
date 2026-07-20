-- ------------------------------------------------------------------
-- 20260720000000_workstreams_and_visibility.sql
--
-- Name the high-level layer and give it a shareholder-clean projection.
--
-- 1. work_items.level marks a top-level item as a WORKSTREAM (a
--    presentable container - "Self Service API", "Unity integration")
--    versus a plain ITEM (standalone, or a sub-step nested under a
--    workstream by parent_id). It is the presentation hierarchy; the
--    work_areas table stays as the internal FILING taxonomy only.
--    A workstream is always top-level, so it can never carry a parent.
-- 2. roadmap_categories.shareholder_visible lets whole themes (Core
--    LaunchPad, and anything bug/fix-flavoured) drop out of the
--    shareholder projection without deleting anything.
-- 3. roadmap_current is a read view: the whole roadmap joined and
--    human-readable in one query, so any assistant with the project ref
--    reads it in a single call (see docs/ROADMAP-PLAYBOOK.md). It runs
--    security_invoker, so it exposes exactly what the caller's RLS
--    already allows on the base tables - no new surface.
--
-- All additive on existing RLS-gated tables, so no policy change is
-- needed (new columns inherit work_items / roadmap_categories RLS).
-- Idempotent.
-- ------------------------------------------------------------------

-- 1. Workstream / item level -------------------------------------------------
alter table public.work_items
  add column if not exists level text not null default 'item';

-- Mark the current parents (data-driven, no hard-coded titles) as
-- workstreams so the board reads identically after the migration. Guard
-- on parent_id is null so the workstream/top-level check below holds.
update public.work_items
  set level = 'workstream'
  where parent_id is null
    and id in (select distinct parent_id from public.work_items where parent_id is not null)
    and level <> 'workstream';

alter table public.work_items
  drop constraint if exists work_items_level_check;
alter table public.work_items
  add constraint work_items_level_check
  check (level in ('workstream', 'item'));

-- A workstream is a top-level container; it never nests under a parent.
alter table public.work_items
  drop constraint if exists work_items_workstream_top_level;
alter table public.work_items
  add constraint work_items_workstream_top_level
  check (level <> 'workstream' or parent_id is null);

create index if not exists work_items_level_idx
  on public.work_items (level, priority, sort_order);

-- 2. Shareholder visibility on themes ---------------------------------------
alter table public.roadmap_categories
  add column if not exists shareholder_visible boolean not null default true;

-- Core LaunchPad is the internal catch-all (fixes, plumbing, uncategorised
-- work); keep it out of the shareholder projection by default.
update public.roadmap_categories
  set shareholder_visible = false
  where key = 'core';

-- 3. roadmap_current: the one-query, human-readable snapshot -----------------
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
