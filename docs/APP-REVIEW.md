# Application review playbook

The operating manual for a review wave. Every write happens here, in a
session with Supabase access; the portal (modules/app-review/) only
displays what this session wrote. Schema and column rationale:
supabase/schema/50_review.sql.

## What a wave is

A point-in-time snapshot of the merchant application estate plus the
triage decided against it. Applications live in LP against a
partner, with an acquirer - currently DaoPay. The owner supplies the
LP list and the mailbox threads as screenshots; this session
extracts them into rows.

**LP status does not tell you what to do.** "Awaiting Contract
Send" may already have been emailed manually and be mid-underwriting.
"Cancelled" may have been approved days earlier. "Application In
Progress" for 48 days may be a perfectly healthy draft. The real state
lives in the mail trail. Reconciling the two is the whole job.

**The output of a wave is not a tidy board. It is a short list the
owner must keep on top of going forward.** Everything else gets
closed, confirmed or left alone. A wave that produces twenty-five
neatly categorised rows and no standing list has failed.

States: `draft` -> `active` -> `closed`. Never auto-close a wave and
never delete anything; `deleted_at` exists but closing is what ends a
wave. Starting the next one carries the watch list forward with its
history intact - that is why waves are objects rather than one
perpetually-mutating board.

## Three concepts, three columns, never collapsed

- **`launchpad_status`** - external truth, mirrored from LP.
  Data-driven (`launchpad_statuses`), because LP will add
  states.
- **`triage_category`** - our judgement. Drives colour and the
  workload split.
- **`confirmed_at` / `confirmed_by`** - orthogonal to both, and
  applicable to any row. "I have looked at this and it needs nothing"
  is a fact about *the review*, not about the application.

The nine categories and their groups:

| Key | Label | Group | Meaning |
|---|---|---|---|
| `act` | Act now | needs_action | A concrete step available today |
| `investigate` | Investigate | needs_action | State contradicts the evidence |
| `blocked` | Blocked | needs_action | Blocker identified and owned by us |
| `chase` | Chase | needs_action | Waiting on a third party; nudge |
| `monitor` | Check & confirm | needs_action | **Assumed** no action, unconfirmed |
| `watch` | Ongoing attention | ongoing | Nothing today, must not go quiet |
| `leave` | Leave alone | settled | Partner-side; we cannot act |
| `rejected` | Rejected | settled | Declined by the acquirer. Terminal |
| `cancelled` | Cancelled | settled | Record killed. Terminal |

Group membership is derived, never stored: `confirmed_at` set means
settled whatever the category; otherwise the category's `group_key`.

## The rules

Each of these came from getting it wrong first.

1. **Assumed no-action is not confirmed no-action.** An AI "nothing to
   do here" is an inference from partial evidence; a human one is a
   decision. Conflating them lets unverified assumptions borrow the
   credibility of confirmed ones. So `monitor` sits in **needs_action**
   - verifying it *is* work - and leaves only when a human confirms.
   **Never set `confirmed_at` yourself.** Your strongest available
   position is `monitor`: "I believe this needs nothing, please
   confirm." Set it only when the owner says so in as many words, and
   always with their `confirmed_by`.
2. **`Cancelled` is the deletion mechanism.** Records are never
   removed from LP, only Cancelled or Rejected. So Cancelled
   does *not* mean the partner withdrew - it means someone
   deliberately killed the record. A Cancelled record with an approval
   in its trail is a red flag, not a closed item.
3. **`Rejected` means the acquirer declined it.** Never use Cancelled
   for a decline or the reverse: it skews decline-rate reporting
   against the acquirer. Cancelled where the evidence shows a decline
   is an `investigate`.
4. **`Pending Further Information` must carry a real message**, never
   a placeholder. For manual submissions the convention is a note
   reading `Pending Daopay Decision` until the acquirer responds; then
   it moves to Approved/Rejected, or stays put *with the actual
   requirement recorded*. The database refuses a blank note on any
   status flagged `requires_note`.
5. **Manual-pipeline records must never be sent digitally.** Set
   `manual_pipeline`. Those applications were emailed to the
   acquirer's compliance mailbox; pushing one through the automated
   send would duplicate a merchant they are already reviewing.
6. **Partner-level blockers are distinct from merchant-level ones, and
   both recur.** Partner scope ("this partner is not established with
   the acquirer") gates every application under that partner - it was
   the root cause of two of twenty-five records in one wave, enough to
   justify checking partner establishment *before* submission.
   Merchant scope ("registered in an unfavourable jurisdiction")
   follows the merchant and resurfaces under a different partner. Set
   `blocker_scope`; never report either as a one-off.
7. **A record can be filed against the wrong partner entirely**,
   making it invalid - correctly Cancelled, not Rejected, and not a
   decline against the partner shown. Link the replacement with
   `superseded_by`.
8. **Age is only a staleness signal for statuses past the partner's
   control.** `Application In Progress` may be a dormant draft that
   legitimately sits for months: nothing has been handed to us, so
   there is nothing to chase and the age is noise. Age *is* meaningful
   for Awaiting Contract Send, Awaiting Contract Signature, Pending
   Further Information and Awaiting Contract Generation. This lives in
   `launchpad_statuses.age_meaningful`; set `is_draft` on In Progress
   records. Age is computed at render time, never stored.
9. **Watch items are gated on a trigger, not a date.** Everything on
   the standing list waits on something outside the owner's control,
   and those differ in kind: a person's reply, a software release, an
   assessment. Use `next_trigger_type` with either
   `next_trigger_date` (type `date`) or `next_trigger_label` (types
   `release`, `person`, `event`). A date-only "next review" produces a
   list that silently rots.
10. **Duplicate merchant records happen**, including twice under one
    partner. Detect, link with `duplicate_of`, and make clear which is
    live. A duplicate already showing Cancelled has been retired - do
    not propose retiring it again.
11. **Evidence is often truncated.** Mailbox previews cut sentences
    mid-clause. Mark the evidence row `is_truncated` and set
    `evidence_confidence='truncated'`. Never complete a cut-off
    sentence, and never let a partial reading present as settled fact.
12. **Corrections are normal, frequent and must be cheap.** In one
    wave the owner overturned which partner a merchant belonged to,
    what Cancelled meant, whether a duplicate still needed retiring,
    whether age implied staleness, and whether an assumption counted
    as no-action. Reclassifying is a single `update`; the revision row
    is written by trigger, so it cannot be skipped. Put the overturned
    reasoning in `superseded_rationale` so a later session does not
    propose it again.
13. **The manual email route caps attachments at 35MB.** Submissions
    have silently bounced on it. Record the bounce as evidence with
    `signal='delivery_failure'` and keep it in the trail even after
    the blocker moves on.

## How to classify

- **Never fabricate.** If a mail-trail entry is not visible in the
  evidence, it does not exist. If a sentence is cut off, mark it
  truncated rather than completing it. Never infer merchant details
  not present in the source.
- **Never set `confirmed`** (rule 1). It is a human act, always.
- **Cross-reference the LP list against the mail evidence and
  surface contradictions explicitly.** That reconciliation is the
  point of the exercise. Type each evidence row's `signal` so the
  board can find the contradiction structurally rather than by reading
  prose.
- **Distinguish what a third party said from what we proposed.** A
  suggestion we made is not a decision they took.
- **Group chases by partner** so one message covers several
  applications.
- **Surface the consequences of a change, not just the change.** When
  a record moves, say what it invalidates elsewhere: cancelling the
  only clean automated-send candidate leaves the integration with no
  test subject; confirming one assumption may leave another exposed.
  This is the most valuable thing a session does in a wave, and it
  should be deliberate, not accidental.
- Everything extracted from a screenshot is reviewed with the owner
  before it is committed. Extraction is lossy; nothing enters a wave
  unreviewed.
- **Screenshots are never persisted.** Extract, then let the image go.
  `review_evidence.screenshot_ref` is a human-written locator
  ("mailbox thread, 12 Jun"), never a URL and never an image.

## Operations

Project ref `zlmkofbkobmhnslfnqsf`. Resolve ids by name in the SQL so
no UUIDs need carrying between steps.

Open a wave:

    insert into review_waves (name, state, opened_by)
    select 'July 2026 wave', 'active', id from profiles
    where email = '<owner email>';

Add an application (statuses and categories are lookup keys, not
labels):

    insert into review_applications (
      wave_id, display_order, merchant_name, partner_name, acquirer,
      launchpad_status, is_draft, triage_category, action_text,
      rationale_text, evidence_confidence, created_in_launchpad_at)
    select w.id, 1, '<merchant>', '<partner>', 'DaoPay',
      'awaiting_contract_send', false, 'act', '<what to do>',
      '<why>', 'inferred', '2026-06-12'
    from review_waves w where w.name = 'July 2026 wave';

Add evidence (`signal` is what makes contradictions detectable):

    insert into review_evidence (
      application_id, occurred_on, source, actor, direction, summary,
      is_truncated, signal)
    values ('<application id>', '2026-05-14', 'mailbox',
      'DaoPay compliance', 'inbound', '<what was said>', false,
      'approval');

Reclassify - one statement; the revision row is written by trigger:

    update review_applications
    set triage_category = 'investigate',
        rationale_text = '<why this changed>'
    where id = '<application id>';

Confirm - only on the owner's explicit say-so:

    update review_applications
    set confirmed_at = now(),
        confirmed_by = (select id from profiles where email = '<owner email>')
    where id = '<application id>';

Close a wave:

    update review_waves set state = 'closed', closed_at = now()
    where name = 'July 2026 wave';

Open the next wave carrying the watch list forward. Only `watch` rows
travel, and each keeps a link back to the row it came from:

    with next_wave as (
      insert into review_waves (name, state, carried_from_wave_id)
      select 'August 2026 wave', 'active', id from review_waves
      where name = 'July 2026 wave'
      returning id
    )
    insert into review_applications (
      wave_id, display_order, merchant_name, partner_name, acquirer,
      launchpad_status, launchpad_status_note, triage_category,
      action_text, rationale_text, evidence_confidence, manual_pipeline,
      blocker_scope, next_trigger_type, next_trigger_date,
      next_trigger_label, created_in_launchpad_at,
      carried_from_application_id)
    select n.id, row_number() over (order by a.display_order),
      a.merchant_name, a.partner_name, a.acquirer, a.launchpad_status,
      a.launchpad_status_note, a.triage_category, a.action_text,
      a.rationale_text, a.evidence_confidence, a.manual_pipeline,
      a.blocker_scope, a.next_trigger_type, a.next_trigger_date,
      a.next_trigger_label, a.created_in_launchpad_at, a.id
    from review_applications a
    join review_waves w on w.id = a.wave_id
    cross join next_wave n
    where w.name = 'July 2026 wave'
      and a.triage_category = 'watch'
      and a.confirmed_at is null
      and a.deleted_at is null;

A new LP status needs a lookup row, not a release. Set
`age_meaningful` false only where the status sits inside the partner's
control (rule 8):

    insert into launchpad_statuses
      (key, label, age_meaningful, requires_note, sort_order)
    values ('<key>', '<Exact LP label>', true, false, 90);
