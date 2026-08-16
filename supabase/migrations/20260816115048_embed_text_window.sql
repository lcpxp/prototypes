-- gte-small has a 512-token context and truncates past it, so sending a
-- 9KB write-up buys nothing except edge-worker memory - and a batch of
-- sixteen untrimmed items failed outright with WORKER_RESOURCE_LIMIT
-- (HTTP 546). The cap is made explicit here rather than left to the
-- model, so what was embedded is knowable from the row: roughly 512
-- tokens of English at four characters a token.
--
-- Title and summary lead, so the most identifying text is always inside
-- the window; details and resolution fill what is left.
create or replace function public.work_item_embed_text(
  p_title text, p_summary text, p_details text, p_resolution text)
returns text
language sql
immutable
as $$
  select left(btrim(concat_ws(E'\n', p_title, p_summary, p_details, p_resolution)), 2000);
$$;

comment on function public.work_item_embed_text(text, text, text, text) is
  'The exact text a work item is embedded from - the same four fields roadmap_find scores, capped at 2000 characters to sit inside gte-small''s 512-token window. One home, so the vector and the hash can never disagree.';
