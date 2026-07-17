-- ------------------------------------------------------------------
-- 30_work.sql - The working-record domain: shared area taxonomy,
-- roadmap/backlog work items, intake and notes (see docs/WORKFLOW.md).
--
-- Roadmap and backlog are ONE table, work_items. Every view - the
-- Executive theme rollup, the Team roadmap, the Backlog master list -
-- is a projection of the same rows, so moving work between views is a
-- single field edit (see docs/ROADMAP.md, docs/ROADMAP-PROCESS.md).
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- work_areas: the single shared taxonomy of development areas.
-- Work items, documents and notes all reference it, so swimlanes,
-- backlog grouping and intake filing can never disagree. scope
-- separates product feature areas from the portal's own development.
-- ---------------------------------------------------------------

create table if not exists public.work_areas (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text,
  scope text not null default 'product' check (scope in ('product', 'portal')),
  -- The theme this area sits under, making the two-level taxonomy
  -- (theme -> area) explicit. Nullable: an unthemed area is valid and
  -- renders under a General group. A work item's own category_id, when
  -- set, stays the authoritative placement. The foreign key is added
  -- below, once roadmap_categories exists.
  category_id uuid,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists work_areas_updated_at on public.work_areas;
create trigger work_areas_updated_at
  before update on public.work_areas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Roadmap taxonomy. Themed lanes and named targets; the work itself
-- lives in work_items below.
--   roadmap_categories  themed lanes for the board (colour + legend)
--   roadmap_milestones  named target points, optionally dated
-- ---------------------------------------------------------------

-- Themed category lanes for the board. Colour for each key lives in
-- assets/css/tokens.css (.rm-cat-<key>); the row carries only label,
-- description and order, so the legend and the category set are data
-- an admin or an AI assistant with Supabase access can edit with no
-- code change. A new category renders with a neutral fallback until a
-- token is added for its key.
create table if not exists public.roadmap_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists roadmap_categories_updated_at on public.roadmap_categories;
create trigger roadmap_categories_updated_at
  before update on public.roadmap_categories
  for each row execute function public.set_updated_at();

-- work_areas.category_id points at a theme; the constraint is declared
-- here (not inline above) because roadmap_categories is defined after
-- work_areas, so a fresh top-to-bottom run would forward-reference it.
alter table public.work_areas
  drop constraint if exists work_areas_category_id_fkey;
alter table public.work_areas
  add constraint work_areas_category_id_fkey
  foreign key (category_id) references public.roadmap_categories (id)
  on delete set null;

create index if not exists work_areas_category_idx
  on public.work_areas (category_id);

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

-- ---------------------------------------------------------------
-- work_documents: raw supplied material (PRDs, roadmaps, backlog
-- lists, DevOps pastes, sprint summaries, platform overviews) kept
-- verbatim, plus a distilled summary; supersede chains preserve the
-- historic record. Defined before work_items because an item may cite
-- its source document.
-- ---------------------------------------------------------------

create table if not exists public.work_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'other'
    check (kind in ('prd', 'roadmap', 'backlog', 'devops', 'sprint', 'meeting', 'discussion', 'platform', 'other')),
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

-- ---------------------------------------------------------------
-- work_items: roadmap and backlog work in one table. Every view is a
-- projection over these fields, so an item moves between views with a
-- single edit and never a copy:
--   Delivered = status 'done'
--   Parked    = not done AND (horizon 'someday' OR status 'dropped')
--   Active    = the rest (horizon now/next/later)
-- The Executive view is a theme rollup of active work (grouped by
-- category_id, or the area's theme when unset), always complete, so it
-- cannot drift. horizon is the START band and end_horizon the band the
-- item runs THROUGH; presentation supplies the Now card's state label.
-- Dates are optional so non-dated roadmaps stay first-class.
-- ---------------------------------------------------------------

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
  -- Owning department: the business function accountable for the item.
  -- A coarse org-owner tag, orthogonal to area/theme, so any view can
  -- group or filter work by who owns it. Optional. Keys mirror the
  -- App.registry.departments list in assets/js/core/registry.js, which
  -- holds the display labels (the exact "&"/"and" wording) so no page
  -- hard-codes them (see docs/WORKFLOW.md).
  department text
    check (department in ('sales_commercial', 'operations_onboarding',
      'product_technology', 'finance_revenue', 'legal_compliance',
      'risk_underwriting')),
  status text not null default 'idea'
    check (status in ('idea', 'planned', 'in_progress', 'blocked', 'done', 'dropped')),
  -- Start band on the continuous axis. 'someday' is the Parked
  -- (far-future) band; now/next/later are the active bands.
  horizon text not null default 'someday'
    check (horizon in ('now', 'next', 'later', 'someday')),
  -- The band the item runs THROUGH, so a long activity spans columns
  -- (Now -> Next, Now -> Later). Null means it sits in its start band.
  end_horizon text
    check (end_horizon in ('now', 'next', 'later', 'someday')),
  -- How the item reads on the Now track. 'sequenced' is a plain item;
  -- 'current' the focus item; 'ongoing' runs continuously; 'wind' is
  -- wrapping up; 'bridge' points to the next horizon. Now band only.
  presentation text not null default 'sequenced'
    check (presentation in ('sequenced', 'current', 'ongoing', 'wind', 'bridge')),
  priority integer not null default 100,
  effort text check (effort in ('small', 'medium', 'large')),
  impact text check (impact in ('low', 'medium', 'high')),
  starts_on date,
  ends_on date,
  -- PXP delivery attributes (optional, light-touch; the board shows
  -- only dates). progress is a coarse 0-100 completion rendered as a
  -- subtle bar. prd_status/project_status mirror the KPI portal's own
  -- status pickers and are DISTINCT from the internal `status`
  -- lifecycle above. start_sprint/end_sprint hold precise sprint codes
  -- (e.g. 26-16) alongside the coarse horizon band (see docs/SPRINTS.md).
  progress smallint not null default 0 check (progress between 0 and 100),
  prd_status text
    check (prd_status in ('n_a', 'in_progress', 'pre_approved', 'approved', 'rejected')),
  project_status text
    check (project_status in ('planned', 'in_progress', 'pending', 'on_hold', 'completed')),
  start_sprint text check (start_sprint ~ '^[0-9]{2}-[0-9]{2}$'),
  end_sprint text check (end_sprint ~ '^[0-9]{2}-[0-9]{2}$'),
  -- Light-touch bag for the remaining KPI-portal fields kept for record
  -- and JSON export but never surfaced on the board: pnl_vertical,
  -- team, region[], customer, resources, team_capacity, cost,
  -- merchant_value, pxp_value, blockers, prd_link, legacy_priority_tags.
  attributes jsonb not null default '{}'::jsonb,
  external_ref text,
  requested_by text,
  tags text[] not null default '{}',
  sort_order integer not null default 100,
  -- Closing note; resolved_at is stamped by the trigger below.
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Closing an item (status done/dropped) stamps resolved_at so the
-- historic record needs no manual bookkeeping; reopening clears it.
-- Also keeps updated_at fresh, so this is work_items' only row trigger.
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

-- ---------------------------------------------------------------
-- work_item_phases: optional delivery phases for a work item
-- (Discovery, Build, Certification, Launch), each with a quarter and
-- start/end dates. Either date may be flagged TBC (planned but not
-- fixed). Light-touch: absent for high-level items, present when a
-- work item carries KPI-portal-style phase planning. See
-- docs/SPRINTS.md and docs/ROADMAP.md.
-- ---------------------------------------------------------------

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

-- Item-to-item ordering for waterfall views (empty until used).
create table if not exists public.work_item_dependencies (
  item_id uuid not null references public.work_items (id) on delete cascade,
  depends_on_id uuid not null references public.work_items (id) on delete cascade,
  primary key (item_id, depends_on_id),
  check (item_id <> depends_on_id)
);

create index if not exists work_item_dependencies_depends_on_idx
  on public.work_item_dependencies (depends_on_id);

-- ---------------------------------------------------------------
-- work_notes: atomic distilled records (decisions, facts, risks,
-- questions, actions) linked to whatever they concern.
-- ---------------------------------------------------------------

create table if not exists public.work_notes (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note'
    check (kind in ('decision', 'fact', 'risk', 'question', 'action', 'note')),
  body text not null,
  area_id uuid references public.work_areas (id) on delete set null,
  document_id uuid references public.work_documents (id) on delete set null,
  work_item_id uuid references public.work_items (id) on delete set null,
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
create index if not exists work_notes_work_item_idx
  on public.work_notes (work_item_id);

drop trigger if exists work_notes_updated_at on public.work_notes;
create trigger work_notes_updated_at
  before update on public.work_notes
  for each row execute function public.set_updated_at();
