-- ------------------------------------------------------------------
-- Applied 2026-09-07. Puts both integration views on security_invoker
-- and takes them off the anon grant. Without it a view runs as its
-- owner and hands the whole estate to the anon key regardless of the
-- policies on the base tables - the same correction roadmap_current
-- needed in July.
--
-- RECOVERED 2026-09-15 from the live database; see the note in
-- 20260907193920_integration_estate_capabilities_and_notes.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

alter view public.v_integration_estate set (security_invoker = on);
alter view public.v_integration_swap_map set (security_invoker = on);

revoke all on public.v_integration_estate from public, anon;
revoke all on public.v_integration_swap_map from public, anon;
grant select on public.v_integration_estate to authenticated;
grant select on public.v_integration_swap_map to authenticated;
