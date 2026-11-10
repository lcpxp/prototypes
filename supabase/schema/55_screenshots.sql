-- ------------------------------------------------------------------
-- 55_screenshots.sql - The screenshot register: every image LPio holds
-- of a LaunchPad screen, where it came from and what it shows.
--
-- The images themselves are in the PRIVATE storage bucket
-- 'screenshots' (supabase/policies.sql holds its policies); a row here
-- is the record that makes one findable and attachable. Nothing in this
-- register is ever in git. The process is docs/SCREENSHOTS.md.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- One row per image.
--
--   review_area_id  the screen it shows, as the portal review's area
--                   map names screens (review_areas) - one vocabulary
--                   for "which screen", not a second one
--   environment     where it was captured; 'mockup' for a rendered
--                   replica that was never a live screen
--   kind            a capture of what exists, or one half of a
--                   before/after mockup of a proposed change
--   code_snapshot   the LaunchPad code snapshot it reflects, so a stale
--                   image can be told from a current one
--   masked          personal data was substituted before capture
--
-- A production image is always masked: the constraint refuses one that
-- is not, because a raw production screenshot is never stored. What an
-- image is about is a knowledge_links row of kind 'about', from the
-- 'screenshot' entity type to the work item - never a column here.
-- ---------------------------------------------------------------

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

drop trigger if exists screenshots_updated_at on public.screenshots;
create trigger screenshots_updated_at
  before update on public.screenshots
  for each row execute function public.set_updated_at();

comment on table public.screenshots is
  'The screenshot register: one row per image in the private screenshots bucket - the screen, route, environment, capture date, code snapshot, kind and whether it was masked. Admin-only. Linked to work items by knowledge_links (docs/SCREENSHOTS.md).';

insert into public.link_entity_types (key, table_name, label, sort_order)
values ('screenshot', 'screenshots', 'Screenshot', 130)
on conflict (key) do nothing;

-- The bucket is private: nothing in it has a public URL, and a page
-- shows an image only through a short-lived signed URL.
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;
