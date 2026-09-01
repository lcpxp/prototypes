-- A view freezes its columns at creation, so the seven benefit and
-- audience columns added by the previous migration do not appear in
-- work_items_board on their own. The roadmap and the backlog both
-- select("*") from this view, so without this the drawer would render
-- an empty benefit section on every row and nothing would say why.

drop view if exists public.work_items_board;
create view public.work_items_board
  with (security_invoker = on) as
  select
    id, area_id, category_id, milestone_id, source_document_id, parent_id,
    title, summary, level, type, status, horizon, end_horizon, presentation,
    priority, effort, impact, progress, prd_status, project_status,
    starts_on, ends_on, start_sprint, end_sprint,
    department, associated_departments, assignee, support_assignee,
    business_benefit, benefit_type, benefit_status,
    pxp_staff_value, partner_staff_value, merchant_value, sales_route,
    external_ref, requested_by, tags, attributes, sort_order,
    resolution, resolved_at, previously_completed_at, created_at, updated_at
  from public.work_items;

revoke all on public.work_items_board from public, anon;
grant select on public.work_items_board to authenticated;

comment on view public.work_items_board is
  'work_items without details, for the roadmap board and the backlog list. security_invoker: reads are filtered by the base table policy. See docs/plan/80-LOAD-SPEED.md.';
