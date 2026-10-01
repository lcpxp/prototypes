-- ------------------------------------------------------------------
-- 38_sprint_handoff.sql - What is read before a sprint starts: what the
-- Sprint Roadmap still needs, finding by finding.
--
-- 37_sprint_delivery.sql holds the behaviour that writes the plan - the
-- intake trigger, the order sync. This file holds only read surfaces,
-- so a session preparing a sprint reads one file to see everything the
-- run looks at. The process is docs/SPRINT-DELIVERY.md.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- What the plan still needs before a sprint: one row per finding.
--
-- The one readiness surface, read at the start of every mapping pass
-- and every stories run (docs/SPRINT-DELIVERY.md). Severity says what
-- answers it:
--   fix      a session can correct it: the order, a row off the belt,
--            a dependency, a thin row, a slot over its bounds
--   confirm  a person has to say so (a provisional slot, drafted stories)
--   write    the stories have not been written yet
-- security_invoker, so it reads only what the caller's policies allow.
-- ---------------------------------------------------------------

create view public.v_sprint_plan_checks with (security_invoker = on) as
with plan as (
  select v.work_item_id, v.workstream_id, v.workstream_title, v.title,
         v.effective_slot, v.effective_end_slot, v.overlap, v.placement,
         w.summary, w.details, w.user_stories, w.stories_status
    from public.v_sprint_plan_items v
    join public.work_items w on w.id = v.work_item_id
),
-- Every row a story set is written for: each allocated item, and each
-- workstream on the plan, which carries the epic.
written as (
  select p.work_item_id as id, p.workstream_title, p.title, false as is_stream,
         p.summary, p.details, p.user_stories, p.stories_status
    from plan p
  union all
  select s.workstream_id, s.workstream_title, s.workstream_title, true,
         w.summary, w.details, w.user_stories, w.stories_status
    from public.v_sprint_plan_streams s
    join public.work_items w on w.id = s.workstream_id
),
found as (
  -- The Now column would list this row in a different place from the
  -- sprint board.
  select 'order'::text as check_key, 'fix'::text as severity, o.work_item_id,
         ws.title as workstream_title, o.title,
         'Priority ' || o.priority || ' and sort order ' || o.sort_order ||
         ', where the sprint order puts it at ' || o.sprint_rank ||
         '. Run select sprint_plan_sync_order();' as detail
    from public.v_sprint_plan_order o
    join public.work_items ws on ws.id = o.workstream_id
   where o.priority is distinct from o.sprint_rank
      or o.sort_order is distinct from o.sprint_rank
  union all
  -- Placed by the intake trigger and not yet by a person.
  select 'placement', 'confirm', p.work_item_id, p.workstream_title, p.title,
         'Placed automatically in Sprint ' || (p.effective_slot + 1) ||
         '. Confirm the slot or move it, then set placement to planned.'
    from plan p
   where p.placement = 'provisional'
  union all
  -- In Now, but not on the plan.
  select 'unplaced', 'fix', w.id, p.title, w.title,
         case
           when w.parent_id is null then
             'A work item in Now with no workstream. Only work under a workstream is on the sprint plan.'
           when p.level <> 'workstream' then
             'Its parent is a work item, so it is drawn as one of that item''s deliverables. Set its level to deliverable, or move it under a workstream.'
           else
             'Under a workstream in Now with no live allocation. Allocate it under docs/SPRINT-DELIVERY.md Part C.'
         end
    from public.work_items w
    left join public.work_items p on p.id = w.parent_id
   where w.level = 'item' and w.horizon = 'now'
     and w.status not in ('done', 'dropped')
     and not exists (select 1 from public.work_item_sprints a
                      where a.work_item_id = w.id and a.retired_at is null)
  union all
  select 'stream_empty', 'fix', ws.id, ws.title, ws.title,
         'A workstream in Now with nothing on the sprint plan. Bring its work items into Now, or move it out of Now.'
    from public.work_items ws
   where ws.level = 'workstream' and ws.horizon = 'now'
     and ws.status not in ('done', 'dropped')
     and not exists (select 1 from public.v_sprint_plan_items v
                      where v.workstream_id = ws.id)
  union all
  select 'stream_not_now', 'fix', p.work_item_id, p.workstream_title, p.title,
         'On the sprint plan, but its workstream is ' ||
         case when ws.status in ('done', 'dropped') then ws.status
              else 'at ' || ws.horizon end ||
         '. Move the workstream into Now, or this item out of it.'
    from plan p
    join public.work_items ws on ws.id = p.workstream_id
   where ws.level = 'workstream'
     and (ws.horizon <> 'now' or ws.status in ('done', 'dropped'))
  union all
  select 'not_an_item', 'fix', v.work_item_id, v.workstream_title, v.title,
         'A live allocation on a row that is not a work item under a workstream. Retire it with a resolution.'
    from public.v_sprint_plan_items v
    left join public.work_items ws on ws.id = v.workstream_id
   where v.level <> 'item' or ws.level is distinct from 'workstream'
  union all
  -- A blocker that is neither done nor on the plan, or that ends after
  -- the work it blocks starts. Sharing the boundary sprint is allowed
  -- unless the blocked item is exclusive (Part C rule 6). A deliverable
  -- blocker is placed by its item.
  select 'dependency', 'fix', t.work_item_id, t.workstream_title, t.title,
         case
           when fa.work_item_id is null and f.status = 'dropped' then
             'Blocked by "' || f.title || '", which was dropped. Close the link with a note.'
           when fa.work_item_id is null then
             'Blocked by "' || f.title || '", which is at ' || f.horizon ||
             ' and not on the sprint plan.'
           else
             'Starts in Sprint ' || (t.effective_slot + 1) || ' but is blocked by "' ||
             f.title || '", which ends in Sprint ' || (fa.effective_end_slot + 1) || '.'
         end
    from public.knowledge_links l
    join plan t on t.work_item_id = l.to_id
    join public.work_items f on f.id = l.from_id
    left join public.v_sprint_plan_items fa
      on fa.work_item_id = case when f.level = 'deliverable' then f.parent_id else f.id end
   where l.kind = 'blocks' and l.valid_to is null
     and l.from_type = 'work_item' and l.to_type = 'work_item'
     and f.status <> 'done'
     and (fa.work_item_id is null
          or t.effective_slot < fa.effective_end_slot
          or (t.effective_slot = fa.effective_end_slot and t.overlap = 'exclusive'))
  union all
  select 'thin', 'fix', x.id, x.workstream_title, x.title,
         case
           when coalesce(btrim(x.summary), '') = '' and coalesce(btrim(x.details), '') = ''
             then 'No summary and no details.'
           when coalesce(btrim(x.summary), '') = '' then 'No summary.'
           else 'No details.'
         end || ' Stories are written from these, so they come first.'
    from written x
   where coalesce(btrim(x.summary), '') = '' or coalesce(btrim(x.details), '') = ''
  union all
  select 'stories_missing', 'write', x.id, x.workstream_title, x.title,
         case when x.is_stream then 'No epic story yet.' else 'No user stories yet.' end
    from written x
   where x.user_stories is null
  union all
  select 'stories_drafted', 'confirm', x.id, x.workstream_title, x.title,
         'Stories drafted and not yet confirmed by the owner.'
    from written x
   where x.stories_status = 'drafted'
  union all
  -- The planning constants stay out of the wording: they produce the
  -- mapping and are never published with it (Part C, Durations).
  select 'load', 'fix', null::uuid, null::text,
         coalesce(l.code, 'Sprint ' || (l.slot + 1)),
         concat_ws(' ',
           case when l.over_capacity then
             'More exclusive builds than the plan holds.' end,
           case when l.over_concurrency then
             l.streams_in_flight || ' workstreams in flight, over the concurrency bound.' end)
    from public.v_sprint_plan_load l
   where l.over_capacity or l.over_concurrency
)
select check_key, severity, work_item_id, workstream_title, title, detail
  from found
 order by case severity when 'fix' then 1 when 'confirm' then 2 else 3 end,
          check_key, workstream_title nulls first, title;

revoke all on public.v_sprint_plan_checks from public, anon;
grant select on public.v_sprint_plan_checks to authenticated;

comment on view public.v_sprint_plan_checks is
  'What the Sprint Roadmap still needs, one row per finding: order, placement, unplaced, stream_empty, stream_not_now, not_an_item, dependency, thin, stories_missing, stories_drafted, load. Severity fix, confirm or write. Read at the start of every mapping pass and stories run (docs/SPRINT-DELIVERY.md).';
