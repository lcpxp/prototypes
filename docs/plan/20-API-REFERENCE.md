# Aligning API reference 2.0 with the code

The reference is the most consequential thing in the portal, because
it is the surface people act on. This workstream makes it provably
match the supplied LaunchPad source, and then keeps it matching.

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
for the LaunchPad Partner Portal API.

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

## The twelve rows that are wrong, and their fixes

Verified against the source. Fix these first; they are the rows that
actively mislead.

| Row | Fault | Fix |
|---|---|---|
| `GET,POST,DELETE /api/v1/partners/{}/products...` (3 rows) | Controller is `[Route("api/partners")]` with **no `[ApiVersion]`** | Repath to `/api/partners/{partnerId}/products/...`; add the missing `GET /api/partners/{}/products/{}` |
| `PATCH /api/v1/admin/price-sheets/{}` | Action lives in `AdminMerchantController`, base `admin/merchant` | Repath to `/api/v1/admin/merchant/price-sheets/{priceSheetId}` |
| `GET /api/v2/merchant-applications/{}/merchant/banks` · `/persons` · `/sites` (3 rows) | Commented-out planning stubs | Retire the rows; record the three in the spec's gap-register topic as designed-not-built |
| `GET,PUT /api/v1/service-fees/{}` and `/{}/questions` (4 rows) | Reference invents a `{category}` parameter; the code has literal segments | Replace with ten rows: `pos`, `pos-plus`, `ecom` (config + questions), `merchant`, `card-service` |
| `DELETE /api/v1/acquirers/{}/onboarding-flows/{}` | **Filed under the wrong resource.** That controller's only delete is `{id}/contracts/{contractId}`; deleting a flow is `DELETE /api/v1/onboarding-flows/{id}` on the standalone controller | Repath it, and document the standalone controller's 19 routes (gap 3 below) |

Nine changes covering twelve rows, plus five to ten new rows: a single
session's work that removes every known falsehood from the reference.

## The 219 gaps, in priority order

Priority comes from consumer evidence (inventory C), not group size.

1. **`/v1/merchant-applications/{}` - 26.** The v1 application surface
   the front end still calls. Highest traffic, most consequential.
2. **`/v1/merchants/{}` - 22 and `/v1/admin/merchant` - 26.** The
   merchant and admin-merchant surfaces. Declare the scope collapse
   here as it was declared for v2, then document the residue.
3. **`/v1/onboarding-flows/{}` - 19.** Flow configuration - the
   mechanism behind acquirer enablement and the modular-stages work on
   the roadmap. Documenting this makes several roadmap items legible.
4. **`/v1/applications/drafts` - 11.** An undocumented draft surface
   with no reference presence at all.
5. **`/v1/service-fees/*` - 14.** Follows directly from the four wrong
   rows above; Tim owns service fees and the roadmap carries several
   items against them.
6. **The 17 scope-prefixed v2 routes with no documented unscoped
   twin**, and the declaration of the v1 collapse that absorbs 22 more.
7. **`/v1/partner/users` - 6, `/v1/product-definitions/{}` - 6,
   `/v2/product-definitions/{}` - 4, `/v1/eit-management/*` - 6.**
8. **Webhooks and listeners - `adobe-webhooks/adobe-sign` (2),
   `listeners/idpal`, `web-shield/events`.** Inbound callbacks. Small,
   and the only documentation anyone will ever get.
9. **`/v1/metrics/*` - 24.** Deliberately last: single-purpose
   dashboard reads, low ambiguity, high row count. Consider one topic
   describing the family plus rows only for the ones in use.
10. **`Dropdown` - 5 remaining.** Trivially documented lookups.

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
test time, and it must not leak LaunchPad route paths into git. Both
constraints are satisfied by reporting shape, not content.

**`supabase/reference-coverage.json`** - generated, committed, and
treated exactly like `schema-snapshot.json`. One object per spec:

    {
      "generated_at": "2026-08-13",
      "source_snapshot": "Pxp.PartnerPortalApi @ <commit or date>",
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
checkout of the LaunchPad source, the same shape as
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
diff itself honest, and it needs no LaunchPad source to run.

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

**Unity Acquiring API (151 endpoints, 24 tags, 6 topics).** No source
supplied, so nothing in it can be graded above `stated`. Add a
spec-level note saying so, badge the endpoints `unverified` until a
Unity source or live Swagger arrives, and keep its gap register as the
list of what to ask for. It must not inherit the confidence the
LaunchPad spec earns.

**LaunchPad Inbound Onboarding API (29 endpoints, draft 0.3.0).**
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
