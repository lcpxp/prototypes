-- ------------------------------------------------------------------
-- 35_sprints.sql - The Sprint Roadmap: the sprint calendar, the plan
-- anchor and the per-item allocation.
--
-- Two roadmaps read the same work_items rows. The PRODUCT roadmap bands
-- work by horizon (now/next/later/someday) and answers "what, in what
-- order". The SPRINT roadmap places the Now column against sprints and
-- answers "when, against whose capacity". Only rows at horizon='now'
-- are allocated, so the Now column is the conveyor belt between them.
--
-- The calendar is NOT defined here. assets/js/core/sprints.js is the one
-- home for the code/date conversion (docs/SPRINTS.md); the sprints table
-- below is a MATERIALISATION of it so SQL can join on a sprint, and
-- tests/unit/sprints-table.test.js fails if the two ever disagree.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- sprints: the calendar, materialised. idx is the global index with
-- 26-01 = 0; code is the YY-NN the business speaks. Seeded from the
-- same anchor App.sprints uses (26-01 starts Mon 22 Dec 2025), never
-- hand-keyed - a hand-edited row is how two copies drift, which is the
-- thing the gate exists to catch.
-- ---------------------------------------------------------------

create table if not exists public.sprints (
  idx       integer primary key check (idx >= 0),
  code      text not null unique check (code ~ '^[0-9]{2}-[0-9]{2}$'),
  starts_on date not null,
  ends_on   date not null,
  quarter   text not null,
  check (ends_on > starts_on)
);

comment on table public.sprints is
  'The sprint calendar, materialised from assets/js/core/sprints.js. Reference data; see docs/SPRINTS.md.';

-- ---------------------------------------------------------------
-- sprint_plan: exactly one row, and the check keeps it that way. It
-- holds the plan ANCHOR and the planning constants, and nothing else.
--
-- anchor_sprint null IS the unanchored state. The sprint the plan
-- starts in is not known until development resource arrives, and an
-- unanchored plan must be visibly unanchored in the data rather than
-- assumed. Anchoring is one write plus one call to
-- sprint_plan_project(); docs/SPRINT-DELIVERY.md carries the step.
--
-- capacity_dev_equivalents and the concurrency bounds are PLANNING
-- constants and live here because they must live in exactly one place.
-- They are never a column on an item, never a label on a bar, and
-- nothing in the front end reads them - only the allocation rules in
-- docs/SPRINT-DELIVERY.md do.
-- ---------------------------------------------------------------

create table if not exists public.sprint_plan (
  key text primary key default 'default' check (key = 'default'),
  anchor_sprint text
    references public.sprints (code) on delete restrict,
  capacity_dev_equivalents numeric(3,1) not null default 3.0
    check (capacity_dev_equivalents > 0),
  min_concurrent_streams smallint not null default 2
    check (min_concurrent_streams >= 1),
  max_concurrent_streams smallint not null default 3
    check (max_concurrent_streams >= min_concurrent_streams),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.sprint_plan.anchor_sprint is
  'The real sprint that slot 0 maps to. Null means unanchored: slots render as Sprint +N and no sprint code is projected onto any item.';

drop trigger if exists sprint_plan_updated_at on public.sprint_plan;
create trigger sprint_plan_updated_at
  before update on public.sprint_plan
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- work_item_sprints: the allocation. One live row per item; span
-- covers multi-sprint work, so there is no row-per-sprint fanout.
--
-- slot is always RELATIVE (0 = Sprint +0). A real code only exists
-- once the plan is anchored, so nothing here can invent one.
--
-- overlap is a first-class property, not a comment:
--   exclusive     - must not share a sprint with another exclusive
--                   allocation in the same workstream; holds a
--                   capacity slot for its whole span.
--   overlappable  - may share its FIRST sprint with the previous item's
--                   last and its LAST with the next item's first.
--   parallel      - imposes no sequencing constraint at all. Discovery,
--                   specification and externally-built work.
--
-- external_party_id points at the integrations row for the party doing
-- the work (EIT, the Payment Service team, Experian). An allocation
-- with one consumes NO PXP capacity and does not count toward the
-- concurrency bound, so externally-gated work is placed honestly and
-- slips without re-flowing the plan.
--
-- Allocations are never deleted (CLAUDE.md): they retire with a
-- resolution when an item leaves Now, so the reason survives.
-- ---------------------------------------------------------------

create table if not exists public.work_item_sprints (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null
    references public.work_items (id) on delete cascade,
  slot smallint not null check (slot >= 0),
  span smallint not null default 1 check (span between 1 and 12),
  sequence_position smallint,
  overlap text not null default 'exclusive'
    check (overlap in ('exclusive', 'overlappable', 'parallel')),
  external_party_id uuid
    references public.integrations (id) on delete set null,
  external_status text
    check (external_status in ('not_started', 'requested', 'committed',
                               'in_progress', 'delivered', 'slipped')),
  slip_slots smallint not null default 0 check (slip_slots >= 0),
  note text,
  retired_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_item_sprints_external_status_needs_party
    check (external_status is null or external_party_id is not null),
  constraint work_item_sprints_retired_has_reason
    check (retired_at is null or resolution is not null)
);

-- One LIVE allocation per item. Retired rows accumulate as history,
-- which is why this is a partial index and not a plain unique.
create unique index if not exists work_item_sprints_live_idx
  on public.work_item_sprints (work_item_id)
  where retired_at is null;

create index if not exists work_item_sprints_slot_idx
  on public.work_item_sprints (slot)
  where retired_at is null;

drop trigger if exists work_item_sprints_updated_at on public.work_item_sprints;
create trigger work_item_sprints_updated_at
  before update on public.work_item_sprints
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- slot -> real sprint code. The one place that resolution happens:
-- the projection below and both sprint views call this rather than
-- each joining the anchor themselves. Null while unanchored.
-- ---------------------------------------------------------------

create or replace function public.sprint_code_for_slot(p_slot integer)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select s2.code
  from public.sprint_plan p
  join public.sprints s1 on s1.code = p.anchor_sprint
  join public.sprints s2 on s2.idx = s1.idx + p_slot
  where p.key = 'default';
$$;

comment on function public.sprint_code_for_slot(integer) is
  'Resolves a relative slot to a real sprint code, or null while the plan is unanchored.';

-- ---------------------------------------------------------------
-- The derived projection onto work_items.start_sprint / end_sprint.
--
-- Those columns stay, so the drawer's Sprints row, the KPI JSON export
-- and the CSV keep working with no front-end change - but they are no
-- longer the source of truth. Two rules:
--   * An unanchored plan writes NOTHING. No invented codes, ever.
--   * Only rows with a live allocation are touched. A sprint code
--     recorded by hand against an item that was never allocated is a
--     record of what happened, and is left alone.
--
-- The trigger keeps it current as allocations change. Anchoring the
-- plan is the one case it cannot see, so that is an explicit call -
-- which is right, because anchoring is a deliberate act and worth
-- being visible in the session that does it.
-- ---------------------------------------------------------------

create or replace function public.sprint_plan_project()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer;
begin
  with live as (
    select a.work_item_id,
           public.sprint_code_for_slot(a.slot + a.slip_slots) as s,
           public.sprint_code_for_slot(a.slot + a.slip_slots + a.span - 1) as e
    from public.work_item_sprints a
    where a.retired_at is null
  )
  update public.work_items w
     set start_sprint = live.s,
         end_sprint   = nullif(live.e, live.s)
    from live
   where w.id = live.work_item_id
     and (w.start_sprint is distinct from live.s
          or w.end_sprint is distinct from nullif(live.e, live.s));
  get diagnostics touched = row_count;
  return touched;
end $$;

comment on function public.sprint_plan_project() is
  'Writes the allocation back onto work_items.start_sprint/end_sprint. No-op while the plan is unanchored. Call it after anchoring; the allocation trigger handles every other case. Returns rows changed.';

create or replace function public.sprint_plan_project_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sprint_plan_project();
  return null;
end $$;

drop trigger if exists work_item_sprints_project on public.work_item_sprints;
create trigger work_item_sprints_project
  after insert or update or delete on public.work_item_sprints
  for each statement execute function public.sprint_plan_project_trigger();

-- ---------------------------------------------------------------
-- The calendar itself, seeded the same way 33_links.sql seeds its
-- vocabularies. Three years is enough for any plan this board holds,
-- and extending it is one more generate_series.
--
-- The arithmetic is the anchor and nothing else: sprint idx starts on
-- 22 Dec 2025 + idx * 14 days, runs 11 days to the second Friday, and
-- the code is the sprint YEAR (26 + idx/26) and the ordinal within it.
-- tests/unit/sprints-table.test.js checks every row of this against
-- App.sprints, so the two cannot drift apart unnoticed.
-- ---------------------------------------------------------------

insert into public.sprints (idx, code, starts_on, ends_on, quarter)
select
  i,
  lpad((26 + i / 26)::text, 2, '0') || '-' || lpad((i % 26 + 1)::text, 2, '0'),
  (date '2025-12-22' + (i * 14)),
  (date '2025-12-22' + (i * 14) + 11),
  'Q' || (extract(quarter from (date '2025-12-22' + (i * 14))))::int
       || ' ' || (extract(year from (date '2025-12-22' + (i * 14))))::int
from generate_series(0, 77) as g(i)
on conflict (idx) do nothing;

insert into public.sprint_plan (key, note)
values ('default',
  'Unanchored: the sprint delivery starts in is not yet known. Capacity is held at three developer-equivalents and concurrency at two to three streams in flight; both are planning constants used only by the allocation rules in docs/SPRINT-DELIVERY.md.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- The read surfaces.
--
-- v_sprint_plan_items is the one the BOARD reads. The other two are
-- read-and-operate surfaces in the same spirit as roadmap_current: for
-- a session or a stakeholder querying the plan without the page. The
-- board derives stream spans from the item rows rather than fetching
-- them twice.
--
-- All are security_invoker, so reads are filtered by the base table
-- policies and they add no new surface, and all are granted to
-- authenticated only - exactly as work_items_board is.
--
-- The conveyor-belt rule lives here and nowhere else: an item is on the
-- Sprint Roadmap if it has a live allocation AND sits at horizon='now'.
-- ---------------------------------------------------------------

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

comment on view public.v_sprint_plan_items is
  'The Sprint Roadmap delivery view: one row per live allocation of a Now work item. The board reads this. See docs/SPRINT-DELIVERY.md.';

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

comment on view public.v_sprint_plan_streams is
  'The Sprint Roadmap stakeholder view: one row per workstream with its span, contents and benefit. A read entry point, not a board dependency.';

-- Load per slot: the one place the capacity and concurrency arithmetic
-- happens, so a re-map is checked rather than eyeballed. An allocation
-- with an external party consumes no PXP capacity, so it is counted
-- separately and excluded from pxp_items.

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
    -- Capacity is SUBSTANTIAL BUILDS running at once, not items per
    -- sprint. A roadmap item is not a sprint of work for one person, so
    -- counting every item against the cap padded the plan by a factor
    -- and made a fortnight's work read as a quarter's. Parallel and
    -- overlappable work rides alongside; docs/SPRINT-DELIVERY.md Part C
    -- rule 4 is the one home for the reasoning.
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
