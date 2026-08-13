-- ------------------------------------------------------------------
-- Portal review (docs/plan/60-PORTAL-REVIEW.md). A sibling of
-- application review, sharing review_waves.
-- ------------------------------------------------------------------

-- A wave now says which review it belongs to. The table is shared:
-- opening, carrying forward and closing are the same operations
-- whichever sort it is.
alter table public.review_waves
  add column if not exists kind text not null default 'application';

alter table public.review_waves
  drop constraint if exists review_waves_kind_check;
alter table public.review_waves
  add constraint review_waves_kind_check
  check (kind in ('application', 'portal', 'code'));

-- ---------------------------------------------------------------
-- review_areas: the durable map of the thing being reviewed, NOT a
-- per-wave list. Walking a stable map in order is what stopped the
-- original review becoming a list of whatever was most annoying that
-- day, and the map outlived every wave that used it.
--
-- `code` is the human handle ("01", "A3") and is what a session and
-- the owner say out loud. `note` carries an area-level caveat - the
-- original board needed one to record that areas 01 and 02 were the
-- same screen, merged so nothing was recorded twice.
--
-- retired_at closes an area that no longer exists without deleting
-- the findings raised against it.
-- ---------------------------------------------------------------

create table if not exists public.review_areas (
  id uuid primary key default gen_random_uuid(),
  part text not null,
  code text not null unique,
  title text not null,
  note text,
  sort_order integer not null default 100,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists review_areas_updated_at on public.review_areas;
create trigger review_areas_updated_at
  before update on public.review_areas
  for each row execute function public.set_updated_at();

create index if not exists review_areas_live_idx
  on public.review_areas (sort_order) where retired_at is null;

-- ---------------------------------------------------------------
-- review_area_passes: coverage, one row per area walked per wave.
-- This is what the rail's dots and every "N of M walked" figure derive
-- from; none of those numbers is stored.
--
-- A wave is a LENS, not a repeat: a later wave walks the areas that
-- lens applies to, and nothing already raised is re-asked. So a sparse
-- pass list is normal and is not a coverage failure.
-- ---------------------------------------------------------------

create table if not exists public.review_area_passes (
  wave_id uuid not null references public.review_waves (id) on delete cascade,
  area_id uuid not null references public.review_areas (id) on delete cascade,
  walked_at timestamptz not null default now(),
  walked_by text,
  primary key (wave_id, area_id)
);

create index if not exists review_area_passes_area_idx
  on public.review_area_passes (area_id, walked_at desc);

-- ---------------------------------------------------------------
-- review_findings: the entry. One thing seen in one area.
--
-- `kind` includes 'works' on purpose: a review that records only
-- faults reads as a worse system than it is, and recording what worked
-- was one of the more valuable habits of the original board.
--
-- `emphasis` is how loud, not how bad - 'lead' is the headline for its
-- area, 'blocker' stops a release. `visibility` decides who sees it:
-- 'roadmap_only' is kept out of the developer conversation and
-- 'internal' never leaves the review.
--
-- `environment` exists because real time was lost to environment
-- behaviour read as defects. A finding that turns out to be
-- configuration records WHERE, and is never deleted.
--
-- `raised_count` carries the re-raise signal across waves: a re-raise
-- is a deliberate statement that the item still matters.
--
-- `blocks` is the typed-block bag the shared renderer already draws
-- (assets/js/core/blocks.js), so a finding can carry a table, a values
-- list or a code snippet without a schema change.
-- ---------------------------------------------------------------

create table if not exists public.review_findings (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references public.review_waves (id) on delete cascade,
  area_id uuid references public.review_areas (id) on delete set null,
  ref text,
  title text not null,
  body text,
  kind text not null default 'issue'
    check (kind in ('issue', 'question', 'works', 'note')),
  -- Where it stands with the developers.
  state text not null default 'open'
    check (state in ('open', 'answered', 'verified', 'closed')),
  emphasis text
    check (emphasis in ('lead', 'bug', 'blocker')),
  visibility text not null default 'full'
    check (visibility in ('full', 'roadmap_only', 'internal')),
  -- What the review decided at close. A different question from state.
  disposition text
    check (disposition in ('promoted', 'merged', 'archived', 'parked')),
  -- A standing ask is carried into every wave until delivered or
  -- closed by the owner.
  standing boolean not null default false,
  -- Waiting on the owner rather than on a developer.
  owner_action boolean not null default false,
  environment text,
  response text,
  response_by text,
  responded_at timestamptz,
  -- Never set by a session. A developer marking something done moves
  -- it to 'answered'; only the reviewer moves it to 'verified'.
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete restrict,
  verification_note text,
  promoted_work_item_id uuid references public.work_items (id) on delete set null,
  raised_count integer not null default 1 check (raised_count > 0),
  carried_from_finding_id uuid references public.review_findings (id) on delete set null,
  blocks jsonb not null default '[]'::jsonb,
  resolution text,
  resolved_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A promotion without the work item it was promoted to is a claim
  -- with nothing behind it.
  constraint review_findings_promoted_has_item
    check (disposition <> 'promoted' or promoted_work_item_id is not null),
  -- Nothing is ever deleted: an archived finding closes with a reason.
  constraint review_findings_archived_has_resolution
    check (disposition <> 'archived' or coalesce(btrim(resolution), '') <> '')
);

drop trigger if exists review_findings_updated_at on public.review_findings;
create trigger review_findings_updated_at
  before update on public.review_findings
  for each row execute function public.set_updated_at();

create index if not exists review_findings_wave_idx
  on public.review_findings (wave_id, area_id) where deleted_at is null;

create index if not exists review_findings_state_idx
  on public.review_findings (state, emphasis) where deleted_at is null;

create index if not exists review_findings_standing_idx
  on public.review_findings (standing, state) where standing and deleted_at is null;

create index if not exists review_findings_promoted_idx
  on public.review_findings (promoted_work_item_id)
  where promoted_work_item_id is not null;

-- ---------------------------------------------------------------
-- review_finding_revisions: an append-only trail of every change to
-- the four columns that carry a judgement. Written by trigger, so the
-- caller cannot skip it - the same reason review_revisions exists.
-- ---------------------------------------------------------------

create table if not exists public.review_finding_revisions (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.review_findings (id) on delete cascade,
  field text not null,
  from_value text,
  to_value text,
  reason text,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists review_finding_revisions_finding_idx
  on public.review_finding_revisions (finding_id, changed_at desc);

-- ---------------------------------------------------------------
-- The revision trigger, mirroring review_revision_log for
-- applications. Skips no-op updates so a touched row does not
-- manufacture history.
-- ---------------------------------------------------------------

create or replace function public.review_finding_revision_log()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  tracked text[] := array[
    'state', 'disposition', 'emphasis', 'response',
    'verified_at', 'promoted_work_item_id', 'resolution',
    'standing', 'owner_action', 'visibility'
  ];
  col text;
  before_value text;
  after_value text;
  old_json jsonb := to_jsonb(old);
  new_json jsonb := to_jsonb(new);
  -- A signed-in caller identifies itself; a session working over the
  -- service connection has no auth.uid(), which leaves changed_by
  -- null - accurately saying "a session did this" rather than
  -- borrowing some other person's name for it.
  actor uuid := (select auth.uid());
begin
  foreach col in array tracked loop
    before_value := old_json ->> col;
    after_value := new_json ->> col;
    if before_value is distinct from after_value then
      insert into public.review_finding_revisions
        (finding_id, changed_by, field, from_value, to_value)
      values (
        new.id,
        -- A verification is the one change that always names its
        -- human, whatever connection carried it.
        case when col = 'verified_at' then coalesce(new.verified_by, actor)
             else actor end,
        col, before_value, after_value);
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists review_findings_revision on public.review_findings;
create trigger review_findings_revision
  after update on public.review_findings
  for each row execute function public.review_finding_revision_log();

-- Findings and areas join the knowledge graph rather than growing
-- reference columns of their own.
insert into public.link_entity_types (key, table_name, label, sort_order)
values ('finding', 'review_findings', 'Review finding', 90),
       ('review_area', 'review_areas', 'Review area', 100)
on conflict (key) do nothing;

-- Policies. Browser reads only, behind the portal-review module grant.
-- There is deliberately no insert/update/delete policy on any of these
-- tables: every write happens in a Claude session over the service
-- connection, which bypasses RLS.
alter table public.review_areas             enable row level security;
alter table public.review_area_passes       enable row level security;
alter table public.review_findings          enable row level security;
alter table public.review_finding_revisions enable row level security;

drop policy if exists "review_areas: members read" on public.review_areas;
create policy "review_areas: members read" on public.review_areas
  for select to authenticated
  using ((select public.has_module_access('portal-review')));

drop policy if exists "review_area_passes: members read" on public.review_area_passes;
create policy "review_area_passes: members read" on public.review_area_passes
  for select to authenticated
  using ((select public.has_module_access('portal-review')));

drop policy if exists "review_findings: members read" on public.review_findings;
create policy "review_findings: members read" on public.review_findings
  for select to authenticated
  using ((select public.has_module_access('portal-review')));

drop policy if exists "review_finding_revisions: members read" on public.review_finding_revisions;
create policy "review_finding_revisions: members read" on public.review_finding_revisions
  for select to authenticated
  using ((select public.has_module_access('portal-review')));

-- review_waves is now shared between the two review features, so the
-- read is either grant. Gating it on app-review alone would hide a
-- portal reviewer's own waves from them.
drop policy if exists "review_waves: members read" on public.review_waves;
create policy "review_waves: members read"
  on public.review_waves for select
  to authenticated
  using ((select public.has_module_access('app-review'))
      or (select public.has_module_access('portal-review')));
