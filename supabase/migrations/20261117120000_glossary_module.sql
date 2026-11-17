-- ---------------------------------------------------------------
-- Glossary module (17 Nov 2026).
--
-- The terms get their own page, modules/glossary/, behind the
-- 'glossary' grant. domain_terms reads behind platform OR glossary, so
-- the platform page keeps its link titles and an account given only
-- the glossary can still read it. New restricted accounts start with
-- the glossary alongside Platform, Integrations and the API reference.
-- ---------------------------------------------------------------

alter policy "domain_terms: members read" on public.domain_terms
  using ((select public.has_module_access('platform') or public.has_module_access('glossary')));

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
  -- Every new account starts restricted: it sees Platform, the Glossary,
  -- Integrations and the API reference and nothing else until an admin
  -- grants more on the Users page. Written in the same statement as the
  -- profile, so there is no moment when a new account can read
  -- everything. has_module_access() in policies.sql reads these rows.
  -- The explicit denials repeat what the '*' row already says, for
  -- page code built before 2026-11-17, which reads denials only and
  -- would otherwise list those modules in the nav (the data stays
  -- hidden either way).
  insert into public.module_access (user_id, module_key, allowed)
  values (new.id, '*', false),
         (new.id, 'platform', true),
         (new.id, 'glossary', true),
         (new.id, 'integrations', true),
         (new.id, 'reference', true),
         (new.id, 'roadmap', false),
         (new.id, 'sprints', false),
         (new.id, 'backlog', false),
         (new.id, 'app-review', false),
         (new.id, 'portal-review', false),
         (new.id, 'prototypes', false),
         (new.id, 'users', false)
  on conflict (user_id, module_key) do nothing;
  return new;
end;
$$;
