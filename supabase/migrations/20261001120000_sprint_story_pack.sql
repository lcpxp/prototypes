-- The stories leave as text someone can paste.
--
-- Stories and acceptance criteria are written on each Sprint Roadmap row
-- (work_items.user_stories). They are used in two places the database
-- cannot reach - Azure DevOps and the company-wide roadmap - so they
-- leave as text. sprint_story_pack() is the one home of that text: the
-- drawer's copy buttons and the /sprint-stories command both call it.

-- ---------------------------------------------------------------
-- The pack: the stories and acceptance criteria, laid out to be pasted
-- into Azure DevOps or the company-wide roadmap.
--
-- The one home of that paste format. The drawer's copy buttons and the
-- /sprint-stories command both call this, so the text a person copies
-- from a page and the text a session prints are the same text.
--
--   p_id    null for the whole Sprint Roadmap, a workstream for its
--           stream, an item for its own Feature block. Anything off the
--           plan answers one line saying so.
--   p_part  'devops' - an Epic per workstream, a Feature per work item,
--           a User Story per story (docs/SPRINT-DELIVERY.md Part A),
--           each with the field it fills; or 'roadmap' - per stream,
--           its sprints, its summary, the epic story and its outcomes.
--           The roadmap is written per workstream, so an item asks for
--           its stream.
--
-- In the board's order and numbering (v_sprint_plan_order), so Epic 3
-- is the stream numbered 3 on the board. It carries sprint labels and
-- nothing else about time - no durations, no capacity, no priority, no
-- benefit prose (Part C, Durations). A drafted set says so in the text;
-- a confirmed one reads plain. security invoker and granted to signed-in
-- users (supabase/policies.sql): it reads only what the caller may.
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
  it record;
  story jsonb;
  crit jsonb;
  k integer;
  deps text;
  body text := '';
  n_streams integer := 0;
  n_items integer := 0;
  n_written integer := 0;
  n_confirmed integer := 0;
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
           w.user_stories, w.stories_status,
           case when s.first_slot = s.last_slot
             then 'Sprint ' || coalesce(s.start_code, (s.first_slot + 1)::text)
             else 'Sprints ' || coalesce(s.start_code, (s.first_slot + 1)::text) ||
                  ' to ' || coalesce(s.end_code, (s.last_slot + 1)::text)
           end as span
      from public.v_sprint_plan_order o
      join public.v_sprint_plan_streams s on s.workstream_id = o.workstream_id
      join public.work_items w on w.id = o.workstream_id
     where o.level = 'workstream'
       and (v_stream is null or o.workstream_id = v_stream)
     order by o.sprint_rank
  loop
    n_streams := n_streams + 1;
    if st.user_stories is not null then n_written := n_written + 1; end if;
    if st.stories_status = 'confirmed' then n_confirmed := n_confirmed + 1; end if;

    if p_part = 'roadmap' then
      body := body || nl || st.no || '. ' || st.title || ' (' || st.span || ')' || nl ||
        coalesce(nullif(btrim(st.summary), '') || nl, '');
      if st.user_stories is null then
        body := body || 'Outcomes not yet written.' || nl;
      else
        if st.stories_status = 'drafted' then body := body || draft || nl; end if;
        for story in select e from jsonb_array_elements(st.user_stories) as t(e) loop
          body := body || (story->>'story') || nl;
        end loop;
        body := body || 'Outcomes:' || nl;
        for story in select e from jsonb_array_elements(st.user_stories) as t(e) loop
          for crit in select e from jsonb_array_elements(story->'criteria') as t(e) loop
            body := body || '- ' || (crit #>> '{}') || nl;
          end loop;
        end loop;
      end if;
      continue;
    end if;

    -- devops: the Epic, unless one item's Feature was asked for.
    if v_item is null then
      body := body || nl || 'EPIC ' || st.no || ': ' || st.title || nl ||
        'Iteration: ' || st.span || nl;
      if st.user_stories is null then
        body := body || 'Epic story not yet written.' || nl;
      else
        if st.stories_status = 'drafted' then body := body || draft || nl; end if;
        for story in select e from jsonb_array_elements(st.user_stories) as t(e) loop
          body := body || 'Description: ' || (story->>'story') || nl;
        end loop;
        body := body || 'Acceptance Criteria:' || nl;
        for story in select e from jsonb_array_elements(st.user_stories) as t(e) loop
          for crit in select e from jsonb_array_elements(story->'criteria') as t(e) loop
            body := body || '- ' || (crit #>> '{}') || nl;
          end loop;
        end loop;
      end if;
    end if;

    for it in
      select o.work_item_id as id, o.sprint_rank / 10 as no,
             v.title, v.summary, v.is_external, v.external_party,
             w.user_stories, w.stories_status,
             case when v.effective_slot = v.effective_end_slot
               then 'Sprint ' || coalesce(v.start_code, (v.effective_slot + 1)::text)
               else 'Sprints ' || coalesce(v.start_code, (v.effective_slot + 1)::text) ||
                    ' to ' || coalesce(v.end_code, (v.effective_end_slot + 1)::text)
             end as span
        from public.v_sprint_plan_order o
        join public.v_sprint_plan_items v on v.work_item_id = o.work_item_id
        join public.work_items w on w.id = o.work_item_id
       where o.level = 'item' and o.workstream_id = st.id
         and (v_item is null or o.work_item_id = v_item)
       order by o.sprint_rank
    loop
      n_items := n_items + 1;
      if it.user_stories is not null then n_written := n_written + 1; end if;
      if it.stories_status = 'confirmed' then n_confirmed := n_confirmed + 1; end if;

      -- What must land first: a blocker on the plan by its Feature
      -- number, anything else by title and, where it has one, its ref.
      select string_agg(
               case when bo.work_item_id is not null
                 then 'Feature ' || (bs.sprint_rank / 10) || '.' || (bo.sprint_rank / 10) ||
                      ' ' || bo.title
                 else f.title || ' (' ||
                      coalesce('ref ' || f.external_ref, 'not on the sprint plan') || ')'
               end, '; ' order by bs.sprint_rank, bo.sprint_rank, f.title)
        into deps
        from public.knowledge_links l
        join public.work_items f on f.id = l.from_id
        left join public.v_sprint_plan_order bo
          on bo.level = 'item'
         and bo.work_item_id = case when f.level = 'deliverable' then f.parent_id else f.id end
        left join public.v_sprint_plan_order bs
          on bs.level = 'workstream' and bs.work_item_id = bo.workstream_id
       where l.kind = 'blocks' and l.valid_to is null
         and l.from_type = 'work_item' and l.to_type = 'work_item'
         and l.to_id = it.id and f.status <> 'done';

      body := body || nl || 'FEATURE ' || st.no || '.' || it.no || ': ' || it.title || nl ||
        'Parent: Epic ' || st.no || nl ||
        'Iteration: ' || it.span || nl ||
        case when it.is_external
          then 'Built by: ' || coalesce(it.external_party, 'an external party') || nl
          else '' end ||
        coalesce('Depends on: ' || deps || nl, '') ||
        coalesce('Description: ' || nullif(btrim(it.summary), '') || nl, '');
      if it.user_stories is null then
        body := body || 'User stories not yet written.' || nl;
        continue;
      end if;
      if it.stories_status = 'drafted' then body := body || draft || nl; end if;
      k := 0;
      for story in select e from jsonb_array_elements(it.user_stories) as t(e) loop
        k := k + 1;
        body := body || nl || 'USER STORY ' || st.no || '.' || it.no || '.' || k || ': ' ||
          (story->>'title') || nl ||
          'Parent: Feature ' || st.no || '.' || it.no || nl ||
          'Iteration: ' || it.span || nl ||
          'Description: ' || (story->>'story') || nl ||
          'Acceptance Criteria:' || nl;
        for crit in select e from jsonb_array_elements(story->'criteria') as t(e) loop
          body := body || '- ' || (crit #>> '{}') || nl;
        end loop;
      end loop;
    end loop;
  end loop;

  if n_streams = 0 then
    return 'Nothing is on the sprint plan yet.';
  end if;
  -- The whole plan opens with what it holds and how far the stories
  -- have got; a single stream or item is just its blocks.
  if p_id is null then
    body := case p_part
        when 'devops' then 'SPRINT ROADMAP FOR AZURE DEVOPS' || nl ||
          n_streams || ' epics, ' || n_items || ' features. Stories written for ' ||
          n_written || ' of ' || (n_streams + n_items) || ', ' || n_confirmed || ' confirmed.'
        else 'SPRINT ROADMAP FOR THE COMPANY ROADMAP' || nl ||
          n_streams || ' workstreams in sprint order. Outcomes written for ' ||
          n_written || ' of ' || n_streams || ', ' || n_confirmed || ' confirmed.'
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
  'The stories and acceptance criteria of the Sprint Roadmap as paste-ready text: p_part devops (Epic, Feature, User Story) or roadmap (per workstream). p_id null for the whole plan, a workstream, or an item. The one home of the paste format (docs/SPRINT-DELIVERY.md Part A).';

revoke execute on function public.sprint_story_pack(uuid, text) from public, anon;
grant execute on function public.sprint_story_pack(uuid, text) to authenticated;
