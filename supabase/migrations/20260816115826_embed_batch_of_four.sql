-- Two corrections found while writing the schema file, applied so the
-- repo and the database say the same thing.
--
-- The batch default was 16, which is the size that failed: sixteen
-- full-length items exceed the edge worker's memory (WORKER_RESOURCE_LIMIT,
-- HTTP 546). Four is what the 268-row backfill actually ran at. A default
-- that is known not to work is a trap for whoever calls it next.
--
-- And embed_texts pointed at 31_roadmap_search.sql for the missing-secret
-- case; the plumbing lives in 34_embeddings.sql.
--
-- The bodies are the ones in supabase/schema/34_embeddings.sql.

create or replace function public.embed_texts(
  p_texts text[],
  p_timeout_ms int default 25000)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions, vault
as $$
declare
  v_token text;
  v_res   extensions.http_response;
begin
  select decrypted_secret into v_token
    from vault.decrypted_secrets where name = 'edge_anon_key';
  if v_token is null then
    raise exception 'vault secret edge_anon_key is missing; see supabase/schema/34_embeddings.sql';
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', p_timeout_ms::text);

  select * into v_res from extensions.http((
    'POST',
    'https://zlmkofbkobmhnslfnqsf.supabase.co/functions/v1/embed',
    array[extensions.http_header('Authorization', 'Bearer ' || v_token)],
    'application/json',
    jsonb_build_object('input', to_jsonb(p_texts))::text
  )::extensions.http_request);

  if v_res.status is distinct from 200 then
    raise exception 'embed: HTTP % - %', v_res.status, left(v_res.content, 200);
  end if;
  return (v_res.content::jsonb) -> 'embeddings';
end $$;

create or replace function public.roadmap_embed_refresh(
  p_batch int default 4,
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

revoke all on function public.embed_texts(text[], int) from public, anon, authenticated;
revoke all on function public.roadmap_embed_refresh(int, int) from public, anon, authenticated;
revoke all on function public.roadmap_embed_query(text) from public, anon, authenticated;
