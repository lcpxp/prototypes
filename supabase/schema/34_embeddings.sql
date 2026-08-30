-- ------------------------------------------------------------------
-- 34_embeddings.sql - The semantic channel's store and its plumbing.
--
-- docs/KNOWLEDGE-MODEL.md: the lexical scorer wins on rare handles and
-- loses badly on rewording, and the commonest duplicate is reworded
-- rather than retitled - so a second channel is added and blended,
-- never swapped in. The blending lives in roadmap_find
-- (31_roadmap_search.sql); everything that produces a vector lives here.
--
-- A fresh project needs one thing that is not in this file, because a
-- credential never is:
--   select vault.create_secret('<the anon key>', 'edge_anon_key',
--     'Anon JWT used to call the embed Edge Function');
-- It is the public anon key - it grants only what RLS allows - kept in
-- Vault so no SQL file carries a second copy of it.
-- ------------------------------------------------------------------

create extension if not exists vector with schema extensions;
create extension if not exists http   with schema extensions;

-- ---------------------------------------------------------------
-- work_item_embeddings: one vector per work item.
--
-- A side table rather than a column on work_items, for three reasons:
-- 384 floats is about 1.5KB of JSON per row and work_items feeds two
-- pages; the provenance a derived value needs (which model, from which
-- text, when) would be three more columns on a table that is about
-- work, not about search; and an absent embedding then means "not
-- computed yet" rather than anything about the item.
--
-- source_hash is the md5 of the exact text embedded. It is what makes a
-- stale vector visible: edit an item's prose and its hash stops
-- matching, so the row is re-embedded instead of silently answering for
-- text nobody wrote any more.
--
-- No HNSW index. A sequential scan over a few hundred 384-float vectors
-- is well under a millisecond; add
--   create index on public.work_item_embeddings
--     using hnsw (embedding extensions.vector_cosine_ops)
-- when this passes roughly 5,000 rows, and not before.
-- ---------------------------------------------------------------

create table if not exists public.work_item_embeddings (
  work_item_id uuid primary key
    references public.work_items(id) on delete cascade,
  embedding    extensions.vector(384) not null,
  model        text        not null default 'gte-small',
  source_hash  text        not null,
  updated_at   timestamptz not null default now()
);

comment on table public.work_item_embeddings is
  'Semantic vectors for work_items, one row per item. source_hash is the md5 of the text embedded, so a stale vector is visible rather than silent. See docs/KNOWLEDGE-MODEL.md.';

-- ---------------------------------------------------------------
-- One home for what gets embedded: the same four fields the lexical
-- channel reads, so the two channels look at the same text and no
-- asymmetry has to be remembered.
--
-- Capped at 2000 characters, roughly gte-small's 512-token window at
-- four characters a token. The model truncates anyway; making the cap
-- explicit means what was embedded is knowable from the row, and a
-- batch of untrimmed items had already failed the edge worker outright
-- (WORKER_RESOURCE_LIMIT, HTTP 546). Title and summary lead, so the
-- most identifying text is always inside the window.
-- ---------------------------------------------------------------

create or replace function public.work_item_embed_text(
  p_title text, p_summary text, p_details text, p_resolution text)
returns text
language sql
immutable
set search_path = public
as $$
  select left(btrim(concat_ws(E'\n', p_title, p_summary, p_details, p_resolution)), 2000);
$$;

comment on function public.work_item_embed_text(text, text, text, text) is
  'The exact text a work item is embedded from - the same four fields roadmap_find scores, capped at 2000 characters to sit inside gte-small''s 512-token window. One home, so the vector and the hash can never disagree.';

-- What still needs a vector: never embedded, or embedded from text that
-- has since changed. The whole staleness model - no timestamp
-- comparison, no trigger, just "does the hash still describe the row".
drop view if exists public.work_items_unembedded;
create view public.work_items_unembedded
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

-- ---------------------------------------------------------------
-- embed_texts: strings in, vectors out, over the `embed` Edge Function
-- (supabase/functions/embed/), which runs gte-small on the edge worker
-- itself - no third-party API, no key to hold, no per-call cost.
--
-- Why Postgres calls out rather than the function writing back: the
-- obvious alternative hands a public HTTP endpoint the service_role key
-- to save one round trip. Here the function only ever sees the text it
-- was sent, and the only thing holding write access is Postgres, which
-- already had it.
--
-- Why synchronous `http` and not `pg_net`: pg_net queues a request and
-- a background worker picks it up AFTER the calling transaction
-- commits, so a function that posts and then polls inside one
-- transaction waits for a row that cannot arrive until it has stopped
-- waiting. That was built first and timed out at 30s on every call
-- while the identical request as a standalone statement returned in
-- under a second. `http` blocks a backend for the length of the call,
-- which is the right trade for an operator batch and the wrong one for
-- a request path - which is why none of these are reachable from one.
--
-- Executable by nobody: not anon, not authenticated, not public. These
-- are operator tools run by a session connected as the owner, and
-- nothing reaches them through PostgREST.
-- ---------------------------------------------------------------

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

comment on function public.embed_texts(text[], int) is
  'Embed an array of strings via the embed Edge Function and return the vectors as a jsonb array. Synchronous. Operator tool: executable by no client role.';

-- Embed everything that needs it, in batches, writing each batch before
-- starting the next. Batches of four: sixteen full-length items exceed
-- the edge worker's memory. Idempotent and resumable - the state is
-- source_hash, so a run that dies half way loses nothing and the next
-- one continues rather than repeats.
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

comment on function public.roadmap_embed_refresh(int, int) is
  'Embed every work item whose vector is missing or stale, in batches. Idempotent and resumable: state is work_item_embeddings.source_hash, so a re-run continues rather than repeats.';

-- One query, one vector, for passing to roadmap_find. Separate from the
-- refresh so a search never triggers a backfill.
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
