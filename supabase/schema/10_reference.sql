-- ------------------------------------------------------------------
-- 10_reference.sql - The API reference domain: specs, endpoints,
-- tag catalogue and narrative topics. All reference content lives in
-- these tables; the repo only renders them.
-- ------------------------------------------------------------------

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
  -- Environments: [{"name","base_url","note"}]. Live URLs belong
  -- here in the database, never in the repo.
  servers jsonb not null default '[]'::jsonb,
  -- Auth scheme as a flat label/value object (type, header, format,
  -- how to obtain credentials); rendered verbatim by the viewer so
  -- new facts need no code change.
  auth jsonb not null default '{}'::jsonb,
  contact text,
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
-- method 'query' is for read-only operations addressed by name
-- rather than path (GraphQL operations, RPC-style calls); put the
-- operation name in path and the query text in request_example.
-- ---------------------------------------------------------------

create table if not exists public.api_endpoints (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.api_specs (id) on delete cascade,
  method text not null check (method in ('get', 'post', 'put', 'patch', 'delete', 'query')),
  path text not null,
  tag text not null default 'General',
  summary text,
  description text,
  params jsonb not null default '[]'::jsonb,
  request_example jsonb,
  response_example jsonb,
  -- Request headers: [{"name","required","description","example"}]
  request_headers jsonb not null default '[]'::jsonb,
  -- Response catalogue: [{"status","description","example"}]
  responses jsonb not null default '[]'::jsonb,
  -- Small flags on the summary row: [{"label","tone"}], tone one of
  -- neutral|info|ok|warn|danger. Carries source-specific facts
  -- (environment observed, runbook step, verification state).
  badges jsonb not null default '[]'::jsonb,
  auth_required boolean not null default true,
  deprecated boolean not null default false,
  notes text,
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
-- api_tags: per-spec tag catalogue. Gives each endpoint group a
-- description and an explicit position, so a spec can order its
-- areas to mirror a runbook instead of alphabetically. Tags not in
-- the catalogue still render (first-seen order, no description).
-- ---------------------------------------------------------------

create table if not exists public.api_tags (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.api_specs (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spec_id, name)
);

create index if not exists api_tags_spec_idx
  on public.api_tags (spec_id, sort_order);

drop trigger if exists api_tags_updated_at on public.api_tags;
create trigger api_tags_updated_at
  before update on public.api_tags
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- api_topics: ordered narrative sections for a spec (overview,
-- conventions, runbooks, accepted values, gap registers...).
-- blocks is a jsonb array of typed blocks rendered generically:
--   {"kind":"p","text"}
--   {"kind":"note","tone":"info|ok|warn|danger","text"}
--   {"kind":"code","text"} or {"kind":"code","json":{...}}
--   {"kind":"table","columns":[...],"rows":[[...]]}
--   {"kind":"kv","items":[{"label","value"}]}
--   {"kind":"values","name","field","values":[...],"source"}
-- Unknown kinds are skipped, so new block types can be introduced
-- without breaking the deployed viewer.
-- ---------------------------------------------------------------

create table if not exists public.api_topics (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.api_specs (id) on delete cascade,
  title text not null,
  intro text,
  blocks jsonb not null default '[]'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_topics_spec_idx
  on public.api_topics (spec_id, sort_order);

drop trigger if exists api_topics_updated_at on public.api_topics;
create trigger api_topics_updated_at
  before update on public.api_topics
  for each row execute function public.set_updated_at();
