-- ---------------------------------------------------------------
-- A spec can be 'planned' (17 Nov 2026).
--
-- 'draft' stays the owner's working material, behind 'internal'.
-- 'planned' is an agreed design that is being built: it reads behind
-- the API reference grant like a live spec, so the developer building
-- it can read it. The read policy needs no change: it already admits
-- every status except 'draft'.
-- ---------------------------------------------------------------

alter table public.api_specs drop constraint if exists api_specs_status_check;
alter table public.api_specs add constraint api_specs_status_check
  check (status in ('draft', 'planned', 'live', 'deprecated'));
