-- ------------------------------------------------------------------
-- 40_platform.sql - Platform product-knowledge domain. The durable,
-- queryable description of what LP is and does today. Hangs
-- off the shared work_areas taxonomy so capability areas, roadmap
-- swimlanes and backlog groups agree. See docs/PLATFORM.md for the
-- ingest, derivation and retrieval protocol.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- product_capabilities: one row per discrete piece of platform
-- knowledge - the value proposition, a capability area, a single
-- capability, or an at-a-glance headline. area_id is nullable so
-- platform-level statements (value proposition) need no area.
--
-- THREE ORTHOGONAL AXES, because one column carrying two of them is
-- what buried this page. Until 2026-09-07 `kind` answered both "what
-- shape of statement is this" and "what is it about", so 27 rows of
-- Partner Portal engineering doctrine (CUBE CSS layers, Angular, EF
-- migrations) rendered at the bottom of a page about what the product
-- does for merchants. They are different subjects for different
-- readers; one column could not say so.
--
-- 1. domain - WHAT THE ROW IS ABOUT. The page's top-level view.
--      product  what LP does, for the people who buy and run it
--      build    how the Partner Portal is built and styled, for the
--               people who change it
--
-- 2. kind - WHAT SHAPE OF STATEMENT IT IS, within a domain:
--      overview     the top-level "what LP is"
--      value        a value-proposition statement
--      capability   an area or feature the platform provides
--      glance       an at-a-glance headline
--      technical    stack, database, dev style, deployment
--      styling      design values, component patterns, tone of voice
--      positioning  how the platform is sold and to whom. Distinct
--                   from 'value', a single value-proposition
--                   statement: positioning is the audience and the
--                   argument around it
--
-- 3. maturity - HOW REAL IT IS. The axis the roadmap is
--    contextualised against:
--      live | partial | planned | exploratory
--
-- attestation - WHO SAYS SO. Replaced the `verified` boolean on
-- 2026-09-07, which could only say yes or no and so could not tell an
-- owner's judgement from a claim nobody had examined:
--      owner       the owner knowingly accepted this row at this
--                  maturity. The only state an assistant may never set.
--      derived     distilled by a session from rows the owner already
--                  owns - delivered work items, facts, decisions,
--                  source documents - restating them and nothing more,
--                  with an `about` link to every source. Traceable, and
--                  gate-enforced (tests/checks/knowledge-drift.test.js).
--      unattested  neither. The honest default for a bare insert.
--
-- as_of - WHEN THE CLAIM WAS LAST CHECKED against reality. Distinct
-- from updated_at, which cannot tell a typo fix from a re-check: 18 of
-- 46 rows had not been touched since 2026-08-14 and nothing said so.
-- The staleness ratchet compares it against delivered work in the same
-- area, which is what makes shipping work mark the platform stale
-- automatically rather than waiting for someone to notice.
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
  domain text not null default 'product'
    check (domain in ('product', 'build')),
  kind text not null default 'capability'
    check (kind in ('overview', 'value', 'capability', 'glance',
                    'technical', 'styling', 'positioning')),
  maturity text not null default 'planned'
    check (maturity in ('live', 'partial', 'planned', 'exploratory')),
  attestation text not null default 'unattested'
    check (attestation in ('owner', 'derived', 'unattested')),
  as_of date,
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
-- The page opens on one domain and renders it in sort order; without
-- this every view scans the table.
create index if not exists product_capabilities_domain_idx
  on public.product_capabilities (domain, sort_order);

drop trigger if exists product_capabilities_updated_at on public.product_capabilities;
create trigger product_capabilities_updated_at
  before update on public.product_capabilities
  for each row execute function public.set_updated_at();
