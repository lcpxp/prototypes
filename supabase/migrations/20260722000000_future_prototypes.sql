-- ---------------------------------------------------------------
-- future_prototypes: a pre-draft shortlist of prototype ideas held
-- for future reference. No page yet, so a row is just a name plus an
-- optional note. Read behind the prototypes module grant; writes are
-- admin-only, matching every other content table.
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

alter table public.future_prototypes enable row level security;

drop policy if exists "future_prototypes: members read" on public.future_prototypes;
drop policy if exists "future_prototypes: admins insert" on public.future_prototypes;
drop policy if exists "future_prototypes: admins update" on public.future_prototypes;
drop policy if exists "future_prototypes: admins delete" on public.future_prototypes;

create policy "future_prototypes: members read" on public.future_prototypes
  for select to authenticated
  using ((select public.has_module_access('prototypes')));

create policy "future_prototypes: admins insert" on public.future_prototypes
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "future_prototypes: admins update" on public.future_prototypes
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "future_prototypes: admins delete" on public.future_prototypes
  for delete to authenticated
  using ((select public.is_admin()));

-- Seed the initial shortlist. Idempotent: skip names already present.
insert into public.future_prototypes (name, sort_order)
select v.name, v.sort_order
from (values
  ('PCI', 10),
  ('Self Service', 20),
  ('Inbound API Lead Start', 30),
  ('Admin tools: Front ends', 40),
  ('Merchant Contributor', 50),
  ('Pre-Screening', 60),
  ('AI Generated Summaries of screening checks', 70),
  ('MCC Lookup AI tool', 80),
  ('Insights and Dashboards', 90),
  ('Pricing Quote Tool', 100),
  ('Pricing Engine', 110),
  ('PFAC Management', 120),
  ('Acquirer Selection', 130),
  ('Multi-Acquirer Selection', 140)
) as v(name, sort_order)
where not exists (
  select 1 from public.future_prototypes f where f.name = v.name
);
