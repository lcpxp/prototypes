-- Roadmap skeleton. Four tables designed so every future roadmap
-- view (timeline graphic, swimlanes, waterfall priority, zoomed
-- detail, exported snapshots) is a rendering of the same rows and
-- all day-to-day adjustment is a database edit. Dates are optional
-- so non-dated roadmaps stay first-class. RLS mirrors the other
-- content tables: members read behind the roadmap module grant,
-- admins write.

create table if not exists public.roadmap_areas (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists roadmap_areas_updated_at on public.roadmap_areas;
create trigger roadmap_areas_updated_at
  before update on public.roadmap_areas
  for each row execute function public.set_updated_at();

create table if not exists public.roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_on date,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists roadmap_milestones_updated_at on public.roadmap_milestones;
create trigger roadmap_milestones_updated_at
  before update on public.roadmap_milestones
  for each row execute function public.set_updated_at();

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.roadmap_areas (id) on delete cascade,
  milestone_id uuid references public.roadmap_milestones (id) on delete set null,
  title text not null,
  summary text,
  details text,
  status text not null default 'idea'
    check (status in ('idea', 'planned', 'committed', 'in_progress', 'done', 'parked')),
  horizon text not null default 'later'
    check (horizon in ('now', 'next', 'later', 'someday')),
  priority integer not null default 100,
  effort text check (effort in ('small', 'medium', 'large')),
  impact text check (impact in ('low', 'medium', 'high')),
  starts_on date,
  ends_on date,
  tags text[] not null default '{}',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmap_items_area_idx
  on public.roadmap_items (area_id, horizon, priority, sort_order);

drop trigger if exists roadmap_items_updated_at on public.roadmap_items;
create trigger roadmap_items_updated_at
  before update on public.roadmap_items
  for each row execute function public.set_updated_at();

create table if not exists public.roadmap_dependencies (
  item_id uuid not null references public.roadmap_items (id) on delete cascade,
  depends_on_id uuid not null references public.roadmap_items (id) on delete cascade,
  primary key (item_id, depends_on_id),
  check (item_id <> depends_on_id)
);

alter table public.roadmap_areas enable row level security;

drop policy if exists "roadmap_areas: members read" on public.roadmap_areas;
create policy "roadmap_areas: members read"
  on public.roadmap_areas for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_areas: admins write" on public.roadmap_areas;
create policy "roadmap_areas: admins write"
  on public.roadmap_areas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.roadmap_milestones enable row level security;

drop policy if exists "roadmap_milestones: members read" on public.roadmap_milestones;
create policy "roadmap_milestones: members read"
  on public.roadmap_milestones for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_milestones: admins write" on public.roadmap_milestones;
create policy "roadmap_milestones: admins write"
  on public.roadmap_milestones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.roadmap_items enable row level security;

drop policy if exists "roadmap_items: members read" on public.roadmap_items;
create policy "roadmap_items: members read"
  on public.roadmap_items for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_items: admins write" on public.roadmap_items;
create policy "roadmap_items: admins write"
  on public.roadmap_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.roadmap_dependencies enable row level security;

drop policy if exists "roadmap_dependencies: members read" on public.roadmap_dependencies;
create policy "roadmap_dependencies: members read"
  on public.roadmap_dependencies for select
  to authenticated
  using (public.has_module_access('roadmap'));

drop policy if exists "roadmap_dependencies: admins write" on public.roadmap_dependencies;
create policy "roadmap_dependencies: admins write"
  on public.roadmap_dependencies for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
