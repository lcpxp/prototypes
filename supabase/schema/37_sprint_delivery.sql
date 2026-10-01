-- ------------------------------------------------------------------
-- 37_sprint_delivery.sql - The behaviour that runs over the Sprint
-- Roadmap: the shape of the stories and acceptance criteria a row
-- carries, how work joins and leaves the plan, and how the two roadmaps
-- are kept in one order.
--
-- 35_sprints.sql holds the plan itself - the calendar, the anchor, the
-- allocation table and the views the board reads. 38_sprint_handoff.sql
-- holds what is read before a sprint: what the plan still needs, and the
-- pack that carries the stories out.
-- docs/SPRINT-DELIVERY.md is the process all three serve.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- The shape of work_items.user_stories, and the guard against bloat.
--
-- An array of 1 to 5 stories, each an object with a non-empty title,
-- a non-empty story sentence and 1 to 8 non-empty criteria. These are
-- the HARD ceilings only. How much to write - one epic on a workstream,
-- a few stories on an item, a handful of criteria each - is judgement,
-- and it is stated once, in docs/SPRINT-DELIVERY.md. The database is
-- here so a malformed or runaway story set cannot be stored at all.
--
-- immutable and side-effect free, so a check constraint can call it.
-- A check runs as the role doing the write, so signed-in users keep
-- EXECUTE (supabase/policies.sql); anon has no business with it.
-- ---------------------------------------------------------------

create or replace function public.work_item_stories_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  -- CASE rather than AND/OR: SQL does not promise to evaluate a boolean
  -- chain left to right, and jsonb_array_length or jsonb_array_elements
  -- on a value that is not an array raises rather than returning false.
  select case
    when p is null then true
    when jsonb_typeof(p) <> 'array' then false
    when jsonb_array_length(p) not between 1 and 5 then false
    else not exists (
      select 1 from jsonb_array_elements(p) as s(story)
      where case
        when jsonb_typeof(s.story) <> 'object' then true
        when coalesce(btrim(s.story->>'title'), '') = '' then true
        when coalesce(btrim(s.story->>'story'), '') = '' then true
        when jsonb_typeof(s.story->'criteria') is distinct from 'array' then true
        when jsonb_array_length(s.story->'criteria') not between 1 and 8 then true
        else exists (
          select 1 from jsonb_array_elements(s.story->'criteria') as c(criterion)
          where jsonb_typeof(c.criterion) <> 'string'
             or btrim(c.criterion #>> '{}') = '')
      end)
  end;
$$;

comment on function public.work_item_stories_valid(jsonb) is
  'The shape of work_items.user_stories: 1-5 stories, each {title, story, criteria[1-8]}, nothing empty. Hard ceilings only; docs/SPRINT-DELIVERY.md holds how much to write.';

alter table public.work_items drop constraint if exists work_items_user_stories_shape;
alter table public.work_items add constraint work_items_user_stories_shape
  check (public.work_item_stories_valid(user_stories));

-- ---------------------------------------------------------------
-- Joining and leaving the Sprint Roadmap, automatically.
--
-- The Now column is the conveyor belt: an item is on the Sprint Roadmap
-- while it sits at Now under a workstream and has a live allocation.
-- Until this trigger, giving it that allocation - and retiring it when
-- the item left - was a step a session had to remember, so the two
-- roadmaps could disagree for as long as nobody did.
--
-- Joining: a work item that arrives at Now (by promotion, a move of its
-- workstream, insertion, re-parenting or re-levelling) is given a
-- PROVISIONAL allocation at once - at the end of its own workstream,
-- sharing that stream's last sprint, or, when the stream is not on the
-- plan yet, in the first sprint after the last one in use. Appending
-- never displaces committed work. The board draws it as not yet placed
-- until a mapping pass (docs/SPRINT-DELIVERY.md Part C) confirms or
-- moves it and sets placement 'planned'.
--
-- Leaving: demoted, dropped, or no longer a work item under a workstream,
-- and its live allocation retires with a resolution saying which. Done
-- is the exception: the allocation stays live as the record of the
-- sprint the work was delivered in, and the view already hides it.
--
-- security definer, so the write is not refused by RLS mid-update; it
-- writes only rows derived from the row that fired it, and it is
-- revoked from every caller (supabase/policies.sql) - a trigger needs
-- no grant to fire. It cannot recurse: its insert fires
-- sprint_plan_project(), which writes start_sprint and end_sprint only,
-- outside this trigger's column list.
-- ---------------------------------------------------------------

create or replace function public.work_items_sprint_intake()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  live_id uuid;
  on_belt boolean;
  v_slot integer;
  v_seq integer;
begin
  select a.id into live_id
    from public.work_item_sprints a
   where a.work_item_id = new.id and a.retired_at is null;

  on_belt := new.horizon = 'now'
    and new.status not in ('done', 'dropped')
    and new.level = 'item'
    and exists (select 1 from public.work_items p
                 where p.id = new.parent_id and p.level = 'workstream');

  if live_id is not null and new.status <> 'done' and not on_belt then
    update public.work_item_sprints
       set retired_at = now(),
           resolution = 'Retired automatically: ' || case
             when new.status = 'dropped' then 'the item was dropped.'
             when new.horizon <> 'now' then 'the item left Now for ' || new.horizon || '.'
             else 'the item is no longer a work item under a workstream.'
           end
     where id = live_id;
    return null;
  end if;

  if live_id is null and on_belt then
    select max(a.slot + a.slip_slots + a.span - 1), max(a.sequence_position)
      into v_slot, v_seq
      from public.work_item_sprints a
      join public.work_items w on w.id = a.work_item_id
     where a.retired_at is null and w.parent_id = new.parent_id and w.id <> new.id
       and w.horizon = 'now' and w.status not in ('done', 'dropped');
    if v_slot is null then
      select coalesce(max(a.slot + a.slip_slots + a.span - 1) + 1, 0)
        into v_slot
        from public.work_item_sprints a
        join public.work_items w on w.id = a.work_item_id
       where a.retired_at is null
         and w.horizon = 'now' and w.status not in ('done', 'dropped');
    end if;
    insert into public.work_item_sprints
      (work_item_id, slot, span, sequence_position, overlap, placement, note)
    values (new.id, v_slot, 1, coalesce(v_seq, 0) + 1, 'overlappable', 'provisional',
      'Placed automatically when this item entered Now, at the end of its ' ||
      'workstream. Confirm or move it in the next mapping pass ' ||
      '(docs/SPRINT-DELIVERY.md Part C).');
  end if;
  return null;
end $$;

comment on function public.work_items_sprint_intake() is
  'Puts a work item on the Sprint Roadmap the moment it reaches Now under a workstream (a provisional allocation at the end of its stream) and retires its allocation when it leaves. Done keeps its allocation as the record of delivery.';

drop trigger if exists work_items_sprint_intake on public.work_items;
create trigger work_items_sprint_intake
  after insert or update of horizon, status, parent_id, level on public.work_items
  for each row execute function public.work_items_sprint_intake();

-- ---------------------------------------------------------------
-- One order for both roadmaps.
--
-- The Sprint Roadmap orders streams by the sprint they start in, and a
-- stream's items by sprint then sequence. The Product Roadmap's Now
-- column orders by priority. Left alone the two drift - a stream
-- re-mapped to a later sprint keeps the priority it had - so the board
-- a stakeholder sees and the column the owner plans from list the same
-- work in different orders.
--
-- The sprint order is the master (docs/SPRINT-DELIVERY.md Part D).
-- v_sprint_plan_order states it once, as a rank in gaps of 10 the way
-- priorities are written; sprint_plan_sync_order() writes that rank to
-- priority and sort_order, and v_sprint_plan_checks reports any row
-- where the two differ. Nothing off the plan is ranked, so nothing off
-- the plan is touched.
-- ---------------------------------------------------------------

-- The checks in 38_sprint_handoff.sql read the order, so they are
-- dropped first and rebuilt there; both are views, holding no data.
drop view if exists public.v_sprint_plan_checks;
drop view if exists public.v_sprint_plan_order;
create view public.v_sprint_plan_order with (security_invoker = on) as
  select s.workstream_id as work_item_id, 'workstream'::text as level,
         s.workstream_id, s.workstream_title as title,
         w.priority, w.sort_order,
         (row_number() over (order by s.first_slot, s.priority,
            s.workstream_title, s.workstream_id) * 10)::integer as sprint_rank
    from public.v_sprint_plan_streams s
    join public.work_items w on w.id = s.workstream_id
  union all
  select v.work_item_id, 'item'::text,
         v.workstream_id, v.title,
         w.priority, w.sort_order,
         (row_number() over (partition by v.workstream_id
            order by v.effective_slot, v.sequence_position nulls last,
                     v.priority, v.title, v.work_item_id) * 10)::integer
    from public.v_sprint_plan_items v
    join public.work_items w on w.id = v.work_item_id;

revoke all on public.v_sprint_plan_order from public, anon;
grant select on public.v_sprint_plan_order to authenticated;

comment on view public.v_sprint_plan_order is
  'The sprint order, stated once: each stream on the plan ranked by first sprint then priority, each item within its stream by sprint then sequence. sprint_rank is in gaps of 10. sprint_plan_sync_order() writes it; v_sprint_plan_checks reports drift from it.';

-- Writes the sprint order onto priority and sort_order. security
-- definer and revoked from every caller (supabase/policies.sql): it
-- rewrites rows across the plan, so it is run deliberately from an
-- admin session, like sprint_plan_project(). It touches only rows whose
-- values change, and priority is outside the intake trigger's column
-- list, so it cannot move anything on or off the plan. Returns the
-- number of rows changed; the caller records the before and after order
-- in a decision note, which is the undo.
create or replace function public.sprint_plan_sync_order()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer;
begin
  update public.work_items w
     set priority = o.sprint_rank, sort_order = o.sprint_rank
    from public.v_sprint_plan_order o
   where w.id = o.work_item_id
     and (w.priority is distinct from o.sprint_rank
          or w.sort_order is distinct from o.sprint_rank);
  get diagnostics touched = row_count;
  return touched;
end $$;

comment on function public.sprint_plan_sync_order() is
  'Writes the sprint order (v_sprint_plan_order) onto priority and sort_order for every row on the Sprint Roadmap, so the Now column lists the work in the order the sprints run it. Rows off the plan are never touched. Returns rows changed.';
