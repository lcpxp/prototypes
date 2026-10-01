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
