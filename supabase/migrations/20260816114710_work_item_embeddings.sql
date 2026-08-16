-- ------------------------------------------------------------------
-- The semantic channel's store. docs/KNOWLEDGE-MODEL.md: the lexical
-- scorer wins on rare handles and loses badly on rewording, and the
-- commonest duplicate is reworded rather than retitled - so the second
-- channel is added and blended, never swapped in.
--
-- A side table rather than a column on work_items, for three reasons:
-- 384 floats is about 1.5KB of JSON per row and work_items is read with
-- select("*") by two pages; the provenance a derived value needs (which
-- model, from which text, when) would be three more columns on a table
-- that is about work, not about search; and an absent embedding then
-- means "not computed yet" rather than anything about the item.
--
-- source_hash is the md5 of the exact text that was embedded. It is what
-- makes a stale embedding visible: edit an item's prose and its hash
-- stops matching, so the row is re-embedded instead of silently
-- answering for text nobody wrote any more.
-- ------------------------------------------------------------------

create extension if not exists vector with schema extensions;

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

-- No HNSW index. A sequential scan over a few hundred 384-float vectors
-- is well under a millisecond; add
--   create index on public.work_item_embeddings
--     using hnsw (embedding extensions.vector_cosine_ops)
-- when this passes roughly 5,000 rows, and not before.

alter table public.work_item_embeddings enable row level security;

-- Read behind the same grant as the rows it describes: an embedding is
-- only meaningful to someone who can see the item.
drop policy if exists "work_item_embeddings: members read" on public.work_item_embeddings;
create policy "work_item_embeddings: members read"
  on public.work_item_embeddings for select
  to authenticated
  using ((select public.has_module_access('roadmap'))
      or (select public.has_module_access('backlog')));

drop policy if exists "work_item_embeddings: admins insert" on public.work_item_embeddings;
create policy "work_item_embeddings: admins insert"
  on public.work_item_embeddings for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "work_item_embeddings: admins update" on public.work_item_embeddings;
create policy "work_item_embeddings: admins update"
  on public.work_item_embeddings for update
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "work_item_embeddings: admins delete" on public.work_item_embeddings;
create policy "work_item_embeddings: admins delete"
  on public.work_item_embeddings for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on public.work_item_embeddings from public, anon;
grant select on public.work_item_embeddings to authenticated;
grant insert, update, delete on public.work_item_embeddings to authenticated;
