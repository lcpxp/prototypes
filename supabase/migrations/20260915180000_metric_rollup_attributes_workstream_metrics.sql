-- ------------------------------------------------------------------
-- Applied 2026-09-15. Fixes v_work_item_metric_rollup, which took
-- parent_id as the workstream and so gave workstream_id null for any
-- metric written against a workstream itself - a workstream has no
-- parent. The stream-level figures, which are the most quotable ones
-- there are, rolled up to nothing and never reached the Sprint
-- Roadmap's chips. Found by rendering the real rows rather than the
-- test fixture.
--
-- Declarative home: supabase/schema/36_value.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

drop view if exists public.v_work_item_metric_rollup;
create view public.v_work_item_metric_rollup with (security_invoker = on) as
  select
    w.id as work_item_id, w.title as work_item_title,
    case when w.level = 'workstream' then w.id else w.parent_id end as workstream_id,
    case when w.level = 'workstream' then w.title else p.title end as workstream_title,
    m.metric_kind, m.unit, m.basis,
    sum(m.value) as total,
    min(m.confidence) as weakest_confidence,
    count(*) as metric_rows
  from public.work_item_metrics m
  join public.work_items w on w.id = m.work_item_id
  left join public.work_items p on p.id = w.parent_id
  group by w.id, w.title, w.level, w.parent_id, p.title, m.metric_kind, m.unit, m.basis;

revoke all on public.v_work_item_metric_rollup from public, anon;
grant select on public.v_work_item_metric_rollup to authenticated;
