-- ------------------------------------------------------------------
-- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations.
-- Applied to the live project on 2026-07-27 through the MCP, but its
-- file was never committed. This is the migration that put assignee and
-- support_assignee on work_items - two columns that supabase/schema/
-- then SELECTED (31_roadmap_search.sql) without ever declaring, so the
-- schema files could not be run top-to-bottom against a fresh project.
-- Body verbatim as applied.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

-- First-class ownership on work_items.
-- Nullable text columns: metadata-only change in Postgres, no table rewrite, no lock of consequence.
alter table public.work_items
  add column if not exists assignee text,
  add column if not exists support_assignee text;

comment on column public.work_items.assignee is
  'Primary owner of the item. Free text so team changes do not require a migration.';
comment on column public.work_items.support_assignee is
  'Secondary owner where an item is shared, e.g. assignee=Tim, support_assignee=Red.';

-- Backfill from the attributes jsonb written earlier.
update public.work_items
set assignee          = attributes->>'assignee',
    support_assignee  = attributes->>'support'
where attributes ? 'assignee';

-- Retire the duplicated jsonb keys so there is a single source of truth.
-- priority_band and assignee_rank stay: they are ordering metadata, not ownership.
update public.work_items
set attributes = attributes - 'assignee' - 'support'
where attributes ?| array['assignee','support'];

-- Filtering by owner is now the common read path.
create index if not exists work_items_assignee_idx
  on public.work_items (assignee)
  where assignee is not null;
