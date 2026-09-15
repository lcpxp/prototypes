-- ------------------------------------------------------------------
-- Applied 2026-09-15. The Sprint Roadmap's two working tables.
--
-- sprint_plan is exactly one row: the plan ANCHOR (null while the sprint
-- delivery starts in is unknown) and the planning constants. Allocations
-- are always RELATIVE to that anchor, so nothing can invent a sprint code
-- before there is one to invent.
--
-- work_item_sprints carries slot, span, overlappability and the external
-- party doing the work. An allocation with an external party consumes no
-- PXP capacity, so externally-gated work is placed honestly and slips
-- without re-flowing the plan.
--
-- Rationale beside each column in supabase/schema/35_sprints.sql;
-- allocation rules in docs/SPRINT-DELIVERY.md.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

create table if not exists public.sprint_plan (
  key text primary key default 'default' check (key = 'default'),
  anchor_sprint text references public.sprints (code) on delete restrict,
  capacity_dev_equivalents numeric(3,1) not null default 3.0
    check (capacity_dev_equivalents > 0),
  min_concurrent_streams smallint not null default 2 check (min_concurrent_streams >= 1),
  max_concurrent_streams smallint not null default 3
    check (max_concurrent_streams >= min_concurrent_streams),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sprint_plan_updated_at on public.sprint_plan;
create trigger sprint_plan_updated_at
  before update on public.sprint_plan
  for each row execute function public.set_updated_at();

create table if not exists public.work_item_sprints (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  slot smallint not null check (slot >= 0),
  span smallint not null default 1 check (span between 1 and 12),
  sequence_position smallint,
  overlap text not null default 'exclusive'
    check (overlap in ('exclusive', 'overlappable', 'parallel')),
  external_party_id uuid references public.integrations (id) on delete set null,
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

create unique index if not exists work_item_sprints_live_idx
  on public.work_item_sprints (work_item_id) where retired_at is null;
create index if not exists work_item_sprints_slot_idx
  on public.work_item_sprints (slot) where retired_at is null;

drop trigger if exists work_item_sprints_updated_at on public.work_item_sprints;
create trigger work_item_sprints_updated_at
  before update on public.work_item_sprints
  for each row execute function public.set_updated_at();

create or replace function public.sprint_code_for_slot(p_slot integer)
returns text language sql stable security invoker set search_path = public as $$
  select s2.code
  from public.sprint_plan p
  join public.sprints s1 on s1.code = p.anchor_sprint
  join public.sprints s2 on s2.idx = s1.idx + p_slot
  where p.key = 'default';
$$;

create or replace function public.sprint_plan_project()
returns integer language plpgsql security definer set search_path = public as $$
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

create or replace function public.sprint_plan_project_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sprint_plan_project();
  return null;
end $$;

drop trigger if exists work_item_sprints_project on public.work_item_sprints;
create trigger work_item_sprints_project
  after insert or update or delete on public.work_item_sprints
  for each statement execute function public.sprint_plan_project_trigger();

alter table public.sprint_plan enable row level security;
alter table public.work_item_sprints enable row level security;

insert into public.sprint_plan (key, note)
values ('default',
  'Unanchored: the sprint delivery starts in is not yet known. Capacity is held at three developer-equivalents and concurrency at two to three streams in flight; both are planning constants used only by the allocation rules in docs/SPRINT-DELIVERY.md.')
on conflict (key) do nothing;
