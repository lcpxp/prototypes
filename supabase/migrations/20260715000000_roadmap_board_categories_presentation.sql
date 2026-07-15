-- ------------------------------------------------------------------
-- 20260715000000_roadmap_board_categories_presentation.sql
-- The roadmap board port: themed category lanes plus the two
-- presentation facts each roadmap item carries on the active track.
-- Applied live and mirrored in supabase/schema/30_work.sql and
-- supabase/policies.sql. See docs/ROADMAP.md for the data model and
-- the AI-assistant working protocol.
-- ------------------------------------------------------------------

-- Colour for each category key lives in assets/css/tokens.css
-- (.rm-cat-<key>); the row carries only label, description and order,
-- so the legend and the category set are data an admin or an AI
-- assistant with Supabase access can edit with no code change. A new
-- category renders with a neutral fallback until a token is added.
create table if not exists public.roadmap_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists roadmap_categories_updated_at on public.roadmap_categories;
create trigger roadmap_categories_updated_at
  before update on public.roadmap_categories
  for each row execute function public.set_updated_at();

-- roadmap_items gains the board's two presentation facts:
--   category_id   the themed lane (colour + legend grouping)
--   presentation  how the item reads on the active track
alter table public.roadmap_items
  add column if not exists category_id uuid
    references public.roadmap_categories (id) on delete set null,
  add column if not exists presentation text not null default 'sequenced'
    check (presentation in ('sequenced', 'current', 'ongoing', 'wind', 'bridge'));

create index if not exists roadmap_items_category_idx
  on public.roadmap_items (category_id);

-- RLS: read behind the roadmap module grant, writes admin-only,
-- matching every other content table.
alter table public.roadmap_categories enable row level security;

drop policy if exists "roadmap_categories: members read"  on public.roadmap_categories;
drop policy if exists "roadmap_categories: admins insert" on public.roadmap_categories;
drop policy if exists "roadmap_categories: admins update" on public.roadmap_categories;
drop policy if exists "roadmap_categories: admins delete" on public.roadmap_categories;

create policy "roadmap_categories: members read" on public.roadmap_categories
  for select to authenticated using ((select public.has_module_access('roadmap')));
create policy "roadmap_categories: admins insert" on public.roadmap_categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "roadmap_categories: admins update" on public.roadmap_categories
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "roadmap_categories: admins delete" on public.roadmap_categories
  for delete to authenticated using ((select public.is_admin()));
