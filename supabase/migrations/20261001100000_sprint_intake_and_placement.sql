-- Work joins and leaves the Sprint Roadmap by itself.
--
-- Until now an item reaching Now had to be allocated by a session that
-- remembered to, and one leaving Now had to be retired the same way, so
-- the Now column and the Sprint Roadmap disagreed for as long as nobody
-- did. The trigger below does both: an item arriving at Now under a
-- workstream gets a PROVISIONAL allocation at the end of its stream; an
-- item leaving has its allocation retired with a resolution. A mapping
-- pass (docs/SPRINT-DELIVERY.md Part C) confirms a provisional row by
-- setting placement 'planned'. Every allocation that exists today was
-- placed by such a pass, so they all start as 'planned'.

alter table public.work_item_sprints
  add column if not exists placement text not null default 'planned'
    check (placement in ('provisional', 'planned'));

comment on column public.work_item_sprints.placement is
  'provisional: placed automatically when the item entered Now, not yet confirmed. planned: placed by a mapping pass under docs/SPRINT-DELIVERY.md Part C.';

create or replace function public.work_items_sprint_intake()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  live_id uuid;
  on_belt boolean;
  v_slot integer;
  v_seq integer;
begin
  select a.id into live_id
    from public.work_item_sprints a
   where a.work_item_id = new.id and a.retired_at is null;

  on_belt := new.horizon = 'now'
    and new.status not in ('done', 'dropped')
    and new.level = 'item'
    and exists (select 1 from public.work_items p
                 where p.id = new.parent_id and p.level = 'workstream');

  if live_id is not null and new.status <> 'done' and not on_belt then
    update public.work_item_sprints
       set retired_at = now(),
           resolution = 'Retired automatically: ' || case
             when new.status = 'dropped' then 'the item was dropped.'
             when new.horizon <> 'now' then 'the item left Now for ' || new.horizon || '.'
             else 'the item is no longer a work item under a workstream.'
           end
     where id = live_id;
    return null;
  end if;

  if live_id is null and on_belt then
    select max(a.slot + a.slip_slots + a.span - 1), max(a.sequence_position)
      into v_slot, v_seq
      from public.work_item_sprints a
      join public.work_items w on w.id = a.work_item_id
     where a.retired_at is null and w.parent_id = new.parent_id and w.id <> new.id
       and w.horizon = 'now' and w.status not in ('done', 'dropped');
    if v_slot is null then
      select coalesce(max(a.slot + a.slip_slots + a.span - 1) + 1, 0)
        into v_slot
        from public.work_item_sprints a
        join public.work_items w on w.id = a.work_item_id
       where a.retired_at is null
         and w.horizon = 'now' and w.status not in ('done', 'dropped');
    end if;
    insert into public.work_item_sprints
      (work_item_id, slot, span, sequence_position, overlap, placement, note)
    values (new.id, v_slot, 1, coalesce(v_seq, 0) + 1, 'overlappable', 'provisional',
      'Placed automatically when this item entered Now, at the end of its ' ||
      'workstream. Confirm or move it in the next mapping pass ' ||
      '(docs/SPRINT-DELIVERY.md Part C).');
  end if;
  return null;
end $$;

comment on function public.work_items_sprint_intake() is
  'Puts a work item on the Sprint Roadmap the moment it reaches Now under a workstream (a provisional allocation at the end of its stream) and retires its allocation when it leaves. Done keeps its allocation as the record of delivery.';

drop trigger if exists work_items_sprint_intake on public.work_items;
create trigger work_items_sprint_intake
  after insert or update of horizon, status, parent_id, level on public.work_items
  for each row execute function public.work_items_sprint_intake();

revoke execute on function public.work_items_sprint_intake() from public, anon, authenticated;

-- The board view carries placement, and stories_status so the page can
-- say how many sprint items have stories without fetching them. Appended
-- at the end with create or replace: v_sprint_plan_streams and
-- v_sprint_plan_load depend on this view, and appending is the change
-- Postgres allows without dropping them.
create or replace view public.v_sprint_plan_items with (security_invoker = on) as
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
    w.business_benefit, w.benefit_type, w.benefit_status,
    a.placement, w.stories_status
  from public.work_item_sprints a
  join public.work_items w on w.id = a.work_item_id
  left join public.work_items p on p.id = w.parent_id
  left join public.roadmap_categories rc on rc.id = w.category_id
  left join public.integrations i on i.id = a.external_party_id
  where a.retired_at is null
    and w.horizon = 'now'
    and w.status not in ('done', 'dropped');


-- Reconcile once, through the trigger itself rather than a second copy of
-- its rules. Both statements are no-ops on the data as it stands - every
-- live allocation sits on a Now item under a workstream, and every such
-- item has one - and they make that true by construction from here on.
update public.work_items w set horizon = w.horizon
 where exists (select 1 from public.work_item_sprints a
                where a.work_item_id = w.id and a.retired_at is null)
   and w.status <> 'done'
   and not (w.horizon = 'now' and w.status <> 'dropped' and w.level = 'item'
            and exists (select 1 from public.work_items p
                         where p.id = w.parent_id and p.level = 'workstream'));

update public.work_items w set horizon = w.horizon
 where w.horizon = 'now' and w.status not in ('done', 'dropped') and w.level = 'item'
   and exists (select 1 from public.work_items p
                where p.id = w.parent_id and p.level = 'workstream')
   and not exists (select 1 from public.work_item_sprints a
                    where a.work_item_id = w.id and a.retired_at is null);
