# Portal review playbook

How a portal review wave is opened, walked, answered, verified,
triaged and closed. Sibling of docs/APP-REVIEW.md, and deliberately
the same shape: waves as objects, three concepts never collapsed,
revisions written by trigger, read-only in the browser, every write
from a session.

The `/portal-review` command wraps this. Schema:
`supabase/schema/52_portal_review.sql`. Pages: `modules/portal-review/`.

## What a wave is

A pass over the portal, area by area, through one lens. **A wave is a
lens, not a repeat.** Wave 3 of the original review was "the portal
seen as a logged-in agent" - it walked the areas that lens applied to
and re-asked nothing already raised. The same fault seen through a new
lens becomes evidence on the existing finding, never a second one.

So a sparse pass list is normal, and coverage under 100% is not a
failure. What matters is that the areas the lens applies to were
walked and that nothing was raised twice.

`review_waves` is shared with application review; a wave carries
`kind = 'portal'`. `kind = 'code'` is the same lifecycle for a wave of
findings out of a code-review slice.

## The area map

`review_areas` is the durable map of what gets walked: `part`, `code`
("01", "A3"), `title` and an optional `note`. It is **not** per-wave.
Walking a stable map in order is what stopped the original review
becoming a list of whatever was most annoying that day, and the map
outlived every wave that used it.

Adding an area is an insert. Removing one is `retired_at`, never a
delete, so the findings raised against it survive.

## Three concepts, three columns, never collapsed

    state        where a finding stands with the developers
    disposition  what the review decided about it at close
    verified_at  a human's confirmation that an answer holds

A finding can be `closed` **and** `promoted` at once - they answer
different questions, and collapsing them is the mistake application
review already learned not to make.

**`verified_at` is never set by a session.** A developer saying "done"
is a claim; the reviewer verifying it is a decision. The strongest
position a session may take is `state = 'answered'`, with
`response_by` naming who said it. Same rule as `confirmed_at` in
application review, for the same reason.

## The four states and the four dispositions

| `state` | Means |
|---|---|
| `open` | Raised, nothing back yet |
| `answered` | A developer says it is handled. Not verified |
| `verified` | The reviewer checked, and it holds |
| `closed` | Finished with, whatever the outcome |

| `disposition` | Means |
|---|---|
| `promoted` | Became a work item. `promoted_work_item_id` set, linked both ways |
| `merged` | Folded into an existing item as a note. No new row |
| `parked` | Real, not now. Lands at `someday` with a note saying which review it came from |
| `archived` | An artefact of the review, not future work. Closed with a resolution, findable, never surfaced again |

`archived` is the "bury what is not needed" half of the ask, and it is
a status with a reason, never a delete. The schema enforces both ends:
a `promoted` finding must name its work item, an `archived` one must
carry a resolution.

## The rules

1. **Write it at the moment it is made.** Quoted from the original
   board's own maintainer note: every ask is written into the record
   at the moment it is made; nothing lives only in the chat; an ask
   made in passing while discussing something else still gets a row.
   This is the rule the whole feature exists to serve.
2. **Nothing already raised is re-asked.** Find the existing finding
   and add to it. If it genuinely recurs after being closed, that is a
   re-raise: `raised_count + 1`, which is a deliberate signal that it
   still matters.
3. **Record what worked.** `kind = 'works'` exists because a review
   that records only faults reads as a worse system than it is.
4. **Environment behaviour is not a defect.** Real time was lost to
   this. A finding that turns out to be configuration records where in
   `environment` and stays; it is never deleted.
5. **A standing ask is carried into every wave** until delivered or
   closed by the owner. `standing = true`.
6. **State back before writing.** Per area, say what was recorded as a
   short table for sign-off. A fast dictation stays honest because the
   owner can refresh the board and see exactly what landed.
7. **The browser never writes.** No page in `modules/portal-review/`
   mutates a row, by design.

## The session workflow

1. **Open.** `/portal-review start "<name>" --lens "<the pass>"`.
   Carry forward standing asks and unresolved findings from the
   previous wave, each with `carried_from_finding_id` and
   `raised_count + 1`. The lens goes in `review_waves.notes` along
   with the standing brief.
2. **Walk and dictate.** The owner narrates; write each finding into
   its area as it is made, and stamp `review_area_passes` for the area
   when it is done.
3. **Fold in answers.** A developer response sets `state = 'answered'`
   with `response_by` and `responded_at`. Never `verified`.
4. **Verify.** The owner walks the answered list and says which hold.
   Only then `state = 'verified'`, with `verified_by`.
5. **Triage and close.** The promotion pass, below.

## The promotion pass

At close, every finding gets a disposition. `triage.html` renders the
whole set grouped by proposed disposition, undecided first, so the
owner can read it in one pass. **The session proposes; the owner
decides; nothing is promoted without a yes.**

For anything promoted or merged, follow docs/ROADMAP-INTAKE.md for the
lookup and the confidence bands and docs/ROADMAP-PLAYBOOK.md for the
fields. Search before creating, and prefer adding detail to an
existing row over making a new one - the original board's own rule was
that a finding gets its own row only if the owner says so.

## Operations

Copy-paste SQL. Every one of these runs in a session over the service
connection; none of it is reachable from the browser.

**Open a wave**

    insert into review_waves (name, kind, state, notes, carried_from_wave_id)
    values ('Wave 5 - <lens>', 'portal', 'active', '<the standing brief>', '<previous wave id>')
    returning id;

**Carry forward standing asks and unresolved findings**

    insert into review_findings
      (wave_id, area_id, title, body, kind, state, emphasis, visibility,
       standing, owner_action, environment, blocks,
       carried_from_finding_id, raised_count)
    select '<new wave id>', area_id, title, body, kind, 'open', emphasis, visibility,
           standing, owner_action, environment, blocks,
           id, raised_count + 1
    from review_findings
    where wave_id = '<previous wave id>'
      and deleted_at is null
      and (standing or state in ('open', 'answered'));

**Record a finding**

    insert into review_findings (wave_id, area_id, ref, title, body, kind, emphasis)
    select '<wave id>', id, '<ref>', '<title>', '<body>', 'issue', 'bug'
    from review_areas where code = '<area code>';

**Stamp an area as walked**

    insert into review_area_passes (wave_id, area_id, walked_by)
    select '<wave id>', id, '<who>' from review_areas where code = '<area code>'
    on conflict (wave_id, area_id) do nothing;

**Fold in a developer answer** (never `verified` - see above)

    update review_findings
    set state = 'answered', response = '<what they said>',
        response_by = '<who>', responded_at = now()
    where id = '<finding id>';

**Verify** (only when the owner has said it holds)

    update review_findings
    set state = 'verified', verified_at = now(), verified_by = '<profile id>',
        verification_note = '<what was checked>'
    where id = '<finding id>';

**Promote**, once the owner has said yes

    update review_findings
    set disposition = 'promoted', promoted_work_item_id = '<work item id>',
        state = 'closed', resolution = '<what was promoted, and where>',
        resolved_at = now()
    where id = '<finding id>';

    insert into knowledge_links (from_type, from_id, to_type, to_id, kind, note, confidence)
    values ('finding', '<finding id>', 'work_item', '<work item id>', 'relates_to',
            'Promoted from <wave name>.', 'proposed');

**Archive** - a resolution is required by the schema, not by convention

    update review_findings
    set disposition = 'archived', state = 'closed',
        resolution = '<why this is an artefact rather than work>', resolved_at = now()
    where id = '<finding id>';

**Close the wave**

    update review_waves set state = 'closed', closed_at = now()
    where id = '<wave id>';

Every write above should be followed by the block check in
docs/PLATFORM.md if it touched `blocks`, for the same reason: a typed
block with the wrong key name renders an empty shell and raises no
error anywhere.
