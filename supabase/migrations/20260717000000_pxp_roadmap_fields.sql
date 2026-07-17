-- ------------------------------------------------------------------
-- 20260717000000_pxp_roadmap_fields.sql
--
-- Expands work_items with optional, light-touch PXP roadmapping fields
-- and adds a work_item_phases child table, aligning the roadmap toward
-- the external KPI portal without cluttering the board. All new item
-- fields are optional; the board still shows only title, band, dates
-- and the coarse progress bar. Also adds a work_items delivery
-- breakdown to dashboard_counts() for the dashboard progress meter.
--
-- Mirrored in supabase/schema/30_work.sql, supabase/schema/90_dashboard.sql,
-- supabase/policies.sql and supabase/seed.sql. Idempotent.
-- ------------------------------------------------------------------

-- --- work_items: new optional columns ------------------------------

alter table public.work_items
  add column if not exists progress smallint not null default 0
    check (progress between 0 and 100);
alter table public.work_items
  add column if not exists prd_status text
    check (prd_status in ('n_a', 'in_progress', 'pre_approved', 'approved', 'rejected'));
alter table public.work_items
  add column if not exists project_status text
    check (project_status in ('planned', 'in_progress', 'pending', 'on_hold', 'completed'));
alter table public.work_items
  add column if not exists start_sprint text
    check (start_sprint ~ '^[0-9]{2}-[0-9]{2}$');
alter table public.work_items
  add column if not exists end_sprint text
    check (end_sprint ~ '^[0-9]{2}-[0-9]{2}$');
alter table public.work_items
  add column if not exists attributes jsonb not null default '{}'::jsonb;

-- --- work_item_phases: optional delivery phases --------------------

create table if not exists public.work_item_phases (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  phase text not null
    check (phase in ('discovery', 'build', 'certification', 'launch')),
  quarter text,
  starts_on date,
  ends_on date,
  start_tbc boolean not null default false,
  end_tbc boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_item_id, phase)
);

create index if not exists work_item_phases_item_idx
  on public.work_item_phases (work_item_id, sort_order);

drop trigger if exists work_item_phases_updated_at on public.work_item_phases;
create trigger work_item_phases_updated_at
  before update on public.work_item_phases
  for each row execute function public.set_updated_at();

-- --- RLS for work_item_phases (mirrors the content-table pattern) --

alter table public.work_item_phases enable row level security;

drop policy if exists "work_item_phases: members read"   on public.work_item_phases;
drop policy if exists "work_item_phases: admins insert"  on public.work_item_phases;
drop policy if exists "work_item_phases: admins update"  on public.work_item_phases;
drop policy if exists "work_item_phases: admins delete"  on public.work_item_phases;

create policy "work_item_phases: members read"
  on public.work_item_phases for select
  to authenticated
  using ((select public.has_module_access('roadmap')) or (select public.has_module_access('backlog')));

create policy "work_item_phases: admins insert"
  on public.work_item_phases for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "work_item_phases: admins update"
  on public.work_item_phases for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "work_item_phases: admins delete"
  on public.work_item_phases for delete
  to authenticated
  using ((select public.is_admin()));

-- --- dashboard_counts(): add the roadmap delivery breakdown --------

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

revoke execute on function public.dashboard_counts() from public, anon;
grant execute on function public.dashboard_counts() to authenticated;
