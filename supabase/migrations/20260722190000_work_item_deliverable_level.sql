-- Deliverables: a third presentation level for work_items. A deliverable
-- is drawer-only detail under a workstream or a work item - it never
-- renders as a bar on the roadmap. Children of a work item are always
-- treated as deliverables by position; children of a workstream are
-- work-item bars unless marked level='deliverable'. Owner-confirmed
-- model (see docs/ROADMAP-PLAYBOOK.md).

alter table public.work_items drop constraint if exists work_items_level_check;
alter table public.work_items add constraint work_items_level_check
  check (level in ('workstream', 'item', 'deliverable'));

-- Owner-confirmed triage of the existing 50 workstream children: the
-- step-grade rows typed task/improvement become deliverables; feature/
-- functionality/untyped children stay work items pending the owner's
-- row-by-row audit.
update public.work_items set level = 'deliverable'
where parent_id in (select id from public.work_items where level = 'workstream')
  and type in ('task', 'improvement');

insert into public.work_notes (kind, body)
values ('decision',
  'Roadmap model: added level=deliverable (drawer-only detail under a workstream or item, never a bar). Children of items are deliverables by position; children of workstreams are work-item bars unless marked deliverable. Auto-triaged task/improvement children to deliverables; remaining children stay work items pending the owner audit.');
