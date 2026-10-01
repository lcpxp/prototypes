-- User stories and acceptance criteria, held on the work item they
-- describe, so Now work carries its own delivery detail and the drawer
-- can show it. docs/SPRINT-DELIVERY.md is the one home for how they are
-- written; this is only where they are kept and the shape they must take.
--
-- user_stories is an array of {title, story, criteria[]}; on a workstream
-- the one element is its epic. stories_status mirrors benefit_status:
-- drafted until the owner confirms the wording in as many words.

alter table public.work_items
  add column if not exists user_stories jsonb;
alter table public.work_items
  add column if not exists stories_status text
    check (stories_status in ('drafted', 'confirmed'));

comment on column public.work_items.user_stories is
  'Sprint stories for this row: an array of {title, story, criteria[]}. A workstream holds one epic story. Shape held by work_item_stories_valid(). See docs/SPRINT-DELIVERY.md.';
comment on column public.work_items.stories_status is
  'drafted until the owner confirms the stories in as many words; confirmed after. Null exactly when user_stories is null.';

alter table public.work_items drop constraint if exists work_items_stories_status_present;
alter table public.work_items add constraint work_items_stories_status_present
  check ((user_stories is null) = (stories_status is null));

-- The shape, and the guard against bloat: 1-5 stories, each with a
-- title, a story sentence and 1-8 criteria, nothing empty. CASE rather
-- than AND/OR because a boolean chain is not evaluated in a promised
-- order, and the array functions raise on a value that is not an array.
create or replace function public.work_item_stories_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
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

revoke execute on function public.work_item_stories_valid(jsonb) from public, anon;
grant execute on function public.work_item_stories_valid(jsonb) to authenticated;

alter table public.work_items drop constraint if exists work_items_user_stories_shape;
alter table public.work_items add constraint work_items_user_stories_shape
  check (public.work_item_stories_valid(user_stories));

-- The board view freezes its columns at creation, so it is recreated to
-- carry stories_status. user_stories is left out with details: long text
-- shown one drawer at a time and fetched when the drawer opens.
drop view if exists public.work_items_board;
create view public.work_items_board
  with (security_invoker = on) as
  select
    id, area_id, category_id, milestone_id, source_document_id, parent_id,
    title, summary, level, type, status, horizon, end_horizon, presentation,
    priority, effort, impact, progress, prd_status, project_status,
    starts_on, ends_on, start_sprint, end_sprint,
    department, associated_departments, assignee, support_assignee,
    business_benefit, benefit_type, benefit_status,
    pxp_staff_value, partner_staff_value, merchant_value, sales_route,
    scope, scale_notes, stories_status,
    external_ref, requested_by, tags, attributes, sort_order,
    resolution, resolved_at, previously_completed_at, created_at, updated_at
  from public.work_items;

revoke all on public.work_items_board from public, anon;
grant select on public.work_items_board to authenticated;

comment on view public.work_items_board is
  'work_items without details or user_stories, for the roadmap board and the backlog list. security_invoker: reads are filtered by the base table policy. See docs/plan/80-LOAD-SPEED.md.';
