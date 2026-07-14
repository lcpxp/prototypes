# Work intake and backlog workflow

How working sessions between the repo owner and Claude turn supplied
material and discussion into durable, queryable records. The goal:
nothing said or supplied in a session is lost, everything lands in
Supabase in a form that is useful immediately and reviewable years
later, and none of it requires code changes.

## The four tables

All in supabase/schema/30_work.sql, all RLS-gated, all admin-write
only.

- work_areas: the single shared taxonomy of development areas.
  scope = 'product' for the feature areas worked with development
  teams; scope = 'portal' for LPio's own development. Roadmap items,
  backlog items, documents and notes all reference it.
- work_documents: raw supplied material, kept verbatim in content,
  with a distilled summary written at ingestion. kind classifies it
  (prd, roadmap, backlog, devops, sprint, meeting, discussion,
  other). A replacement document points at its predecessor via
  supersedes_id and the predecessor's status becomes 'superseded';
  the chain is the history.
- backlog_items: the rolling work list, replacing the roll-forward
  Notion page. type is one of consideration, feature, functionality,
  bug, improvement, task. Items are never deleted: closing one means
  status 'done' or 'dropped' plus a resolution sentence; resolved_at
  is stamped by trigger. Reopening clears it.
- work_notes: atomic distilled records - decision, fact, risk,
  question, action or note - each linked to whatever it concerns
  (an area, a document, a backlog item, a roadmap item).

## Ingestion protocol

When the owner supplies material in chat (a PRD, a roadmap export, a
backlog list, a DevOps copy-paste, a sprint summary), the session:

1. Stores the material verbatim as one work_documents row: title,
   kind, area where one clearly applies, content exactly as
   supplied, captured_on today. Never truncate or paraphrase the
   content column; fidelity is the point.
2. Writes a summary on the same row: a few sentences a future
   session can rely on without re-reading the content.
3. Extracts work_notes rows for anything with standalone value:
   decisions made, facts stated, risks raised, open questions,
   actions agreed. Each linked to the document and, where clear, an
   area or item.
4. Creates or updates backlog_items for actionable entries, linked
   to the source document via source_document_id and carrying any
   external reference (DevOps id, ticket number) in external_ref.
5. If the material replaces an earlier document (this sprint's
   summary superseding last sprint's), sets supersedes_id on the new
   row and status 'superseded' on the old one.

When discussion in chat (not a document) produces a decision or a
new item, steps 3 and 4 apply directly; a work_documents row of kind
'discussion' is only worth creating when the thread itself has
reference value.

## Retrieval protocol

At the start of work on any area, a session should query, in order:

1. work_notes where status = 'active' for the area (open decisions,
   risks and questions constrain everything else).
2. backlog_items in the open group (open, planned, in_progress,
   blocked) for the area, by priority.
3. work_documents summaries for the area, newest first, following
   supersedes_id chains only when history matters.

The content column is the deep archive: fetch it only when the
summary is not enough. This keeps retrieval cheap even when the
tables grow very large.

## Rolling forward

The Notion habit of re-writing the list each cycle becomes: filter
backlog_items to the open group (the default view on
modules/backlog/), re-prioritise by updating priority values, close
finished items with a resolution, and let done and dropped rows
accumulate as the historic record. Nothing is copied forward because
nothing moves; only statuses and priorities change.

## Boundaries

- Everything above is data in Supabase. The repo changes only when
  the rendering or the schema itself must change; schema changes go
  through supabase/schema/, policies.sql and a migration in the
  same commit (CLAUDE.md rules apply).
- The repo is public: real material never enters git, including
  seed.sql, commit messages and docs. Session log entries reference
  tables and counts, never contents.
- Where material contains credentials or endpoints, they are
  redacted at ingestion; the redaction is noted in the summary.
