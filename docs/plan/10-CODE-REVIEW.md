# Reviewing the LP codebase

How to work through the two supplied repositories so that what comes
out is usable as fact rather than as impression. This is a different
lens from the walkthrough review that produced the wave 4 board: that
one asked "what does this screen do wrong", this one asks "what is
actually built, and does the rest of our system agree with it".

Read 00-PROGRAMME.md first for the provenance ladder. Everything below
assumes it.

## What is in scope, and what is not

In scope, because the source is on hand:

- `Pxp.PartnerPortalApi` - the LP API. Onion architecture with
  four source layers plus `Host`, and three test projects: `Unit`,
  `Integration` (feature files plus step definitions) and `E2E`, whose
  folders - Actors, Abilities, Tasks, Questions, Drivers - are the
  screenplay pattern.
- `Pxp.PartnerPortal` - the Angular 20 front end.

Out of scope, and must be labelled `stated` wherever it appears:

- **Merchant Portal.** The reference carries a 151-endpoint Merchant Portal Acquiring API
  spec with no source to check it against. The API repo has a `Merchant Portal`
  feature folder, which tells us what LP *calls*, not what
  Merchant Portal *offers*.
- **The payment service, DaoPay's own systems, Adobe Sign, Experian
  Bank Wizard, Companies House, IdPal, WebShield.** Integration edges
  are visible from our side only.
- **Anything on a branch.** The review board records that much of the
  DaoPay automation sat on branches and that "the repos and commits on
  hand looked stale against what is deployed". Treat the supplied
  snapshot as one point in time and record its provenance as such.

## Traps already found, before any wave runs

Each of these was hit while writing this plan. They are listed here so
a session does not re-learn them, and they seed the findings register.

1. **Commented-out controllers look live.** `Inputs/V1/InputsController`
   and `InputValues/V1/InputValuesController` are entirely commented
   out - route, version and every action. A naive grep for `HttpGet`
   with no anchor picks them up.
2. **A `V0` folder holds live code.** `ProductAssignment/V0/PartnerProductsController`
   is real and routed, but declares `[Route("api/partners")]` with **no
   `[ApiVersion]`** - so it serves unversioned paths. The folder name
   suggests dead code; it is not.
3. **Route bases are not where the path suggests.** `AdminMerchantController`
   is `[Route("api/v{version:apiVersion}/admin/merchant")]`, so its
   `[HttpPatch("price-sheets/{priceSheetId}")]` action serves
   `/api/v1/admin/merchant/price-sheets/{priceSheetId}` and not
   `/api/v1/admin/price-sheets/{...}`. Always compose the action route
   onto the controller route; never read the action attribute alone.
4. **Planned routes are documented in comments.** `MerchantApplication/V2/MerchantApplicationsController.cs`
   carries a commented block listing `GET /{id}/merchant/sites`,
   `/persons`, `/banks` and four more. Three of those are in our
   reference as if they shipped.
5. **The version segment is a template, not a literal.**
   `api/v{version:apiVersion}` resolves from the controller's
   `[ApiVersion]`. Substituting it naively yields `api/vv1/...`.
6. **Behaviour differs by environment, by design.** The review board's
   closing statement lists screening on returned contracts, the
   underwriting notification email, and Pending Merchant Signature as
   production-only or environment-gated. A fact read from code without
   its configuration is half a fact.

## The mechanical extractions

Do these once per snapshot, before any reading. They are cheap,
repeatable, and they turn "review the codebase" into a bounded task.
Scripts live in `scripts/` beside the other generators, and read from
a scratch checkout of the LP source - never from a committed
copy. `scripts/extract-routes.js` is the first of them.

| Extraction | Source | Output | Used by |
|---|---|---|---|
| Route inventory | `[Route]` + `[ApiVersion]` + `[Http*]` across `src/Presentation` | method, path, version, controller, file:line | 20 |
| Consumer inventory | `.get/.post/.put/.patch/.delete(` calls across `src/app` | method, URL template, service, file:line | 20 |
| Auth surface | `[Authorize]`, `[AllowAnonymous]`, policy names, role constants | endpoint → required role | 30 |
| Enum vocabulary | SmartEnum types and `*.constant.ts` files | canonical value lists (statuses, risk levels, tag colours) | 20, 30 |
| Guard and route map | Angular `Routes` arrays and `CanActivate` guards | tenant → route → guard → role | 30 |
| Style ruleset | `src/styles/styling-rules.md`, `global.scss` layer manifest, `blocks/*` | the design system, as facts | 30 |
| Integration edges | `HttpClient`/`SendGrid`/`SFTP`/`Adobe`/`Merchant Portal` service classes | outbound dependency list | 30 |

Two rules on the scripts: they are read-only and they emit a report,
never a database write. Every write goes through a session that has
read the report and judged it.

## The eight review waves

One slice per wave, chosen so that a wave is a coherent story rather
than an alphabetical sweep, and so the slices line up with the areas
the walkthrough review already used.

| Wave | Slice | Principal feature folders |
|---|---|---|
| C1 | Identity, tenancy, access | Auth, User, Partner, SalesTeam, SalesOrganizations; Angular guards and `V2AuthService` |
| C2 | Merchant and application core | Merchants, MerchantApplication v1 and v2, MerchantApplicationSummary, drafts, status transitions |
| C3 | The application form | Inputs, InputValues, OnboardingFlow, MerchantDocuments, ExternalAsset, steps and questions |
| C4 | Commercial | ProductDefinition, ProductAssignment, ShoppingCarts, Orders, RateSheet, PriceSheets, Quote, ServiceDefinition, service fees |
| C5 | Risk and decision | Screening, IndustryCodes, Acquirers, approval / reject / override, CompaniesHouse, WebShield, IdPal |
| C6 | Contracts | Adobe Sign, contract generate / send / void, DaoPay KYC contract, terminal financing, webhooks |
| C7 | Integrations and automation | Merchant Portal, DaoPay, CRM, Emails, Provisioning, PaymentServiceV5, EITManagement, SFTP |
| C8 | Cross-cutting | Metrics, Auditing, Logger, Appearance, RegionDefinitions, Country, Azure, configuration and environments |

A wave is not finished when the files have been read. It is finished
when its four outputs exist.

## The four outputs of a wave

**1. One `work_documents` row, kind `codereview`.** The verbatim
extract: the route table for the slice, the enum values, the guard
matrix, and the specific `path:line` citations behind every claim the
wave makes. This is the evidence, kept whole, exactly as
docs/WORKFLOW.md treats every other source. `kind = 'codereview'` is a
new value on the existing check constraint - see the schema note
below. Redact nothing except credentials and live hostnames; a route
template is not a secret, a deployed host is.

**2. Reference corrections.** Every endpoint the slice touches
reconciled against the reference: rows added, rows corrected, rows
retired. Procedure and the exact SQL are in 20-API-REFERENCE.md.

**3. Knowledge rows.** Capabilities, terms, journey stages and facts
distilled from the evidence, each linked back to the document by
`source_document_id`, each carrying its grade. Procedure in
30-KNOWLEDGE.md.

**4. Context onto existing work items.** This is the output most
easily skipped and the one the owner asked for by name. For every
active work item in the slice's area, ask three questions and record
the answer as a note on the item:

- *Is this already built?* If the code says yes and the item says
  planned, that is a `fact` note plus a status question for the owner.
  Never close an item from code alone.
- *Is this harder or easier than the item assumes?* A named class, a
  missing abstraction, a hardcoded flag - all of it is a `fact` note
  with a citation.
- *Does the code contradict the item's premise?* The acquirer
  third-party flag is the worked example: the review board records
  that clearing a flag commits to a full suite of screening flows,
  products and pricing, so "add Elavon" is a one-line seed plus an
  entire readiness programme. That belongs on the item.

## Evidence rules

Borrowed wholesale from docs/APP-REVIEW.md's classification rules,
because they were learned the hard way and they transfer.

- **Never fabricate.** If a behaviour is not in the source, it does
  not exist. Absence of a route is evidence of absence only for the
  snapshot supplied.
- **Distinguish what the code does from what a person said it does.**
  A `stated` fact keeps the speaker's name in the body. When code and
  statement disagree, record both and raise a `question` note; do not
  silently prefer either.
- **Distinguish code facts from environment facts** (trap 6). Name the
  environment in the body or leave the claim ungraded.
- **Never complete a partial reading.** A method whose body calls into
  an interface with no implementation in the snapshot is "declared,
  implementation not in the supplied source", not "implemented".
- **Surface the consequence, not just the finding.** The most valuable
  line a wave produces is usually "and therefore X elsewhere is
  wrong": the commented-out v2 merchant sub-resources are not just
  three bad rows, they are three endpoints somebody may have planned a
  prototype around.
- **Corrections are cheap and expected.** Reclassifying a finding is
  one update; put the overturned reasoning in the note body so a later
  session does not propose it again.

## The findings register

A code-review wave produces findings that are neither reference rows
nor platform facts: defects, risks, oddities, questions for the
developers. Those go into the portal review feature built in
60-PORTAL-REVIEW.md, as a wave of kind `code`, so they get the same
triage-and-promote treatment as walkthrough findings and do not
accumulate in a document nobody rereads.

Until that ships, they go in as `work_notes` of kind `risk` or
`question` against the relevant area, and get swept into the first
code wave once it exists.

Seed entries, verified while writing this plan:

| Finding | Grade | Consequence |
|---|---|---|
| Two controllers exist only as comments (`Inputs`, `InputValues`) | verified-code | Dead surface; either finish or delete. Ask before assuming intent. |
| `PartnerProductsController` serves unversioned paths from a `V0` folder | verified-code | Four routes outside the versioning scheme; reference documents them as v1 |
| Seven v2 merchant sub-resources are commented planning stubs | verified-code | Three are in our reference as live |
| `ServiceFeesController` uses literal category segments, not a parameter | verified-code | Reference invents a `{category}` path parameter that does not exist |
| `admin/price-sheets` is really `admin/merchant/price-sheets` | verified-code | One wrong path in the reference |
| No unit test suite on the front end, by decision | verified-code | Type-check with `npx ngc -p tsconfig.app.json --noEmit`; QA's Playwright suite is external and depends on `data-testid` |
| The reference files the onboarding-flow delete under the acquirer path | verified-code | The real one is `DELETE /api/v1/onboarding-flows/{id}` on the standalone controller, whose 19 routes the reference does not cover at all |
| Front end HTTP comes from 405 call sites in 88 files | verified-code | 212 declare their base URL outside the calling file, so the consumer inventory needs config and environment resolution |

## Schema change this workstream needs

One migration, one line, plus its schema file and policy check:

    alter table public.work_documents
      drop constraint work_documents_kind_check;
    alter table public.work_documents
      add constraint work_documents_kind_check
      check (kind in ('prd', 'roadmap', 'backlog', 'devops', 'sprint',
                      'meeting', 'discussion', 'platform',
                      'codereview', 'other'));

Update `supabase/schema/30_work.sql` in the same commit, regenerate
`supabase/schema-snapshot.json` with `npm run snapshot`, and confirm
the drift gate is green. `codereview` needs no new policy: RLS on
`work_documents` already gates on the backlog grant.

The backlog page filters documents by kind for display; check
`assets/js/pages/backlog/backlog.js` renders the new kind rather than dropping
it, and add the case to `tests/unit/` alongside the existing document
benchmarks. That check is the workstream's own instance of the rule in
40-SURFACING.md: a new enum value that renders nowhere is a bug on the
day it is added.

## Done when

- All eight waves have a `codereview` document with citations.
- The route inventory, consumer inventory and reference agree, or
  every disagreement is a row in the coverage register with a reason.
- Every active work item in a reviewed area carries at least one note
  written from the code, or an explicit "no code bearing on this".
- The findings register holds the defects and questions, triaged, with
  the promoted ones on the roadmap and the rest archived against the
  wave that raised them.

## Wave 3, 14 Aug: the journey model against the instrumentation

Waves 1 and 2 read the front end's styling and the API's architecture.
Wave 3 took the last thing the plan named - domain terms and journey
stages - and checked them against what the code actually records.

The glossary held up: 34 terms, every one with a definition and a
source, and the code contradicted none of them. One term was missing
and has been added - the application event log, which a reader meeting
`MerchantApplicationEventLogType` in the API had nowhere to look up.

The journey model did not, and the mismatch is now finding CR3-02.
`journey_stages` carries 13 stages from the Merchant Portal Integration PRD,
owner-validated. `MerchantApplicationEventLogType` declares **17**
events, and `TimelineUtility` maps 16 of them and computes the gap
between each pair - which makes that order authoritative rather than
merely declared. Against each other:

- **Two events have no stage.** `APPLICATION_STARTED` is the timeline
  origin, so the model has no stage for where an application begins.
  `PRODUCT_ASSIGNMENT` sets a date the v2 summary repository reads.
- **Two stages fold two events each.** Contract covers sent and
  signed; Third-Party Checks covers started and complete. Each has a
  start and a finish the model cannot express.
- **One pair is ordered the other way round.** The model puts Related
  Entities before Product Selection; the code computes
  `RelatedEntities - ProductSelection`.
- **The last stage has no timeline slot.** `ACTIVE_MERCHANT` is on the
  enum but not in the mapping, so the stage that matters commercially
  contributes no date.
- **The elapsed-time field names are offset.** Each `TimePassedSinceX`
  measures the gap ending at X's successor, and
  `TimePassedSincePeopleSiteBanks` names something that is not an event.

Left for the owner rather than applied. Reshaping an owner-validated
model to match instrumentation is a decision about what the model is
for, not a correction, so the finding carries `owner_action`.
