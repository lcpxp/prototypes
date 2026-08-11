-- ------------------------------------------------------------------
-- portal_links: outbound tool links rendered as icon buttons in the
-- top nav. Mirrors supabase/schema/20_portal.sql; the read policy
-- mirrors the content-table loop in supabase/policies.sql, which
-- remains the authoritative home for every policy in the project.
--
-- The link targets are rows, not repo content, because this repo is
-- public: a tool's host, the log indexes a saved search names and the
-- API routes it filters on are all material docs/SECURITY.md keeps
-- out of git.
-- ------------------------------------------------------------------

create table if not exists public.portal_links (
  key text primary key,
  label text not null,
  icon text not null default 'bug',
  base_url text not null,
  query text,
  params jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists portal_links_updated_at on public.portal_links;
create trigger portal_links_updated_at
  before update on public.portal_links
  for each row execute function public.set_updated_at();

alter table public.portal_links enable row level security;

-- No owning module: the nav is on every page, so every signed-in user
-- reads these. Writes are admin-only, like every other content table.
drop policy if exists "portal_links: members read" on public.portal_links;
drop policy if exists "portal_links: admins insert" on public.portal_links;
drop policy if exists "portal_links: admins update" on public.portal_links;
drop policy if exists "portal_links: admins delete" on public.portal_links;

create policy "portal_links: members read" on public.portal_links
  for select to authenticated using (true);

create policy "portal_links: admins insert" on public.portal_links
  for insert to authenticated with check ((select public.is_admin()));

create policy "portal_links: admins update" on public.portal_links
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "portal_links: admins delete" on public.portal_links
  for delete to authenticated using ((select public.is_admin()));
