-- Prototype ideas and plans (docs/plan/70-PROTOTYPE-IDEAS.md).
-- future_prototypes keeps its name - these are prototypes intended and
-- not yet built, which is accurate - and gains the columns that turn a
-- three-column strip into something reviewable. `note` is untouched,
-- so the fourteen existing rows lose nothing.
alter table public.future_prototypes
  add column if not exists summary text,
  add column if not exists status text not null default 'idea',
  add column if not exists priority integer not null default 100,
  add column if not exists effort text,
  add column if not exists value_note text,
  add column if not exists area_id uuid references public.work_areas (id) on delete set null,
  add column if not exists blocks jsonb not null default '[]'::jsonb,
  add column if not exists tags text[] not null default '{}',
  add column if not exists requested_by text,
  add column if not exists promoted_prototype_id uuid
    references public.prototypes (id) on delete set null,
  add column if not exists resolution text,
  add column if not exists resolved_at timestamptz;

alter table public.future_prototypes drop constraint if exists future_prototypes_status_check;
alter table public.future_prototypes add constraint future_prototypes_status_check
  check (status in ('idea', 'shortlisted', 'planned', 'building', 'promoted', 'dropped'));

alter table public.future_prototypes drop constraint if exists future_prototypes_effort_check;
alter table public.future_prototypes add constraint future_prototypes_effort_check
  check (effort is null or effort in ('small', 'medium', 'large'));

-- A promotion without the prototype it became is a claim with nothing
-- behind it; a drop without a reason is a delete wearing a status.
alter table public.future_prototypes drop constraint if exists future_prototypes_promoted_has_row;
alter table public.future_prototypes add constraint future_prototypes_promoted_has_row
  check (status <> 'promoted' or promoted_prototype_id is not null);

alter table public.future_prototypes drop constraint if exists future_prototypes_dropped_has_reason;
alter table public.future_prototypes add constraint future_prototypes_dropped_has_reason
  check (status <> 'dropped' or coalesce(btrim(resolution), '') <> '');

create index if not exists future_prototypes_status_idx
  on public.future_prototypes (status, priority, sort_order);
create index if not exists future_prototypes_area_idx
  on public.future_prototypes (area_id);

-- Stamp the closing date rather than trusting a caller to remember,
-- mirroring set_work_item_resolution in 30_work.sql.
create or replace function public.set_prototype_idea_resolution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('promoted', 'dropped') then
    if new.resolved_at is null then new.resolved_at := now(); end if;
  else
    new.resolved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists future_prototypes_resolution on public.future_prototypes;
create trigger future_prototypes_resolution
  before insert or update on public.future_prototypes
  for each row execute function public.set_prototype_idea_resolution();

-- An idea and a prototype join the graph, so a prototype can record
-- what it was built from and a change to that source names every
-- prototype now out of date.
insert into public.link_entity_types (key, table_name, label, sort_order)
values ('prototype', 'prototypes', 'Prototype', 110),
       ('prototype_idea', 'future_prototypes', 'Prototype idea', 120)
on conflict (key) do nothing;
