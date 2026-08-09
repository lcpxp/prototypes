-- ------------------------------------------------------------------
-- Applied 2026-08-09. Widens product_capabilities.kind with technical,
-- styling and positioning. Rationale beside the constraint in
-- supabase/schema/40_platform.sql; ingestion guidance in
-- docs/PLATFORM.md.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

alter table public.product_capabilities
  drop constraint if exists product_capabilities_kind_check;
alter table public.product_capabilities
  add constraint product_capabilities_kind_check
  check (kind in ('overview', 'value', 'capability', 'glance',
                  'technical', 'styling', 'positioning'));
