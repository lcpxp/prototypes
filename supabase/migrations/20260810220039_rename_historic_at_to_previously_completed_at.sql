-- The board's delivered columns are "Recently completed" and "Previously
-- completed". The latch column added minutes earlier was named for a
-- label that was never adopted, leaving two words for one concept. Rename
-- it to match the band it actually controls. Nothing reads it yet.
alter table public.work_items
  rename column historic_at to previously_completed_at;

alter index if exists work_items_historic_idx
  rename to work_items_previously_completed_idx;

comment on column public.work_items.previously_completed_at is
  'Delivered work only. Null = the board derives Recently vs Previously completed from the freshness window on resolved_at (90 days). A timestamp moves the row into Previously completed permanently, regardless of age. Set null to undo.';
