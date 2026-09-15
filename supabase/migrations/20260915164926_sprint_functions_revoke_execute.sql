-- ------------------------------------------------------------------
-- Applied 2026-09-15. sprint_plan_project() is security definer and
-- writes to work_items, so it must never be reachable over the REST RPC
-- surface - the advisor flagged it as anon-callable the moment it was
-- created. Same treatment as the embedding functions: revoked from
-- public, anon AND authenticated. The statement trigger still fires; a
-- trigger runs as the table owner and needs no caller grant.
--
-- Declarative home: supabase/policies.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

revoke all on function public.sprint_plan_project() from public, anon, authenticated;
revoke all on function public.sprint_plan_project_trigger() from public, anon, authenticated;
revoke execute on function public.sprint_code_for_slot(integer) from public, anon;
