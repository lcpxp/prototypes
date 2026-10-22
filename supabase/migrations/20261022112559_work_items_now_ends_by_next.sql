-- A Now row ends by Next at the latest (the owner's rule, 22 Oct 2026).
-- Now is the sprint conveyor belt and Next a theoretical distance, so a
-- Now row reaching Later or Someday claims a span nobody can plan
-- against. Refused at the database so every surface that writes the
-- roadmap meets the rule, not only the board. docs/ROADMAP.md, "Run-on
-- into Next".
alter table public.work_items
  drop constraint if exists work_items_now_ends_by_next;
alter table public.work_items
  add constraint work_items_now_ends_by_next
  check (horizon <> 'now' or end_horizon is null or end_horizon in ('now', 'next'));

comment on constraint work_items_now_ends_by_next on public.work_items is
  'A row starting in Now ends in Now or Next, never Later or Someday. Set end_horizon to next (or null) instead. docs/ROADMAP.md, Run-on into Next.';
