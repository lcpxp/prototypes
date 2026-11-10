-- ------------------------------------------------------------------
-- 39_ado_push.sql - The Azure DevOps side of the sprint hand-off: where
-- the target is described, how a story's fields are rendered into the
-- markup a backlog item stores, the payload a push reads, and how a
-- receipt is written back.
--
-- 38_sprint_handoff.sql derives the fields; this file only renders and
-- packages them. tools/ado/engine.js carries the payload across and
-- holds no content of its own. The process is docs/DEVOPS.md.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- ado_profile: the one row describing the Azure DevOps project the
-- hand-off writes to. Everything that names the organisation lives
-- here and never in the repo: the project and team, the area and
-- iteration root, which Epic stands for which roadmap category, the
-- work item types and field references, the sprints the team has
-- selected, and where LPio is served from for the link back.
--
--   types      epic, feature, story, bug -> the work item type name
--   fields     the logical field a story carries (sprint_story_fields)
--              -> the field reference it is written to
--   epic_ids   roadmap category key -> Epic id, written back on push
--
-- Admin-only in both directions (supabase/policies.sql). The views and
-- functions that read it are security invoker, so anyone else simply
-- sees no profile.
-- ---------------------------------------------------------------

create table if not exists public.ado_profile (
  key text primary key default 'default' check (key = 'default'),
  organisation text not null,
  project text not null,
  team text not null,
  area_path text not null,
  iteration_root text not null,
  epic_ids jsonb not null default '{}'::jsonb
    check (jsonb_typeof(epic_ids) = 'object'),
  types jsonb not null default '{}'::jsonb
    check (jsonb_typeof(types) = 'object'),
  fields jsonb not null default '{}'::jsonb
    check (jsonb_typeof(fields) = 'object'),
  required_defaults jsonb not null default '{}'::jsonb
    check (jsonb_typeof(required_defaults) = 'object'),
  forbidden_types text[] not null default '{}',
  checklist_control_id text,
  team_sprints text[] not null default '{}',
  lpio_base_url text not null,
  source_extract_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ado_profile_updated_at on public.ado_profile;
create trigger ado_profile_updated_at
  before update on public.ado_profile
  for each row execute function public.set_updated_at();

comment on table public.ado_profile is
  'The Azure DevOps project the sprint hand-off writes to: one row, admin-only. Names, ids and field references live here, never in the repo (docs/DEVOPS.md).';

-- ---------------------------------------------------------------
-- Rendering. Azure DevOps stores rich text as markup, and the
-- acceptance criteria and clarification fields are checklists drawn
-- from one block per line. These two functions are the only place that
-- markup is written; the engine never builds any.
--
--   ado_html(kind, lines)   'lines'      joined by line breaks
--                           'div'        one block per line
--                           'list'       a bulleted list
--                           'checklist'  one unticked box per line
--   ado_notes_html          the technical notes under their standing
--                           heading: a line ending in a colon is a
--                           heading, '- ' lines are a list, the rest
--                           are paragraphs
--
-- Both escape &, < and > and nothing else. Null in, null out, so an
-- empty field is left out of the payload rather than written blank.
-- ---------------------------------------------------------------

create or replace function public.ado_html(p_kind text, p_lines text[])
returns text
language sql
immutable
set search_path = public
as $$
  select case p_kind when 'list' then '<ul>' else '' end ||
         string_agg(case p_kind
             when 'checklist' then '<div><span>[ ]</span><span> ' || e.t || '</span> </div>'
             when 'list' then '<li>' || e.t || '</li>'
             when 'div' then '<div>' || e.t || '</div>'
             else e.t end,
           case p_kind when 'lines' then '<br>' else '' end order by e.k) ||
         case p_kind when 'list' then '</ul>' else '' end
    from (select replace(replace(replace(btrim(l.t), '&', '&amp;'), '<', '&lt;'), '>', '&gt;') as t, l.k
            from unnest(p_lines) with ordinality as l(t, k)
           where coalesce(btrim(l.t), '') <> '') e
  having count(*) > 0;
$$;

create or replace function public.ado_notes_html(p_notes text, p_snapshot date)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  line text;
  in_list boolean := false;
  body text := '';
begin
  if coalesce(btrim(p_notes), '') = '' then return null; end if;
  for line in select btrim(l) from unnest(string_to_array(p_notes, chr(10))) as l loop
    if line like '- %' then
      if not in_list then body := body || '<ul>'; in_list := true; end if;
      body := body || '<li>' || public.ado_html('lines', array[substr(line, 3)]) || '</li>';
      continue;
    end if;
    if in_list then body := body || '</ul>'; in_list := false; end if;
    if line = '' then continue; end if;
    body := body || case when line ~ ':$'
      then '<p><strong>' || public.ado_html('lines', array[line]) || '</strong></p>'
      else '<p>' || public.ado_html('lines', array[line]) || '</p>' end;
  end loop;
  if in_list then body := body || '</ul>'; end if;
  return '<p><strong>Suggested approach (code snapshot ' ||
    coalesce(to_char(p_snapshot, 'FMDD Mon YYYY'), 'undated') ||
    '): confirm or challenge in refinement</strong></p>' || body;
end $$;

-- ---------------------------------------------------------------
-- ado_push_payload: everything a push needs, already rendered.
--
-- Carries confirmed stories of developer work that have no DevOps id
-- yet, each with its fields keyed by the LOGICAL name (the profile maps
-- those to field references), the Feature its workstream becomes and
-- the Epic its category becomes. A story that cannot go is listed
-- under held_back with the reason, never dropped silently.
--
-- A sprint the team has not selected is not guessed at: the item's
-- iteration is the root and sprint_missing names the sprint. A
-- dependency is written as '{{ado:<story key>}}', which the engine
-- replaces with the id once it knows it.
--
-- hash covers the epics, features and items, so a payload printed
-- twice can be seen to be the same one. security invoker: without the
-- admin-only profile there is nothing to build.
-- ---------------------------------------------------------------

create or replace function public.ado_push_payload(p_id uuid default null)
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

  with f as (
    select x.* from public.sprint_story_fields(p_id) x
     where x.is_build and (x.ado->>'id') is null
  ),
  ready as (
    select * from f
     where stories_status = 'confirmed' and shape_ok and epic_key is not null
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
                   coalesce(' ({{ado:' || (d->>'key') || '}})', '')
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
      ) order by r.stream_no, r.item_no, r.n), '[]'::jsonb) as j
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
          'comment', 'LPio ' || w.id)
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
          'description', public.ado_html('div', array[rc.description])))
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
      ) order by f.stream_no, f.item_no, f.n), '[]'::jsonb) as j
    from f
    where not (f.stories_status = 'confirmed' and f.shape_ok and f.epic_key is not null)
  )
  select jsonb_build_object(
      'epics', epics.j, 'features', features.j, 'items', items.j, 'held_back', held.j)
    into body
    from epics, features, items, held;

  return jsonb_build_object(
    'version', 1,
    'generated_at', now(),
    'hash', md5((body - 'held_back')::text),
    'profile', to_jsonb(prof) - 'key' - 'note' - 'created_at' - 'updated_at' - 'epic_ids') || body;
end $$;

comment on function public.ado_push_payload(uuid) is
  'The Azure DevOps push payload: confirmed, unpushed stories of developer work with every field rendered, their Features and Epics, and what is held back and why. p_id null for the whole plan, a workstream, or an item. Admin only, through ado_profile (docs/DEVOPS.md).';

-- ---------------------------------------------------------------
-- ado_receipt_apply: the write-back. The engine hands back a receipt -
-- one entry per object it created or found - and this records each
-- association where it belongs: a story's on the story, a Feature's on
-- its workstream's attributes, an Epic's in the profile. A story with
-- an id is frozen from then on (v_sprint_plan_checks, ado_changed).
--
-- security definer and revoked from every caller: it is run from an
-- admin session, and the session records the push as a decision note.
-- Returns the number of associations written.
-- ---------------------------------------------------------------

create or replace function public.ado_receipt_apply(p_receipt jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  e jsonb;
  v_key text;
  v_n integer;
  written integer := 0;
begin
  for e in select x from jsonb_array_elements(p_receipt->'entries') as x loop
    v_key := e->>'key';
    if (e->>'id') is null or e->>'outcome' not in ('created', 'exists') then
      continue;
    end if;
    if v_key like 'category:%' then
      update public.ado_profile
         set epic_ids = epic_ids || jsonb_build_object(substr(v_key, 10), (e->>'id')::integer)
       where key = 'default';
    elsif v_key like 'workstream:%' then
      update public.work_items
         set attributes = jsonb_set(coalesce(attributes, '{}'::jsonb), '{ado}',
               jsonb_build_object('feature_id', (e->>'id')::integer,
                                  'pushed_at', p_receipt->>'pushed_at'))
       where id = substr(v_key, 12)::uuid;
    else
      v_n := split_part(v_key, '#', 2)::integer;
      update public.work_items
         set user_stories = jsonb_set(user_stories, array[(v_n - 1)::text, 'ado'],
               jsonb_build_object('id', (e->>'id')::integer, 'type', e->>'type',
                                  'rev', (e->>'rev')::integer,
                                  'pushed_at', p_receipt->>'pushed_at',
                                  'hash', e->>'hash'))
       where id = split_part(v_key, '#', 1)::uuid
         and jsonb_array_length(user_stories) >= v_n;
    end if;
    if found then written := written + 1; end if;
  end loop;
  return written;
end $$;

comment on function public.ado_receipt_apply(jsonb) is
  'Writes a push receipt back: each story''s DevOps id, type, revision and hash onto the story, each Feature id onto its workstream, each Epic id into ado_profile. Run from an admin session; returns the associations written (docs/DEVOPS.md).';
