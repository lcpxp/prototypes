-- Several user stories in one backlog item (owner, 19 Nov 2026), part 3 of 6.
-- A backlog item that asks for several distinct things holds one user
-- story for each, {label, story, criteria[]} under "stories"
-- (docs/SPRINT-DELIVERY.md Part A). The paste pack and the Azure DevOps
-- Description lay several stories out under their labels.

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
          then (select string_agg(coalesce(p.label || nl, '') || p.role_line || nl ||
                                  p.want_line || nl || p.outcome_line, nl || nl order by p.k)
                  from public.work_items w
                  cross join lateral public.story_parts(w.user_stories -> (f.n - 1)) p
                 where w.id = f.work_item_id)
          else '(the story does not split at "I want" and "so that")' end || nl ||
        coalesce('Purpose: ' || f.purpose || nl, '') ||
        coalesce('Scope: ' || f.scope || nl, '') ||
        case when cardinality(f.out_of_scope) > 0 then 'Out of scope:' || nl || '- ' ||
          array_to_string(f.out_of_scope, nl || '- ') || nl else '' end ||
        'Acceptance Criteria:' || nl || '- ' || array_to_string(f.criteria, nl || '- ') || nl ||
        case when cardinality(f.clarifications) > 0 then 'Needs clarification:' || nl || '- ' ||
          array_to_string(f.clarifications, nl || '- ') || nl else '' end ||
        coalesce((select 'Dependencies:' || nl ||
                         string_agg('- Needs: ' || (d->>'title') ||
                           coalesce(' (' || (d->>'outside') || ')', ''), nl) || nl
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

-- A backlog item's Description: its user story as three lines, or, when
-- it holds several, each under its label in bold (story_parts).
create or replace function public.ado_story_html(p_story jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select string_agg(
           coalesce('<p><strong>' || public.ado_html('lines', array[p.label]) || '</strong></p>', '') ||
           public.ado_html('lines', array[p.role_line, p.want_line, p.outcome_line]),
           '' order by p.k)
    from public.story_parts(p_story) p;
$$;

revoke execute on function public.ado_story_html(jsonb) from public, anon;
grant execute on function public.ado_story_html(jsonb) to authenticated;
