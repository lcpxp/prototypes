-- ------------------------------------------------------------------
-- 20260716000000_roadmap_audience_and_area_theme.sql
-- Roadmap refinement: the two-level taxonomy and the audience axis.
--   roadmap_items.audience   which altitude an item surfaces at, so
--                            the Executive (C-suite) view can be a
--                            curated filter over the same rows the
--                            Team view shows in full.
--   work_areas.category_id   makes the theme -> area hierarchy
--                            explicit, so a theme can list the areas
--                            beneath it (item.category_id stays the
--                            authoritative placement for the board).
-- Applied live and mirrored in supabase/schema/30_work.sql. RLS on
-- both tables already covers read/admin-write, so no policy change.
-- See docs/ROADMAP.md and docs/ROADMAP-PROCESS.md.
-- ------------------------------------------------------------------

-- The audience axis. 'team' is the default so existing rows and any
-- new item are developer-visible until explicitly promoted to 'exec'.
alter table public.roadmap_items
  add column if not exists audience text not null default 'team'
    check (audience in ('exec', 'team'));

create index if not exists roadmap_items_audience_idx
  on public.roadmap_items (audience, priority, sort_order);

-- The theme -> area link. Nullable and on delete set null: an area
-- without a theme is still valid (it renders under a General group),
-- and retiring a theme never deletes its areas.
alter table public.work_areas
  add column if not exists category_id uuid
    references public.roadmap_categories (id) on delete set null;

create index if not exists work_areas_category_idx
  on public.work_areas (category_id);
