-- Integrations overview: one row per third-party service connected
-- to Launchpad. detail is a flat JSONB object of extra label/value
-- pairs rendered verbatim in the detail modal, so new facts are a
-- database edit, not a code change. RLS mirrors the other content
-- tables: members read behind the module grant, admins write.

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

alter table public.integrations enable row level security;

drop policy if exists "integrations: members read" on public.integrations;
create policy "integrations: members read"
  on public.integrations for select
  to authenticated
  using (public.has_module_access('integrations'));

drop policy if exists "integrations: admins write" on public.integrations;
create policy "integrations: admins write"
  on public.integrations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
