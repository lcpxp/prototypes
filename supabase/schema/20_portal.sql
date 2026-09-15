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

-- ---------------------------------------------------------------
-- The integration ESTATE: what each provider can do, what it could
-- replace, and what is still unanswered about it.
--
-- integrations says which systems LaunchPad talks to. These two say
-- what is actually on offer behind each one, which is the question a
-- consolidation decision turns on: a provider PXP already holds a
-- contract with may cover several it pays separately for, and that is
-- only visible if capabilities are rows rather than prose.
--
-- Declared here on 2026-09-15. The tables were applied to the live
-- project on 2026-09-07 and never written back to the repo, so
-- supabase/schema/ could not rebuild them - the exact failure
-- tests/checks/schema-drift.test.js exists to catch, and it stayed
-- invisible only because schema-snapshot.json was also stale.
-- ---------------------------------------------------------------

create table if not exists public.integration_capabilities (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null
    references public.integrations (id) on delete cascade,
  group_label text,
  name text not null,
  description text,
  -- live: consumed today. available: offered and not taken up - the
  -- gap a consolidation closes. planned/not_offered/unknown carry the
  -- rest honestly rather than guessing.
  availability text not null default 'available'
    check (availability in ('live', 'available', 'planned', 'not_offered', 'unknown')),
  -- The swap edge: this capability is direct cover for what that other
  -- provider does today. Null for capabilities that replace nothing.
  replaces_integration_id uuid
    references public.integrations (id) on delete set null,
  replaces_note text,
  verified boolean not null default false,
  as_of date,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_capabilities_integration_idx
  on public.integration_capabilities (integration_id, availability);

drop trigger if exists integration_capabilities_updated_at on public.integration_capabilities;
create trigger integration_capabilities_updated_at
  before update on public.integration_capabilities
  for each row execute function public.set_updated_at();

create table if not exists public.integration_notes (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null
    references public.integrations (id) on delete cascade,
  kind text not null default 'comment'
    check (kind in ('meeting', 'decision', 'question', 'commercial', 'comment', 'risk')),
  body text not null,
  -- 'open' is the load-bearing one: an unanswered commercial or
  -- coverage question that a decision should not be taken over.
  status text not null default 'active'
    check (status in ('active', 'open', 'answered', 'superseded')),
  captured_on date not null default current_date,
  source_document_id uuid
    references public.work_documents (id) on delete set null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_notes_integration_idx
  on public.integration_notes (integration_id, status);

drop trigger if exists integration_notes_updated_at on public.integration_notes;
create trigger integration_notes_updated_at
  before update on public.integration_notes
  for each row execute function public.set_updated_at();

-- The estate in one row per provider. The subqueries are aggregated
-- separately and joined, rather than counted across one join, because
-- joining both children at once fans the rows out and doubles every
-- count.

drop view if exists public.v_integration_estate;
create view public.v_integration_estate with (security_invoker = on) as
  select
    i.id, i.name, i.category, i.estate, i.status, i.direction, i.purpose, i.sort_order,
    coalesce(c.capabilities_live, 0) as capabilities_live,
    coalesce(c.capabilities_available, 0) as capabilities_available,
    coalesce(c.swap_targets, 0) as swap_targets,
    coalesce(n.open_questions, 0) as open_questions,
    coalesce(n.notes_total, 0) as notes_total
  from public.integrations i
  left join (
    select integration_id,
           count(*) filter (where availability = 'live') as capabilities_live,
           count(*) filter (where availability = 'available') as capabilities_available,
           count(*) filter (where replaces_integration_id is not null) as swap_targets
      from public.integration_capabilities group by integration_id) c on c.integration_id = i.id
  left join (
    select integration_id,
           count(*) filter (where status = 'open') as open_questions,
           count(*) as notes_total
      from public.integration_notes group by integration_id) n on n.integration_id = i.id;

revoke all on public.v_integration_estate from public, anon;
grant select on public.v_integration_estate to authenticated;

comment on view public.v_integration_estate is
  'One row per integration with its capability and open-question counts. The consolidation read.';

-- Every swap edge, resolved to names: what this provider offers that
-- covers what that one does today.

drop view if exists public.v_integration_swap_map;
create view public.v_integration_swap_map with (security_invoker = on) as
  select
    src.id as offered_by_id, src.name as offered_by,
    c.group_label, c.name as capability, c.availability,
    tgt.id as replaces_id, tgt.name as replaces, tgt.category as replaces_category,
    c.replaces_note, c.as_of
  from public.integration_capabilities c
  join public.integrations src on src.id = c.integration_id
  join public.integrations tgt on tgt.id = c.replaces_integration_id;

revoke all on public.v_integration_swap_map from public, anon;
grant select on public.v_integration_swap_map to authenticated;

comment on view public.v_integration_swap_map is
  'Every capability that is direct cover for another provider, resolved to names.';
