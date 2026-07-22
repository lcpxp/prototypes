-- ------------------------------------------------------------------
-- 20260722170000_roadmap_move_workstream_cascade.sql
--
-- roadmap_move_workstream(workstream_id, target_horizon): reschedule a
-- workstream and cascade the shift to its direct child items, so
-- "move this workstream to now" moves the work beneath it too.
--
-- The move is a relative band shift: delta = target band - current band,
-- applied to the workstream's horizon AND end_horizon and to every
-- child's horizon AND end_horizon. Relative offsets and the workstream's
-- total span are preserved (2 Next + 2 Later children moved to Now become
-- 2 Now + 2 Next; a Next->Later workstream becomes Now->Next). Bands
-- clamp to now..someday. priority and sort_order are untouched, so
-- ordering within each band is retained. Only direct children (parent_id)
-- move; soft-linked items (relates_to_id) stay put. Idempotent for
-- delta 0. Canonical schema in supabase/schema/30_work.sql.
-- ------------------------------------------------------------------
create or replace function public.roadmap_move_workstream(
  p_workstream_id uuid,
  p_target_horizon text)
returns integer
language plpgsql
as $$
declare
  bands text[] := array['now', 'next', 'later', 'someday'];
  cur_idx int;
  tgt_idx int;
  delta int;
  affected int;
begin
  tgt_idx := array_position(bands, p_target_horizon);
  if tgt_idx is null then
    raise exception 'invalid target horizon %, expected one of now/next/later/someday', p_target_horizon;
  end if;

  select array_position(bands, horizon) into cur_idx
    from public.work_items
   where id = p_workstream_id and level = 'workstream';
  if cur_idx is null then
    raise exception 'no workstream found with id % (must be level=workstream)', p_workstream_id;
  end if;

  delta := tgt_idx - cur_idx;
  if delta = 0 then
    return 0;
  end if;

  with moved as (
    update public.work_items set
      horizon = bands[greatest(1, least(4, array_position(bands, horizon) + delta))],
      end_horizon = case
        when end_horizon is null then null
        else bands[greatest(1, least(4, array_position(bands, end_horizon) + delta))]
      end
    where id = p_workstream_id
       or parent_id = p_workstream_id
    returning 1)
  select count(*) into affected from moved;

  return affected;
end $$;

comment on function public.roadmap_move_workstream(uuid, text) is
  'Reschedule a workstream and cascade the band shift to its direct children, preserving relative offsets and span. See docs/ROADMAP-PLAYBOOK.md.';
