-- ------------------------------------------------------------------
-- 39_sprint_checks.sql - What is read before and after a sprint: what
-- the Sprint Roadmap still needs, finding by finding, and the ledger of
-- what each sprint held and delivered.
--
-- Read surfaces only. 37_sprint_delivery.sql writes the plan,
-- 38_sprint_handoff.sql derives the stories' fields, 39_ado_push.sql
-- describes the Azure DevOps target these checks compare against.
-- The process is docs/SPRINT-DELIVERY.md and docs/DEVOPS.md.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- What the plan still needs before a sprint: one row per finding.
--
-- The one readiness surface, read at the start of every mapping pass
-- and every stories run. Severity says what answers it:
--   fix      a session can correct it: the order, a row off the belt,
--            a dependency, a thin row, a sprint over its bounds, a
--            story that cannot be handed over as it stands
--   confirm  a person has to say so (a provisional slot, drafted
--            stories, a confirmed story not yet pushed)
--   write    something has not been written yet
-- The hand-off checks cover developer work only - an allocation that is
-- neither external nor parallel - because only that work is pushed.
-- security_invoker, so it reads only what the caller's policies allow;
-- without the admin-only ado_profile the sprint check finds nothing.
-- ---------------------------------------------------------------

drop view if exists public.v_sprint_plan_checks;
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
-- Every story of developer work, with the fields a backlog item will
-- carry (38_sprint_handoff.sql). The hand-off checks below read these.
sf as (
  select * from public.sprint_story_fields() where is_build
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
  select 'load', 'fix', null::uuid, null::text,
         coalesce(l.code, 'Sprint ' || (l.slot + 1)),
         concat_ws(' ',
           case when l.over_capacity then
             l.planned_points || ' points planned against ' || l.capacity_points || '.' end,
           case when l.over_concurrency then
             l.build_streams || ' workstreams with developer work in flight, over the concurrency bound.' end)
    from public.v_sprint_plan_load l
   where l.over_capacity or l.over_concurrency
  union all
  -- The hand-off checks (docs/DEVOPS.md). One row per item, naming the
  -- stories it is true of.
  select 'ado_story_shape', 'fix', s.work_item_id, s.workstream_title, s.item_title,
         'Story ' || string_agg(s.n::text, ', ' order by s.n) ||
         ' does not read "As a <role>, I want <behaviour>, so that <outcome>", so its Description cannot be laid out.'
    from sf s where not s.shape_ok
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'ado_criteria_count', 'fix', s.work_item_id, s.workstream_title, s.item_title,
         'Story ' || string_agg(s.n::text, ', ' order by s.n) ||
         ' has fewer than 2 or more than 5 acceptance criteria.'
    from sf s where cardinality(s.criteria) not between 2 and 5
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'ado_no_purpose', 'fix', s.work_item_id, s.workstream_title, s.item_title,
         'No Purpose: the item has no business benefit and story ' ||
         string_agg(s.n::text, ', ' order by s.n) || ' has no outcome to fall back on.'
    from sf s where s.kind = 'story' and coalesce(btrim(s.purpose), '') = ''
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'ado_no_category', 'fix', s.work_item_id, s.workstream_title, s.item_title,
         'Its workstream has no roadmap category, so there is no Epic to sit under.'
    from sf s where s.epic_key is null
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'ado_sprint_missing', 'fix', s.work_item_id, s.workstream_title, s.item_title,
         'Sprint ' || s.sprint_code || ' is not among the sprints the team has in Azure DevOps. ' ||
         'A push would land on the root iteration.'
    from sf s
    join public.ado_profile ap on ap.key = 'default'
   where s.sprint_code is not null and (s.ado->>'id') is null
     and not (s.sprint_code = any (ap.team_sprints))
   group by s.work_item_id, s.workstream_title, s.item_title, s.sprint_code
  union all
  select 'ado_changed', 'fix', s.work_item_id, s.workstream_title, s.item_title,
         'Story ' || string_agg(s.n || ' (#' || (s.ado->>'id') || ')', ', ' order by s.n) ||
         ' changed after it was pushed. The pushed text is frozen: make the difference in Azure DevOps.'
    from sf s
   where (s.ado->>'id') is not null and (s.ado->>'hash') is distinct from s.content_hash
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'estimate_missing', 'fix', s.work_item_id, s.workstream_title, s.item_title,
         'Story ' || string_agg(s.n::text, ', ' order by s.n) ||
         ' has no points, or points off the scale (docs/ESTIMATION.md).'
    from sf s where s.points is null or s.points not in (1, 2, 3, 5, 8)
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'tech_notes_stale', 'fix', p.work_item_id, p.workstream_title, p.title,
         'Technical notes were verified against the ' || w.technical_notes_snapshot ||
         ' code snapshot; the platform picture has been synced to ' || sp.code_snapshot || ' since.'
    from plan p
    join public.work_items w on w.id = p.work_item_id
    join public.sprint_plan sp on sp.key = 'default'
   where w.technical_notes_snapshot < sp.code_snapshot
  union all
  select 'ado_not_pushed', 'confirm', s.work_item_id, s.workstream_title, s.item_title,
         count(*) || ' confirmed ' || case when count(*) = 1 then 'story' else 'stories' end ||
         ' not yet in Azure DevOps.'
    from sf s where s.stories_status = 'confirmed' and (s.ado->>'id') is null
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'ado_open_clarifications', 'confirm', s.work_item_id, s.workstream_title, s.item_title,
         max(cardinality(s.clarifications)) || ' open question(s) would travel as unticked clarifications.'
    from sf s where cardinality(s.clarifications) > 0
   group by s.work_item_id, s.workstream_title, s.item_title
  union all
  select 'ado_no_stream_feature', 'write', ws.id, ws.title, ws.title,
         'Its Feature needs the workstream''s epic story with 3 to 5 outcomes.'
    from public.work_items ws
   where ws.id in (select s.workstream_id from sf s)
     and (ws.user_stories is null
          or (select count(*) from jsonb_array_elements(ws.user_stories) as e(story)
               cross join lateral jsonb_array_elements(e.story->'criteria')) not between 3 and 5)
)
select f.check_key, f.severity, f.work_item_id, f.workstream_title, f.title, f.detail,
       -- The sprint the finding belongs to (zero-indexed, as slots are),
       -- so a sprint can be read on its own. Null for a stream or a sprint row.
       p.effective_slot as slot
  from found f
  left join plan p on p.work_item_id = f.work_item_id
 order by case f.severity when 'fix' then 1 when 'confirm' then 2 else 3 end,
          f.check_key, f.workstream_title nulls first, f.title;

revoke all on public.v_sprint_plan_checks from public, anon;
grant select on public.v_sprint_plan_checks to authenticated;

comment on view public.v_sprint_plan_checks is
  'What the Sprint Roadmap still needs, one row per finding. The plan: order, placement, unplaced, stream_empty, stream_not_now, not_an_item, dependency, thin, stories_missing, stories_drafted, load. The hand-off: ado_story_shape, ado_criteria_count, ado_no_purpose, ado_no_category, ado_sprint_missing, ado_changed, estimate_missing, tech_notes_stale, ado_not_pushed, ado_open_clarifications, ado_no_stream_feature. Severity fix, confirm or write; slot is the sprint the finding belongs to. Read at the start of every mapping pass and stories run (docs/SPRINT-DELIVERY.md, docs/DEVOPS.md).';

-- ---------------------------------------------------------------
-- v_sprint_ledger: one row per item per sprint, for every sprint the
-- item's allocation covers - past, current and to come. It is what a
-- question about any sprint is answered from (/sprint-status).
--
--   planned_points  the item's points, spread evenly over its sprints
--   actual_points   points of the stories closed in that sprint, as the
--                   sprint close recorded them on the story's ado entry
--                   (closed_sprint, and actual where it differed)
--   outcome         delivered, carried or blocked for a sprint that has
--                   ended; in sprint for the current one; planned ahead
--
-- A done item keeps its allocation as the record of the sprint it was
-- delivered in, so it stays in the ledger. Empty while the plan is
-- unanchored: there is no sprint to be a row of.
-- ---------------------------------------------------------------

drop view if exists public.v_sprint_ledger;
create view public.v_sprint_ledger with (security_invoker = on) as
  select
    s.code as sprint_code, s.starts_on, s.ends_on,
    case when current_date > s.ends_on then 'past'
         when current_date < s.starts_on then 'future' else 'current' end as sprint_state,
    w.id as work_item_id, w.title, ws.id as workstream_id, ws.title as workstream_title,
    w.status, w.progress,
    (a.external_party_id is null and a.overlap <> 'parallel') as is_build,
    round(public.work_item_points(w.user_stories) / a.span, 1) as planned_points,
    (select sum(coalesce((e.story #>> '{ado,actual}')::numeric, (e.story->>'points')::numeric))
       from jsonb_array_elements(w.user_stories) as e(story)
      where e.story #>> '{ado,closed_sprint}' = s.code) as actual_points,
    (select jsonb_agg(e.story #> '{ado,id}' order by e.k)
       from jsonb_array_elements(w.user_stories) with ordinality as e(story, k)
      where e.story #> '{ado,id}' is not null) as ado_ids,
    a.slip_slots, a.placement,
    case
      when w.status = 'done' and s.idx = s0.idx + a.slot + a.slip_slots + a.span - 1 then 'delivered'
      when current_date > s.ends_on and w.status = 'blocked' then 'blocked'
      when current_date > s.ends_on and w.status <> 'done' then 'carried'
      when current_date > s.ends_on then 'progressed'
      when current_date >= s.starts_on then 'in sprint'
      else 'planned'
    end as outcome
  from public.work_item_sprints a
  join public.work_items w on w.id = a.work_item_id
  left join public.work_items ws on ws.id = w.parent_id
  join public.sprint_plan sp on sp.key = 'default'
  join public.sprints s0 on s0.code = sp.anchor_sprint
  join public.sprints s
    on s.idx between s0.idx + a.slot + a.slip_slots
                 and s0.idx + a.slot + a.slip_slots + a.span - 1
  where a.retired_at is null and w.status <> 'dropped';

revoke all on public.v_sprint_ledger from public, anon;
grant select on public.v_sprint_ledger to authenticated;

comment on view public.v_sprint_ledger is
  'One row per item per sprint its allocation covers: planned and actual points, DevOps ids and outcome (delivered, progressed, carried, blocked, in sprint, planned). What a question about a past, current or future sprint is answered from (docs/SPRINT-DELIVERY.md Part B).';
