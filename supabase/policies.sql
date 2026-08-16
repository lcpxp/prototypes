-- ------------------------------------------------------------------
-- policies.sql - Row Level Security. Run AFTER the files in
-- supabase/schema/ (lexical order).
--
-- This file is the security boundary of the whole portal. The anon
-- key in the browser is only safe because these policies exist:
--
--   * Unauthenticated visitors can read and write NOTHING.
--   * Signed-in users can read content tables their module grants
--     allow, plus the user list.
--   * Only admins (profiles.role = 'admin') can write.
--
-- If a table is ever added without enabling RLS and adding policies,
-- its contents are exposed to anyone with the anon key. Treat any
-- new table as public until this file covers it.
--
-- THIS FILE IS AUTHORITATIVE. Every policy in the project is declared
-- here, so "which tables can be written, and by whom" stays a
-- single-file question. A migration that needs a policy applies the
-- same statement and cites the block here that it mirrors - it does
-- not become that policy's home. Both halves of that claim used to be
-- asserted and neither was checked; since 2026-08-09
-- tests/checks/schema-drift.test.js compares every policy live on the
-- database against this file and fails on anything missing.
--
-- Performance rules baked into every policy here (enforced by
-- tests/checks/perf.test.js):
--   * auth.uid() and the helper functions are always wrapped in a
--     scalar subselect - (select auth.uid()) - so Postgres evaluates
--     them once per query, not once per row.
--   * No "for all" policies. Admin writes are separate insert/update/
--     delete policies so a select only ever evaluates one permissive
--     policy. Reads already admit admins via has_module_access.
-- ------------------------------------------------------------------

-- Admin check. SECURITY DEFINER so the lookup on profiles does not
-- recurse through profiles' own RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Module grant check used by content-table policies. Absence of a
-- module_access row means allowed; admins always pass. SECURITY
-- DEFINER so the lookup does not recurse through RLS.
create or replace function public.has_module_access(key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or not exists (
    select 1 from public.module_access
    where user_id = (select auth.uid()) and module_key = key and not allowed
  );
$$;

revoke execute on function public.has_module_access(text) from public, anon;
grant execute on function public.has_module_access(text) to authenticated;

-- The caller's own role. SECURITY DEFINER because policies on
-- profiles cannot subselect profiles - that recurses through the
-- table's own RLS.
create or replace function public.own_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke execute on function public.own_role() from public, anon;
grant execute on function public.own_role() to authenticated;

-- Internal functions must not be callable as API RPCs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Content tables. All follow one pattern, applied by the loop below:
-- a single read policy gated on the owning module's grant, and
-- admin-only insert/update/delete policies.
-- ---------------------------------------------------------------

alter table public.api_specs               enable row level security;
alter table public.api_endpoints           enable row level security;
alter table public.api_tags                enable row level security;
alter table public.api_topics              enable row level security;
alter table public.integrations            enable row level security;
alter table public.portal_links            enable row level security;
alter table public.prototypes              enable row level security;
alter table public.future_prototypes       enable row level security;
alter table public.work_areas              enable row level security;
alter table public.roadmap_categories      enable row level security;
alter table public.roadmap_milestones      enable row level security;
alter table public.work_documents          enable row level security;
alter table public.work_items              enable row level security;
alter table public.work_item_phases        enable row level security;
alter table public.knowledge_links         enable row level security;
alter table public.link_kinds              enable row level security;
alter table public.link_entity_types       enable row level security;
alter table public.work_notes              enable row level security;
alter table public.product_capabilities    enable row level security;
alter table public.domain_terms            enable row level security;
alter table public.journey_stages          enable row level security;
alter table public.work_item_embeddings    enable row level security;

do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('api_specs',            '(select public.has_module_access(''reference''))'),
      ('api_endpoints',        '(select public.has_module_access(''reference''))'),
      ('api_tags',             '(select public.has_module_access(''reference''))'),
      ('api_topics',           '(select public.has_module_access(''reference''))'),
      ('integrations',         '(select public.has_module_access(''integrations''))'),
      -- portal_links is the one content table with no owning module:
      -- it drives icon buttons in the top nav, which every signed-in
      -- user sees on every page, so there is no grant to gate the read
      -- on. Writes stay admin-only like everything else here.
      ('portal_links',         'true'),
      ('prototypes',           '(select public.has_module_access(''prototypes''))'),
      ('future_prototypes',    '(select public.has_module_access(''prototypes''))'),
      -- work_areas and work_items are shared: readable behind either
      -- the roadmap or the backlog grant, since both modules read them
      -- (the roadmap board and the backlog table are two views of the
      -- same work_items rows).
      ('work_areas',             '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('roadmap_categories',     '(select public.has_module_access(''roadmap''))'),
      ('roadmap_milestones',     '(select public.has_module_access(''roadmap''))'),
      ('work_documents',         '(select public.has_module_access(''backlog''))'),
      ('work_items',             '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('work_item_phases',       '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      -- The knowledge graph reads behind the same grant as the rows it
      -- links: a link is only meaningful to someone who can see both
      -- ends, and work_items already gates on roadmap OR backlog.
      ('knowledge_links',        '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('link_kinds',             '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('link_entity_types',      '(select public.has_module_access(''roadmap'') or public.has_module_access(''backlog''))'),
      ('work_notes',             '(select public.has_module_access(''backlog''))'),
      ('product_capabilities', '(select public.has_module_access(''platform''))'),
      ('domain_terms',         '(select public.has_module_access(''platform''))'),
      ('journey_stages',       '(select public.has_module_access(''platform''))')
    ) as v(tbl, read_expr)
  loop
    execute format('drop policy if exists "%s: members read" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins write" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins insert" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins update" on public.%I',
      entry.tbl, entry.tbl);
    execute format('drop policy if exists "%s: admins delete" on public.%I',
      entry.tbl, entry.tbl);
    execute format('create policy "%s: members read" on public.%I
      for select to authenticated using (%s)',
      entry.tbl, entry.tbl, entry.read_expr);
    execute format('create policy "%s: admins insert" on public.%I
      for insert to authenticated with check ((select public.is_admin()))',
      entry.tbl, entry.tbl);
    execute format('create policy "%s: admins update" on public.%I
      for update to authenticated using ((select public.is_admin()))
      with check ((select public.is_admin()))',
      entry.tbl, entry.tbl);
    execute format('create policy "%s: admins delete" on public.%I
      for delete to authenticated using ((select public.is_admin()))',
      entry.tbl, entry.tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- profiles: everyone reads their own row; the user list needs the
-- users module grant. Users may edit their own row but never their
-- own role; admins may change anything.
-- ---------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles: members read all" on public.profiles;
drop policy if exists "profiles: members read" on public.profiles;
drop policy if exists "profiles: users update own name" on public.profiles;
drop policy if exists "profiles: admins manage" on public.profiles;
drop policy if exists "profiles: update own or admin" on public.profiles;
drop policy if exists "profiles: admins insert" on public.profiles;
drop policy if exists "profiles: admins delete" on public.profiles;

create policy "profiles: members read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.has_module_access('users')));

create policy "profiles: update own or admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (
    (select public.is_admin())
    or (id = (select auth.uid()) and role = (select public.own_role()))
  );

create policy "profiles: admins insert"
  on public.profiles for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "profiles: admins delete"
  on public.profiles for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------
-- module_access: users see their own grants; only admins write.
-- ---------------------------------------------------------------

alter table public.module_access enable row level security;

drop policy if exists "module_access: users read own" on public.module_access;
drop policy if exists "module_access: admins manage" on public.module_access;
drop policy if exists "module_access: admins insert" on public.module_access;
drop policy if exists "module_access: admins update" on public.module_access;
drop policy if exists "module_access: admins delete" on public.module_access;

create policy "module_access: users read own"
  on public.module_access for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "module_access: admins insert"
  on public.module_access for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "module_access: admins update"
  on public.module_access for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "module_access: admins delete"
  on public.module_access for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------
-- Application review (schema/50_review.sql). READ ONLY, deliberately.
--
-- These tables are NOT in the content-table loop above, because that
-- loop grants admins insert/update/delete and this feature must not
-- expose a write path to the browser at all. Every write happens in a
-- Claude Code session over the service connection, which bypasses RLS;
-- the portal only ever displays what that session wrote.
--
-- The consequence to keep in mind when changing this: adding a write
-- policy here does not just enable an edit, it moves the boundary of
-- the feature. Do not add one without the owner asking for it.
--
-- Contents are commercially sensitive (merchant and partner names,
-- application ids, risk levels, mail-trail summaries), so reads are
-- gated on the app-review module grant and anon gets nothing.
-- ---------------------------------------------------------------

alter table public.launchpad_statuses    enable row level security;
alter table public.triage_categories     enable row level security;
alter table public.review_waves          enable row level security;
alter table public.review_applications   enable row level security;
alter table public.review_evidence       enable row level security;
alter table public.review_revisions      enable row level security;

-- Written out one by one rather than through the loop above: this is
-- the security boundary, and a reader (or a grep, or tests/checks/
-- security.test.js) must be able to see every policy that exists on
-- every table without executing anything to find out.

drop policy if exists "launchpad_statuses: members read" on public.launchpad_statuses;
drop policy if exists "triage_categories: members read" on public.triage_categories;
drop policy if exists "review_waves: members read" on public.review_waves;
drop policy if exists "review_applications: members read" on public.review_applications;
drop policy if exists "review_evidence: members read" on public.review_evidence;
drop policy if exists "review_revisions: members read" on public.review_revisions;

create policy "launchpad_statuses: members read"
  on public.launchpad_statuses for select
  to authenticated
  using ((select public.has_module_access('app-review')));

create policy "triage_categories: members read"
  on public.triage_categories for select
  to authenticated
  using ((select public.has_module_access('app-review')));

-- review_waves is SHARED between the two review features: a wave
-- carries a `kind` (application, portal, code). So the read is either
-- grant, and the pages filter by kind. Gating it on app-review alone
-- would hide a portal reviewer's own waves from them.
create policy "review_waves: members read"
  on public.review_waves for select
  to authenticated
  using ((select public.has_module_access('app-review'))
      or (select public.has_module_access('portal-review')));

create policy "review_applications: members read"
  on public.review_applications for select
  to authenticated
  using ((select public.has_module_access('app-review')));

create policy "review_evidence: members read"
  on public.review_evidence for select
  to authenticated
  using ((select public.has_module_access('app-review')));

create policy "review_revisions: members read"
  on public.review_revisions for select
  to authenticated
  using ((select public.has_module_access('app-review')));

-- ---------------------------------------------------------------
-- Portal review (schema/52_portal_review.sql). READ ONLY, for exactly
-- the same reasons as application review above: every write happens in
-- a Claude session over the service connection, and adding a write
-- policy here would move the boundary of the feature rather than just
-- enabling an edit.
--
-- Findings name internal defects, environments and developer
-- conversations, and carry a `visibility` of 'internal' for the ones
-- that never leave the review - so reads are gated on the
-- portal-review module grant and anon gets nothing.
--
-- review_waves is shared and its policy is above.
-- ---------------------------------------------------------------

alter table public.review_areas             enable row level security;
alter table public.review_area_passes       enable row level security;
alter table public.review_findings          enable row level security;
alter table public.review_finding_revisions enable row level security;

drop policy if exists "review_areas: members read" on public.review_areas;
drop policy if exists "review_area_passes: members read" on public.review_area_passes;
drop policy if exists "review_findings: members read" on public.review_findings;
drop policy if exists "review_finding_revisions: members read" on public.review_finding_revisions;

create policy "review_areas: members read"
  on public.review_areas for select
  to authenticated
  using ((select public.has_module_access('portal-review')));

create policy "review_area_passes: members read"
  on public.review_area_passes for select
  to authenticated
  using ((select public.has_module_access('portal-review')));

create policy "review_findings: members read"
  on public.review_findings for select
  to authenticated
  using ((select public.has_module_access('portal-review')));

create policy "review_finding_revisions: members read"
  on public.review_finding_revisions for select
  to authenticated
  using ((select public.has_module_access('portal-review')));

-- ---------------------------------------------------------------
-- The dashboard read RPCs (defined in schema/90_dashboard.sql):
-- callable by signed-in users only, never by anon. Both are SECURITY
-- INVOKER, so every figure they return is already filtered by the
-- policies above to what the caller may read.
--
-- dashboard_counts() is superseded by dashboard_summary() and stays
-- only until nothing calls it.
-- ---------------------------------------------------------------

revoke execute on function public.dashboard_counts() from public, anon;
grant execute on function public.dashboard_counts() to authenticated;

revoke execute on function public.dashboard_summary() from public, anon;
grant execute on function public.dashboard_summary() to authenticated;

-- ---------------------------------------------------------------
-- Roadmap search surface (schema/31_roadmap_search.sql).
--
-- roadmap_searchable is a security_invoker view over work_items, so it
-- carries no policies of its own: every read is filtered by the
-- "work_items: members read" policy above, exactly as roadmap_current is.
-- It exposes summary, details and resolution, which the board does not
-- need, so it is granted to authenticated only - never to anon.
--
-- roadmap_find() is a plain (invoker-rights) SQL function reading only
-- that view and work_item_embeddings, so it inherits the same RLS.
-- Signed-in users only. Its grant is below, with the semantic channel,
-- because its signature belongs to that change.
-- ---------------------------------------------------------------

revoke all on public.roadmap_searchable from public, anon;
grant select on public.roadmap_searchable to authenticated;

-- ---------------------------------------------------------------
-- Roadmap board surface (schema/32_roadmap_board.sql).
--
-- work_items_board is work_items without details - the row the roadmap
-- board and the backlog list actually read (docs/plan/80-LOAD-SPEED.md).
--
-- A VIEW IS NOT COVERED BY ITS BASE TABLE'S POLICIES. What makes this
-- one inherit them is `with (security_invoker = on)` in its definition:
-- the view executes as the caller, so every read is filtered by the
-- "work_items: members read" policy above. Without that option the view
-- would run as its owner, which bypasses RLS entirely and would publish
-- all 268 rows to anyone holding the anon key. Never create a view over
-- a policy-protected table without it.
--
-- The grant is the second layer and holds on its own: anon has no
-- select on this view at all, so an unauthenticated request is refused
-- before RLS is consulted. Same treatment as roadmap_searchable.
--
-- roadmap_current is granted to anon as well and stays that way: it is
-- the read entry point for an operating session and exposes no prose.
-- ---------------------------------------------------------------

revoke all on public.work_items_board from public, anon;
grant select on public.work_items_board to authenticated;

-- ---------------------------------------------------------------
-- Semantic search (schema/34_embeddings.sql).
--
-- work_item_embeddings reads behind the same grant as the rows it
-- describes: an embedding is only meaningful to someone who can see the
-- item. Written out rather than generated by the loop above, whose read
-- expressions key on the table's own name. work_items_unembedded is a
-- security_invoker view, so the work_items policy already filters it.
--
-- embed_texts, roadmap_embed_refresh and roadmap_embed_query are
-- executable by NOBODY: not anon, not authenticated, not public. They
-- make outbound HTTP calls and block a backend while they wait - fine
-- for an operator backfill, unacceptable on a request path. Revoking
-- rather than gating is what keeps them off PostgREST entirely: there
-- is no /rpc/ route to a function no role can execute. The anon JWT
-- they use is in Vault under `edge_anon_key`, so no SQL file carries a
-- second copy of it.
-- ---------------------------------------------------------------

drop policy if exists "work_item_embeddings: members read" on public.work_item_embeddings;
create policy "work_item_embeddings: members read"
  on public.work_item_embeddings for select
  to authenticated
  using ((select public.has_module_access('roadmap'))
      or (select public.has_module_access('backlog')));

drop policy if exists "work_item_embeddings: admins insert" on public.work_item_embeddings;
create policy "work_item_embeddings: admins insert"
  on public.work_item_embeddings for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "work_item_embeddings: admins update" on public.work_item_embeddings;
create policy "work_item_embeddings: admins update"
  on public.work_item_embeddings for update
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "work_item_embeddings: admins delete" on public.work_item_embeddings;
create policy "work_item_embeddings: admins delete"
  on public.work_item_embeddings for delete
  to authenticated
  using ((select public.is_admin()));

revoke all on public.work_item_embeddings from public, anon;
grant select on public.work_item_embeddings to authenticated;
grant insert, update, delete on public.work_item_embeddings to authenticated;

revoke all on public.work_items_unembedded from public, anon;
grant select on public.work_items_unembedded to authenticated;

revoke all on function public.embed_texts(text[], int) from public, anon, authenticated;
revoke all on function public.roadmap_embed_refresh(int, int) from public, anon, authenticated;
revoke all on function public.roadmap_embed_query(text) from public, anon, authenticated;

revoke execute on function public.roadmap_find(text, int, numeric, uuid, extensions.vector) from public, anon;
grant execute on function public.roadmap_find(text, int, numeric, uuid, extensions.vector) to authenticated;

-- ---------------------------------------------------------------
-- After running this file, promote your own account to admin:
--
--   update public.profiles set role = 'admin'
--   where email = 'you@example.com';
-- ---------------------------------------------------------------
