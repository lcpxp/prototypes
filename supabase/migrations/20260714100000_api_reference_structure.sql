-- Generic reference structure so any comprehensive API guide fits
-- the standard viewer without new code or schema per source:
--
--   api_tags     per-spec tag catalogue. Gives each endpoint group a
--                description and an explicit position, so a spec can
--                order its areas to mirror a runbook instead of
--                alphabetically. Tags not in the catalogue still
--                render (first-seen order, no description).
--
--   api_topics   ordered narrative sections for a spec (overview,
--                conventions, runbooks, accepted values, gap
--                registers...). Content is a jsonb array of typed
--                blocks the viewer renders generically:
--                  {"kind":"p","text"}
--                  {"kind":"note","tone":"info|ok|warn|danger","text"}
--                  {"kind":"code","text"} or {"kind":"code","json":{}}
--                  {"kind":"table","columns":[],"rows":[[]]}
--                  {"kind":"kv","items":[{"label","value"}]}
--                  {"kind":"values","name","field","values":[],"source"}
--                Unknown kinds are skipped, so blocks can be added
--                by migration later without breaking old viewers.
--
--   api_endpoints.badges  jsonb array of small flags shown on the
--                endpoint summary row: [{"label","tone"}] with the
--                same tones as note blocks. Carries source-specific
--                facts (environment observed, runbook step,
--                verification state) without dedicated columns.
--
--   api_endpoints.method  now also allows 'query' for read-only
--                operations addressed by name rather than path
--                (GraphQL operations, RPC-style calls).

create table if not exists public.api_tags (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.api_specs (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spec_id, name)
);

create index if not exists api_tags_spec_idx
  on public.api_tags (spec_id, sort_order);

drop trigger if exists api_tags_updated_at on public.api_tags;
create trigger api_tags_updated_at
  before update on public.api_tags
  for each row execute function public.set_updated_at();

create table if not exists public.api_topics (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.api_specs (id) on delete cascade,
  title text not null,
  intro text,
  blocks jsonb not null default '[]'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_topics_spec_idx
  on public.api_topics (spec_id, sort_order);

drop trigger if exists api_topics_updated_at on public.api_topics;
create trigger api_topics_updated_at
  before update on public.api_topics
  for each row execute function public.set_updated_at();

alter table public.api_endpoints
  add column if not exists badges jsonb not null default '[]'::jsonb;

alter table public.api_endpoints
  drop constraint if exists api_endpoints_method_check;
alter table public.api_endpoints
  add constraint api_endpoints_method_check
  check (method in ('get', 'post', 'put', 'patch', 'delete', 'query'));

-- RLS: same posture as the other reference tables - members with the
-- reference grant read, admins write.

alter table public.api_tags   enable row level security;
alter table public.api_topics enable row level security;

do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('api_tags',   '(select public.has_module_access(''reference''))'),
      ('api_topics', '(select public.has_module_access(''reference''))')
    ) as v(tbl, read_expr)
  loop
    execute format('drop policy if exists "%s: members read" on public.%I',
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
