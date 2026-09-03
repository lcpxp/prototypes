-- ------------------------------------------------------------------
-- 50_review.sql - Application review: waves of merchant application
-- triage against LP records (see docs/APP-REVIEW.md).
--
-- The portal renders these tables and never writes them. Every write -
-- opening a wave, extracting from screenshots, classifying, confirming,
-- reclassifying, closing - happens in a Claude Code session over the
-- service connection. policies.sql therefore grants select only; there
-- is deliberately no insert/update/delete policy on any table here.
--
-- Three concepts stay in three columns and are never collapsed:
--   launchpad_status   external truth, mirrored from LP
--   triage_category    our judgement about what to do
--   confirmed_at/_by   a human's decision that a record needs nothing
-- An AI-assigned "nothing to do here" is an inference; a human
-- "nothing to do here" is a decision. The 'monitor' category exists to
-- hold the first until a human turns it into the second.
--
-- Nothing derivable is stored: age in days, group membership, group
-- counts and the do-now ordering are all computed at render time.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- Lookup tables. Both carry BEHAVIOUR, not just labels, so the rules
-- that depend on them are data an admin can change rather than code
-- that needs a deploy. LP will add statuses; that must never
-- require a release of this portal.
-- ---------------------------------------------------------------

-- launchpad_statuses: mirrors LP's status vocabulary exactly.
-- age_meaningful is the encoded form of a rule learned the hard way:
-- age is a staleness signal only for statuses past the partner's
-- control. "Application In Progress" may be a dormant draft that sits
-- for months with nothing handed to us, so its age is noise and must
-- not be flagged. requires_note forces a real message onto statuses
-- that are meaningless without one (Pending Further Information), so
-- a placeholder can never be saved in its place.
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

drop trigger if exists launchpad_statuses_updated_at on public.launchpad_statuses;
create trigger launchpad_statuses_updated_at
  before update on public.launchpad_statuses
  for each row execute function public.set_updated_at();

-- triage_categories: our own judgement vocabulary. group_key drives
-- the three-way split the board is read by. Note where 'monitor'
-- sits: needs_action, because verifying an assumption IS work. It
-- leaves that group only when a human sets confirmed_at, never by
-- being reclassified. colour_token names the --ar-<key> pair in
-- assets/css/tokens.css; a category with no token falls back to a
-- neutral surface.
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

drop trigger if exists triage_categories_updated_at on public.triage_categories;
create trigger triage_categories_updated_at
  before update on public.triage_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- review_waves: a point-in-time snapshot of the application estate
-- plus the triage work done against it. draft -> active -> closed.
-- A closed wave is a record of what was decided and why, not a live
-- view. Waves are never auto-closed and never deleted.
--
-- carried_from_wave_id is what makes waves first-class rather than
-- one perpetually-mutating board: starting a new wave carries the
-- watch list forward with its history, notes and triggers intact
-- instead of re-extracting from screenshots.
-- ---------------------------------------------------------------

create table if not exists public.review_waves (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Which review this wave belongs to. The table is SHARED: opening,
  -- carrying forward and closing are the same operations whichever
  -- sort of review it is, and duplicating the lifecycle into a second
  -- table would be two mechanisms for one job. 'application' is
  -- merchant triage (this file); 'portal' is a walkthrough and 'code'
  -- a code-review slice (52_portal_review.sql).
  kind text not null default 'application'
    check (kind in ('application', 'portal', 'code')),
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
  -- A wave is closed exactly when it carries a closing timestamp.
  constraint review_waves_closed_state
    check ((state = 'closed') = (closed_at is not null))
);

drop trigger if exists review_waves_updated_at on public.review_waves;
create trigger review_waves_updated_at
  before update on public.review_waves
  for each row execute function public.set_updated_at();

create index if not exists review_waves_live_idx
  on public.review_waves (opened_at desc) where deleted_at is null;

-- ---------------------------------------------------------------
-- review_applications: one row per LP application in a wave.
--
-- display_order preserves the source list order. The board is read in
-- LP order because that is the order the owner reads the real
-- list in; re-sorting by category would break the cross-reference.
-- ---------------------------------------------------------------

create table if not exists public.review_applications (
  id uuid primary key default gen_random_uuid(),
  wave_id uuid not null references public.review_waves (id) on delete cascade,
  display_order integer not null default 0,

  -- Record identity, mirrored from LP. Commercially sensitive:
  -- these values live here and never in the repository.
  merchant_name text not null,
  partner_name text,
  acquirer text,
  launchpad_application_id text,
  risk_level text,
  raised_by text,
  created_in_launchpad_at timestamptz,
  launchpad_last_updated_at timestamptz,
  launchpad_last_updated_by text,

  -- External truth. is_draft distinguishes a live edit from a dormant
  -- draft on statuses where both look identical, so age can be
  -- suppressed on the second (see launchpad_statuses.age_meaningful).
  launchpad_status text not null
    references public.launchpad_statuses (key),
  launchpad_status_note text,
  is_draft boolean not null default false,

  -- Our judgement. rationale_text is why, action_text is what to do.
  triage_category text references public.triage_categories (key),
  action_text text,
  rationale_text text,

  -- How far the evidence actually goes. Deliberately NOT called
  -- "confirmed": mailbox previews truncate sentences mid-clause, and a
  -- classification drawn from a cut-off sentence must not present as
  -- settled fact. Kept distinct in wording from the confirmation flag
  -- below so the two can never be read as the same thing.
  evidence_confidence text not null default 'inferred'
    check (evidence_confidence in ('corroborated', 'inferred', 'truncated')),

  -- Confirmation: orthogonal to category, applicable to any row. Both
  -- columns move together or not at all, and a confirmation always
  -- names a real person - it can never be anonymous.
  confirmed_by uuid references public.profiles (id) on delete restrict,
  confirmed_at timestamptz,

  -- Never push a manual-pipeline record through the automated send:
  -- the acquirer is already reviewing that merchant by email, and a
  -- second submission creates a duplicate on their side.
  manual_pipeline boolean not null default false,

  -- Blockers recur, so scope matters more than the blocker text.
  -- A partner-scope blocker gates every application under that
  -- partner and rolls up to a wave-level panel; a merchant-scope one
  -- follows the merchant and resurfaces under any partner.
  blocker_scope text check (blocker_scope in ('merchant', 'partner', 'record')),

  -- Watch items are gated on a trigger, not a date: the things being
  -- waited on differ in kind (a person's reply, a software release, an
  -- assessment). A date-only field would produce a list that rots.
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

  -- Confirmation is whole or absent, never half-written.
  constraint review_applications_confirmation_pair
    check ((confirmed_at is null) = (confirmed_by is null)),
  -- A trigger is either a date or a named dependency, never both and
  -- never neither once its type is set.
  constraint review_applications_trigger_shape check (
    next_trigger_type is null
    or (next_trigger_type = 'date'
        and next_trigger_date is not null and next_trigger_label is null)
    or (next_trigger_type <> 'date'
        and next_trigger_label is not null and next_trigger_date is null)
  ),
  -- A record cannot be its own duplicate or replacement.
  constraint review_applications_no_self_link check (
    duplicate_of is distinct from id
    and superseded_by is distinct from id
  )
);

drop trigger if exists review_applications_updated_at on public.review_applications;
create trigger review_applications_updated_at
  before update on public.review_applications
  for each row execute function public.set_updated_at();

create index if not exists review_applications_wave_idx
  on public.review_applications (wave_id, display_order) where deleted_at is null;
-- Merchant-scope blockers resurface on any new record for the same
-- merchant, so that lookup runs on every board render.
create index if not exists review_applications_merchant_idx
  on public.review_applications (lower(merchant_name)) where deleted_at is null;

-- ---------------------------------------------------------------
-- review_evidence: the mail trail and anything else a classification
-- rests on. is_truncated marks a source that cut off mid-sentence,
-- so a partial reading is never presented as a complete one.
--
-- signal types what an entry MEANS, so contradictions are detected
-- structurally rather than by matching words in prose. That is what
-- lets the board flag a Cancelled record holding an approval, or a
-- Cancelled record whose evidence shows a decline (which belongs in
-- Rejected, and skews decline-rate reporting against the acquirer if
-- left as Cancelled).
--
-- screenshot_ref is a human-written locator ("mailbox thread, 12 Jun"),
-- never a URL and never an image. Screenshots carry everything
-- sensitive in picture form and are deliberately not persisted.
-- ---------------------------------------------------------------

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

drop trigger if exists review_evidence_updated_at on public.review_evidence;
create trigger review_evidence_updated_at
  before update on public.review_evidence
  for each row execute function public.set_updated_at();

create index if not exists review_evidence_application_idx
  on public.review_evidence (application_id, occurred_on) where deleted_at is null;

-- ---------------------------------------------------------------
-- review_revisions: every change to a classification, written by
-- trigger rather than by the caller.
--
-- Corrections are normal and frequent - which partner a merchant
-- belongs to, what Cancelled means, whether age implied staleness,
-- whether an assumption counted as no-action. They must be cheap to
-- make and impossible to lose. Because the portal never writes, this
-- is the only record of what a session changed, so it cannot depend
-- on a session remembering to log it.
--
-- superseded_rationale keeps the reasoning that was overturned, so a
-- later session can see it was already considered and rejected rather
-- than proposing it again.
-- ---------------------------------------------------------------

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

create index if not exists review_revisions_application_idx
  on public.review_revisions (application_id, changed_at desc);

-- The two guard functions and their triggers live in
-- 51_review_guards.sql: this file was at its size-budget exception and
-- they were the declared seam. They enforce the two rules that must
-- hold whatever wrote the row, including a session working over the
-- service connection where RLS does not apply.
