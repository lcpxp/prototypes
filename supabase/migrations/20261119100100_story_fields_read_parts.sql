-- Several user stories in one backlog item (owner, 19 Nov 2026), part 2 of 6.
-- A backlog item that asks for several distinct things holds one user
-- story for each, {label, story, criteria[]} under "stories"
-- (docs/SPRINT-DELIVERY.md Part A). The renderer reads the parts: each
-- criterion led by its story's label, the shape checked for every
-- story. A single story renders and hashes exactly as before.

create or replace function public.sprint_story_fields(p_id uuid default null)
returns table (
  story_key text, work_item_id uuid, n integer, item_title text,
  workstream_id uuid, workstream_title text, stream_no integer, item_no integer,
  epic_key text, epic_label text, kind text, title text,
  role_line text, want_line text, outcome_line text, shape_ok boolean,
  purpose text, scope text, out_of_scope text[], criteria text[],
  clarifications text[], needs jsonb,
  technical_notes text, notes_snapshot date, points numeric,
  sprint_code text, sprint_label text, stories_status text,
  is_build boolean, built_by text, ado jsonb, content_hash text
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select v.work_item_id, v.title as item_title, v.workstream_id, v.workstream_title,
           v.type, v.is_build, v.external_party, v.start_code, v.end_code,
           v.effective_slot, v.effective_end_slot,
           rc.key as epic_key, rc.label as epic_label,
           w.summary, w.details, w.business_benefit, w.user_stories, w.stories_status,
           w.technical_notes as item_notes, w.technical_notes_snapshot,
           o.sprint_rank / 10 as item_no, so.sprint_rank / 10 as stream_no
      from public.v_sprint_plan_items v
      join public.work_items w on w.id = v.work_item_id
      join public.work_items ws on ws.id = v.workstream_id
      left join public.roadmap_categories rc on rc.id = ws.category_id
      join public.v_sprint_plan_order o
        on o.level = 'item' and o.work_item_id = v.work_item_id
      join public.v_sprint_plan_order so
        on so.level = 'workstream' and so.work_item_id = v.workstream_id
     where w.user_stories is not null
       and (p_id is null or v.work_item_id = p_id or v.workstream_id = p_id)
  ),
  split as (
    select b.*, s.story, s.n::integer as n,
           regexp_match(btrim(coalesce(s.story->>'story', s.story->'stories'->0->>'story')),
             '^(As an? .+?), I want (.+), so that (.+)$') as m,
           not exists (select 1 from public.story_parts(s.story) p
                        where not p.shape_ok) as parts_ok
      from base b
      cross join lateral jsonb_array_elements(b.user_stories)
        with ordinality as s(story, n)
  ),
  derived as (
    select x.*,
      btrim(x.story->>'title') as story_title,
      coalesce(
        nullif(btrim(x.story->>'purpose'), ''),
        (regexp_match(btrim(x.business_benefit), '^(.+?[.!?])(\s|$)'))[1],
        nullif(btrim(x.business_benefit), ''),
        upper(left(x.m[3], 1)) || substr(x.m[3], 2)) as purpose,
      coalesce(nullif(btrim(x.story->>'scope'), ''), nullif(btrim(x.summary), '')) as scope,
      array(select btrim(r.hit[1])
              from regexp_matches(coalesce(x.details, ''),
                     '^\s*Out of scope:\s*(.+)$', 'gin') as r(hit)) as out_of_scope,
      array(select coalesce(p.label || ': ', '') || c.t
              from public.story_parts(x.story) p
              cross join lateral unnest(p.criteria) with ordinality as c(t, j)
             order by p.k, c.j) as criteria,
      coalesce(nullif(btrim(x.story->>'technical_notes'), ''), x.item_notes) as notes,
      case when jsonb_typeof(x.story->'points') = 'number'
        then (x.story->>'points')::numeric end as points
    from split x
  )
  select
    d.work_item_id || '#' || d.n, d.work_item_id, d.n, d.item_title,
    d.workstream_id, d.workstream_title, d.stream_no, d.item_no,
    d.epic_key, d.epic_label,
    case when d.type = 'bug' then 'bug' else 'story' end,
    d.story_title,
    d.m[1], 'I want ' || d.m[2], 'So that ' || d.m[3], d.m is not null and d.parts_ok,
    d.purpose, d.scope, d.out_of_scope, d.criteria,
    array(select cl.line from (
            select split_part(btrim(q.body), chr(10), 1) as line, 1 as grp, q.created_at
              from public.work_notes q
             where q.kind = 'question' and q.status = 'active'
               and (q.work_item_id = d.work_item_id
                    or q.work_item_id in (select c.id from public.work_items c
                                           where c.parent_id = d.work_item_id
                                             and c.level = 'deliverable'))
            union all
            select 'Decision: ' || split_part(btrim(q.body), chr(10), 1), 2, q.created_at
              from public.knowledge_links l
              join public.work_items b on b.id = l.from_id
              join public.work_notes q on q.work_item_id = b.id
             where l.kind = 'blocks' and l.valid_to is null
               and l.from_type = 'work_item' and l.to_type = 'work_item'
               and l.to_id = d.work_item_id and b.status not in ('done', 'dropped')
               and q.kind = 'question' and q.status = 'active' and 'decision' = any (q.tags)
          ) cl order by cl.grp, cl.created_at),
    (select coalesce(jsonb_agg(jsonb_build_object(
              'title', f.title,
              'key', case when bv.is_build and bi.user_stories is not null
                       then bi.id || '#' || jsonb_array_length(bi.user_stories) end,
              'outside', case
                when bv.work_item_id is null then 'not yet on the sprint plan'
                when not bv.is_build then coalesce(bv.external_party, 'the product manager') end)
              order by f.title), '[]'::jsonb)
       from public.knowledge_links l
       join public.work_items f on f.id = l.from_id
       join public.work_items bi
         on bi.id = case when f.level = 'deliverable' then f.parent_id else f.id end
       left join public.v_sprint_plan_items bv on bv.work_item_id = bi.id
      where l.kind = 'blocks' and l.valid_to is null
        and l.from_type = 'work_item' and l.to_type = 'work_item'
        and l.to_id = d.work_item_id and f.status not in ('done', 'dropped')),
    d.notes, d.technical_notes_snapshot, d.points,
    d.start_code,
    case when d.effective_slot = d.effective_end_slot
      then 'Sprint ' || coalesce(d.start_code, (d.effective_slot + 1)::text)
      else 'Sprints ' || coalesce(d.start_code, (d.effective_slot + 1)::text) ||
           ' to ' || coalesce(d.end_code, (d.effective_end_slot + 1)::text) end,
    d.stories_status, d.is_build, d.external_party, d.story->'ado',
    md5(concat_ws(chr(31), d.story_title,
      coalesce(btrim(d.story->>'story'), (d.story->'stories')::text), d.purpose, d.scope,
      array_to_string(d.out_of_scope, chr(30)), array_to_string(d.criteria, chr(30)),
      d.notes, d.points::text))
  from derived d;
$$;
