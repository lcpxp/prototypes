---
description: Quick-capture or update roadmap work from a one-line request, applied straight to Supabase
argument-hint: e.g. "add self-service returns endpoint under Self Service API, next" or "update Inbound API: promote to now"
---

Apply the quick-capture / quick-edit protocol from `docs/ROADMAP-PLAYBOOK.md`
to this request: `$ARGUMENTS`

The roadmap is data in Supabase (project ref `zlmkofbkobmhnslfnqsf`). Read the
playbook's "Field reference" and "Quick capture / quick edit" sections if they
are not already in context, then:

1. Read `roadmap_current` (and, for an update, find the row by title).
2. Decide add vs update. Infer `category_id` (theme), `parent_id` (does it
   belong under a named workstream?), `department`, `level` and `horizon`
   from the wording. Default `horizon='someday'` unless a scheduling word
   ("now", "this sprint", "next", "urgent") is present. A high-level container
   ("the X workstream/area") is `level='workstream'`; a concrete piece is an
   item, nested under its workstream when one is named.
3. If exactly one critical field is genuinely ambiguous (which workstream? or
   now vs someday?), ask ONE clickable `AskUserQuestion`. Otherwise apply
   silently.
4. Apply the insert/update via the Supabase MCP, then report ONE line: what
   changed and where it now sits (theme / workstream / band). Record a
   `work_notes` decision only when the reasoning matters.

Resolve theme and workstream ids by key/title in the SQL (see the playbook's
operations), so no UUIDs are needed. Keep real merchant, partner and staff
detail out of the repo - it lives only in Supabase.
