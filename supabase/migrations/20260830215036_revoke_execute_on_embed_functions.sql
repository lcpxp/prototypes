-- ------------------------------------------------------------------
-- revoke_execute_on_embed_functions
--
-- supabase/policies.sql has always CLAIMED that embed_texts,
-- roadmap_embed_refresh and roadmap_embed_query are "executable by
-- NOBODY: not anon, not authenticated, not public" - they make outbound
-- HTTP calls and block a backend while they wait, so they must never
-- reach a request path via PostgREST.
--
-- The live database matched that claim. The repo did not: the paragraph
-- was the only record, with no REVOKE behind it, so a rebuild from
-- supabase/schema/ + policies.sql would have published all three on
-- /rest/v1/rpc/. Postgres grants EXECUTE to PUBLIC by default.
--
-- Applying this was a no-op against the live database, which already had
-- them revoked. It exists so the repo can rebuild what it describes, and
-- tests/checks/security.test.js now fails if any SECURITY DEFINER
-- function is left unrevoked.
-- ------------------------------------------------------------------

revoke execute on function public.embed_texts(text[], integer) from public, anon, authenticated;
revoke execute on function public.roadmap_embed_refresh(integer, integer) from public, anon, authenticated;
revoke execute on function public.roadmap_embed_query(text) from public, anon, authenticated;
