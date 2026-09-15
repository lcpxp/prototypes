-- ------------------------------------------------------------------
-- Applied 2026-09-15. Corrects the policy set two migrations earlier.
--
-- sprint_plan was admin-read-only, to keep the capacity constant off the
-- surface. That was the wrong mechanism: the sprint views are
-- security_invoker and resolve every sprint code through this table, so
-- an admin-only policy made start_code and end_code null for ordinary
-- roadmap members - the plan would have read as unanchored for everyone
-- but an admin, silently.
--
-- The rule is that capacity is never RENDERED, not that it is
-- unreadable, and the front end is where that is enforced.
--
-- Declarative home: supabase/policies.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

drop policy if exists "sprint_plan: members read" on public.sprint_plan;
create policy "sprint_plan: members read" on public.sprint_plan
  for select to authenticated
  using ((select public.has_module_access('roadmap')));
