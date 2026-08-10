-- Delivered work splits into two columns on the board: Completed (a
-- rolling freshness window) and Historic. historic_at is the one-way
-- latch: null means "derive from the freshness window", a timestamp
-- means the delivery has been retired to Historic and stays there
-- regardless of age. Clearing it back to null is the undo.
alter table public.work_items
  add column if not exists historic_at timestamptz;

comment on column public.work_items.historic_at is
  'Delivered work only. Null = the board derives Completed vs Historic from the freshness window on resolved_at. A timestamp latches the row to Historic permanently. Set null to undo.';

create index if not exists work_items_historic_idx
  on public.work_items (historic_at)
  where historic_at is not null;
