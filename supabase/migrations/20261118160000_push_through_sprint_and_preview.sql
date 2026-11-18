-- The push can stop at a sprint, and can be previewed before the owner
-- confirms. ado_push_payload gains p_through (the last sprint code to
-- include, so stories confirmed for later sprints wait for their own
-- push) and p_preview (drafted stories treated as confirmed, the payload
-- marked preview: true; the engine refuses to push it). The signature
-- changes, so the old function is dropped and its grants restated.

drop function if exists public.ado_push_payload(uuid);
create or replace function public.ado_push_payload(
  p_id uuid default null, p_through text default null, p_preview boolean default false)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  prof public.ado_profile%rowtype;
  body jsonb;
begin
  select * into prof from public.ado_profile where key = 'default';
  if not found then
    raise exception 'ado_push_payload: no ado_profile row is visible (admin only)';
  end if;

  -- Delivery order: the sprint, then the item's place in it
  -- (sequence_position), then the board's numbering. Items are created
  -- in this order, and Azure DevOps ranks a new backlog item below the
  -- last, so the backlog opens in the order the developer works it.
  with f as (
    select x.*, v.effective_slot as d_slot, v.sequence_position as d_seq
      from public.sprint_story_fields(p_id) x
      join public.v_sprint_plan_items v on v.work_item_id = x.work_item_id
     where x.is_build and (x.ado->>'id') is null
       and (p_through is null or x.sprint_code <= p_through)
  ),
  ready as (
    select * from f
     where (stories_status = 'confirmed' or p_preview) and shape_ok and epic_key is not null
  ),
  items as (
    select coalesce(jsonb_agg(jsonb_build_object(
        'key', r.story_key,
        'type', r.kind,
        'feature_key', 'workstream:' || r.workstream_id,
        'hash', r.content_hash,
        'iteration', prof.iteration_root || case when r.sprint_code = any (prof.team_sprints)
          then '\Sprint ' || r.sprint_code else '' end,
        'sprint_missing', case when r.sprint_code is not null
          and not (r.sprint_code = any (prof.team_sprints)) then r.sprint_code end,
        'fields', jsonb_strip_nulls(jsonb_build_object(
          'title', r.title,
          'description', case when r.kind = 'story' then
            public.ado_html('lines', array[r.role_line, r.want_line, r.outcome_line]) end,
          'repro_steps', case when r.kind = 'bug' then
            public.ado_html('div', array[r.scope]) ||
            public.ado_html('lines', array[r.role_line, r.want_line, r.outcome_line]) end,
          'purpose', case when r.kind = 'story' then
            public.ado_html('div', array[r.purpose]) end,
          'scope', case when r.kind = 'story' then
            public.ado_html('list', array[r.scope]) end,
          'out_of_scope', case when r.kind = 'story' then
            public.ado_html('list', r.out_of_scope) end,
          'criteria', public.ado_html('checklist', r.criteria),
          'clarifications', public.ado_html('checklist', r.clarifications),
          'dependencies', public.ado_html('list', array(
            select 'Needs: ' || (d->>'title') ||
                   coalesce(' (' || (d->>'outside') || ')',
                            ' ({{ado:' || (d->>'key') || '}})', '')
              from jsonb_array_elements(r.needs) as d)),
          'technical_notes', public.ado_notes_html(r.technical_notes, r.notes_snapshot),
          'effort', coalesce(r.points, 0))),
        'needs', (select coalesce(jsonb_agg(d->>'key'), '[]'::jsonb)
                    from jsonb_array_elements(r.needs) as d
                   where (d->>'key') is not null),
        'link', jsonb_build_object(
          'url', prof.lpio_base_url || '/modules/roadmap/index.html?item=' || r.work_item_id,
          'comment', 'LPio ' || r.story_key),
        'attachments', (select coalesce(jsonb_agg(jsonb_build_object(
                           'id', s.id, 'path', s.storage_path, 'kind', s.kind,
                           'caption', s.caption) order by s.captured_on, s.kind), '[]'::jsonb)
                          from public.knowledge_links l
                          join public.screenshots s on s.id = l.from_id
                         where l.kind = 'about' and l.valid_to is null
                           and l.from_type = 'screenshot' and l.to_type = 'work_item'
                           and l.to_id = r.work_item_id)
      ) order by r.d_slot, r.d_seq nulls last, r.stream_no, r.item_no, r.n), '[]'::jsonb) as j
    from ready r
  ),
  features as (
    select coalesce(jsonb_agg(jsonb_build_object(
        'key', 'workstream:' || w.id,
        'epic_key', 'category:' || rc.key,
        'ado_id', w.attributes #> '{ado,feature_id}',
        'fields', jsonb_strip_nulls(jsonb_build_object(
          'title', w.title,
          'description', public.ado_html('div', array[w.summary] || array(
            select e.story->>'story'
              from jsonb_array_elements(w.user_stories) with ordinality as e(story, k)
             order by e.k)),
          'criteria', public.ado_html('list', array(
            select c.criterion #>> '{}'
              from jsonb_array_elements(w.user_stories) with ordinality as e(story, k)
              cross join lateral jsonb_array_elements(e.story->'criteria')
                with ordinality as c(criterion, j)
             order by e.k, c.j)),
          'start_date', (select sp.starts_on from public.sprints sp where sp.code = s.start_code),
          'target_date', (select sp.ends_on from public.sprints sp where sp.code = s.end_code))),
        'link', jsonb_build_object(
          'url', prof.lpio_base_url || '/modules/roadmap/index.html?item=' || w.id,
          'comment', 'LPio workstream:' || w.id)
      ) order by s.first_slot, w.title), '[]'::jsonb) as j
    from public.work_items w
    join public.v_sprint_plan_streams s on s.workstream_id = w.id
    join public.roadmap_categories rc on rc.id = w.category_id
    where w.id in (select workstream_id from ready)
  ),
  epics as (
    select coalesce(jsonb_agg(jsonb_build_object(
        'key', 'category:' || rc.key,
        'ado_id', prof.epic_ids -> rc.key,
        'fields', jsonb_strip_nulls(jsonb_build_object(
          'title', rc.label,
          'description', public.ado_html('div', array[rc.description]))),
        'link', jsonb_build_object(
          'url', prof.lpio_base_url || '/modules/roadmap/index.html',
          'comment', 'LPio category:' || rc.key)
      ) order by rc.sort_order), '[]'::jsonb) as j
    from public.roadmap_categories rc
    where rc.key in (select epic_key from ready)
  ),
  held as (
    select coalesce(jsonb_agg(jsonb_build_object(
        'key', f.story_key, 'title', f.title,
        'reason', case
          when f.stories_status <> 'confirmed' then 'Drafted and not yet confirmed by the owner.'
          when not f.shape_ok then 'The story does not split at "I want" and "so that".'
          else 'Its workstream has no roadmap category, so there is no Epic.' end
      ) order by f.d_slot, f.d_seq nulls last, f.stream_no, f.item_no, f.n), '[]'::jsonb) as j
    from f
    where not ((f.stories_status = 'confirmed' or p_preview) and f.shape_ok and f.epic_key is not null)
  )
  select jsonb_build_object(
      'epics', epics.j, 'features', features.j, 'items', items.j, 'held_back', held.j)
    into body
    from epics, features, items, held;

  return jsonb_build_object(
    'version', 1,
    'generated_at', now(),
    'hash', md5((body - 'held_back')::text),
    'profile', to_jsonb(prof) - 'key' - 'note' - 'created_at' - 'updated_at' - 'epic_ids') || body ||
    case when p_preview then jsonb_build_object('preview', true) else '{}'::jsonb end;
end $$;

comment on function public.ado_push_payload(uuid, text, boolean) is
  'The Azure DevOps push payload: confirmed, unpushed stories of developer work with every field rendered, their Features and Epics, and what is held back and why. p_id null for the whole plan, a workstream, or an item; p_through the last sprint code to include; p_preview true for a preflight rehearsal of drafted stories, which the engine will not push. Admin only, through ado_profile (docs/DEVOPS.md).';

revoke execute on function public.ado_push_payload(uuid, text, boolean) from public, anon;
grant execute on function public.ado_push_payload(uuid, text, boolean) to authenticated;
