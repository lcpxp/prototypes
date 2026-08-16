-- ------------------------------------------------------------------
-- work_items_board: every work_items column except details.
--
-- details is paragraphs of free text - 46.6% of the table by stored
-- size, and 102,956 bytes of every cold load of the roadmap, spent on
-- prose that only ever appears in one drawer at a time. The roadmap
-- board and the backlog list read this view instead; the prose is
-- fetched when a drawer opens and in bulk when an export is pressed.
-- docs/plan/80-LOAD-SPEED.md.
--
-- security_invoker, so every read is filtered by the "work_items:
-- members read" policy on the base table. Without it the view runs as
-- its owner and hands the whole table to the anon key. Granted to
-- authenticated only, as roadmap_searchable is.
-- ------------------------------------------------------------------

drop view if exists public.work_items_board;
create view public.work_items_board
  with (security_invoker = on) as
  select
    id, area_id, category_id, milestone_id, source_document_id, parent_id,
    title, summary, level, type, status, horizon, end_horizon, presentation,
    priority, effort, impact, progress, prd_status, project_status,
    starts_on, ends_on, start_sprint, end_sprint,
    department, associated_departments, assignee, support_assignee,
    external_ref, requested_by, tags, attributes, sort_order,
    resolution, resolved_at, previously_completed_at, created_at, updated_at
  from public.work_items;

revoke all on public.work_items_board from public, anon;
grant select on public.work_items_board to authenticated;

comment on view public.work_items_board is
  'work_items without details, for the roadmap board and the backlog list. security_invoker: reads are filtered by the base table policy. See docs/plan/80-LOAD-SPEED.md.';
