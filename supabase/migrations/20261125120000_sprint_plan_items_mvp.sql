-- ------------------------------------------------------------------
-- 20261125120000_sprint_plan_items_mvp.sql
--
-- v_sprint_plan_items gains is_mvp: an item tagged 'mvp' is part of its
-- workstream's MVP. The Sprint Roadmap draws each stream's MVP window
-- from these rows (assets/js/pages/roadmap/views-sprint-mvp.js) and
-- labels each such item "(MVP)". The column is APPENDED, so create or
-- replace keeps every view built on this one (streams, order, load,
-- checks) exactly as it is.
--
-- Mirrored in supabase/schema/35_sprints.sql. Idempotent.
-- ------------------------------------------------------------------

create or replace view public.v_sprint_plan_items with (security_invoker = on) as
  select
    w.id as work_item_id, w.title, w.summary, w.level, w.type, w.status,
    w.progress, w.priority,
    w.parent_id as workstream_id, p.title as workstream_title,
    rc.key as category_key, rc.label as category_label, w.department,
    a.slot, a.span, a.slip_slots,
    (a.slot + a.slip_slots) as effective_slot,
    (a.slot + a.slip_slots + a.span - 1) as effective_end_slot,
    a.sequence_position, a.overlap, a.note as allocation_note,
    i.name as external_party, a.external_status,
    (a.external_party_id is not null) as is_external,
    public.sprint_code_for_slot(a.slot + a.slip_slots) as start_code,
    public.sprint_code_for_slot(a.slot + a.slip_slots + a.span - 1) as end_code,
    (select sp.anchor_sprint is not null from public.sprint_plan sp
      where sp.key = 'default') as anchored,
    w.business_benefit, w.benefit_type, w.benefit_status,
    a.placement, w.stories_status,
    public.work_item_points(w.user_stories) as points,
    (a.external_party_id is null and a.overlap <> 'parallel') as is_build,
    ('mvp' = any(w.tags)) as is_mvp
  from public.work_item_sprints a
  join public.work_items w on w.id = a.work_item_id
  left join public.work_items p on p.id = w.parent_id
  left join public.roadmap_categories rc on rc.id = w.category_id
  left join public.integrations i on i.id = a.external_party_id
  where a.retired_at is null
    and w.horizon = 'now'
    and w.status not in ('done', 'dropped');

revoke all on public.v_sprint_plan_items from public, anon;
grant select on public.v_sprint_plan_items to authenticated;

comment on view public.v_sprint_plan_items is
  'The Sprint Roadmap delivery view: one row per live allocation of a Now work item, with its points, whether it is developer work (is_build) and whether it is part of its workstream''s MVP (is_mvp, the item''s mvp tag). The board reads this. See docs/SPRINT-DELIVERY.md.';
