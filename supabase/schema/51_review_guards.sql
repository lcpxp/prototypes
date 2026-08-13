-- ------------------------------------------------------------------
-- 51_review_guards.sql - The application-review guards, split out of
-- 50_review.sql when that file reached its size-budget exception.
--
-- Both enforce a rule that must hold whatever wrote the row, including
-- a session working over the service connection where RLS does not
-- apply. They live in the database because a convention in a document
-- is not a constraint.
--
-- The tables they guard are in 50_review.sql; the review domain is
-- documented in docs/APP-REVIEW.md.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- Guards. Two rules that must hold whatever wrote the row, including
-- a session working over the service connection where RLS does not
-- apply. Both are enforced here because a convention in a document is
-- not a constraint.
-- ---------------------------------------------------------------

-- A status flagged requires_note must carry a real message. The
-- convention for manual submissions is a note reading "Pending Daopay
-- Decision" until the acquirer responds; once they do it becomes
-- Approved/Rejected, or stays put WITH the actual requirement
-- recorded. A blank or whitespace note is refused either way.
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

-- Log every change to a field that carries judgement or state. Skips
-- no-op updates so a touched row does not manufacture history.
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
  -- Who made the change. A signed-in caller identifies itself; a
  -- session working over the service connection has no auth.uid(),
  -- which leaves changed_by null - accurately saying "a session did
  -- this", rather than borrowing some other person's name for it.
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
        -- A confirmation is the one change that always names its
        -- human, whatever connection carried it.
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
