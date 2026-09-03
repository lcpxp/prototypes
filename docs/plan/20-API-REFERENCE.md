# Aligning API reference 2.0 with the code

The reference is the most consequential thing in the portal, because
it is the surface people act on. This workstream makes it provably
match the supplied LP source, and then keeps it matching.

Schema: `supabase/schema/10_reference.sql`. Renderer:
`assets/js/pages/reference*.js`. Every change here is a database
write; the repository changes only for the extractor, the coverage
artefact and the drift gate.

## What "aligned" means - five levels

Alignment is not one thing. A row can be right about its path and
wrong about everything else, so the work is graded and the coverage
report reports each level separately.

1. **Existence.** Every route has a row, or is explicitly excluded
   with a reason. No row exists without a route.
2. **Shape.** Method, path, path and query parameters, required
   headers and the response status set match the controller signature
   and its `ActionResult<T>`.
3. **Semantics.** Summary and description say what the endpoint does,
   in the code's own vocabulary, with its authorisation requirement
   (`[Authorize]`, role, tenant scope) stated.
4. **Values.** Enumerations match the SmartEnum or constant file they
   come from, stated once in the "Accepted values and field rules"
   topic rather than repeated per endpoint.
5. **Narrative.** The topics - runbooks, conventions, data model,
   business logic, gap register - reflect current behaviour, and the
   gap register shrinks as waves land.

Level 1 is mechanical and gets a gate. Levels 2 to 5 are judgement and
get a wave.

## The three inventories

Two lists tell you what is missing; three tell you what matters.

**Inventory A - the routes.** From `src/Presentation`, one entry per
`[Http*]` attribute, composed onto its controller `[Route]`, with the
version substituted from `[ApiVersion]`. **552 entries** in the
supplied snapshot: 376 v1, 150 v2, 26 unversioned.

**Inventory B - the reference.** From `api_endpoints`: **245 rows**
for the LP Partner Portal API.

**Inventory C - the consumers.** From the Angular front end, one entry
per `HttpClient` call. **405 call sites across 88 files.** C turns a
flat gap list into a priority list: a route with no consumer is
admin-only tooling, dead, or used outside the front end - each a
different answer, worth knowing before writing 219 rows. One
requirement falls out of building it: **212 of the 405 declare their
base URL outside the calling file**, so the extractor must read
`src/config/` and the environment files too. A single-file regex
resolves fewer than half and silently collapses the rest onto one
token.

## Normalisation rules

Getting these wrong produces a diff that is confidently wrong, which
is worse than no diff. Each was needed to make the real comparison
come out right.

- **Compose, never read the action attribute alone.** Controller
  `[Route]` plus action route on a single slash; an empty action route
  means the controller route itself.
- **Substitute the version, do not template it.** `api/v{version:apiVersion}`
  with `[ApiVersion("2.0")]` is `api/v2`. Replacing the placeholder
  with `v2` yields `api/vv2` and breaks every comparison.
- **Placeholders are positional, not named.** `{id}`, `{applicationId}`
  and `{merchantApplicationId}` are the same slot. Normalise every
  `{...}` to `{}` before comparing; keep the real name in the row.
- **Compare case-insensitively.** `/api/Dropdown/CountryCodes` and
  `/api/dropdown/countrycodes` are one route.
- **Anchor the attribute match to line start.** `//   [HttpGet]` is a
  comment; two controllers and seven v2 actions exist only as comments.
- **No `[ApiVersion]` means unversioned, not v1.** Twenty-six routes
  serve `/api/...` with no version segment. Assuming v1 is the single
  largest source of wrong paths in the current reference.
- **Scope prefixes are a declared collapse, not a gap.** See below.

## The reconciliation, as it stands

| Bucket | Count | Meaning |
|---|---|---|
| Routes in code | 552 | inventory A |
| Documented, matching a route | 233 | correct rows |
| Documented, no matching route | **12** | wrong or aspirational rows |
| Undocumented, a **declared** v2 scope variant | 78 | covered by the badged convention |
| Undocumented, an **undeclared** v1 mirror | 22 | the same collapse, nowhere stated |
| Undocumented, genuinely absent | **219** | the writing job |

Accounted for by the declared convention: **311 of 552, 56%**. Accept
the undeclared v1 mirror and it is 333, 60% - but an undeclared
convention is how a reader ends up guessing, which is why the two
lines are separate.

**The scope-variant convention.** Thirty-nine v2 endpoints carry a
`3 scope variants` badge and a note: the same operation exists under
three prefixes - unscoped (admin), `/partners/{partnerId}/` and
`/sales-teams/{salesTeamId}/` - identical shapes, different
visibility. Documenting one row and naming the variants is right; two
things are unfinished. The code carries **95** v2 scope-prefixed
routes (48 partner, 47 team) against 39 badged endpoints, so **17 have
no documented unscoped twin** - only one lacks a twin in the code
itself. And the equivalent v1 collapse (`/v1/merchants/{}` against
`/v1/partner/merchant/...` and `/v1/admin/merchant/...`) is declared
nowhere, which is why those three groups show 74 gaps between them,
22 of them pure mirrors a declared convention would absorb.

## The twelve rows that were wrong - CORRECTED 2026-08-13

Each was traced to source and fixed; `phantom` is now 0 and the budget
ceiling holds it there. Kept as the record of what was wrong and why,
because the same mistakes are the ones a later wave will make again.

| Row | Fault | Fix applied |
|---|---|---|
| `GET,POST,DELETE /api/v1/partners/{}/products...` (3) | Controller is `[Route("api/partners")]` with **no `[ApiVersion]`** | Repathed to `/api/partners/...`; the missing detail read added |
| `PATCH /api/v1/admin/price-sheets/{}` | Action lives in `AdminMerchantController`, base `admin/merchant` | Repathed to `/api/v1/admin/merchant/price-sheets/{priceSheetId}` |
| `GET /api/v2/.../merchant/banks` · `/persons` · `/sites` (3) | Commented-out planning stubs | Retired, after recording all seven stubs in the gap register |
| `GET,PUT /api/v1/service-fees/{}` and `/{}/questions` (4) | An invented `{category}` parameter; the code has literal segments | Replaced by the 16 real endpoints across five fee families |
| `DELETE /api/v1/acquirers/{}/onboarding-flows/{}` | **Filed under the wrong resource.** That controller's only delete is `{id}/contracts/{contractId}` | Repathed to `DELETE /api/v1/onboarding-flows/{flowId}`; the contract delete added |

Applied as nine changes over twelve rows plus fourteen new rows they
implicated, the retired stubs written into the gap register first so
nothing was lost. Coverage 311/552 (56.3%) to 334/552 (60.5%), rows
245 to 256, `absent` 219 to 196.

## The remaining 196 gaps, in priority order

Priority comes from consumer evidence (inventory C), not group size.

### Measured 2026-08-14: the gap is 69, not 196

The priority list this section used to carry was ordered on a guess
about which surfaces the front end still calls. `scripts/extract-calls.js`
now measures it instead, resolving all 401 of the portal's call sites.
The answer reorders the work and shrinks it:

| | portal calls it | nothing calls it |
|---|---|---|
| **documented** | 342 | 4 |
| **not documented** | **69** | 127 |

So 196 undocumented routes are two different jobs. **69 are the
writing job** - live surface with no reference row. The other **127
are a register**: whole features nothing in the portal touches, which
should be present and findable but must never be shown as current.

**Of the 69, 38 were the merchant collapse - DONE 2026-08-14.**

The v1 merchant surface serves **twenty identical operations under
three prefixes**: `/api/v1/merchants` (unscoped), `/api/v1/admin/merchant`
and `/api/v1/partner/merchant`. Same action names, same shapes,
different visibility. A further twenty-seven operations are served by
two of the three.

The reference had been documenting this two ways at once - the
banks, persons, sites and documents operations under the partner
prefix, the order and fulfilment ones under the unscoped prefix - which
is why sixty routes read as undocumented when twenty rows already
described them. The twenty shared operations moved onto the unscoped
path, forty-seven rows now carry a `3 merchant scopes` or `2 merchant
scopes` badge naming the prefixes, and `gen-coverage.js` declares the
collapse.

One duplicate was folded in the process: `POST /api/v1/partner/merchant`
and `POST /api/v1/merchants` were two rows for one operation, and the
partner row's note claimed it mirrored `POST /api/v1/admin/merchant`.
There is no admin create - `AdminMerchantController` declares no create
action. That is a thirteenth wrong claim, of a kind the twelve
corrections did not cover: the row was real, its note pointed at a
route that does not exist.

Result: coverage **60.5% to 72.5%**, absent 196 to 152, the gap 69 to
**31**, undeclared mirrors 22 to **0**.

**Declared has to mean declared.** A rule marked `declared` in the
COLLAPSES table is an intention; the badge on the row is the evidence.
So a route only counts as a declared variant when the row it collapses
onto actually carries the badge - proven by removing them, which drops
coverage back to 60.3% and fails the gate. Without that, anyone could
decide a convention was obvious and gain twelve points of coverage
while every reader still had to guess.

**The last 31 - DONE 2026-08-14. The gap is 0.**

Sixteen rows and two more collapses closed it. The user surface is the
same six operations under an admin and a partner prefix, identical on
all six, so it collapses like the merchant one. Three v2 product
reads, the pre-screen validation and the partner addons each carry
scope variants, so one row apiece covers three routes.

**Where the collapse did NOT apply, and why that matters.** The
merchant *list* looks like the same mirror and is not: the admin form
returns `AdminMerchantSummaryReadModel` and takes `includeHidden`, the
partner form returns `PartnerMerchantSummaryReadModel` and takes
`salesTeamId` and `partnerId`. Two rows, each saying it is not the
other. This was caught by comparing every shared operation's return
type and parameter list mechanically rather than trusting the matching
action names - 46 of 48 were identical, and these two were not. The
create operation was the second: same body and response, but the
unscoped form takes `partnerId` where the partner-scoped one infers
it. It stayed one row, with the difference stated on it.

### The register - DONE 2026-08-14. Coverage is 100%

The 121 routes nothing calls are now rows of their own, each written
from its controller signature, each badged `no portal consumer`, each
carrying one sentence per family saying what the family is and what is
**not** known about it. Metrics, ShoppingCart and
MerchantApplicationsProducts say plainly that whether a BI tool or a
scheduled job reads them cannot be answered from the source and has
not been guessed. The four webhook receivers say the opposite thing:
their caller is Adobe Sign, ID-Pal or WebShield, so having no
front-end call site is what you would expect rather than a sign of
death.

Final state: **392 rows, 552 of 552 routes accounted for (100%), 0
phantom, 0 absent, 0 gap, 0 undeclared mirrors.** 411 routes are
called by the portal; 141 are not, and 125 rows say so on their face.

**What holds it there.** Every one of those figures is capped at 0 in
tests/reference-budget.json, and the two that are deliberately not
capped - how many routes are uncalled, and how many rows say so - are
held equal to each other instead. Probed four ways: drop a badge, drop
a stale row, add a gap, add an absent route. Each fails.

**The 127, by why nothing calls them.** These go in the register.

| Family | Rows | What it is |
|---|---|---|
| `Metrics` | 24 | an analytics surface with no portal consumer at all |
| `MerchantApplications` v1 | 23 | superseded by the v2 application surface |
| `OnboardingFlows` | 20 | the unscoped mirror of the acquirer-scoped controller the portal does call |
| `ShoppingCart` | 11 | draft-cart surface superseded by the merchant order routes |
| `EitManagement` | 7 | |
| `MerchantApplicationsProducts` | 7 | |
| `MerchantDocuments` | 4 | the unscoped third arm; admin and partner arms are both live |
| `Dropdown` | 4 | lookups the portal does not use |
| webhook receivers | 4 | Adobe Sign x2, ID-Pal, WebShield - **inbound from a third party**, correctly never called by a front end |
| the rest | 23 | ones and twos across sixteen controllers |

Two things follow. The webhook receivers are not dead: their consumer
is an external system, so "no portal consumer" is the wrong frame for
them and the register must say so. And `Metrics`, `ShoppingCart` and
`MerchantApplicationsProducts` are graded `verified-code` with the
consumer left as an open question - the source proves the routes exist
and that the portal does not call them, and proves nothing about
whether a BI tool or another client does.

### The defect this measurement found

`OnboardingFlowApiService.deleteOnboardingFlow()` calls
`DELETE /api/v1/acquirers/{acquirerId}/onboarding-flows/{flowId}`.
`AcquirerOnboardingFlowsController` declares no `[HttpDelete("{id}")]`
- its only delete is `{id}/contracts/{contractId}` - so that call
returns 405.

This is the same misunderstanding the reference made. Row twelve of
the corrections table above was that exact path, filed under the wrong
resource and repathed to `DELETE /api/v1/onboarding-flows/{flowId}`.
The reference has been fixed; the portal has not. And the route it
should be calling is one of the four now badged as having no consumer
- which is precisely why it has none.

## What a finished row looks like

Every column beyond method and path is optional and sparse rows render
cleanly - that is the design. But a row written from code review has
no excuse for being sparse, because the controller signature supplies
most of it.

- `summary` - one line, sentence case, verb first. "Approve an
  application, optionally overriding contract checks."
- `description` - what it does, requires and changes. Name the guard
  behaviour; state the environment if it differs.
- `params` - one entry per path and query parameter, named exactly as
  the controller declares it, with type, required flag, description.
- `request_headers` - only where one is required beyond the bearer.
- `request_example` - from the request DTO's shape, generic values.
- `responses` - the status set the action can actually return,
  including the failures the `Result` pattern produces, each with an
  example where the shape is not obvious.
- `auth_required` - true unless `[AllowAnonymous]`.
- `badges` - the existing vocabulary, extended only with cause.
  Counts across the whole reference: `admin only` 84, `PROD` / `DEV` /
  `TEST` 143, `3 scope variants` 39, `planned` 29 (all of them on the
  Inbound spec - this spec has none), `active-merchant gate` 25, plus
  `async`, `idempotent`, `GraphQL`, `Step N` (journey stage) and the
  two provenance badges below.
- `notes` - the thing a reader could not infer: a gotcha, a
  precondition, a cross-reference to another endpoint.
- `deprecated` - set it rather than deleting the row.

**Two provenance badges, used consistently.** `unverified` (4 in use)
means the row was written from a statement rather than from source;
`gap` (8 in use) means a known hole in our understanding of that
endpoint. A wave's job is to remove them, one endpoint at a time, and
the count of both is a headline on the coverage report. A row written
from a cited controller carries neither.

## The coverage artefact and the drift gate

The gate has to work in a public repository with no database access at
test time, and it must not leak LP route paths into git. Both
constraints are satisfied by reporting shape, not content.

**`supabase/reference-coverage.json`** - generated, committed, and
treated exactly like `schema-snapshot.json`. One object per spec:

    {
      "generated_at": "2026-08-13",
      "source_snapshot": "Acquirer.PartnerPortalApi @ <commit or date>",
      "specs": {
        "<spec title>": {
          "routes": 552, "documented": 245, "matched": 233,
          "phantom": 12, "scope_variants": 100, "absent": 219,
          "excluded": 0, "unverified_badges": 4, "gap_badges": 8,
          "route_digest": "<sha256 of the sorted normalised route list>"
        }
      }
    }

No paths, no hosts, no payloads - counts and one digest. The digest
changes when the API changes, which is the signal a session needs.

**`scripts/gen-coverage.js`** - run with Supabase access and a scratch
checkout of the LP source, the same shape as
`scripts/gen-snapshot.js`. Add `npm run coverage`.

**`tests/checks/reference-drift.test.js`** - runs with no network:

- the artefact exists, parses, and names every spec in
  `App.registry.specFamilies` that has endpoint rows;
- `phantom` is 0, or every phantom row is listed in an `excluded`
  block with a reason;
- `absent` is 0, or equals the declared exclusion count;
- `unverified_badges` and `gap_badges` are non-increasing against the
  committed previous value, so the register can only shrink;
- `generated_at` is not older than the newest migration, so the
  artefact cannot silently rot.

**`tests/unit/route-extract.test.js`** - the extractor's own
benchmarks, run against fixture controllers committed under
`tests/fixtures/controllers/`. These are synthetic files, written for
this repo, exercising every normalisation rule above: composed routes,
version substitution, unversioned controllers, commented-out actions,
named placeholders, a `V0` folder. This is the gate that keeps the
diff itself honest, and it needs no LP source to run.

## Per-wave procedure

Each code-review wave closes with a reference pass over its slice.

1. Filter the coverage report to the slice's route prefixes.
2. Read each controller action: signature, attributes, `Result`
   branches, and the DTO it takes and returns.
3. Write or correct the rows in one transaction, in tag order.
4. Drop `unverified` and `gap` badges the wave has answered, and add
   the answers to the spec's gap-register topic rather than deleting
   the question.
5. Regenerate the coverage artefact, commit it, confirm the gate.

Insert shape - `sort_order` keeps a tag in runbook order, and
`api_tags` gives the tag its blurb and position:

    insert into api_endpoints (
      spec_id, method, path, tag, summary, description,
      params, responses, badges, auth_required, notes, sort_order)
    select s.id, 'post', '<path>', '<tag>', '<summary>', '<description>',
      '[{"name":"applicationId","in":"path","type":"string",
         "required":true,"description":"<...>"}]'::jsonb,
      '[{"status":"200","description":"<...>"}]'::jsonb,
      '[{"tone":"info","label":"admin only"}]'::jsonb,
      true, '<the thing a reader could not infer>', 120
    from api_specs s where s.title = '<spec title>';

Correcting a path is an update, never a delete-and-insert: the row's
id is what deep links point at.

## The other two specs

**Merchant Portal Acquiring API (151 endpoints, 24 tags, 6 topics).** No source
supplied, so nothing in it can be graded above `stated`. Add a
spec-level note saying so, badge the endpoints `unverified` until a
Merchant Portal source or live Swagger arrives, and keep its gap register as the
list of what to ask for. It must not inherit the confidence the
LP spec earns.

**LP Inbound Onboarding API (29 endpoints, draft 0.3.0).**
Design intent, not code - the spin-out surface, which the Partner
Portal spec already points at from its "Spin-out roadmap" topic. Keep
it draft, keep its 29 `planned` badges, and link it to its roadmap
workstream so the reference and the roadmap stop being two
unconnected accounts of one plan.

## Done when

- `phantom` is 0 and `absent` is 0 or fully declared.
- Every v2 endpoint and every endpoint the front end calls has a row
  at level 3 or better.
- The scope-variant collapse is declared for v1 as it is for v2, and
  no scope-prefixed route lacks a twin.
- `unverified` and `gap` badge counts are down to the endpoints the
  developers genuinely have not answered, and each survivor is a line
  in the gap-register topic.
- `npm run coverage` regenerates the artefact and the drift gate is
  green in CI.
