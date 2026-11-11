-- A story may carry its own purpose, as it may its own scope: where it
-- does, that is the Purpose its backlog item gets, ahead of the first
-- sentence of the item's benefit. Mirrors supabase/schema/38_sprint_handoff.sql,
-- which holds the function in full; this applies the one changed line
-- to the definition already live.
do $$
declare
  src text;
  needle constant text := '(regexp_match(btrim(x.business_benefit),';
begin
  select pg_get_functiondef('public.sprint_story_fields(uuid)'::regprocedure) into src;
  if position('x.story->>''purpose''' in src) > 0 then
    return;
  end if;
  if position(needle in src) = 0 then
    raise exception 'sprint_story_fields: the purpose expression was not found';
  end if;
  src := replace(src, needle,
    'nullif(btrim(x.story->>''purpose''), ''''),' || chr(10) || '        ' || needle);
  execute src;
end $$;

comment on function public.sprint_story_fields(uuid) is
  'One row per story on the Sprint Roadmap with every field a backlog item carries, derived once: the renderer sprint_story_pack and ado_push_payload both read. A story''s own purpose and scope win over the item''s. p_id null for the whole plan, a workstream, or an item. docs/DEVOPS.md holds the field standard.';
