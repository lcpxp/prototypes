-- ------------------------------------------------------------------
-- 20260716140000_unify_work_items.sql
-- Collapse roadmap_items + backlog_items into ONE table, work_items,
-- so every roadmap/backlog view is a projection of the same rows and
-- a move between views is a single field edit. The item's own fields
-- place it everywhere:
--   Delivered = status 'done'
--   Parked    = not done AND (horizon 'someday' OR status 'dropped')
--   Active    = the rest (horizon now/next/later)
-- The per-item audience flag is retired: Executive is a theme rollup
-- of active work, always complete, so it cannot drift. UUIDs are
-- preserved on copy (the two id sets are disjoint) so work_notes and
-- dependency references stay intact.
-- ------------------------------------------------------------------

-- 1. The unified table: the union of both tables' columns.
create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.work_areas (id) on delete set null,
  category_id uuid references public.roadmap_categories (id) on delete set null,
  milestone_id uuid references public.roadmap_milestones (id) on delete set null,
  source_document_id uuid references public.work_documents (id) on delete set null,
  title text not null,
  summary text,
  details text,
  -- Backlog classification; null for roadmap-origin work.
  type text
    check (type in ('consideration', 'feature', 'functionality', 'bug', 'improvement', 'task')),
  status text not null default 'idea'
    check (status in ('idea', 'planned', 'in_progress', 'blocked', 'done', 'dropped')),
  -- The start band on the continuous axis. 'someday' is the Parked
  -- (far-future) band; now/next/later are the active bands.
  horizon text not null default 'someday'
    check (horizon in ('now', 'next', 'later', 'someday')),
  -- The band the item runs THROUGH, so a long activity spans columns.
  end_horizon text
    check (end_horizon in ('now', 'next', 'later', 'someday')),
  -- The Now card's state label (Now band only).
  presentation text not null default 'sequenced'
    check (presentation in ('sequenced', 'current', 'ongoing', 'wind', 'bridge')),
  priority integer not null default 100,
  effort text check (effort in ('small', 'medium', 'large')),
  impact text check (impact in ('low', 'medium', 'high')),
  starts_on date,
  ends_on date,
  external_ref text,
  requested_by text,
  tags text[] not null default '{}',
  sort_order integer not null default 100,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Copy roadmap_items, preserving id. Retire audience; map the two
--    roadmap-only statuses onto the unified set (a parked roadmap item
--    becomes planned work on the far horizon).
insert into public.work_items
  (id, area_id, category_id, milestone_id, title, summary, details,
   status, horizon, end_horizon, presentation, priority, effort, impact,
   starts_on, ends_on, tags, sort_order, created_at, updated_at)
select id, area_id, category_id, milestone_id, title, summary, details,
  case status when 'committed' then 'planned' when 'parked' then 'planned' else status end,
  case when status = 'parked' then 'someday' else horizon end,
  end_horizon, presentation, priority, effort, impact,
  starts_on, ends_on, tags, sort_order, created_at, updated_at
from public.roadmap_items;

-- 3. Copy backlog_items, preserving id. 'open' becomes 'idea' (an
--    untriaged candidate); the theme comes from the area, so
--    category_id stays null here.
insert into public.work_items
  (id, area_id, source_document_id, title, summary, details, type,
   status, horizon, end_horizon, priority, external_ref, requested_by,
   tags, sort_order, resolution, resolved_at, created_at, updated_at)
select id, area_id, source_document_id, title, summary, details, type,
  case status when 'open' then 'idea' else status end,
  horizon, end_horizon, priority, external_ref, requested_by,
  tags, sort_order, resolution, resolved_at, created_at, updated_at
from public.backlog_items;

create index if not exists work_items_area_idx
  on public.work_items (area_id, horizon, priority, sort_order);
create index if not exists work_items_category_idx
  on public.work_items (category_id);
create index if not exists work_items_status_idx
  on public.work_items (status, priority, sort_order);
create index if not exists work_items_milestone_idx
  on public.work_items (milestone_id);
create index if not exists work_items_source_document_idx
  on public.work_items (source_document_id);

-- Closing an item stamps resolved_at; reopening clears it. Also keeps
-- updated_at fresh, so work_items needs this one row trigger.
create or replace function public.set_work_item_resolution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status in ('done', 'dropped') then
    new.resolved_at = coalesce(new.resolved_at, now());
  else
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists work_items_resolution on public.work_items;
create trigger work_items_resolution
  before update on public.work_items
  for each row execute function public.set_work_item_resolution();

-- 4. Re-point work_notes onto work_items. Values survive because ids
--    were preserved; the two old columns collapse into one.
alter table public.work_notes
  add column if not exists work_item_id uuid references public.work_items (id) on delete set null;
update public.work_notes
  set work_item_id = coalesce(roadmap_item_id, backlog_item_id)
  where work_item_id is null;
drop index if exists public.work_notes_roadmap_item_idx;
drop index if exists public.work_notes_backlog_item_idx;
alter table public.work_notes drop column if exists roadmap_item_id;
alter table public.work_notes drop column if exists backlog_item_id;
create index if not exists work_notes_work_item_idx
  on public.work_notes (work_item_id);

-- 5. Dependencies now join work_items (empty today; recreated cleanly).
drop table if exists public.roadmap_dependencies;
create table if not exists public.work_item_dependencies (
  item_id uuid not null references public.work_items (id) on delete cascade,
  depends_on_id uuid not null references public.work_items (id) on delete cascade,
  primary key (item_id, depends_on_id),
  check (item_id <> depends_on_id)
);
create index if not exists work_item_dependencies_depends_on_idx
  on public.work_item_dependencies (depends_on_id);

-- 6. Drop the old tables and the now-unused backlog trigger function.
drop table if exists public.backlog_items cascade;
drop table if exists public.roadmap_items cascade;
drop function if exists public.set_backlog_resolution();

-- 7. dashboard_counts references the old tables; re-point it at
--    work_items (keys mirror registry.js statTable values).
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
    'product_capabilities', (select count(*) from (select 1 from public.product_capabilities limit 1001) c),
    'profiles',      (select count(*) from (select 1 from public.profiles      limit 1001) c)
  );
$$;

-- 8. RLS for the new tables. work_items is shared behind either the
--    roadmap or the backlog grant (both modules read it); admin writes.
alter table public.work_items enable row level security;
alter table public.work_item_dependencies enable row level security;

do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('work_items',             '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('work_item_dependencies', '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))')
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
