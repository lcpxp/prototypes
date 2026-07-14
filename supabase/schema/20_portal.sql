-- ------------------------------------------------------------------
-- 20_portal.sql - Portal content domains: the integrations overview
-- and the prototype gallery registry.
-- ------------------------------------------------------------------

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

-- ---------------------------------------------------------------
-- prototypes: registry of prototype pages under prototypes/ in the
-- repo. The gallery and dashboard render from this table so adding
-- a prototype is a database insert, not a navigation code change.
-- ---------------------------------------------------------------

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
