-- Restricted accounts (2026-11-17).
--
-- New accounts start restricted: Platform, Integrations and the API
-- reference only, applied by handle_new_user in the same statement as
-- the profile. A restricted account is allow-list based, so a module
-- added later stays hidden from it until an admin grants it.
-- The owner's working material on shared pages - draft API specs,
-- planned capabilities, integration notes and the header tools - reads
-- behind the 'internal' key, which restricted accounts do not have.
-- Admins are unaffected; accounts made before today are unaffected.
-- docs/SECURITY.md is the one home for the model.

create or replace function public.has_module_access(key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or (
    not exists (
      select 1 from public.module_access
      where user_id = (select auth.uid()) and module_key = key and not allowed
    )
    and (
      not exists (
        select 1 from public.module_access
        where user_id = (select auth.uid()) and module_key = '*' and not allowed
      )
      or exists (
        select 1 from public.module_access
        where user_id = (select auth.uid()) and module_key = key and allowed
      )
    )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  insert into public.module_access (user_id, module_key, allowed)
  values (new.id, '*', false),
         (new.id, 'platform', true),
         (new.id, 'integrations', true),
         (new.id, 'reference', true)
  on conflict (user_id, module_key) do nothing;
  return new;
end;
$$;

alter policy "api_specs: members read" on public.api_specs
  using ((select public.has_module_access('reference'))
         and (status is distinct from 'draft' or (select public.has_module_access('internal'))));
alter policy "api_endpoints: members read" on public.api_endpoints
  using ((select public.has_module_access('reference'))
         and exists (select 1 from public.api_specs s where s.id = api_endpoints.spec_id));
alter policy "api_tags: members read" on public.api_tags
  using ((select public.has_module_access('reference'))
         and exists (select 1 from public.api_specs s where s.id = api_tags.spec_id));
alter policy "api_topics: members read" on public.api_topics
  using ((select public.has_module_access('reference'))
         and exists (select 1 from public.api_specs s where s.id = api_topics.spec_id));
alter policy "product_capabilities: members read" on public.product_capabilities
  using ((select public.has_module_access('platform'))
         and (maturity is distinct from 'planned' or (select public.has_module_access('internal'))));
alter policy "integration_notes: members read" on public.integration_notes
  using ((select public.has_module_access('integrations')) and (select public.has_module_access('internal')));
alter policy "portal_links: members read" on public.portal_links
  using ((select public.has_module_access('internal')));
alter policy "work_areas: members read" on public.work_areas
  using ((select public.has_module_access('roadmap') or public.has_module_access('backlog') or public.has_module_access('platform')));
