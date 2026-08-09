-- ------------------------------------------------------------------
-- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations.
-- Applied to the live project on 2026-07-24 through the MCP, but its
-- file was never committed. The tables it creates are declared in
-- supabase/schema/45_context.sql and their policies in
-- supabase/policies.sql; this file is the applied history.
-- Body verbatim as applied.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- Context enrichment: platform-knowledge tables that are neither
-- capabilities nor roadmap work. domain_terms is the glossary of
-- LaunchPad/Unity terminology; journey_stages is the canonical
-- lead-to-live onboarding lifecycle. Both hang off the shared
-- work_areas taxonomy (nullable) and read behind the 'platform'
-- module grant, like product_capabilities.
-- ------------------------------------------------------------------

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

-- RLS: read behind the platform module grant, admin-only writes,
-- mirroring the product_capabilities policy shape exactly.
alter table public.domain_terms   enable row level security;
alter table public.journey_stages enable row level security;

do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('domain_terms',   '(select public.has_module_access(''platform''))'),
      ('journey_stages', '(select public.has_module_access(''platform''))')
    ) as v(tbl, read_expr)
  loop
    execute format('drop policy if exists "%s: members read" on public.%I', entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins insert" on public.%I', entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins update" on public.%I', entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins delete" on public.%I', entry.tbl, entry.tbl);
    execute format('create policy "%s: members read" on public.%I
      for select to authenticated using (%s)', entry.tbl, entry.tbl, entry.read_expr);
    execute format('create policy "%s: admins insert" on public.%I
      for insert to authenticated with check ((select public.is_admin()))', entry.tbl, entry.tbl);
    execute format('create policy "%s: admins update" on public.%I
      for update to authenticated using ((select public.is_admin()))
      with check ((select public.is_admin()))', entry.tbl, entry.tbl);
    execute format('create policy "%s: admins delete" on public.%I
      for delete to authenticated using ((select public.is_admin()))', entry.tbl, entry.tbl);
  end loop;
end $$;
