-- ------------------------------------------------------------------
-- The embedding plumbing: Postgres calls the `embed` Edge Function,
-- waits for the answer and stores the vectors itself.
--
-- Why this way round. The obvious alternative is to let the Edge
-- Function write back with the service_role key it is handed
-- automatically. That works and is worse: it gives a public HTTP
-- endpoint write access to the whole database in order to save one
-- round trip. Here the function only ever sees the text it was sent,
-- and the only thing holding write access is Postgres, which already
-- had it.
--
-- The anon JWT lives in Vault under `edge_anon_key`, so no SQL file
-- carries a second copy of it. It is public by design - it grants only
-- what RLS allows - but one home for a credential is the rule
-- regardless. A fresh project needs:
--   select vault.create_secret('<anon key>', 'edge_anon_key', '...');
--
-- These functions are executable by nobody: not anon, not
-- authenticated, not public. They are operator tools, run by a session
-- connected as the owner. Nothing reaches them through PostgREST.
--
-- NOTE: embed_texts was replaced two migrations later - the pg_net
-- version here could never work. Kept as applied history.
-- ------------------------------------------------------------------

-- One home for what gets embedded. The same four fields the lexical
-- channel reads (roadmap_find's corpus), so the two channels are
-- looking at the same text and no asymmetry has to be remembered.
create or replace function public.work_item_embed_text(
  p_title text, p_summary text, p_details text, p_resolution text)
returns text
language sql
immutable
as $$
  select btrim(concat_ws(E'\n', p_title, p_summary, p_details, p_resolution));
$$;

-- What still needs a vector: never embedded, or embedded from text that
-- has since changed. This is the whole staleness model - no timestamp
-- comparison, no trigger, just "does the hash still describe the row".
create or replace view public.work_items_unembedded
  with (security_invoker = on) as
  select wi.id,
         public.work_item_embed_text(wi.title, wi.summary, wi.details, wi.resolution) as body,
         md5(public.work_item_embed_text(wi.title, wi.summary, wi.details, wi.resolution)) as source_hash,
         (e.work_item_id is not null) as is_stale
    from public.work_items wi
    left join public.work_item_embeddings e on e.work_item_id = wi.id
   where e.work_item_id is null
      or e.source_hash <> md5(public.work_item_embed_text(wi.title, wi.summary, wi.details, wi.resolution));

comment on view public.work_items_unembedded is
  'Work items whose vector is missing or was computed from text that has since changed. is_stale distinguishes the two.';

-- Embed the work items that need it, in batches, writing each batch
-- before starting the next. Idempotent and resumable: the state is
-- work_item_embeddings.source_hash, so a re-run continues rather than
-- repeats.
create or replace function public.roadmap_embed_refresh(
  p_batch int default 16,
  p_max   int default 1000)
returns table (embedded int, remaining int)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_done  int := 0;
  v_ids   uuid[];
  v_texts text[];
  v_hash  text[];
  v_vecs  jsonb;
  i       int;
begin
  loop
    exit when v_done >= p_max;

    select array_agg(id order by id), array_agg(body order by id), array_agg(source_hash order by id)
      into v_ids, v_texts, v_hash
      from (select id, body, source_hash from public.work_items_unembedded
             order by id limit least(p_batch, p_max - v_done)) b;

    exit when v_ids is null or array_length(v_ids, 1) is null;

    v_vecs := public.embed_texts(v_texts);

    if jsonb_array_length(v_vecs) <> array_length(v_ids, 1) then
      raise exception 'embed: asked for % vectors, got %',
        array_length(v_ids, 1), jsonb_array_length(v_vecs);
    end if;

    for i in 1 .. array_length(v_ids, 1) loop
      insert into public.work_item_embeddings (work_item_id, embedding, model, source_hash, updated_at)
      values (v_ids[i], ((v_vecs -> (i - 1))::text)::extensions.vector(384),
              'gte-small', v_hash[i], now())
      on conflict (work_item_id) do update
        set embedding = excluded.embedding,
            model = excluded.model,
            source_hash = excluded.source_hash,
            updated_at = excluded.updated_at;
    end loop;

    v_done := v_done + array_length(v_ids, 1);
  end loop;

  return query
    select v_done, (select count(*)::int from public.work_items_unembedded);
end $$;

comment on function public.roadmap_embed_refresh(int, int) is
  'Embed every work item whose vector is missing or stale, in batches. Idempotent and resumable: state is work_item_embeddings.source_hash, so a re-run continues rather than repeats.';

-- One query, one vector. Separate from the refresh so a search never
-- triggers a backfill.
create or replace function public.roadmap_embed_query(p_query text)
returns extensions.vector(384)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare v jsonb;
begin
  v := public.embed_texts(array[btrim(coalesce(p_query, ''))], 15000);
  return ((v -> 0)::text)::extensions.vector(384);
end $$;

comment on function public.roadmap_embed_query(text) is
  'The 384-dimension vector for a search string, for passing to roadmap_find. Operator tool: executable by no client role.';

revoke all on function public.roadmap_embed_refresh(int, int) from public, anon, authenticated;
revoke all on function public.roadmap_embed_query(text) from public, anon, authenticated;
revoke all on public.work_items_unembedded from public, anon;
grant select on public.work_items_unembedded to authenticated;
