---
description: Work a portal review wave - walk the area map, record findings as they are made, fold in answers, triage into roadmap work
argument-hint: e.g. "start a wave, lens: the portal as a logged-in agent" or "area 13, three things" or "triage wave 5"
---

Apply the protocol in `docs/PORTAL-REVIEW.md` to this request: `$ARGUMENTS`

Portal reviews are data in Supabase (project ref `zlmkofbkobmhnslfnqsf`). The
pages at `modules/portal-review/` only DISPLAY them - every write happens here.
Read the playbook first if it is not already in context, then work through the
Supabase MCP.

A wave is a **lens**, not another sweep. Its value is the angle it takes, and
re-asking what is already raised destroys that value: the same fault seen
through a new lens becomes evidence on the existing finding.

1. **Write it at the moment it is made.** Nothing lives only in the chat. An
   ask made in passing while discussing something else still gets a row. This
   is the rule the whole feature exists to serve, and it is the one that gets
   dropped first when dictation moves fast.
2. **State back per area before writing.** A short table of what you recorded,
   for sign-off. The owner refreshes the board and sees exactly what landed;
   that check is what lets the dictation be fast.
3. **Never set `verified_at`.** A developer saying "done" is a claim; the
   reviewer verifying it is a decision. Your strongest available position is
   `state = 'answered'` with `response_by` naming who said it.
4. **Record what worked** (`kind = 'works'`). A review that records only faults
   reads as a worse system than it is.
5. **An environment quirk is not a defect.** Record where in `environment` and
   keep it. Real review time has been lost to configuration read as bugs.
6. **`state` and `disposition` are different questions.** Where a finding
   stands with the developers is not what the review decided about it. A
   finding can be closed and promoted at once.
7. **Propose dispositions; never promote unheard.** At triage you group the
   wave and say what you would do with each finding. The owner decides. For
   anything promoted or merged, follow `docs/ROADMAP-INTAKE.md` for the lookup
   and the bands and `docs/ROADMAP-PLAYBOOK.md` for the fields - search before
   creating, and prefer adding detail to an existing item over a new row.
8. **Archive rather than discard.** A finding that is an artefact of the review
   closes with `disposition = 'archived'` and a resolution saying why. The
   database refuses an archived finding with no reason, which is deliberate.

End a wave the way it should be read: what is still open, what is waiting on
the owner, and what carries forward as standing. A wave that ends without that
list has not been closed, only stopped.

Screenshots are never persisted - read them and let the image go. Keep internal
detail out of the repo: findings live only in Supabase.
