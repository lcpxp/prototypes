-- ------------------------------------------------------------------
-- Applied 2026-09-07. Separates the three axes product_capabilities.kind
-- was carrying at once, replaces the verified boolean with a three-state
-- attestation, adds the as_of freshness date, opens work_areas.scope to
-- 'build', widens knowledge_links.confidence with 'derived', and
-- registers the endpoint and spec link entity types.
--
-- Rationale beside each column in supabase/schema/40_platform.sql and
-- supabase/schema/33_links.sql; protocol in docs/PLATFORM.md.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

-- 1. domain: what a row is ABOUT, as opposed to what shape of
--    statement it is. Backfilled from kind, which is where the two
--    axes were tangled: technical and styling rows describe how the
--    Partner Portal is built, not what the product does.
alter table public.product_capabilities
  add column if not exists domain text not null default 'product';
alter table public.product_capabilities
  drop constraint if exists product_capabilities_domain_check;
update public.product_capabilities
   set domain = 'build'
 where kind in ('technical', 'styling');
alter table public.product_capabilities
  add constraint product_capabilities_domain_check
  check (domain in ('product', 'build'));

create index if not exists product_capabilities_domain_idx
  on public.product_capabilities (domain, sort_order);

-- 2. attestation: WHO says so. A boolean could only say yes or no, so
--    an owner's judgement and a claim nobody had examined were the
--    same value. Three states tell them apart, and 'owner' is the one
--    an assistant may never set.
alter table public.product_capabilities
  add column if not exists attestation text not null default 'unattested';
alter table public.product_capabilities
  drop constraint if exists product_capabilities_attestation_check;
update public.product_capabilities
   set attestation = case when verified then 'owner' else 'unattested' end;
alter table public.product_capabilities
  add constraint product_capabilities_attestation_check
  check (attestation in ('owner', 'derived', 'unattested'));

-- 3. verified becomes a projection of attestation rather than a second
--    place the same fact is stored. Dropping it outright would break
--    the deployed page mid-change; keeping it writable would leave two
--    mechanisms for one job, which is the ambiguity CLAUDE.md exists to
--    prevent. A generated column is neither: one source of truth, with
--    the old name still readable. Drop it once nothing reads it.
alter table public.product_capabilities drop column if exists verified;
alter table public.product_capabilities
  add column verified boolean
  generated always as (attestation = 'owner') stored;

-- 4. as_of: when the claim was last checked against reality. Distinct
--    from updated_at, which cannot tell a typo fix from a re-check.
--    Seeded from updated_at so the staleness figure starts honest
--    rather than empty.
alter table public.product_capabilities
  add column if not exists as_of date;
update public.product_capabilities
   set as_of = updated_at::date
 where as_of is null;

-- 5. work_areas gains the 'build' scope: a filing axis for capabilities
--    about how the product is built, so the product area 'Front end'
--    stops being the junk drawer 25 of 46 rows had been forced into.
alter table public.work_areas
  drop constraint if exists work_areas_scope_check;
alter table public.work_areas
  add constraint work_areas_scope_check
  check (scope in ('product', 'portal', 'build'));

-- 6. knowledge_links.confidence gains 'derived', the same vocabulary as
--    attestation: a link whose two ends are named in one row the owner
--    already owns restates a fact rather than proposing one, and
--    conflating the two is what made the proposed queue unreadable.
alter table public.knowledge_links
  drop constraint if exists knowledge_links_confidence_check;
alter table public.knowledge_links
  add constraint knowledge_links_confidence_check
  check (confidence in ('proposed', 'derived', 'confirmed'));

-- 7. The two missing entity types. Specified in
--    docs/plan/30-KNOWLEDGE.md and never applied; without them the
--    reference - 572 endpoints across 3 specs - could not be an end of
--    any link, so no capability could name what serves it.
insert into public.link_entity_types (key, table_name, label, sort_order) values
  ('endpoint', 'api_endpoints', 'API endpoint', 80),
  ('spec',     'api_specs',     'API spec',     85)
on conflict (key) do nothing;
