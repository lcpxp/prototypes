-- ------------------------------------------------------------------
-- 37_sprint_delivery.sql - The flow from the Now column into a sprint
-- and out to delivery: how work joins and leaves the Sprint Roadmap,
-- how the two roadmaps are kept in one order, what the plan still needs
-- before a sprint, and the stories and acceptance criteria that travel
-- to the company roadmap and Azure DevOps.
--
-- 35_sprints.sql holds the plan itself - the calendar, the anchor, the
-- allocation table and the views the board reads. This file holds the
-- behaviour that runs over it, so the allocation model stays one
-- readable file and the delivery flow another. docs/SPRINT-DELIVERY.md
-- is the process both serve.
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
