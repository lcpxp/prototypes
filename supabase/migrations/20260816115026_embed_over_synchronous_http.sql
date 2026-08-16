-- ------------------------------------------------------------------
-- Correction, made on measurement rather than reasoning: pg_net cannot
-- be awaited.
--
-- pg_net queues a request into net.http_request_queue and a background
-- worker picks it up AFTER the calling transaction commits. So a
-- function that posts and then polls net._http_response inside one
-- transaction waits for a row that cannot arrive until it has finished
-- waiting. Verified: the first version of roadmap_embed_refresh timed
-- out at 30s on every call, while the identical request issued as a
-- standalone statement returned 200 in under a second.
--
-- Making it work with pg_net means splitting into queue and collect
-- phases with a job table mapping request ids to work items. The
-- synchronous `http` extension removes all of that: one call, one
-- answer, and the state that matters still lives in
-- work_item_embeddings.source_hash. It blocks a backend for the length
-- of the call, which is the right trade for an operator batch and a
-- 200ms query embedding, and is the wrong trade for a request path -
-- which is why none of these are reachable from one.
--
-- pg_net is dropped again: an extension with a background worker and a
-- growing response table, kept for nothing, is a cost with no payer.
-- ------------------------------------------------------------------

create extension if not exists http with schema extensions;
drop extension if exists pg_net;

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
    raise exception 'vault secret edge_anon_key is missing; see supabase/schema/31_roadmap_search.sql';
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

revoke all on function public.embed_texts(text[], int) from public, anon, authenticated;
