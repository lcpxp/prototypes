-- ------------------------------------------------------------------
-- 30_work.sql - The working-record domain: shared area taxonomy,
-- roadmap, work intake and backlog (see docs/WORKFLOW.md).
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- work_areas: the single shared taxonomy of development areas.
-- Roadmap items, backlog items, documents and notes all reference
-- it, so swimlanes, backlog grouping and intake filing can never
-- disagree. scope separates the product feature areas worked with
-- development teams from the portal's own development areas.
-- ---------------------------------------------------------------

create table if not exists public.work_areas (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  scope text not null default 'product' check (scope in ('product', 'portal')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists work_areas_updated_at on public.work_areas;
create trigger work_areas_updated_at
  before update on public.work_areas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Roadmap. Designed so every future roadmap view (timeline
-- graphic, swimlanes, waterfall priority, zoomed detail, exported
-- snapshots) is a rendering of the same rows and all day-to-day
-- adjustment is a database edit:
--   roadmap_milestones    named target points, optionally dated
--   roadmap_items         the work itself; dates optional so
--                         non-dated roadmaps stay first-class
--   roadmap_dependencies  item-to-item ordering for waterfall views
-- ---------------------------------------------------------------

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
  area_id uuid not null references public.work_areas (id) on delete cascade,
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
create index if not exists roadmap_items_milestone_idx
  on public.roadmap_items (milestone_id);

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

create index if not exists roadmap_dependencies_depends_on_idx
  on public.roadmap_dependencies (depends_on_id);

-- ---------------------------------------------------------------
-- Work intake. Three tables that make the ongoing owner-and-Claude
-- working conversation durable (see docs/WORKFLOW.md):
--   work_documents  raw supplied material (PRDs, roadmaps, backlog
--                   lists, DevOps pastes, sprint summaries) kept
--                   verbatim, plus a distilled summary; supersede
--                   chains preserve the historic record
--   backlog_items   the rolling work list: considerations,
--                   features, functionality, bugs and improvements,
--                   never deleted - closed with a resolution
--   work_notes      atomic distilled records (decisions, facts,
--                   risks, questions, actions) linked to whatever
--                   they concern
-- ---------------------------------------------------------------

create table if not exists public.work_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'other'
    check (kind in ('prd', 'roadmap', 'backlog', 'devops', 'sprint', 'meeting', 'discussion', 'other')),
  area_id uuid references public.work_areas (id) on delete set null,
  content text,
  summary text,
  status text not null default 'active'
    check (status in ('active', 'superseded', 'archived')),
  supersedes_id uuid references public.work_documents (id) on delete set null,
  captured_on date not null default current_date,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_documents_area_idx
  on public.work_documents (area_id);
create index if not exists work_documents_supersedes_idx
  on public.work_documents (supersedes_id);

drop trigger if exists work_documents_updated_at on public.work_documents;
create trigger work_documents_updated_at
  before update on public.work_documents
  for each row execute function public.set_updated_at();

create table if not exists public.backlog_items (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.work_areas (id) on delete set null,
  roadmap_item_id uuid references public.roadmap_items (id) on delete set null,
  source_document_id uuid references public.work_documents (id) on delete set null,
  type text not null default 'consideration'
    check (type in ('consideration', 'feature', 'functionality', 'bug', 'improvement', 'task')),
  title text not null,
  summary text,
  details text,
  status text not null default 'open'
    check (status in ('open', 'planned', 'in_progress', 'blocked', 'done', 'dropped')),
  priority integer not null default 100,
  external_ref text,
  requested_by text,
  tags text[] not null default '{}',
  sort_order integer not null default 100,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backlog_items_status_idx
  on public.backlog_items (status, priority, sort_order);
create index if not exists backlog_items_area_idx
  on public.backlog_items (area_id, status);
create index if not exists backlog_items_roadmap_item_idx
  on public.backlog_items (roadmap_item_id);
create index if not exists backlog_items_source_document_idx
  on public.backlog_items (source_document_id);

-- Closing an item stamps resolved_at automatically so the historic
-- record needs no manual bookkeeping; reopening clears it.
create or replace function public.set_backlog_resolution()
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

drop trigger if exists backlog_items_resolution on public.backlog_items;
create trigger backlog_items_resolution
  before update on public.backlog_items
  for each row execute function public.set_backlog_resolution();

create table if not exists public.work_notes (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note'
    check (kind in ('decision', 'fact', 'risk', 'question', 'action', 'note')),
  body text not null,
  area_id uuid references public.work_areas (id) on delete set null,
  document_id uuid references public.work_documents (id) on delete set null,
  backlog_item_id uuid references public.backlog_items (id) on delete set null,
  roadmap_item_id uuid references public.roadmap_items (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'resolved', 'superseded')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_notes_document_idx
  on public.work_notes (document_id);
create index if not exists work_notes_area_idx
  on public.work_notes (area_id, kind, status);
create index if not exists work_notes_backlog_item_idx
  on public.work_notes (backlog_item_id);
create index if not exists work_notes_roadmap_item_idx
  on public.work_notes (roadmap_item_id);

drop trigger if exists work_notes_updated_at on public.work_notes;
create trigger work_notes_updated_at
  before update on public.work_notes
  for each row execute function public.set_updated_at();
