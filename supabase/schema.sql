-- ------------------------------------------------------------------
-- schema.sql - Tables, triggers and indexes for the onboarding portal.
-- Run this FIRST in the Supabase SQL editor, then policies.sql, then
-- (optionally) seed.sql.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- profiles: one row per portal user, extends Supabase auth.users.
-- Created automatically by trigger when a user is added.
-- ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Shared updated_at trigger function.
-- ---------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- module_access: per-user, per-module grants. Module keys come from
-- assets/js/core/registry.js. Absence of a row means allowed, so new
-- users and newly added modules start open; rows record explicit
-- toggles made on the users page. Admins always have access.
-- ---------------------------------------------------------------

create table if not exists public.module_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_key text not null,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_key)
);

drop trigger if exists module_access_updated_at on public.module_access;
create trigger module_access_updated_at
  before update on public.module_access
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- api_specs: one row per API specification. The spec column can
-- hold a full OpenAPI 3 document as JSONB; the viewer falls back to
-- it when no api_endpoints rows exist for the spec. family groups
-- specs into distinct reference sites (keys mirror
-- App.registry.specFamilies in assets/js/core/registry.js).
-- ---------------------------------------------------------------

create table if not exists public.api_specs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version text not null default '0.1.0',
  status text not null default 'draft' check (status in ('draft', 'live', 'deprecated')),
  family text not null default 'other'
    check (family in ('launchpad', 'unity', 'integration', 'other')),
  description text,
  spec jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists api_specs_updated_at on public.api_specs;
create trigger api_specs_updated_at
  before update on public.api_specs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- api_endpoints: one row per endpoint, for piecemeal editing.
-- params, request_example and response_example are JSONB so payload
-- shapes stay structured. params is an array of objects:
--   [{ "name": "...", "in": "path|query|header|body",
--      "type": "...", "required": true, "description": "..." }]
-- ---------------------------------------------------------------

create table if not exists public.api_endpoints (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.api_specs (id) on delete cascade,
  method text not null check (method in ('get', 'post', 'put', 'patch', 'delete')),
  path text not null,
  tag text not null default 'General',
  summary text,
  description text,
  params jsonb not null default '[]'::jsonb,
  request_example jsonb,
  response_example jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_endpoints_spec_idx
  on public.api_endpoints (spec_id, tag, sort_order);

drop trigger if exists api_endpoints_updated_at on public.api_endpoints;
create trigger api_endpoints_updated_at
  before update on public.api_endpoints
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- prototypes: registry of prototype pages under prototypes/ in the
-- repo. The gallery and dashboard render from this table so adding
-- a prototype is a database insert, not a navigation code change.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- integrations: one row per third-party service connected to
-- Launchpad. Drives the integrations overview table and its detail
-- modals. detail is a flat JSONB object of extra label/value pairs
-- (for example auth method, data exchanged, environments) rendered
-- verbatim in the modal, so new facts need no code change.
-- ---------------------------------------------------------------

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other',
  purpose text,
  direction text not null default 'outbound'
    check (direction in ('inbound', 'outbound', 'two-way')),
  status text not null default 'live'
    check (status in ('live', 'pilot', 'planned', 'deprecated')),
  docs_url text,
  owner text,
  detail jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists integrations_updated_at on public.integrations;
create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

create table if not exists public.prototypes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  path text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'deprecated')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists prototypes_updated_at on public.prototypes;
create trigger prototypes_updated_at
  before update on public.prototypes
  for each row execute function public.set_updated_at();

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

drop trigger if exists work_notes_updated_at on public.work_notes;
create trigger work_notes_updated_at
  before update on public.work_notes
  for each row execute function public.set_updated_at();
