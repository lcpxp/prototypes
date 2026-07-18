-- ------------------------------------------------------------------
-- 20260718120000_work_item_parent.sql
--
-- Add an optional parent_id to work_items so a coarse item can break
-- into ordered sub-steps that are themselves first-class work items
-- (e.g. "Unity integration" -> Merchant Group, Merchant, Site,
-- Products, Services, Pricing, Settlement). A child carries its own
-- status/progress, so "done apart from pricing and settlement" reads
-- straight off the data; the roadmap nests children under their parent
-- rather than placing them as their own bars.
--
-- Self-referential; deleting a parent removes its steps (on delete
-- cascade). One level of nesting by convention (the views nest
-- parent -> children only); a CHECK blocks self-parenting. Same table,
-- so the existing work_items RLS policies cover the new column; no
-- policy change is needed. Idempotent.
-- ------------------------------------------------------------------

alter table public.work_items
  add column if not exists parent_id uuid;

alter table public.work_items
  drop constraint if exists work_items_parent_id_fkey;
alter table public.work_items
  add constraint work_items_parent_id_fkey
  foreign key (parent_id) references public.work_items (id) on delete cascade;

alter table public.work_items
  drop constraint if exists work_items_parent_not_self;
alter table public.work_items
  add constraint work_items_parent_not_self
  check (parent_id is null or parent_id <> id);

create index if not exists work_items_parent_idx
  on public.work_items (parent_id, sort_order);
