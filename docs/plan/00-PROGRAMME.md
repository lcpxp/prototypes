# Alignment programme

The spine of a single piece of work: review the supplied LaunchPad
codebase properly, bring the API reference into line with it, write
what is verified into the system as durable knowledge, stop burying
that knowledge behind partial renderers, and add the two features
(portal review waves, prototype ideas) the current shape is missing.

Eight workstreams, one file each. Read this first, then the file for
the workstream in hand. Nothing here restates the existing protocols -
docs/WORKFLOW.md, docs/PLATFORM.md, docs/ROADMAP-INTAKE.md,
docs/ROADMAP-PLAYBOOK.md and docs/APP-REVIEW.md remain the one home
for what they cover, and this plan cites them rather than repeating
them.

    10-CODE-REVIEW.md      how to review the LaunchPad codebase
    20-API-REFERENCE.md    bring reference 2.0 into line with the code
    30-KNOWLEDGE.md        write verified findings in, including style
    40-SURFACING.md        stop burying content anywhere in the portal
    50-DASHBOARD.md        rebuild the dashboard around what we do now
    60-PORTAL-REVIEW.md    portal review waves, as a portal feature
    70-PROTOTYPE-IDEAS.md  prototype ideas and plans area

## What was reviewed to write this

Three inputs, read directly, not summarised from memory.

**Pxp.PartnerPortalApi** - the LaunchPad API. .NET onion architecture
(Domain / Application / Infrastructure / Presentation / Host), 2,854
files of which 2,600 are C#, four layered feature trees of 31 to 38
folders each, URL-segment API versioning. **51 controller files carry
552 route attributes**, every one distinct after normalisation: 376 on
`[ApiVersion("1.0")]`, 150 on `[ApiVersion("2.0")]`, and 26 on
controllers with no version attribute at all - these serve unversioned
`/api/...` paths and are the single most misdocumented group. There
are no minimal-API endpoints, no controller with two route bases and
no action with stacked verb attributes, so a composed extractor sees
the whole surface.

**Pxp.PartnerPortal** - the LaunchPad front end. Angular 20, 785
files, Azure MSAL / B2C auth, two tenants (`/pxp` for system admin,
`/app/:tenantId` for partners), CUBE CSS with Every Layout, a single
compiled stylesheet, and a written CSS ruleset at
`src/styles/styling-rules.md`. It issues HTTP from **405 call sites
across 88 files** - the consumer's view of the API, and a third
opinion to reconcile against the other two. Note for the tooling: 212
of those declare their base URL outside the calling file, so full-path
resolution needs the environment and config files read too. A
single-file extractor resolves fewer than half.

**launchpadreviewboard_1.html** - the wave 4 review board. **39 areas
in six parts** (8 / 14 / 7 / 2 / 2 / 6), **183 recorded entries**
across five waves, a standing brief with ten standing asks, and a
closing statement. Content to be discarded; structure and method to be
kept. Modelled in 60-PORTAL-REVIEW.md.

Against those, the live database (project `zlmkofbkobmhnslfnqsf`) and
this repository at every commit up to `4c0bf7b`.

## The state we are actually in

Numbers taken from the live database and the supplied source, not
estimated.

| Surface | Now | Reality it should match |
|---|---|---|
| Reference: LaunchPad Partner Portal API 2.0 | 245 endpoints, no duplicates | 552 routes in code |
| Endpoints in code with no reference row | **319**, of which 219 are real gaps | 0, or explicitly excluded |
| Reference rows with no matching route | **12** | 0 |
| Reference: Unity Acquiring API 2.0 | 151 endpoints | no source supplied - unverifiable |
| Reference: Inbound Onboarding (planned) | 29 endpoints | design intent, not code |
| Platform capabilities | 21 rows | 0 of kind `styling`, 0 `positioning`, 2 `technical` |
| Knowledge links, live | 50 | the two renderers express 2 of 49 possible type pairs; 4 links render nowhere |
| Work notes | 174 | **20 orphans** anchored to nothing, visible on no page |
| Roadmap milestones / item phases | 0 / 0 | dead schema and a dead drawer section |
| `work_item_dependencies` | documented in ARCHITECTURE.md | **does not exist in the database** |
| Global nav search | 6 sources | notes, documents, terms, journey stages, topics, specs and future prototypes are all unsearchable |
| Review waves | 0 | the app-review module has never carried data |
| Future prototypes | 14 rows, 3 columns | no status, priority, plan or promotion path |
| Dashboard | 8 count cards, a meter, 8 activity rows | says nothing about workstreams, reference, tools or reviews |

Two things follow from that table. The reference accounts for 56% of
the route surface and is wrong in twelve places. And the system
has become good at *storing* knowledge some time before it became good
at *showing* it - which is the burying problem, stated as data.

## The provenance ladder

Everything this programme writes into the database carries a grade.
This is the mechanism that keeps "contextual information obtainable
from verified code review" separable from everything else, and it uses
columns that already exist rather than inventing new ones.

| Grade | Means | Recorded as |
|---|---|---|
| `verified-code` | Read in the supplied source at a named file and line, restated with no inference | `verified = true`, source document cites the path and line range |
| `verified-behaviour` | Observed working in a named environment | `verified = true`, source document names the environment and date |
| `stated` | Asserted by a named person and recorded as theirs | `verified = false`, body opens "Red states..." |
| `inferred` | Derived by a session from code plus context | `verified = false`, `work_notes` row of kind `question` raised alongside |
| `assumed` | A working assumption with no source | never written as fact; only as a `question` note |

Three rules make it hold:

1. **A grade never rises on its own.** An `inferred` row becomes
   `verified-code` only when a session cites the file and line, or the
   owner confirms it. Rewriting the summary does not promote it.
2. **The citation lives in the source document, not the fact.** A
   `work_documents` row of kind `codereview` holds the verbatim
   extract and its `path:line` citations; the capability or note rows
   distilled from it carry `source_document_id`. One home for the
   evidence, many rows citing it.
3. **Environment facts are not code facts.** The review board's
   closing statement is emphatic about this: screening on a returned
   contract, the contract-signed email, and Pending Merchant Signature
   all behave differently per environment, and several review waves
   were spent on what turned out to be deployment configuration. A
   fact that is only true on production is recorded with the
   environment named in the body, never as a flat capability claim.

## Sequencing

Four phases. Phase 1 is prerequisite to everything; phases 2 and 3 run
independently of each other; phase 4 depends on both.

**Phase 1 - Ground truth (10, 20).** Extract the three endpoint
inventories, generate the coverage report, fix the twelve wrong rows,
and land the drift gate that keeps the reference honest from then on.
Nothing else in this programme is safe to build on a reference that
accounts for 56% of the surface, because the knowledge workstream will
cite it.

**Phase 2 - Show what we hold (40, 50).** The surfacing work and the
dashboard. These are pure repository changes against data that already
exists; they do not wait on the review. Doing them early means every
later wave of knowledge lands somewhere visible, which is the whole
point of the exercise.

**Phase 3 - Capture (30).** Platform knowledge, style knowledge, and
the context written back onto existing work items. Runs continuously
once phase 1 has produced verifiable material, and feeds phase 2's
surfaces.

**Phase 4 - New features (60, 70).** Portal review waves and the
prototype ideas area. Both are new schema plus new pages, and both
should be built after 40 lands so they inherit the universal detail
renderer instead of growing their own.

A reasonable order of first commits:

    1. scripts/extract-routes.js and the coverage report    (20)
    2. reference corrections: the 12 wrong rows             (20)
    3. reference drift gate                                 (20)
    4. entity-aware knowledge links, everywhere             (40)
    5. universal fact renderer + orphan surfaces            (40)
    6. dashboard rebuild                                    (50)
    7. codereview document kind + first capture wave        (10, 30)
    8. style capability load                                (30)
    9. portal_review schema + protocol + board              (60)
    10. prototype ideas schema + page                       (70)

## Principles binding all eight workstreams

- **Verified or labelled, never quietly asserted.** Every fact written
  in carries its grade. A session that cannot cite a file and line
  writes a `question` note instead of a `fact` note.
- **One home per concept.** The gate in
  tests/checks/roadmap-intake.test.js exists because the confidence
  bands ended up stated in three files. Every new document in this
  programme cites rather than restates, and each earns its own gate
  entry where it introduces a vocabulary.
- **Nothing is stored-but-invisible.** Any column, block kind, link
  type or table this programme adds must render somewhere on first
  commit, with a generic fallback for values it does not yet know.
  40-SURFACING.md makes that mechanical.
- **Rows close, schema goes.** Review findings, work items and notes
  close with a status, a resolution and a back-link. Dead columns,
  dead tables and dead renderer branches are removed - milestones and
  phases are the first two candidates.
- **The browser reads; sessions write.** Every content change in this
  portal is made in a Claude Code session over the service connection,
  never through a form on a page. Settled by the owner, 13 Aug 2026,
  and binding on all eight workstreams: no workstream may propose a
  front-end write path, an editor, an inline control that mutates a
  row, or a "narrow" write policy for one column. Browser policies
  stay select-only for content tables; admin insert/update/delete
  policies exist for the service connection alone. This is what keeps
  the portal a rendering surface and the session the single point at
  which judgement is applied.
- **The repo stays public and empty of substance.** No merchant names,
  no live endpoints, no credentials, no internal hosts. Every worked
  example in these eight files uses generic values. The LaunchPad
  source is read from a scratch directory and never committed.
- **Each commit is green and reviewable.** `npm test` passes, the
  drift gate is green, and a user-visible change adds its line under
  Unreleased in docs/CHANGELOG.md in the same commit.

## Decisions needed before phase 1 closes

These change what gets built; everything else is a judgement call a
session should make and record. One further question - whether the
portal should grow a front-end write path - was **settled by the owner
on 13 Aug 2026: it should not.** It is recorded as a binding principle
above rather than as an open decision.

1. **Reference scope.** Does the LaunchPad Partner Portal API spec
   aim for all 552 routes, or a curated surface with the remainder
   listed as known-but-undocumented? Recommendation: full coverage of
   v2 plus everything the front end calls; a coverage register for the
   rest. 20-API-REFERENCE.md is written for that reading.
2. **Unity Acquiring API.** 151 endpoints with no source supplied.
   Recommendation: mark the whole spec `stated` until a source or a
   live Swagger arrives, so it cannot be mistaken for verified.
3. **Commented-out routes.** `InputsController`, `InputValuesController`
   and seven v2 merchant sub-resources exist only as comments.
   Recommendation: a `planned` badge and a topic entry, never an
   endpoint row.
   *Measured in wave 2, 13 Aug:* the two controllers are commented out
   in their entirety - every line prefixed with `//` - carrying three
   actions each. That is exactly the difference between the 53
   `*Controller.cs` files on disk and the 51 the route extractor
   reports, so both figures were right and the gap is now explained
   rather than outstanding. The decision itself is still open: it is
   about what the reference should say, not about what the code does.
4. **Milestones and phases. CLOSED 2026-08-13: leave them.** Both
   tables are empty, so removing them changes nothing a user sees and
   nothing a test checks. The case was tidiness, and a destructive
   migration wants a better reason. See 40-SURFACING.md.
5. **Review findings and work items.** Should a promoted finding
   become a new `work_items` row, or fold into an existing one? The
   review board's own convention was "prefer merging into the older
   row, a finding gets its own row only if Luke says so".
   Recommendation: keep it, with the promotion pass in 60 making the
   choice explicit per finding.

## Definition of done for the programme

- The reference reports its own coverage against the code, and the
  number is either 100% or explicitly reconciled.
- A drift gate fails the build when the reference and the extracted
  route inventory disagree.
- Every `product_capabilities.kind`, every `work_notes` anchor, every
  `knowledge_links` entity type and every jsonb block kind renders on
  at least one page, proven by a test.
- Zero orphan notes; zero dead columns; ARCHITECTURE.md describes only
  tables that exist.
- A portal review wave can be opened, filled from a chat session,
  walked in the browser, triaged into roadmap work, and closed - with
  the residue archived rather than deleted.
- The dashboard answers "what is being worked on now and next" without
  a click.
