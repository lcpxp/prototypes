-- The screenshot register and its private bucket. Mirrors
-- supabase/schema/55_screenshots.sql; policies mirror the admin-only
-- entries and the storage block in supabase/policies.sql.

create table if not exists public.screenshots (
  id uuid primary key default gen_random_uuid(),
  review_area_id uuid references public.review_areas (id) on delete set null,
  route text,
  environment text not null
    check (environment in ('qa', 'uat', 'production', 'local', 'mockup')),
  captured_on date not null default current_date,
  code_snapshot date,
  kind text not null
    check (kind in ('capture', 'mockup-before', 'mockup-after')),
  masked boolean not null default false,
  storage_path text not null unique,
  caption text not null check (btrim(caption) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint screenshots_production_is_masked
    check (environment <> 'production' or masked),
  constraint screenshots_mockup_is_a_mockup
    check ((environment = 'mockup') = (kind <> 'capture'))
);

create trigger screenshots_updated_at
  before update on public.screenshots
  for each row execute function public.set_updated_at();

comment on table public.screenshots is
  'The screenshot register: one row per image in the private screenshots bucket - the screen, route, environment, capture date, code snapshot, kind and whether it was masked. Admin-only. Linked to work items by knowledge_links (docs/SCREENSHOTS.md).';

insert into public.link_entity_types (key, table_name, label, sort_order)
values ('screenshot', 'screenshots', 'Screenshot', 130)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

alter table public.screenshots enable row level security;
create policy "screenshots: members read" on public.screenshots
  for select to authenticated using ((select public.is_admin()));
create policy "screenshots: admins insert" on public.screenshots
  for insert to authenticated with check ((select public.is_admin()));
create policy "screenshots: admins update" on public.screenshots
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "screenshots: admins delete" on public.screenshots
  for delete to authenticated using ((select public.is_admin()));
revoke all on public.screenshots from public, anon;
grant select, insert, update, delete on public.screenshots to authenticated;

create policy "screenshots bucket: admins read" on storage.objects for select
  to authenticated using (bucket_id = 'screenshots' and (select public.is_admin()));
create policy "screenshots bucket: admins insert" on storage.objects for insert
  to authenticated with check (bucket_id = 'screenshots' and (select public.is_admin()));
create policy "screenshots bucket: admins update" on storage.objects for update
  to authenticated using (bucket_id = 'screenshots' and (select public.is_admin()));
create policy "screenshots bucket: admins delete" on storage.objects for delete
  to authenticated using (bucket_id = 'screenshots' and (select public.is_admin()));
