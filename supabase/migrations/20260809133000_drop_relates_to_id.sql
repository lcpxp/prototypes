-- ------------------------------------------------------------------
-- Applied 2026-08-09. Retires work_items.relates_to_id.
--
-- Its 35 relationships live in knowledge_links, typed and readable from
-- both ends, and no code reads the column any more.
--
-- "Nothing is ever deleted" governs ROWS - they close with a status, a
-- resolution and a back-link. It does not govern columns: a dead column
-- left in place leaves two mechanisms for one job and forces every
-- later session to work out which is live, which is the ambiguity the
-- link graph exists to remove. The data is moved, not discarded, and
-- git holds the column definition.
--
-- Gated on a counted precondition, not a comment about one: the drop is
-- refused unless every source row is present in the graph.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

do $$
declare missing int;
begin
  select count(*) into missing
    from public.work_items wi
   where wi.relates_to_id is not null
     and not exists (
       select 1 from public.knowledge_links l
        where l.valid_to is null
          and ((l.from_id = wi.id and l.to_id = wi.relates_to_id)
            or (l.from_id = wi.relates_to_id and l.to_id = wi.id)));
  if missing > 0 then
    raise exception 'refusing to drop relates_to_id: % rows are not in knowledge_links', missing;
  end if;
end $$;

drop view if exists public.roadmap_searchable cascade;

alter table public.work_items drop constraint if exists work_items_relates_not_self;
drop index if exists public.work_items_relates_to_idx;
alter table public.work_items drop column if exists relates_to_id;

-- roadmap_searchable and roadmap_find are rebuilt without the column by
-- 20260809133500_roadmap_find_returns_links.sql; their bodies are in
-- supabase/schema/31_roadmap_search.sql as at that commit.
