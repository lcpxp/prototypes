-- ------------------------------------------------------------------
-- Applied 2026-08-09. roadmap_searchable gains a `links` aggregate so a
-- session banding a candidate can see the pair was already adjudicated
-- without a second query - the point of recording the judgement.
--
-- roadmap_current is untouched: the board depends on its shape, and it
-- never carried relates_to_id anyway. roadmap_find's signature is
-- unchanged; it selects from this view, so every caller keeps working.
-- Body: supabase/schema/31_roadmap_search.sql as at this commit.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

drop view if exists public.roadmap_searchable cascade;
create view public.roadmap_searchable
  with (security_invoker = on) as
  select
    wi.id, wi.title, wi.summary, wi.details, wi.level, wi.status,
    wi.horizon, wi.end_horizon, wi.type, wi.priority, wi.parent_id,
    parent.title as workstream_title,
    rc.label     as theme_label,
    wa.title     as filing_area,
    wi.department,
    wi.assignee,
    wi.relates_to_id,
    rel.title    as relates_to_title,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', g.kind, 'reads', g.reads, 'family', g.family,
               'other_type', g.dst_type, 'other_id', g.dst_id,
               'other_title', other.title,
               'note', g.note, 'confidence', g.confidence)
             order by g.family, g.kind, other.title)
        from public.knowledge_graph g
        left join public.work_items other
          on g.dst_type = 'work_item' and other.id = g.dst_id
       where g.src_type = 'work_item' and g.src_id = wi.id
    ), '[]'::jsonb) as links,
    wi.resolution,
    wi.tags,
    (coalesce(wi.summary,'') = '' and coalesce(wi.details,'') = '') as is_hollow,
    wi.created_at, wi.updated_at
  from public.work_items wi
  left join public.work_items parent      on parent.id = wi.parent_id
  left join public.work_items rel         on rel.id = wi.relates_to_id
  left join public.roadmap_categories rc  on rc.id = wi.category_id
  left join public.work_areas wa          on wa.id = wi.area_id;

revoke all on public.roadmap_searchable from public, anon;
grant select on public.roadmap_searchable to authenticated;
