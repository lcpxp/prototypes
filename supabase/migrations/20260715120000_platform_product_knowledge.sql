-- ------------------------------------------------------------------
-- 20260715120000_platform_product_knowledge.sql
-- The Platform product-knowledge domain: the durable, queryable
-- description of what Launchpad is and does today. Adds
-- product_capabilities (hangs off the shared work_areas taxonomy,
-- scope 'product'), extends work_documents.kind with 'platform' for
-- the verbatim source overview, and wires RLS + the dashboard count.
-- Applied live and mirrored in supabase/schema/40_platform.sql,
-- supabase/schema/30_work.sql, supabase/policies.sql and
-- supabase/schema/90_dashboard.sql. See docs/PLATFORM.md for the
-- ingest and retrieval protocol. No content data here - that is
-- owner-run in the Supabase SQL editor, never committed to git.
-- ------------------------------------------------------------------

create table if not exists public.product_capabilities (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.work_areas (id) on delete set null,
  source_document_id uuid references public.work_documents (id) on delete set null,
  key text not null unique,
  title text not null,
  summary text,
  kind text not null default 'capability'
    check (kind in ('overview', 'value', 'capability', 'glance')),
  maturity text not null default 'planned'
    check (maturity in ('live', 'partial', 'planned', 'exploratory')),
  verified boolean not null default false,
  blocks jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_capabilities_area_idx
  on public.product_capabilities (area_id, kind, sort_order);
create index if not exists product_capabilities_source_idx
  on public.product_capabilities (source_document_id);

drop trigger if exists product_capabilities_updated_at on public.product_capabilities;
create trigger product_capabilities_updated_at
  before update on public.product_capabilities
  for each row execute function public.set_updated_at();

-- work_documents.kind gains 'platform' for the verbatim source
-- overview (drop and recreate the check constraint).
alter table public.work_documents drop constraint if exists work_documents_kind_check;
alter table public.work_documents add constraint work_documents_kind_check
  check (kind in ('prd', 'roadmap', 'backlog', 'devops', 'sprint', 'meeting', 'discussion', 'platform', 'other'));

-- RLS: read behind the platform module grant, writes admin-only,
-- matching every other content table.
alter table public.product_capabilities enable row level security;

drop policy if exists "product_capabilities: members read" on public.product_capabilities;
drop policy if exists "product_capabilities: admins insert" on public.product_capabilities;
drop policy if exists "product_capabilities: admins update" on public.product_capabilities;
drop policy if exists "product_capabilities: admins delete" on public.product_capabilities;

create policy "product_capabilities: members read" on public.product_capabilities
  for select to authenticated using ((select public.has_module_access('platform')));
create policy "product_capabilities: admins insert" on public.product_capabilities
  for insert to authenticated with check ((select public.is_admin()));
create policy "product_capabilities: admins update" on public.product_capabilities
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "product_capabilities: admins delete" on public.product_capabilities
  for delete to authenticated using ((select public.is_admin()));

-- dashboard_counts() gains the platform module's card count.
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
    'roadmap_items', (select count(*) from (select 1 from public.roadmap_items limit 1001) c),
    'backlog_items', (select count(*) from (select 1 from public.backlog_items limit 1001) c),
    'product_capabilities', (select count(*) from (select 1 from public.product_capabilities limit 1001) c),
    'profiles',      (select count(*) from (select 1 from public.profiles      limit 1001) c)
  );
$$;
