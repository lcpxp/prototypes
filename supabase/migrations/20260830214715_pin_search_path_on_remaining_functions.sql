-- ------------------------------------------------------------------
-- pin_search_path_on_remaining_functions
--
-- Sixteen of the eighteen functions in supabase/schema/ already set
-- search_path = public, as do all three in policies.sql. These two did
-- not, and Supabase's linter flagged both
-- (function_search_path_mutable): a function with a mutable search_path
-- can be made to resolve an unqualified name against a schema the
-- caller controls.
--
-- The 2026-07-13 session remediated exactly this class of finding
-- (module_access_and_function_hardening) and it has regressed twice
-- since, because the convention was held by habit rather than by a
-- gate. tests/checks/security.test.js now holds it mechanically.
--
-- Bodies unchanged; only the search_path setting is added.
-- ------------------------------------------------------------------

create or replace function public.roadmap_move_workstream(
  p_workstream_id uuid,
  p_target_horizon text)
returns integer
language plpgsql
set search_path = public
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

create or replace function public.work_item_embed_text(
  p_title text, p_summary text, p_details text, p_resolution text)
returns text
language sql
immutable
set search_path = public
as $$
  select left(btrim(concat_ws(E'\n', p_title, p_summary, p_details, p_resolution)), 2000);
$$;
