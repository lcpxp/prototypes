-- Work areas, backlog and intake framework (see docs/WORKFLOW.md).
--
-- 1. roadmap_areas becomes work_areas: the single shared taxonomy
--    of development areas, with a scope column separating product
--    feature areas from the portal's own development areas.
-- 2. work_documents keeps raw supplied material (PRDs, roadmaps,
--    backlog lists, DevOps pastes, sprint summaries) verbatim with
--    a distilled summary and supersede chains.
-- 3. backlog_items is the rolling work list: considerations,
--    features, functionality, bugs, improvements and tasks. Items
--    are closed with a resolution, never deleted; resolved_at is
--    stamped by trigger.
-- 4. work_notes holds atomic distilled records (decisions, facts,
--    risks, questions, actions) linked to whatever they concern.

alter table public.roadmap_areas rename to work_areas;

alter trigger roadmap_areas_updated_at on public.work_areas
  rename to work_areas_updated_at;

alter table public.work_areas
  add column if not exists scope text not null default 'product'
  check (scope in ('product', 'portal'));

-- Pre-rename rows are the portal's own development areas.
update public.work_areas set scope = 'portal';

drop policy if exists "roadmap_areas: members read" on public.work_areas;
drop policy if exists "roadmap_areas: admins write" on public.work_areas;

create policy "work_areas: members read"
  on public.work_areas for select
  to authenticated
  using (public.has_module_access('roadmap') or public.has_module_access('backlog'));

create policy "work_areas: admins write"
  on public.work_areas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Intake tables ----------------------------------------------------

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

drop trigger if exists work_notes_updated_at on public.work_notes;
create trigger work_notes_updated_at
  before update on public.work_notes
  for each row execute function public.set_updated_at();

-- RLS ---------------------------------------------------------------

alter table public.work_documents enable row level security;

drop policy if exists "work_documents: members read" on public.work_documents;
create policy "work_documents: members read"
  on public.work_documents for select
  to authenticated
  using (public.has_module_access('backlog'));

drop policy if exists "work_documents: admins write" on public.work_documents;
create policy "work_documents: admins write"
  on public.work_documents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.backlog_items enable row level security;

drop policy if exists "backlog_items: members read" on public.backlog_items;
create policy "backlog_items: members read"
  on public.backlog_items for select
  to authenticated
  using (public.has_module_access('backlog'));

drop policy if exists "backlog_items: admins write" on public.backlog_items;
create policy "backlog_items: admins write"
  on public.backlog_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.work_notes enable row level security;

drop policy if exists "work_notes: members read" on public.work_notes;
create policy "work_notes: members read"
  on public.work_notes for select
  to authenticated
  using (public.has_module_access('backlog'));

drop policy if exists "work_notes: admins write" on public.work_notes;
create policy "work_notes: admins write"
  on public.work_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
