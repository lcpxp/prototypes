-- The profiles update policy compared role against a subselect on
-- profiles itself, which re-enters the table's own RLS policies and
-- recurses. Read the caller's current role through a SECURITY
-- DEFINER helper instead, mirroring is_admin().

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

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (
    (select public.is_admin())
    or (id = (select auth.uid()) and role = (select public.own_role()))
  );
