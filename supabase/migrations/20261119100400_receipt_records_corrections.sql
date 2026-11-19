-- Several user stories in one backlog item (owner, 19 Nov 2026), part 5 of 6.
-- A backlog item that asks for several distinct things holds one user
-- story for each, {label, story, criteria[]} under "stories"
-- (docs/SPRINT-DELIVERY.md Part A). A receipt entry with outcome
-- updated records a correction's revision and hash on the story.

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
    if (e->>'id') is null or e->>'outcome' not in ('created', 'exists', 'updated') then
      continue;
    end if;
    -- A correction: the story keeps its id and push date, and takes the
    -- revision and hash it now has in Azure DevOps.
    if e->>'outcome' = 'updated' then
      if v_key not like '%#%' then continue; end if;
      v_n := split_part(v_key, '#', 2)::integer;
      update public.work_items
         set user_stories = jsonb_set(user_stories, array[(v_n - 1)::text, 'ado'],
               (user_stories -> (v_n - 1) -> 'ado') ||
               jsonb_build_object('rev', (e->>'rev')::integer, 'hash', e->>'hash',
                                  'corrected_at', p_receipt->>'pushed_at'))
       where id = split_part(v_key, '#', 1)::uuid
         and (user_stories -> (v_n - 1) -> 'ado' ->> 'id')::integer = (e->>'id')::integer;
      if found then written := written + 1; end if;
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
  'Writes a push receipt back: each story''s DevOps id, type, revision and hash onto the story (a correction, outcome updated, refreshes only the revision and hash), each Feature id onto its workstream, each Epic id into ado_profile. Run from an admin session; returns the associations written (docs/DEVOPS.md).';
