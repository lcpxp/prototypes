-- Restricted accounts: explicit denials as well (2026-11-17).
-- The '*' row already restricts a new account. The explicit denials
-- repeat it for page code built before 2026-11-17, which reads denials
-- only and would otherwise list the other modules in the nav.
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
