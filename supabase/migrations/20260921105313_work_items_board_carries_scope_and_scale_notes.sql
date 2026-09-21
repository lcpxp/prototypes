-- A view freezes its column list at creation, so the two columns added
-- to work_items in 20260921080014 are invisible to everything reading
-- work_items_board - the roadmap board, the backlog list and the drawer
-- - where they would read as an empty field on every row with nothing
-- failing. schema-drift.test.js watches exactly this, and `details` is
-- the only column this view is entitled to leave out.
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
    scope, scale_notes,
    external_ref, requested_by, tags, attributes, sort_order,
    resolution, resolved_at, previously_completed_at, created_at, updated_at
  from public.work_items;

revoke all on public.work_items_board from public, anon;
grant select on public.work_items_board to authenticated;

comment on view public.work_items_board is
  'work_items without details, for the roadmap board and the backlog list. security_invoker: reads are filtered by the base table policy. See docs/plan/80-LOAD-SPEED.md.';
