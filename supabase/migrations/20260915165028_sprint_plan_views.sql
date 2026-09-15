-- ------------------------------------------------------------------
-- Applied 2026-09-15. The Sprint Roadmap's read surfaces.
--
-- v_sprint_plan_items is the one the BOARD reads. The other two are
-- read-and-operate surfaces in the spirit of roadmap_current: for a
-- session or a stakeholder querying the plan without the page. The
-- board derives stream spans from the item rows rather than fetching
-- them twice.
--
-- The conveyor-belt rule lives in v_sprint_plan_items and nowhere else:
-- an item is on the Sprint Roadmap if it has a live allocation AND sits
-- at horizon='now'.
--
-- Declarative home: supabase/schema/35_sprints.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

drop view if exists public.v_sprint_plan_items;
create view public.v_sprint_plan_items with (security_invoker = on) as
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
    w.business_benefit, w.benefit_type, w.benefit_status
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

drop view if exists public.v_work_item_metric_rollup;
create view public.v_work_item_metric_rollup with (security_invoker = on) as
  select
    w.id as work_item_id, w.title as work_item_title,
    w.parent_id as workstream_id, p.title as workstream_title,
    m.metric_kind, m.unit, m.basis,
    sum(m.value) as total,
    min(m.confidence) as weakest_confidence,
    count(*) as metric_rows
  from public.work_item_metrics m
  join public.work_items w on w.id = m.work_item_id
  left join public.work_items p on p.id = w.parent_id
  group by w.id, w.title, w.parent_id, p.title, m.metric_kind, m.unit, m.basis;

revoke all on public.v_work_item_metric_rollup from public, anon;
grant select on public.v_work_item_metric_rollup to authenticated;

drop view if exists public.v_sprint_plan_streams;
create view public.v_sprint_plan_streams with (security_invoker = on) as
  select
    ws.id as workstream_id, ws.title as workstream_title,
    ws.priority, ws.department,
    ws.business_benefit, ws.benefit_type, ws.benefit_status,
    min(v.effective_slot) as first_slot,
    max(v.effective_end_slot) as last_slot,
    max(v.effective_end_slot) - min(v.effective_slot) + 1 as slots_spanned,
    count(*) as item_count,
    count(*) filter (where v.is_external) as external_item_count,
    bool_or(v.is_external) as externally_gated,
    public.sprint_code_for_slot(min(v.effective_slot)) as start_code,
    public.sprint_code_for_slot(max(v.effective_end_slot)) as end_code
  from public.v_sprint_plan_items v
  join public.work_items ws on ws.id = v.workstream_id
  group by ws.id, ws.title, ws.priority, ws.department,
           ws.business_benefit, ws.benefit_type, ws.benefit_status;

revoke all on public.v_sprint_plan_streams from public, anon;
grant select on public.v_sprint_plan_streams to authenticated;

drop view if exists public.v_sprint_plan_load;
create view public.v_sprint_plan_load with (security_invoker = on) as
  with occupancy as (
    select v.*, gs.slot_n
    from public.v_sprint_plan_items v
    cross join lateral generate_series(v.effective_slot, v.effective_end_slot) as gs(slot_n)
  )
  select
    o.slot_n as slot,
    public.sprint_code_for_slot(o.slot_n) as code,
    count(distinct o.workstream_id) as streams_in_flight,
    count(*) filter (where not o.is_external) as pxp_items,
    count(*) filter (where o.is_external) as external_items,
    count(*) filter (where not o.is_external and o.overlap = 'exclusive') as exclusive_items,
    (select sp.capacity_dev_equivalents from public.sprint_plan sp where sp.key = 'default') as capacity,
    (count(*) filter (where not o.is_external))
      > (select sp.capacity_dev_equivalents from public.sprint_plan sp where sp.key = 'default') as over_capacity,
    count(distinct o.workstream_id)
      > (select sp.max_concurrent_streams from public.sprint_plan sp where sp.key = 'default') as over_concurrency
  from occupancy o
  group by o.slot_n
  order by o.slot_n;

revoke all on public.v_sprint_plan_load from public, anon;
grant select on public.v_sprint_plan_load to authenticated;
