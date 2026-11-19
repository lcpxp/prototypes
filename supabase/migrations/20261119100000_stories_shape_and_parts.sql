-- Several user stories in one backlog item (owner, 19 Nov 2026), part 1 of 6.
-- A backlog item that asks for several distinct things holds one user
-- story for each, {label, story, criteria[]} under "stories"
-- (docs/SPRINT-DELIVERY.md Part A). The shape check accepts it, and
-- story_parts() reads either shape for every reader below.

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
        when exists (
          select 1 from (values ('points'), ('points_low'), ('points_high')) as k(name)
          where s.story ? k.name and jsonb_typeof(s.story->k.name) <> 'number') then true
        when s.story ? 'technical_notes'
          and jsonb_typeof(s.story->'technical_notes') <> 'string' then true
        when s.story ? 'ado' and jsonb_typeof(s.story->'ado') <> 'object' then true
        -- A backlog item that asks for several distinct things holds one
        -- user story for each: {label, story, criteria[]}, 2 to 4 of them,
        -- in place of its own story and criteria.
        when s.story ? 'stories' then
          s.story ? 'story' or s.story ? 'criteria'
          or jsonb_typeof(s.story->'stories') is distinct from 'array'
          or jsonb_array_length(s.story->'stories') not between 2 and 4
          or exists (
            select 1 from jsonb_array_elements(s.story->'stories') as u(part)
            where jsonb_typeof(u.part) <> 'object'
               or coalesce(btrim(u.part->>'label'), '') = ''
               or coalesce(btrim(u.part->>'story'), '') = ''
               or jsonb_typeof(u.part->'criteria') is distinct from 'array'
               or jsonb_array_length(u.part->'criteria') not between 1 and 8
               or exists (
                 select 1 from jsonb_array_elements(u.part->'criteria') as c(criterion)
                 where jsonb_typeof(c.criterion) <> 'string'
                    or btrim(c.criterion #>> '{}') = ''))
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
  'The shape of work_items.user_stories: 1-5 backlog items, each {title} with either {story, criteria[1-8]} or stories[2-4] of {label, story, criteria[1-8]}, nothing empty; optionally points, points_low, points_high (numbers), technical_notes (text) and ado (the DevOps association). Hard ceilings only; docs/SPRINT-DELIVERY.md holds how much to write.';

-- ---------------------------------------------------------------
-- story_parts: the user stories one backlog item carries, each split
-- into its three lines, with its own criteria. A single story is one
-- part with no label; an item holding several gives one part per label.
-- The renderer, the payload, the pack and the checks all read stories
-- through this, so they lay several stories out the same way.
-- ---------------------------------------------------------------
create or replace function public.story_parts(p_story jsonb)
returns table (k integer, label text, role_line text, want_line text,
               outcome_line text, shape_ok boolean, criteria text[])
language sql
immutable
set search_path = public
as $$
  select u.k::integer, nullif(btrim(u.part->>'label'), ''),
         r.m[1], 'I want ' || r.m[2], 'So that ' || r.m[3], r.m is not null,
         array(select btrim(c.criterion #>> '{}')
                 from jsonb_array_elements(u.part->'criteria')
                   with ordinality as c(criterion, j) order by c.j)
    from jsonb_array_elements(case when p_story ? 'stories' then p_story->'stories'
                                   else jsonb_build_array(p_story) end)
           with ordinality as u(part, k)
    cross join lateral (select regexp_match(btrim(u.part->>'story'),
                          '^(As an? .+?), I want (.+), so that (.+)$') as m) r;
$$;

revoke execute on function public.story_parts(jsonb) from public, anon;
grant execute on function public.story_parts(jsonb) to authenticated;
