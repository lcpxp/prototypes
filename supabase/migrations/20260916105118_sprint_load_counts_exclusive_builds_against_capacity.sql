-- Capacity is SUBSTANTIAL BUILDS running at once, not items per sprint.
-- Counting every PXP item against capacity_dev_equivalents treated one
-- roadmap item as one developer for a whole sprint, which padded the
-- plan by a factor: a fortnight of work read as a quarter of plan.
-- Parallel and overlappable work now rides alongside.
-- docs/SPRINT-DELIVERY.md Part C rule 4 carries the reasoning.

create or replace view public.v_sprint_plan_load
with (security_invoker = on) as
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
    (count(*) filter (where not o.is_external and o.overlap = 'exclusive'))
      > (select sp.capacity_dev_equivalents from public.sprint_plan sp where sp.key = 'default') as over_capacity,
    count(distinct o.workstream_id)
      > (select sp.max_concurrent_streams from public.sprint_plan sp where sp.key = 'default') as over_concurrency
  from occupancy o
  group by o.slot_n
  order by o.slot_n;

revoke all on public.v_sprint_plan_load from public, anon;
grant select on public.v_sprint_plan_load to authenticated;

comment on view public.v_sprint_plan_load is
  'Per-slot load: streams in flight, PXP-consuming items, external items, and whether the slot breaches capacity (exclusive builds against capacity_dev_equivalents) or the concurrency bound.';
