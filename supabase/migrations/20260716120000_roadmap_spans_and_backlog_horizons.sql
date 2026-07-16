-- ------------------------------------------------------------------
-- 20260716120000_roadmap_spans_and_backlog_horizons.sql
-- Make the roadmap a continuous timeline where an activity can span
-- columns (Now -> Next, Now -> Later) to show it running on:
--   roadmap_items.end_horizon   the band the item runs THROUGH; null
--                               means it sits in its start horizon
--                               only. horizon stays the START band.
--   backlog_items.horizon /     backlog and parked items join the same
--   backlog_items.end_horizon   Now/Next/Later timeline, so the whole
--                               list from idea to delivered lives on
--                               one axis.
-- Applied live and mirrored in supabase/schema/30_work.sql.
-- See docs/ROADMAP.md and docs/ROADMAP-PROCESS.md.
-- ------------------------------------------------------------------

alter table public.roadmap_items
  add column if not exists end_horizon text
    check (end_horizon in ('now', 'next', 'later', 'someday'));

alter table public.backlog_items
  add column if not exists horizon text not null default 'someday'
    check (horizon in ('now', 'next', 'later', 'someday')),
  add column if not exists end_horizon text
    check (end_horizon in ('now', 'next', 'later', 'someday'));
