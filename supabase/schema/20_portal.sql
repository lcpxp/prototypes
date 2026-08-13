-- ------------------------------------------------------------------
-- 20_portal.sql - Portal content domains: the integrations overview,
-- the prototype gallery registry and the nav's outbound tool links.
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

-- ---------------------------------------------------------------
-- future_prototypes: a pre-draft shortlist of prototype ideas held
-- for future reference. Unlike prototypes these have no page yet, so
-- the row carries only a name and an optional note. The gallery lists
-- them in a plain table below the Live and Drafts card grids. Promote
-- one by adding a prototypes row (and a page) and deleting it here.
-- ---------------------------------------------------------------

create table if not exists public.future_prototypes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists future_prototypes_updated_at on public.future_prototypes;
create trigger future_prototypes_updated_at
  before update on public.future_prototypes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- portal_links: one row per icon button the top nav offers as a link
-- out to an external tool (assets/js/core/tools.js renders them).
--
-- The rows live here rather than in the repo because that is where
-- the sensitive half of a link is. This repo is public, and a tool's
-- host, the log indexes a saved search names and the API routes it
-- filters on are all "live internal endpoint URL" material under
-- docs/SECURITY.md. Holding them as rows means the search can also be
-- retuned without a commit or a deploy.
--
-- base_url is everything up to the query string (origin plus the
-- tool's search path). query is the search itself, stored exactly as
-- it would be pasted into the tool's own search bar - tools.js adds
-- any leading command the URL form needs. params is a flat JSONB
-- object of the remaining query parameters (time range, display
-- options), appended verbatim, so retuning a link never needs code.
-- icon names an SVG that tools.js knows how to draw.
--
-- description is one sentence saying what the tool does and when to
-- use it. The nav shows icons with tooltips and explains nothing; the
-- dashboard's tools grid needs prose, and prose about an internal
-- tool belongs beside the URL it describes rather than in this repo.
-- ---------------------------------------------------------------

create table if not exists public.portal_links (
  key text primary key,
  label text not null,
  icon text not null default 'bug',
  base_url text not null,
  query text,
  params jsonb not null default '{}'::jsonb,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists portal_links_updated_at on public.portal_links;
create trigger portal_links_updated_at
  before update on public.portal_links
  for each row execute function public.set_updated_at();
