-- ------------------------------------------------------------------
-- 38_sprint_handoff.sql - The stories that leave the Sprint Roadmap for
-- Azure DevOps and the company roadmap: the one renderer that turns a
-- story into the fields a backlog item carries, and the text pack built
-- from it.
--
-- 37_sprint_delivery.sql holds the behaviour that writes the plan.
-- 39_ado_push.sql builds the Azure DevOps payload from the SAME fields,
-- so the text a person copies and the payload a script pushes cannot
-- disagree. 39_sprint_checks.sql reads them to say what is not ready.
-- The process is docs/SPRINT-DELIVERY.md and docs/DEVOPS.md.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- sprint_story_fields: one row per story on the Sprint Roadmap, every
-- field derived once.
--
-- The mapping (docs/DEVOPS.md): a roadmap category is an Epic, a
-- workstream a Feature, a story a backlog item - a Bug when its item's
-- type is bug. The work item is the allocation unit and maps to
-- nothing; its stories share its sprint.
--
--   story_key      '<item uuid>#<n>' - the association with DevOps
--   shape_ok       the story splits at ', I want ' and ', so that '
--   purpose        the first sentence of the item's benefit, else the
--                  story's own outcome
--   scope          the story's own scope line, else the item's summary.
--                  work_items.scope is NOT read: it says whether a
--                  stream ends (finite, staged, continuous)
--   out_of_scope   'Out of scope:' lines in details, then each sibling
--                  story as 'Covered separately: <title>'
--   clarifications open question notes on the item or its deliverables
--   needs          what blocks the item, by title and by the story_key
--                  of the blocker's last story
--   content_hash   over what is written to DevOps and then frozen:
--                  title, story, purpose, scope, out of scope, criteria,
--                  technical notes and points. Clarifications and
--                  dependencies are left out - they are ticked and
--                  linked in DevOps after the push.
--   is_build       developer work: an allocation that is neither
--                  external nor parallel. Only these are pushed.
--
-- security invoker: it reads only what the caller's policies allow.
-- ---------------------------------------------------------------

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
           regexp_match(btrim(s.story->>'story'),
             '^(As an? .+?), I want (.+), so that (.+)$') as m
      from base b
      cross join lateral jsonb_array_elements(b.user_stories)
        with ordinality as s(story, n)
  ),
  derived as (
    select x.*,
      btrim(x.story->>'title') as story_title,
      coalesce(
        (regexp_match(btrim(x.business_benefit), '^(.+?[.!?])(\s|$)'))[1],
        nullif(btrim(x.business_benefit), ''),
        upper(left(x.m[3], 1)) || substr(x.m[3], 2)) as purpose,
      coalesce(nullif(btrim(x.story->>'scope'), ''), nullif(btrim(x.summary), '')) as scope,
      array(select btrim(r.hit[1])
              from regexp_matches(coalesce(x.details, ''),
                     '^\s*Out of scope:\s*(.+)$', 'gin') as r(hit))
        || array(select 'Covered separately: ' || btrim(o.story->>'title')
                   from jsonb_array_elements(x.user_stories)
                     with ordinality as o(story, k)
                  where o.k <> x.n order by o.k) as out_of_scope,
      array(select btrim(c.criterion #>> '{}')
              from jsonb_array_elements(x.story->'criteria')
                with ordinality as c(criterion, k) order by c.k) as criteria,
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
    d.m[1], 'I want ' || d.m[2], 'So that ' || d.m[3], d.m is not null,
    d.purpose, d.scope, d.out_of_scope, d.criteria,
    array(select split_part(btrim(q.body), chr(10), 1)
            from public.work_notes q
           where q.kind = 'question' and q.status = 'active'
             and (q.work_item_id = d.work_item_id
                  or q.work_item_id in (select c.id from public.work_items c
                                         where c.parent_id = d.work_item_id
                                           and c.level = 'deliverable'))
           order by q.created_at),
    (select coalesce(jsonb_agg(jsonb_build_object(
              'title', f.title,
              'key', case when bi.user_stories is not null
                       then bi.id || '#' || jsonb_array_length(bi.user_stories) end)
              order by f.title), '[]'::jsonb)
       from public.knowledge_links l
       join public.work_items f on f.id = l.from_id
       join public.work_items bi
         on bi.id = case when f.level = 'deliverable' then f.parent_id else f.id end
      where l.kind = 'blocks' and l.valid_to is null
        and l.from_type = 'work_item' and l.to_type = 'work_item'
        and l.to_id = d.work_item_id and f.status <> 'done'),
    d.notes, d.technical_notes_snapshot, d.points,
    d.start_code,
    case when d.effective_slot = d.effective_end_slot
      then 'Sprint ' || coalesce(d.start_code, (d.effective_slot + 1)::text)
      else 'Sprints ' || coalesce(d.start_code, (d.effective_slot + 1)::text) ||
           ' to ' || coalesce(d.end_code, (d.effective_end_slot + 1)::text) end,
    d.stories_status, d.is_build, d.external_party, d.story->'ado',
    md5(concat_ws(chr(31), d.story_title, btrim(d.story->>'story'), d.purpose, d.scope,
      array_to_string(d.out_of_scope, chr(30)), array_to_string(d.criteria, chr(30)),
      d.notes, d.points::text))
  from derived d;
$$;

comment on function public.sprint_story_fields(uuid) is
  'One row per story on the Sprint Roadmap with every field a backlog item carries, derived once: the renderer sprint_story_pack and ado_push_payload both read. p_id null for the whole plan, a workstream, or an item. docs/DEVOPS.md holds the field standard.';

-- ---------------------------------------------------------------
-- The pack: the same fields as paste-ready text.
--
--   p_id    null for the whole Sprint Roadmap, a workstream for its
--           stream, an item for its own stories. Anything off the plan
--           answers one line saying so.
--   p_part  'devops' - a Feature per workstream under its category's
--           Epic and a backlog item per story, each with the field it
--           fills; or 'roadmap' - per stream, its sprints, its summary,
--           the epic story and its outcomes.
--
-- In the board's order and numbering (v_sprint_plan_order), so Feature
-- 3 is the stream numbered 3 on the board. A drafted set says so in the
-- text; a confirmed one reads plain. The drawer's copy buttons and the
-- commands call this, never a second builder. security invoker and
-- granted to signed-in users (supabase/policies.sql).
-- ---------------------------------------------------------------

create or replace function public.sprint_story_pack(p_id uuid default null, p_part text default 'devops')
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  nl constant text := chr(10);
  draft constant text := 'Draft - not yet confirmed by the owner.';
  v_stream uuid;
  v_item uuid;
  st record;
  f record;
  body text := '';
  n_streams integer := 0;
begin
  if p_part is null or p_part not in ('devops', 'roadmap') then
    raise exception 'sprint_story_pack: p_part is devops or roadmap, not %',
      coalesce(p_part, 'null');
  end if;

  if p_id is not null then
    if exists (select 1 from public.v_sprint_plan_streams
                where workstream_id = p_id) then
      v_stream := p_id;
    else
      select v.workstream_id into v_stream
        from public.v_sprint_plan_items v where v.work_item_id = p_id;
      if v_stream is null then
        return 'Not on the sprint plan: stories are written only for Now work.';
      end if;
      if p_part = 'devops' then v_item := p_id; end if;
    end if;
  end if;

  for st in
    select o.workstream_id as id, o.sprint_rank / 10 as no,
           s.workstream_title as title, s.summary,
           w.user_stories, w.stories_status, rc.label as epic,
           case when s.first_slot = s.last_slot
             then 'Sprint ' || coalesce(s.start_code, (s.first_slot + 1)::text)
             else 'Sprints ' || coalesce(s.start_code, (s.first_slot + 1)::text) ||
                  ' to ' || coalesce(s.end_code, (s.last_slot + 1)::text)
           end as span
      from public.v_sprint_plan_order o
      join public.v_sprint_plan_streams s on s.workstream_id = o.workstream_id
      join public.work_items w on w.id = o.workstream_id
      left join public.roadmap_categories rc on rc.id = w.category_id
     where o.level = 'workstream'
       and (v_stream is null or o.workstream_id = v_stream)
     order by o.sprint_rank
  loop
    n_streams := n_streams + 1;

    -- The stream's own block: its outcomes for the company roadmap, or
    -- its Feature for DevOps (skipped when one item was asked for).
    if p_part = 'roadmap' or v_item is null then
      body := body || nl || case p_part
          when 'roadmap' then st.no || '. ' || st.title || ' (' || st.span || ')' || nl ||
            coalesce(nullif(btrim(st.summary), '') || nl, '')
          else 'FEATURE ' || st.no || ': ' || st.title || nl ||
            'Parent: Epic ' || coalesce(st.epic, '(no roadmap category)') || nl ||
            'Iteration: ' || st.span || nl end;
      if st.user_stories is null then
        body := body || case p_part when 'roadmap' then 'Outcomes not yet written.'
          else 'Epic story not yet written.' end || nl;
      else
        body := body ||
          case when st.stories_status = 'drafted' then draft || nl else '' end ||
          (select string_agg(case p_part when 'roadmap' then '' else 'Description: ' end ||
                    (e.story->>'story'), nl order by e.k)
             from jsonb_array_elements(st.user_stories) with ordinality as e(story, k)) || nl ||
          case p_part when 'roadmap' then 'Outcomes:' else 'Acceptance Criteria:' end || nl ||
          (select string_agg('- ' || (c.criterion #>> '{}'), nl order by e.k, c.j)
             from jsonb_array_elements(st.user_stories) with ordinality as e(story, k)
             cross join lateral jsonb_array_elements(e.story->'criteria')
               with ordinality as c(criterion, j)) || nl;
      end if;
    end if;
    if p_part = 'roadmap' then continue; end if;

    for f in
      select x.* from public.sprint_story_fields(st.id) x
       where v_item is null or x.work_item_id = v_item
       order by x.item_no, x.n
    loop
      body := body || nl ||
        case f.kind when 'bug' then 'BUG ' else 'BACKLOG ITEM ' end ||
        f.stream_no || '.' || f.item_no || '.' || f.n || ': ' || f.title || nl ||
        'Parent: Feature ' || f.stream_no || nl ||
        'Iteration: ' || f.sprint_label || nl ||
        coalesce('Effort: ' || f.points || nl, '') ||
        case when f.built_by is not null then 'Built by: ' || f.built_by || nl
             when not f.is_build then 'Not developer work: it stays on the roadmap.' || nl
             else '' end ||
        case when f.stories_status = 'drafted' then draft || nl else '' end ||
        'Description: ' || case when f.shape_ok
          then f.role_line || nl || f.want_line || nl || f.outcome_line
          else '(the story does not split at "I want" and "so that")' end || nl ||
        coalesce('Purpose: ' || f.purpose || nl, '') ||
        coalesce('Scope: ' || f.scope || nl, '') ||
        case when cardinality(f.out_of_scope) > 0 then 'Out of scope:' || nl || '- ' ||
          array_to_string(f.out_of_scope, nl || '- ') || nl else '' end ||
        'Acceptance Criteria:' || nl || '- ' || array_to_string(f.criteria, nl || '- ') || nl ||
        case when cardinality(f.clarifications) > 0 then 'Needs clarification:' || nl || '- ' ||
          array_to_string(f.clarifications, nl || '- ') || nl else '' end ||
        coalesce((select 'Dependencies:' || nl ||
                         string_agg('- Needs: ' || (d->>'title'), nl) || nl
                    from jsonb_array_elements(f.needs) as d
                  having count(*) > 0), '') ||
        coalesce('Technical notes (code snapshot ' || f.notes_snapshot || '):' || nl ||
          f.technical_notes || nl, '');
    end loop;

    body := body || coalesce((
      select string_agg(nl || 'ITEM ' || st.no || '.' || (o.sprint_rank / 10) || ': ' ||
               v.title || nl || 'User stories not yet written.', nl order by o.sprint_rank)
        from public.v_sprint_plan_items v
        join public.work_items w on w.id = v.work_item_id
        join public.v_sprint_plan_order o
          on o.level = 'item' and o.work_item_id = v.work_item_id
       where v.workstream_id = st.id and w.user_stories is null
         and (v_item is null or v.work_item_id = v_item)) || nl, '');
  end loop;

  if n_streams = 0 then
    return 'Nothing is on the sprint plan yet.';
  end if;
  -- The whole plan opens with what it holds and how far the stories
  -- have got; a single stream or item is just its blocks.
  if p_id is null then
    body := case p_part
        when 'devops' then 'SPRINT ROADMAP FOR AZURE DEVOPS' || nl ||
          (select n_streams || ' features, ' || count(*) || ' work items. Stories written for ' ||
                  count(*) filter (where v.stories_status is not null) || ', ' ||
                  count(*) filter (where v.stories_status = 'confirmed') || ' confirmed.'
             from public.v_sprint_plan_items v)
        else 'SPRINT ROADMAP FOR THE COMPANY ROADMAP' || nl ||
          n_streams || ' workstreams in sprint order.'
      end || nl ||
      case when (select sp.anchor_sprint is null from public.sprint_plan sp
                  where sp.key = 'default')
        then 'Sprint numbers count from the plan''s first sprint until the plan is anchored.' || nl
        else '' end ||
      body;
  end if;
  return btrim(body, nl);
end $$;

comment on function public.sprint_story_pack(uuid, text) is
  'The stories and acceptance criteria of the Sprint Roadmap as paste-ready text: p_part devops (a Feature per workstream, a backlog item per story) or roadmap (per workstream). p_id null for the whole plan, a workstream, or an item. Built from sprint_story_fields, the one renderer (docs/DEVOPS.md).';
