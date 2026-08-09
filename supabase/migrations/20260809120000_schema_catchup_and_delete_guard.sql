-- ------------------------------------------------------------------
-- Bring a fresh project to the state the live one is already in, and
-- close one long-standing hazard.
--
-- 1. assignee / support_assignee were applied live on 2026-07-27 but
--    declared in no schema file, while supabase/schema/31_roadmap_search
--    .sql SELECTED wi.assignee - so the schema directory could not be run
--    top-to-bottom against a fresh project. They are now declared in
--    30_work.sql; these statements are the idempotent catch-up and are a
--    no-op against the live project.
--
-- 2. work_items.parent_id was ON DELETE CASCADE in a table whose
--    governing rule is that nothing is ever deleted. 162 of 239 rows
--    carry a parent, so deleting one workstream would have removed every
--    child silently, with no undo. Every other foreign key on the table
--    already used SET NULL. This swaps it, and adds a before-delete
--    guard so an accidental delete fails loudly instead.
-- ------------------------------------------------------------------

alter table public.work_items
  add column if not exists assignee text,
  add column if not exists support_assignee text;

comment on column public.work_items.assignee is
  'Primary owner of the item. Free text so team changes do not require a migration.';
comment on column public.work_items.support_assignee is
  'Secondary owner where an item is shared, e.g. assignee=Tim, support_assignee=Red.';

create index if not exists work_items_assignee_idx
  on public.work_items (assignee)
  where assignee is not null;

-- Re-point parent_id at SET NULL. The constraint name is the Postgres
-- default from the original create table.
alter table public.work_items
  drop constraint if exists work_items_parent_id_fkey;
alter table public.work_items
  add constraint work_items_parent_id_fkey
  foreign key (parent_id) references public.work_items (id)
  on delete set null;

create or replace function public.work_item_delete_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('lpio.allow_work_item_delete', true), 'off') <> 'on' then
    raise exception using
      errcode = 'restrict_violation',
      message = format('work_items rows are closed, not deleted (id %s, "%s")',
        old.id, old.title),
      hint = 'Set status to done or dropped with a resolution. To delete anyway: '
        || 'set local lpio.allow_work_item_delete = ''on'';';
  end if;
  return old;
end;
$$;

drop trigger if exists work_items_delete_guard on public.work_items;
create trigger work_items_delete_guard
  before delete on public.work_items
  for each row execute function public.work_item_delete_guard();
