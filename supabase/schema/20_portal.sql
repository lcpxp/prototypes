-- ------------------------------------------------------------------
-- 20_portal.sql - Portal content domains: the integrations overview,
-- the prototype gallery registry and the nav's outbound tool links.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- integrations: one row per third-party service connected to
-- LP. Drives the integrations overview table and its detail
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
-- future_prototypes: prototype ideas and the plans written against
-- them (docs/plan/70-PROTOTYPE-IDEAS.md). The name is kept because it
-- is accurate - these are prototypes intended and not yet built - and
-- renaming would touch the registry, the gallery, its test and the
-- snapshot for no reader benefit.
--
-- It was three columns (name, note, sort_order), with no way to say
-- how important an idea is, what it would prove, or what happened to
-- it. `note` is unchanged, so the rows that predate this lose nothing.
--
-- An idea is never deleted. Promotion sets promoted_prototype_id and
-- a resolution; dropping sets a resolution. Both are refused by a
-- constraint if the back-link or the reason is missing, so "closed
-- with a reason and an undo" is the database's rule rather than a
-- convention.
--
-- `blocks` is the plan itself, in the typed vocabulary the shared
-- renderer draws (assets/js/core/blocks.js): screens, data needed,
-- scope, out of scope, open questions, and a built-from block naming
-- the capabilities, styling rows and endpoints it draws on. That last
-- one is what lets a reader know whether to trust a prototype, and
-- what names every prototype now out of date when a capability
-- changes.
-- ---------------------------------------------------------------

create table if not exists public.future_prototypes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- One line, so the list reads without opening anything. `note` is
  -- the longer thought and stays as it was.
  summary text,
  note text,
  -- The lifecycle. 'idea' is the inbox; 'shortlisted' survived a
  -- review pass; 'planned' has plan blocks; 'building' has a page but
  -- no registry row; 'promoted' is a real prototypes row.
  status text not null default 'idea'
    check (status in ('idea', 'shortlisted', 'planned',
                      'building', 'promoted', 'dropped')),
  -- Banded by tens, the same reading as work_items.priority.
  priority integer not null default 100,
  effort text check (effort is null or effort in ('small', 'medium', 'large')),
  -- What building it would prove or unblock. The field that stops a
  -- list of fourteen becoming a list of forty nobody triages.
  value_note text,
  -- The shared taxonomy, so an idea files against the same areas as
  -- roadmap work and platform capability.
  area_id uuid references public.work_areas (id) on delete set null,
  blocks jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  requested_by text,
  promoted_prototype_id uuid references public.prototypes (id) on delete set null,
  resolution text,
  resolved_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint future_prototypes_promoted_has_row
    check (status <> 'promoted' or promoted_prototype_id is not null),
  constraint future_prototypes_dropped_has_reason
    check (status <> 'dropped' or coalesce(btrim(resolution), '') <> '')
);

drop trigger if exists future_prototypes_updated_at on public.future_prototypes;
create trigger future_prototypes_updated_at
  before update on public.future_prototypes
  for each row execute function public.set_updated_at();

create index if not exists future_prototypes_status_idx
  on public.future_prototypes (status, priority, sort_order);
create index if not exists future_prototypes_area_idx
  on public.future_prototypes (area_id);

-- Stamp the closing date rather than trusting a caller to remember,
-- mirroring set_work_item_resolution in 30_work.sql. Reopening an idea
-- clears it, so the date always means "closed on".
create or replace function public.set_prototype_idea_resolution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('promoted', 'dropped') then
    if new.resolved_at is null then new.resolved_at := now(); end if;
  else
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists future_prototypes_resolution on public.future_prototypes;
create trigger future_prototypes_resolution
  before insert or update on public.future_prototypes
  for each row execute function public.set_prototype_idea_resolution();

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
