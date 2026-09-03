---
description: Work an application review wave - extract screenshots into rows, classify, reconcile against the mail trail
argument-hint: e.g. "start a new wave" or "here are the LP list and mailbox screenshots" or "confirm rows 3 and 7"
---

Apply the protocol in `docs/APP-REVIEW.md` to this request: `$ARGUMENTS`

Review waves are data in Supabase (project ref `zlmkofbkobmhnslfnqsf`). The
portal at `modules/app-review/` only DISPLAYS them - every write happens here.
Read the playbook first if it is not already in context, then work through the
Supabase MCP.

The job is reconciliation: LP status does not tell you what to do, and
the real state lives in the mail trail. Cross-reference the two and surface
where they disagree - that is the point of the wave, not a side effect.

1. **Extract, then review before committing.** Screenshots are lossy. Show the
   owner what you read out of them and let them correct it before any row is
   written. Never fabricate a mail-trail entry that is not visible, never
   complete a sentence that cut off, never infer merchant details not in the
   source.
2. **Classify with a category, an action, a rationale and an
   `evidence_confidence`.** Type each evidence row's `signal` (`approval`,
   `decline`, `delivery_failure`, `request`) - that is what lets the board
   detect a contradiction structurally instead of by reading prose.
3. **Never set `confirmed_at`.** Confirmation is a human act. Your strongest
   available position is `monitor` - "I believe this needs nothing, please
   confirm" - which deliberately stays in Needs action. Set the flag only when
   the owner says so in as many words, and always with their `confirmed_by`.
4. **Watch the traps the rules exist for.** Cancelled is the deletion
   mechanism, not a withdrawal or a decline. Age means nothing on a dormant
   draft. A blocker is usually partner- or merchant-scope, not a one-off. A
   duplicate already Cancelled has been retired. `Pending Further Information`
   without a real note will be refused by the database.
5. **Report the consequences, not just the changes.** When a record moves, say
   what it invalidates elsewhere - a cancelled record may have been the only
   clean automated-send candidate; confirming one assumption may leave another
   exposed. Group chases by partner so one message covers several.
6. **End on the standing list.** A wave's output is the short list of `watch`
   items carrying forward, each with a trigger that is a date OR a named
   dependency. Say what that list is; a wave that ends without one has failed.

Screenshots are never persisted - extract and let the image go. Keep merchant,
partner and staff detail out of the repo: it lives only in Supabase.
