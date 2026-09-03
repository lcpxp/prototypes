-- ------------------------------------------------------------------
-- 45_context.sql - Platform context that is neither a capability nor
-- roadmap work: the terminology glossary and the canonical onboarding
-- lifecycle. Both read behind the 'platform' module grant (policies in
-- supabase/policies.sql) alongside product_capabilities. See
-- docs/PLATFORM.md for the ingest and retrieval protocol.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- domain_terms: one row per piece of LP/Merchant Portal terminology.
-- term is the canonical label; expansion holds an acronym's words
-- (nullable for non-acronyms); definition is the plain-language
-- meaning. area_id optionally hangs the term off the shared
-- work_areas taxonomy. verified defaults false: an unverified row
-- is a captured-but-unconfirmed term (e.g. one the owner flagged as
-- uncertain), a verified row is owner-confirmed.
-- ---------------------------------------------------------------

create table if not exists public.domain_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  expansion text,
  definition text not null,
  area_id uuid references public.work_areas (id) on delete set null,
  source text,
  verified boolean not null default false,
  tags text[] not null default '{}',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists domain_terms_area_idx
  on public.domain_terms (area_id, sort_order);

drop trigger if exists domain_terms_updated_at on public.domain_terms;
create trigger domain_terms_updated_at
  before update on public.domain_terms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- journey_stages: the canonical lead-to-live onboarding lifecycle,
-- one row per stage in order. stage_no is the 1-based position
-- (unique); actor names who acts at the stage; description is the
-- plain-language summary. This is reference data, not per-merchant
-- state - an application's live status lives in the operational
-- platform, not here.
-- ---------------------------------------------------------------

create table if not exists public.journey_stages (
  id uuid primary key default gen_random_uuid(),
  stage_no integer not null unique,
  key text not null unique,
  title text not null,
  actor text,
  description text,
  source text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists journey_stages_updated_at on public.journey_stages;
create trigger journey_stages_updated_at
  before update on public.journey_stages
  for each row execute function public.set_updated_at();
