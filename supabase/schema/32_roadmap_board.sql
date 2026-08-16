-- ------------------------------------------------------------------
-- 32_roadmap_board.sql - The roadmap's read-and-operate surface: the
-- human-readable board view and the one operation that moves a whole
-- workstream.
--
-- Split out of 30_work.sql, which passed its 500-line budget when the
-- assignee columns and the delete guard were declared. Same seam
-- 31_roadmap_search.sql already uses: 30_work.sql defines the DOMAIN,
-- these files carry the surfaces built on top of it. Neither is a
-- board dependency - modules/roadmap/ reads work_items directly - so
-- they are the operating entry points for a session, not the page's.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- roadmap_current: the whole roadmap joined and human-readable in one
-- query, so any assistant with the project ref reads the current state
-- in a single call (see docs/ROADMAP-PLAYBOOK.md). security_invoker, so
-- it exposes exactly what the caller's RLS already allows on the base
-- tables and adds no new surface. Rendering still comes from the page;
-- this view is the operating/read entry point, not a board dependency.
-- ---------------------------------------------------------------

drop view if exists public.roadmap_current;
create view public.roadmap_current
  with (security_invoker = on) as
  select
    wi.id,
    wi.title,
    wi.level,
    (wi.parent_id is not null) as is_child,
    parent.title              as workstream_title,
    rc.key                    as theme_key,
    rc.label                  as theme_label,
    coalesce(rc.shareholder_visible, false) as shareholder_visible,
    wa.title                  as filing_area,
    wa.scope                  as scope,
    wi.department,
    wi.associated_departments,
    wi.type,
    wi.status,
    wi.horizon,
    wi.end_horizon,
    wi.presentation,
    wi.priority,
    wi.progress,
    wi.start_sprint,
    wi.end_sprint,
    wi.updated_at
  from public.work_items wi
  left join public.work_items parent    on parent.id = wi.parent_id
  left join public.roadmap_categories rc on rc.id = wi.category_id
  left join public.work_areas wa         on wa.id = wi.area_id
  order by rc.sort_order nulls last, wi.priority, wi.sort_order;

grant select on public.roadmap_current to anon, authenticated;

-- ---------------------------------------------------------------
-- roadmap_move_workstream: reschedule a workstream and cascade the band
-- shift to its direct child items, preserving their relative offsets and
-- the workstream's span (a Next->Later workstream with 2 Next + 2 Later
-- children, moved to Now, becomes a Now->Next workstream with 2 Now + 2
-- Next children). Bands clamp to now..someday; priority/sort_order are
-- untouched so ordering within a band is kept. Only direct children
-- (parent_id) move; items linked via knowledge_links stay put. This is
-- the canonical "move this workstream" operation (see
-- docs/ROADMAP-PLAYBOOK.md); the board page stays read-only.
-- ---------------------------------------------------------------
create or replace function public.roadmap_move_workstream(
  p_workstream_id uuid,
  p_target_horizon text)
returns integer
language plpgsql
as $$
declare
  bands text[] := array['now', 'next', 'later', 'someday'];
  cur_idx int;
  tgt_idx int;
  delta int;
  affected int;
begin
  tgt_idx := array_position(bands, p_target_horizon);
  if tgt_idx is null then
    raise exception 'invalid target horizon %, expected one of now/next/later/someday', p_target_horizon;
  end if;

  select array_position(bands, horizon) into cur_idx
    from public.work_items
   where id = p_workstream_id and level = 'workstream';
  if cur_idx is null then
    raise exception 'no workstream found with id % (must be level=workstream)', p_workstream_id;
  end if;

  delta := tgt_idx - cur_idx;
  if delta = 0 then
    return 0;
  end if;

  with moved as (
    update public.work_items set
      horizon = bands[greatest(1, least(4, array_position(bands, horizon) + delta))],
      end_horizon = case
        when end_horizon is null then null
        else bands[greatest(1, least(4, array_position(bands, end_horizon) + delta))]
      end
    where id = p_workstream_id
       or parent_id = p_workstream_id
    returning 1)
  select count(*) into affected from moved;

  return affected;
end $$;

comment on function public.roadmap_move_workstream(uuid, text) is
  'Reschedule a workstream and cascade the band shift to its direct children, preserving relative offsets and span. See docs/ROADMAP-PLAYBOOK.md.';

-- ---------------------------------------------------------------
-- work_items_board: every work_items column EXCEPT details, which is
-- paragraphs of free text - 46.6% of the table by stored size, and
-- 102,956 bytes of a cold page load spent on prose that only ever
-- appears in one drawer at a time. The roadmap and the backlog both
-- select("*") from here instead; App.workItemsData fetches details when
-- a drawer opens and in bulk when an export is pressed.
-- docs/plan/80-LOAD-SPEED.md.
--
-- The column list lives in SQL rather than in the page, because the
-- place a column is added is a migration, not a fetch line - so the
-- list sits where the person adding one is already working. It is not
-- self-updating: a view freezes its columns at creation. That is held
-- mechanically instead - tests/checks/schema-drift.test.js compares
-- this view's columns against work_items' and fails on any column
-- present in the table and absent here other than details.
--
-- security_invoker, so every read is filtered by the "work_items:
-- members read" policy on the base table. Without it the view would run
-- as its owner and hand the whole table to the anon key. Granted to
-- authenticated only, as roadmap_searchable is.
-- ---------------------------------------------------------------

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
