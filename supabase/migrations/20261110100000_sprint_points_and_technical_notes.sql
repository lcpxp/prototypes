-- Capacity in story points, estimates on stories, technical notes on
-- items. Mirrors supabase/schema/35_sprints.sql and 37_sprint_delivery.sql.
--
-- Estimates are allowed from 10 Nov 2026 (docs/ESTIMATION.md): a story
-- is the unit that is sized, an item's points are the sum of its
-- stories', and a sprint holds capacity_points of them. The old cap -
-- capacity_dev_equivalents, counted in exclusive builds - is superseded
-- and removed rather than left as a second mechanism for one job. Its
-- last value was 3.0.

drop view if exists public.v_sprint_plan_checks;
drop view if exists public.v_sprint_plan_load;

alter table public.sprint_plan
  add column if not exists capacity_points numeric(4,1) not null default 24
    check (capacity_points > 0),
  add column if not exists capacity_overrides jsonb not null default '{}'::jsonb
    check (jsonb_typeof(capacity_overrides) = 'object'),
  add column if not exists code_snapshot date,
  drop column if exists capacity_dev_equivalents;

comment on column public.sprint_plan.capacity_points is
  'Story points one sprint holds. Recalibrated after every sprint from delivered points, with a decision note (docs/ESTIMATION.md).';
comment on column public.sprint_plan.capacity_overrides is
  'Sprint code -> points, for a sprint that is not a full one (a short sprint over public holidays).';
comment on column public.sprint_plan.code_snapshot is
  'The date of the newest LaunchPad code snapshot the platform picture was synced to. Technical notes older than this are stale (v_sprint_plan_checks).';

alter table public.work_items
  add column if not exists estimate_drivers jsonb
    check (estimate_drivers is null or jsonb_typeof(estimate_drivers) = 'object'),
  add column if not exists technical_notes text,
  add column if not exists technical_notes_snapshot date;

alter table public.work_items drop constraint if exists work_items_technical_notes_dated;
alter table public.work_items add constraint work_items_technical_notes_dated
  check ((technical_notes is null) = (technical_notes_snapshot is null));

comment on column public.work_items.estimate_drivers is
  'Why the item is sized as it is: the drivers and the low/likely/high range behind its stories'' points. Owner surfaces only (docs/ESTIMATION.md).';
comment on column public.work_items.technical_notes is
  'The code review behind the item: current behaviour, shortcoming, suggested change, risks, how to test. A story may carry its own override (docs/SPRINT-DELIVERY.md Part A).';
comment on column public.work_items.technical_notes_snapshot is
  'The code snapshot date the technical notes were verified against.';

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
        when exists (
          select 1 from (values ('points'), ('points_low'), ('points_high')) as k(name)
          where s.story ? k.name and jsonb_typeof(s.story->k.name) <> 'number') then true
        when s.story ? 'technical_notes'
          and jsonb_typeof(s.story->'technical_notes') <> 'string' then true
        when s.story ? 'ado' and jsonb_typeof(s.story->'ado') <> 'object' then true
        else exists (
          select 1 from jsonb_array_elements(s.story->'criteria') as c(criterion)
          where jsonb_typeof(c.criterion) <> 'string'
             or btrim(c.criterion #>> '{}') = '')
      end)
  end;
$$;

comment on function public.work_item_stories_valid(jsonb) is
  'The shape of work_items.user_stories: 1-5 stories, each {title, story, criteria[1-8]}, nothing empty; optionally points, points_low, points_high (numbers), technical_notes (text) and ado (the DevOps association). Hard ceilings only; docs/SPRINT-DELIVERY.md holds how much to write.';

create or replace function public.work_item_points(p jsonb)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p is null or jsonb_typeof(p) <> 'array' then null
    else (select sum((s.story->>'points')::numeric)
            from jsonb_array_elements(p) as s(story)
           where jsonb_typeof(s.story->'points') = 'number')
  end;
$$;

comment on function public.work_item_points(jsonb) is
  'An item''s points: the sum of its stories'' points, null while none is sized. The one place that sum is taken.';

revoke execute on function public.work_item_points(jsonb) from public, anon;
grant execute on function public.work_item_points(jsonb) to authenticated;

create or replace view public.v_sprint_plan_items with (security_invoker = on) as
  select
    w.id as work_item_id, w.title, w.summary, w.level, w.type, w.status,
    w.progress, w.priority,
    w.parent_id as workstream_id, p.title as workstream_title,
    rc.key as category_key, rc.label as category_label, w.department,
    a.slot, a.span, a.slip_slots,
    (a.slot + a.slip_slots) as effective_slot,
    (a.slot + a.slip_slots + a.span - 1) as effective_end_slot,
    a.sequence_position, a.overlap, a.note as allocation_note,
    i.name as external_party, a.external_status,
    (a.external_party_id is not null) as is_external,
    public.sprint_code_for_slot(a.slot + a.slip_slots) as start_code,
    public.sprint_code_for_slot(a.slot + a.slip_slots + a.span - 1) as end_code,
    (select sp.anchor_sprint is not null from public.sprint_plan sp
      where sp.key = 'default') as anchored,
    w.business_benefit, w.benefit_type, w.benefit_status,
    a.placement, w.stories_status,
    public.work_item_points(w.user_stories) as points,
    (a.external_party_id is null and a.overlap <> 'parallel') as is_build
  from public.work_item_sprints a
  join public.work_items w on w.id = a.work_item_id
  left join public.work_items p on p.id = w.parent_id
  left join public.roadmap_categories rc on rc.id = w.category_id
  left join public.integrations i on i.id = a.external_party_id
  where a.retired_at is null
    and w.horizon = 'now'
    and w.status not in ('done', 'dropped');

comment on view public.v_sprint_plan_items is
  'The Sprint Roadmap delivery view: one row per live allocation of a Now work item, with its points and whether it is developer work (is_build). The board reads this. See docs/SPRINT-DELIVERY.md.';

create view public.v_sprint_plan_load with (security_invoker = on) as
  with occupancy as (
    select v.*, gs.slot_n
    from public.v_sprint_plan_items v
    cross join lateral generate_series(v.effective_slot, v.effective_end_slot) as gs(slot_n)
  ),
  per_slot as (
    select
      o.slot_n as slot,
      public.sprint_code_for_slot(o.slot_n) as code,
      count(distinct o.workstream_id) as streams_in_flight,
      count(distinct o.workstream_id) filter (where o.is_build) as build_streams,
      count(*) filter (where o.is_build) as build_items,
      count(*) filter (where o.is_external) as external_items,
      count(*) filter (where o.is_build and o.points is null) as unsized_items,
      coalesce(round(sum(o.points / o.span) filter (where o.is_build), 1), 0) as planned_points
    from occupancy o
    group by o.slot_n
  )
  select
    s.slot, s.code, s.streams_in_flight, s.build_streams, s.build_items,
    s.external_items, s.unsized_items, s.planned_points,
    coalesce((sp.capacity_overrides ->> s.code)::numeric, sp.capacity_points) as capacity_points,
    s.planned_points
      > coalesce((sp.capacity_overrides ->> s.code)::numeric, sp.capacity_points) as over_capacity,
    s.build_streams > sp.max_concurrent_streams as over_concurrency
  from per_slot s
  cross join public.sprint_plan sp
  where sp.key = 'default'
  order by s.slot;

revoke all on public.v_sprint_plan_load from public, anon;
grant select on public.v_sprint_plan_load to authenticated;

comment on view public.v_sprint_plan_load is
  'Per-sprint load: planned points of developer work against the sprint''s capacity (capacity_points, or its override), unsized items, and streams in flight against the concurrency bound. External and parallel allocations consume no points.';
