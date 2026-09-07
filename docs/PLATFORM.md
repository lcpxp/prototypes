# Platform product-knowledge protocol

How the durable, structured answer to "what is LP, what does it
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

Beyond these three, two further context stores hold platform knowledge
that is not a capability catalogue entry, same scope and access (read
behind the 'platform' grant, admin writes), in
supabase/schema/45_context.sql: domain_terms (the LP/Merchant Portal
glossary) and journey_stages (the canonical lead-to-live onboarding
lifecycle). integrations (connected services) and platform facts in
work_notes (kind 'fact') complete the picture. Together these are the
context the roadmap synchronises against both ways every review - see
Wave 4, "Context sync", in docs/ROADMAP-REVIEW.md.

## Three axes, not one

A capability row answers three separate questions, and `kind` used to
answer two of them at once. Until 2026-09-07 it said both what shape of
statement a row was AND what the row was about, so 27 rows describing
how the Partner Portal is built rendered at the bottom of a page about
what the product does for merchants. Keep them apart:

- **domain** - what the row is ABOUT. It picks the top-level view on
  modules/platform/. `product` is what LP does, for the people who buy
  and run it; `build` is how the Partner Portal is built and styled,
  for the people who change it. A `build` row files against a
  build-scope work_area, never a product one.
- **kind** - what SHAPE of statement it is, within a domain. Below.
- **maturity** - how real it is. See "Maturity and attestation".

A value added to `domain` needs a view in
assets/js/pages/platform/views.js or every row carrying it renders
nowhere; tests/unit/platform/views.test.js fails the build if one does
not have one.

## Choosing a kind

Seven kinds. The first four answer "what does the platform DO"; the
last three, added 2026-08-09, cover knowledge that previously had
nowhere to live and so either sat undistilled in work_documents or was
forced into 'capability', where it reads as a feature claim.

- overview - the top-level "what LP is". Usually one row.
- value - a value-proposition statement: the benefit, stated once.
- capability - an area or feature the platform provides. The bulk.
- glance - an at-a-glance headline, for a summary strip.
- technical - stack, database, dev style, deployment, integrations
  approach. What a session needs to answer "how is this built" rather
  than "what does it do". Redact endpoints and credentials as always.
- styling - design values, component patterns, spacing and tone of
  voice, at enough detail to spin a prototype that looks right.
  LPIO's own tokens live in assets/css/tokens.css; this kind is for
  the PRODUCT's styling, which is a different thing.
- positioning - how the platform is sold and to whom. Distinct from
  'value': a value row is one proposition, a positioning row is the
  audience and the argument around it (who it beats, on what).

If a piece of material fits two kinds, split it into two rows rather
than picking one - each row is a discrete fact, and the link graph
(supabase/schema/33_links.sql) is how they stay connected.

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
   document via source_document_id. Each row gets a kind (see "Choosing
   a kind" below). Default assumption: a comprehensive
   "what the platform does today" overview describes shipped
   capability, not aspiration, so rows load as maturity 'live' and
   verified = true unless the source itself flags something as
   planned or exploratory. Mark a row down (lower maturity,
   verified = false) only when there is a specific reason to doubt
   the claim; later review can realign it in either direction.
4. When a new overview replaces an earlier one, sets supersedes_id on
   the new work_documents row and status 'superseded' on the old one,
   same as any other document kind.
5. Runs the block check below before finishing, and fixes anything it
   reports.

Database inserts only; the repo does not change for a content load.

### The block check

A typed block whose renderer finds nothing draws an empty shell - an
`<h4>` with no heading, a `<tbody>` with no rows. That is worse than an
unrecognised kind, which at least renders generically and says so
(assets/js/core/blocks.js). It happens when a row is written with the
wrong key name: `kv` reads `items`, not `pairs`; `values` reads
`values` and `name`, not `items` and `label`. Neither mistake produces
an error anywhere.

The suite cannot catch this - it has no database access, by design -
so it is a step in this protocol. Run it after any write that touches
`blocks`, and expect every count after the first two columns to be zero:

    with b as (
      select c.key as cap, e.b
      from product_capabilities c, jsonb_array_elements(c.blocks) e(b)
    )
    select b->>'kind' as block_kind, count(*) as n,
      count(*) filter (where b->>'kind' not in
        ('p','note','code','table','kv','values')) as unknown_kind,
      count(*) filter (where b->>'kind' in ('p','note')
        and coalesce(b->>'text','') = '') as empty_text,
      count(*) filter (where b->>'kind' = 'code'
        and coalesce(b->>'text','') = '' and not (b ? 'json')) as empty_code,
      count(*) filter (where b->>'kind' = 'kv'
        and coalesce(jsonb_array_length(b->'items'), 0) = 0) as empty_kv,
      count(*) filter (where b->>'kind' = 'values'
        and coalesce(jsonb_array_length(b->'values'), 0) = 0) as empty_values,
      count(*) filter (where b->>'kind' = 'table'
        and coalesce(jsonb_array_length(b->'rows'), 0) = 0) as empty_table
    from b group by 1 order by 1;

`api_topics.blocks` uses the same vocabulary; swap the two table names
to check the reference the same way.

## What the page shows, and what it asks for

modules/platform/ renders every store above, not just the capability
catalogue: the lead-to-live journey from journey_stages, the glossary
from domain_terms, the recorded facts from work_notes (kind 'fact'),
and the source documents each record was distilled from. A capability
card also carries its provenance and any typed links out of it, so
"what is the roadmap doing to this capability" reads off the card.

Above all that sits a **Coverage** panel that names the gaps: areas
with no capability recorded, capabilities with neither a summary nor
any blocks, capabilities with no source, and unverified terms. That
panel is the prompt to write - a gap should be something to fill, not
something to discover. When a round of ingestion finishes, read it and
decide whether the next round is more capture or filling the holes.

One rule this enforces mechanically: every kind allowed by the
constraint on product_capabilities.kind must have a place on the page
(tests/unit/platform/knowledge.test.js). Three kinds were added in
August 2026 and rendered nowhere for a week because the page filtered
for kind='capability'; anything unplaced now falls through to a
backstop section rather than vanishing.

## Retrieval protocol

To brief a session on current platform capability, one call:

    select platform_context('<area-key>');

It returns, for that area: the capabilities with their blocks, maturity,
attestation and as_of; the lifecycle stages and glossary terms they
touch; the facts, decisions and risks recorded against the area; the API
endpoints that serve them; the delivered and the planned work items; and
the provenance of every claim. `select platform_context(null)` orients
instead - the platform-level statements plus the index of every area and
its coverage. `select platform_context_gaps()` returns what is missing.

This used to be six queries written out by hand in every session that
bothered, and most did not: on 2026-09-07 eight product areas carried
186 open work items and no capability at all, and docs/ROADMAP-INTAKE.md
- the protocol that runs on every quick capture, the highest-volume
write path there is - had never read product_capabilities once. A
protocol that costs six queries is a protocol nobody runs.

The deep archive is still a second query on purpose: fetch the linked
work_documents row (via source_document_id) only when the distilled
summary is not enough.

## Maturity and attestation

maturity is the axis the roadmap gets contextualised against:

- live - shipped and in production use today.
- partial - shipped but incomplete, or live for some segment only.
- planned - not yet built; on the roadmap.
- exploratory - an idea, not yet committed.

This catalogue exists to document what the platform does today, so the
default reading of a comprehensive current-capabilities overview is that
everything it describes is shipped: rows load as maturity 'live'. Mark a
row down only when there is a concrete reason to doubt it - the source
flags something as planned, or the owner knows it has slipped. This is a
living catalogue: realign a row in either direction as reality changes.

**attestation says WHO stands behind the row**, and it replaced the
`verified` boolean on 2026-09-07 because a boolean could only say yes or
no - so an owner's judgement and a claim nobody had examined were the
same value.

- **owner** - the owner knowingly accepted this row at this maturity,
  recorded as a decision. **An assistant may never set this**, on any
  reasoning, including a request to. It is the one word in this store
  that means a person checked.
- **derived** - a session distilled it from rows the owner already owns,
  restating them and nothing more, with an `about` link to every source.
  Not owner-checked, and not a guess either.
- **unattested** - neither. The honest default for a bare insert.

`verified` survives as a generated column reading `attestation = 'owner'`
so older code keeps working. Do not write to it; it has no setter.

**as_of** is when the claim was last checked against reality, which
`updated_at` cannot say - it cannot tell a typo fix from a re-check. The
staleness figure compares it against delivered work in the same area, so
shipping something marks the rows it may have invalidated without anyone
having to remember.

## Deriving a capability from delivered work

A session may write a capability without the owner present, and the six
rules below are what make that safe. They are enforced by
tests/checks/knowledge-drift.test.js, not merely recommended.

1. **Evidence must be owner-owned and delivered.** Only `work_items`
   with status 'done', `work_notes` of kind 'fact' or 'decision',
   `work_documents` of kind 'platform', and `api_endpoints` may be
   evidence. **An open item is never evidence that a capability
   exists** - at most it sharpens an existing row's planned blocks.
2. **Quote-bound.** Every assertion restates specific source text. A
   claim needing a leap is not written; it becomes a `work_notes`
   question against the area.
3. **Contradictions are recorded, not resolved.** Two sources
   disagreeing produce a `risk` note naming both and their dates, never
   an assertion picking a winner. Watch for the closed row whose own
   text says nothing was delivered - four were found in the first pass,
   including two containers closed because they emptied.
4. **Maturity follows the evidence.** All sources delivered -> live;
   mixed -> partial; only planned sources -> no row at all.
5. **Every row is traceable.** attestation 'derived', as_of from the
   newest source, source_document_id pointing at a derivation record
   that names the method AND what was deliberately excluded, plus one
   `about` link per source. "Where did this claim come from" is one
   query, always.
6. **Run the block check** below before finishing.

A decision NOT to write is also a decision: record it as a derivation
document, so the next session does not have to re-reach it.

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
