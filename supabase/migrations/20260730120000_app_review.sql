-- ---------------------------------------------------------------
-- App Review: waves of merchant application triage.
--
-- Creates the six tables in supabase/schema/50_review.sql, their two
-- guards, select-only RLS, and the lookup vocabulary. Rationale for
-- every column lives in the schema file; this migration is the applied
-- form of it. See docs/APP-REVIEW.md for the session protocol.
--
-- Read-only by design: no insert/update/delete policy is created for
-- any of these tables. Writes happen over the service connection.
-- ---------------------------------------------------------------

create table if not exists public.launchpad_statuses (
  key text primary key,
  label text not null,
  description text,
  age_meaningful boolean not null default true,
  requires_note boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.triage_categories (
  key text primary key,
  label text not null,
  description text,
  group_key text not null
    check (group_key in ('needs_action', 'ongoing', 'settled')),
  colour_token text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_waves (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text not null default 'draft'
    check (state in ('draft', 'active', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references public.profiles (id) on delete set null,
  notes text,
  carried_from_wave_id uuid references public.review_waves (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_waves_closed_state
    check ((state = 'closed') = (closed_at is not null))
);

create table if not exists public.review_applications (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references public.review_waves (id) on delete cascade,
  display_order integer not null default 0,
  merchant_name text not null,
  partner_name text,
  acquirer text,
  launchpad_application_id text,
  risk_level text,
  raised_by text,
  created_in_launchpad_at timestamptz,
  launchpad_last_updated_at timestamptz,
  launchpad_last_updated_by text,
  launchpad_status text not null references public.launchpad_statuses (key),
  launchpad_status_note text,
  is_draft boolean not null default false,
  triage_category text references public.triage_categories (key),
  action_text text,
  rationale_text text,
  evidence_confidence text not null default 'inferred'
    check (evidence_confidence in ('corroborated', 'inferred', 'truncated')),
  confirmed_by uuid references public.profiles (id) on delete restrict,
  confirmed_at timestamptz,
  manual_pipeline boolean not null default false,
  blocker_scope text check (blocker_scope in ('merchant', 'partner', 'record')),
  next_trigger_type text
    check (next_trigger_type in ('date', 'release', 'person', 'event')),
  next_trigger_date date,
  next_trigger_label text,
  priority_rank integer,
  duplicate_of uuid references public.review_applications (id) on delete set null,
  superseded_by uuid references public.review_applications (id) on delete set null,
  carried_from_application_id uuid
    references public.review_applications (id) on delete set null,
  resolved_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_applications_confirmation_pair
    check ((confirmed_at is null) = (confirmed_by is null)),
  constraint review_applications_trigger_shape check (
    next_trigger_type is null
    or (next_trigger_type = 'date'
        and next_trigger_date is not null and next_trigger_label is null)
    or (next_trigger_type <> 'date'
        and next_trigger_label is not null and next_trigger_date is null)
  ),
  constraint review_applications_no_self_link check (
    duplicate_of is distinct from id
    and superseded_by is distinct from id
  )
);

create table if not exists public.review_evidence (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.review_applications (id) on delete cascade,
  occurred_on date,
  source text check (source in ('mailbox', 'launchpad', 'verbal', 'screenshot')),
  actor text,
  direction text check (direction in ('inbound', 'outbound')),
  summary text not null,
  is_truncated boolean not null default false,
  signal text check (signal in ('approval', 'decline', 'delivery_failure',
    'request', 'other')),
  screenshot_ref text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_revisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.review_applications (id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles (id) on delete set null,
  field text not null,
  from_value text,
  to_value text,
  reason text,
  superseded_rationale text,
  created_at timestamptz not null default now()
);

-- updated_at triggers
do $$
declare
  tbl text;
begin
  foreach tbl in array array['launchpad_statuses', 'triage_categories',
    'review_waves', 'review_applications', 'review_evidence']
  loop
    execute format('drop trigger if exists %I on public.%I',
      tbl || '_updated_at', tbl);
    execute format('create trigger %I before update on public.%I
      for each row execute function public.set_updated_at()',
      tbl || '_updated_at', tbl);
  end loop;
end $$;

create index if not exists review_waves_live_idx
  on public.review_waves (opened_at desc) where deleted_at is null;
create index if not exists review_applications_wave_idx
  on public.review_applications (wave_id, display_order) where deleted_at is null;
create index if not exists review_applications_merchant_idx
  on public.review_applications (lower(merchant_name)) where deleted_at is null;
create index if not exists review_evidence_application_idx
  on public.review_evidence (application_id, occurred_on) where deleted_at is null;
create index if not exists review_revisions_application_idx
  on public.review_revisions (application_id, changed_at desc);

-- Guard: a status flagged requires_note must carry a real message.
create or replace function public.review_status_note_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  needs_note boolean;
begin
  select requires_note into needs_note
  from public.launchpad_statuses where key = new.launchpad_status;

  if coalesce(needs_note, false)
     and coalesce(btrim(new.launchpad_status_note), '') = '' then
    raise exception using
      errcode = 'check_violation',
      message = format('launchpad_status "%s" requires a status note',
        new.launchpad_status),
      detail = format('Application %s has a blank note. Record what is '
        || 'actually pending, never a placeholder.', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists review_applications_status_note on public.review_applications;
create trigger review_applications_status_note
  before insert or update on public.review_applications
  for each row execute function public.review_status_note_guard();

-- Guard: every classification change writes a revision row.
create or replace function public.review_revision_log()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  tracked text[] := array[
    'triage_category', 'launchpad_status', 'launchpad_status_note',
    'action_text', 'rationale_text', 'evidence_confidence',
    'confirmed_at', 'manual_pipeline', 'blocker_scope',
    'next_trigger_type', 'next_trigger_date', 'next_trigger_label',
    'is_draft', 'duplicate_of', 'superseded_by', 'priority_rank'
  ];
  col text;
  before_value text;
  after_value text;
  old_json jsonb := to_jsonb(old);
  new_json jsonb := to_jsonb(new);
  actor uuid := (select auth.uid());
begin
  foreach col in array tracked loop
    before_value := old_json ->> col;
    after_value := new_json ->> col;
    if before_value is distinct from after_value then
      insert into public.review_revisions
        (application_id, changed_by, field, from_value, to_value)
      values (
        new.id,
        case when col = 'confirmed_at' then coalesce(new.confirmed_by, actor)
             else actor end,
        col, before_value, after_value);
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists review_applications_revision on public.review_applications;
create trigger review_applications_revision
  after update on public.review_applications
  for each row execute function public.review_revision_log();

-- Select-only RLS. No write policy is created, deliberately.
alter table public.launchpad_statuses    enable row level security;
alter table public.triage_categories     enable row level security;
alter table public.review_waves          enable row level security;
alter table public.review_applications   enable row level security;
alter table public.review_evidence       enable row level security;
alter table public.review_revisions      enable row level security;

create policy "launchpad_statuses: members read"
  on public.launchpad_statuses for select
  to authenticated
  using ((select public.has_module_access('app-review')));

create policy "triage_categories: members read"
  on public.triage_categories for select
  to authenticated
  using ((select public.has_module_access('app-review')));

create policy "review_waves: members read"
  on public.review_waves for select
  to authenticated
  using ((select public.has_module_access('app-review')));

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
-- Lookup vocabulary. Category and status names only - no merchant or
-- partner data of any kind. age_meaningful is false only where the
-- status sits inside the partner's control, so a long-dormant draft
-- is never flagged as stale.
-- ---------------------------------------------------------------

insert into public.launchpad_statuses
  (key, label, age_meaningful, requires_note, sort_order) values
  ('application_in_progress',      'Application In Progress',      false, false, 10),
  ('awaiting_contract_generation', 'Awaiting Contract Generation', true,  false, 20),
  ('awaiting_contract_send',       'Awaiting Contract Send',       true,  false, 30),
  ('awaiting_contract_signature',  'Awaiting Contract Signature',  true,  false, 40),
  ('pending_further_information',  'Pending Further Information',  true,  true,  50),
  ('onboarding_pending_mid',       'Onboarding: Pending MID',      true,  false, 60),
  ('rejected',                     'Rejected',                     false, false, 70),
  ('cancelled',                    'Cancelled',                    false, false, 80)
on conflict (key) do update set
  label = excluded.label,
  age_meaningful = excluded.age_meaningful,
  requires_note = excluded.requires_note,
  sort_order = excluded.sort_order;

insert into public.triage_categories
  (key, label, description, group_key, colour_token, sort_order) values
  ('act', 'Act now',
   'A concrete step available today.',
   'needs_action', 'ar-act', 10),
  ('investigate', 'Investigate',
   'The record''s state contradicts the evidence.',
   'needs_action', 'ar-investigate', 20),
  ('blocked', 'Blocked',
   'Cannot progress; blocker identified and owned by us.',
   'needs_action', 'ar-blocked', 30),
  ('chase', 'Chase',
   'Waiting on a third party; a nudge is the action.',
   'needs_action', 'ar-chase', 40),
  ('monitor', 'Check & confirm',
   'Assumed to need nothing, not yet confirmed by a human. Verifying it is work, so it stays in Needs action until someone confirms.',
   'needs_action', 'ar-monitor', 50),
  ('watch', 'Ongoing attention',
   'Nothing today, but it must not go quiet.',
   'ongoing', 'ar-watch', 60),
  ('leave', 'Leave alone',
   'Partner-side; we cannot act even if we wanted to.',
   'settled', 'ar-leave', 70),
  ('rejected', 'Rejected',
   'Declined by the acquirer. Terminal.',
   'settled', 'ar-rejected', 80),
  ('cancelled', 'Cancelled',
   'Record killed. Terminal, and never a synonym for declined.',
   'settled', 'ar-cancelled', 90)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  group_key = excluded.group_key,
  colour_token = excluded.colour_token,
  sort_order = excluded.sort_order;
