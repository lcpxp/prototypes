-- ------------------------------------------------------------------
-- 40_platform.sql - Platform product-knowledge domain. The durable,
-- queryable description of what LP is and does today. Hangs
-- off the shared work_areas taxonomy (scope 'product') so capability
-- areas, roadmap swimlanes and backlog groups agree. See
-- docs/PLATFORM.md for the ingest and retrieval protocol.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- product_capabilities: one row per discrete piece of platform
-- knowledge - the value proposition, a capability area, a single
-- capability, or an at-a-glance headline. area_id is nullable so
-- platform-level statements (value proposition) need no area.
--
-- kind classifies the row for rendering and filtering:
--   overview   the top-level "what LP is"
--   value      a value-proposition statement
--   capability an area or feature the platform provides
--   glance     an at-a-glance headline
-- and, added 2026-08-09, three kinds of knowledge that had nowhere to
-- live - the first four all answer "what does the platform DO", so
-- material about how it is built, how it looks, or how it is sold was
-- either left undistilled in work_documents or forced into 'capability'
-- where it reads as a feature claim:
--   technical    stack, database, dev style, deployment: what a session
--                needs to answer "how is this built"
--   styling      design values, component patterns, tone of voice:
--                enough detail to spin a prototype that looks right
--   positioning  how the platform is sold and to whom. Distinct from
--                'value', a single value-proposition statement:
--                positioning is the audience and the argument around it
--
-- maturity is the axis that separates what exists today from what is
-- aspirational; it is what the roadmap gets contextualised against:
--   live | partial | planned | exploratory
--
-- verified defaults to false as a safe fallback for a bare insert
-- with no other context. Ingesting a comprehensive "what the
-- platform does today" overview should set maturity to 'live' and
-- verified to true explicitly, since documenting current capability
-- is the point of this table; mark a row down only when there is a
-- specific reason to doubt it. See docs/PLATFORM.md.
--
-- blocks reuses the api_topics typed-block vocabulary (p, note, kv,
-- table, code, values); unknown kinds are skipped by the renderer, so
-- new block types never break the deployed viewer.
-- ---------------------------------------------------------------

create table if not exists public.product_capabilities (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.work_areas (id) on delete set null,
  source_document_id uuid references public.work_documents (id) on delete set null,
  key text not null unique,
  title text not null,
  summary text,
  kind text not null default 'capability'
    check (kind in ('overview', 'value', 'capability', 'glance',
                    'technical', 'styling', 'positioning')),
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
