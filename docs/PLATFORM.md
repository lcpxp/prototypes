# Platform product-knowledge protocol

How the durable, structured answer to "what is Launchpad, what does it
do, what is in place today" gets built and kept current. This is the
sibling of docs/WORKFLOW.md: that protocol captures what we are doing
(work intake, backlog); this one captures what the platform already
is. Everything below is data in Supabase; the repo changes only when
rendering or schema itself changes.

## The three tables

- work_areas (shared, scope = 'product'): the same capability-area
  taxonomy used by the roadmap and backlog. Loading platform
  knowledge against these areas means "what exists" and "what's
  planned" read against one shared grouping - a roadmap swimlane, a
  backlog group and a platform capability section are the same area.
- work_documents (kind = 'platform'): the verbatim source material -
  a product overview, a capability brief - kept exactly as supplied,
  plus a distilled summary. Same fidelity and supersede-chain design
  as every other work_documents kind (see docs/WORKFLOW.md).
- product_capabilities (supabase/schema/40_platform.sql): the
  distilled, queryable, renderable catalogue. One row per discrete
  fact - the value proposition, a capability area, a single
  capability, or an at-a-glance headline - linked back to its source
  document. blocks reuses the api_topics typed-block vocabulary (p,
  note, kv, table, code, values; see supabase/schema/10_reference.sql)
  so new facts about a capability never need a code change.

## Ingestion protocol (drip-feed)

When the owner supplies platform material in chat - a product
overview, a capability description, "what it does today" material -
the session:

1. Stores it verbatim as a work_documents row, kind 'platform', with
   a distilled summary written at ingestion. Redact any credentials
   or live endpoints before storing, and note the redaction in the
   summary (same rule as docs/WORKFLOW.md).
2. Ensures the relevant work_areas exist, scope 'product'. Create any
   missing area rather than forcing new knowledge into a mismatched
   one.
3. Creates or updates product_capabilities rows linked to the source
   document via source_document_id. Each row gets a kind (overview,
   value, capability, glance), a maturity, and verified = false until
   the owner confirms it against the real build state.
4. When a new overview replaces an earlier one, sets supersedes_id on
   the new work_documents row and status 'superseded' on the old one,
   same as any other document kind.

Database inserts only; the repo does not change for a content load.

## Retrieval protocol

To brief a session on current platform capability:

1. Query product_capabilities for the area in question - summaries
   first, blocks only when the detail is actually needed.
2. Cross-reference open backlog_items and roadmap_items for the same
   area_id to see today-vs-planned in one view: product_capabilities
   is what exists, roadmap_items and backlog_items are what's next.
3. Fetch the linked work_documents row (via source_document_id) only
   when the distilled summary is not enough - the content column is
   the deep archive, not the first read.

## Maturity and verified

maturity is the axis the roadmap gets contextualised against:

- live - shipped and in production use today.
- partial - shipped but incomplete, or live for some segment only.
- planned - not yet built; on the roadmap.
- exploratory - an idea, not yet committed.

verified guards against trusting a marketing overview as shipped
fact. Content loaded from an overview arrives with verified = false
and a best-guess maturity transcribed from the source's framing.
Nothing in the platform module should be read as confirmed until the
owner has gone through the rows, corrected maturity where the source
overstated it, and set verified = true. Until then, treat the module
as "what the source claims", not "what is definitely built".

## Boundaries

- Real platform content - product names, partner names, capability
  detail - lives in Supabase only. It never enters git: not
  seed.sql, not commit messages, not this file or any other doc.
  seed.sql keeps a single generic placeholder row so the renderer is
  provable without real material.
- Schema changes (a new block kind, a new column) go through
  supabase/schema/, policies.sql and a migration in the same commit,
  per CLAUDE.md. A new fact about an existing capability is a data
  edit, not a schema change, because blocks is open-ended jsonb.
