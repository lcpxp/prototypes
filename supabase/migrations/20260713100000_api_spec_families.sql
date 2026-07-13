-- Group api_specs rows into distinct reference sites. Keys mirror
-- App.registry.specFamilies in assets/js/core/registry.js:
--   launchpad    Launchpad API (inbound flows, Unity-initiated actions)
--   unity        Unity Merchant Portal API (Launchpad-to-Unity integration)
--   integration  third-party and outbound integration surfaces
--   other        uncategorised (default)

alter table public.api_specs
  add column if not exists family text not null default 'other'
  check (family in ('launchpad', 'unity', 'integration', 'other'));
