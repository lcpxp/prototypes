-- ------------------------------------------------------------------
-- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations.
-- Applied to the live project on 2026-07-22 through the MCP, but its
-- file was never committed, so supabase/schema/ described a database
-- the repo could not rebuild. Body verbatim as applied.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

-- The earlier create-or-replace of roadmap_current dropped the
-- security_invoker option. Restore it so the view exposes exactly what
-- the caller's RLS allows on the base tables (no definer-privilege
-- surface). See supabase/schema/30_work.sql.
alter view public.roadmap_current set (security_invoker = on);
