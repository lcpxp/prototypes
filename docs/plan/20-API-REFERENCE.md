# Aligning API reference 2.0 with the code

**Closed 2026-08-14. Folded into this outcome at release 0.1.0
(2026-10-01).** The full working record, including the gap-by-gap
reasoning, is in git history before that release.

The reference is the most consequential thing in the portal, because it
is the surface people act on. This workstream made it provably match the
supplied LP source, and the gate keeps it matching.

Schema: `supabase/schema/10_reference.sql`. Renderer:
`assets/js/pages/reference*.js`. Every change here is a database write;
the repository changes only for the extractors, the coverage artefact
and the drift gate.

## Outcome

**392 rows; 552 of 552 routes accounted for; 0 phantom, 0 absent, 0 gap,
0 undeclared mirrors.** 411 routes are called by the portal; 141 are not,
and 125 rows say so on their face. Every figure is capped at 0 in
`tests/reference-budget.json`, and the two deliberately uncapped figures
(routes nobody calls, rows that say so) are held equal to each other.
The gate was probed four ways - drop a badge, drop a stale row, add a gap,
add an absent route - and each fails.

## What "aligned" means - five levels

1. **Existence.** Every route has a row, or is explicitly excluded with a
   reason. No row exists without a route.
2. **Shape.** Method, path, parameters, required headers and the response
   status set match the controller signature.
3. **Semantics.** Summary and description say what the endpoint does, in
   the code's vocabulary, with its authorisation stated.
4. **Values.** Enumerations match their source constants, stated once in
   the "Accepted values and field rules" topic.
5. **Narrative.** The topics reflect current behaviour, and the gap
   register shrinks as waves land.

Level 1 is mechanical and has a gate. Levels 2 to 5 are judgement and get
a wave.

## The three inventories

- **Inventory A - the routes** (`scripts/extract-routes.js`). From
  `src/Presentation`, one entry per `[Http*]` attribute, composed onto its
  controller `[Route]`, version substituted from `[ApiVersion]`. 552
  entries: 376 v1, 150 v2, 26 unversioned.
- **Inventory B - the reference.** The `api_endpoints` rows.
- **Inventory C - the consumers** (`scripts/extract-calls.js`). One entry
  per `HttpClient` call in the Angular front end; all 401 call sites
  resolve. 212 declare their base URL outside the calling file, so the
  extractor reads `src/config/` and the environment files too.

C is what turned a flat gap list into a priority list: of 196
undocumented routes, 69 were live surface with no row and 127 were a
register of features nothing in the portal touches.

## Normalisation rules

Each was needed to make the real comparison come out right, and each is
the mistake a later wave will make again.

- **Compose, never read the action attribute alone.** Controller `[Route]`
  plus action route on a single slash; an empty action route means the
  controller route itself.
- **Substitute the version, do not template it.** `api/v{version:apiVersion}`
  with `[ApiVersion("2.0")]` is `api/v2`, never `api/vv2`.
- **Placeholders are positional, not named.** Normalise every `{...}` to
  `{}` before comparing; keep the real name in the row.
- **Compare case-insensitively.**
- **Anchor the attribute match to line start.** `//   [HttpGet]` is a
  comment; two controllers and seven v2 actions exist only as comments.
- **No `[ApiVersion]` means unversioned, not v1.** The largest single
  source of wrong paths.
- **Scope prefixes are a declared collapse, not a gap** - and declared
  means the row carries the badge. Removing the badges drops coverage and
  fails the gate.

## The twelve rows that were wrong - CORRECTED 2026-08-13

Kept as the record of what was wrong and why.

| Row | Fault | Fix applied |
|---|---|---|
| `GET,POST,DELETE /api/v1/partners/{}/products...` (3) | Controller is `[Route("api/partners")]` with **no `[ApiVersion]`** | Repathed to `/api/partners/...`; the missing detail read added |
| `PATCH /api/v1/admin/price-sheets/{}` | Action lives in `AdminMerchantController`, base `admin/merchant` | Repathed to `/api/v1/admin/merchant/price-sheets/{priceSheetId}` |
| `GET /api/v2/.../merchant/banks` · `/persons` · `/sites` (3) | Commented-out planning stubs | Retired, after recording all seven stubs in the gap register |
| `GET,PUT /api/v1/service-fees/{}` and `/{}/questions` (4) | An invented `{category}` parameter; the code has literal segments | Replaced by the 16 real endpoints across five fee families |
| `DELETE /api/v1/acquirers/{}/onboarding-flows/{}` | **Filed under the wrong resource.** That controller's only delete is `{id}/contracts/{contractId}` | Repathed to `DELETE /api/v1/onboarding-flows/{flowId}`; the contract delete added |

A thirteenth wrong claim was a real row whose note pointed at a route
that does not exist: `POST /api/v1/partner/merchant` said it mirrored an
admin create, and there is no admin create. It was folded into
`POST /api/v1/merchants`.

**Where the collapse did not apply.** The merchant *list* looks like a
mirror and is not: the admin and partner forms return different read
models and take different parameters, so they are two rows, each saying
it is not the other. Found by comparing every shared operation's return
type and parameters mechanically - 46 of 48 were identical.

## The defect the measurement found

`OnboardingFlowApiService.deleteOnboardingFlow()` calls
`DELETE /api/v1/acquirers/{acquirerId}/onboarding-flows/{flowId}`, which
the controller does not serve, so it returns 405. It is the same
misunderstanding the reference made in row twelve above. The reference
is fixed; the portal call is a roadmap item.

## What a finished row looks like

- `summary` - one line, sentence case, verb first.
- `description` - what it does, requires and changes, including guards.
- `params` - every path and query parameter, named as the controller
  declares it, with type, required flag and description.
- `request_headers` - only where one is required beyond the bearer.
- `request_example` and `responses` - from the DTOs and the `Result`
  branches, generic values, every status the action can return.
- `auth_required` - true unless `[AllowAnonymous]`.
- `badges` - the existing vocabulary, extended only with cause.
  `unverified` means written from a statement rather than source; `gap`
  means a known hole. A wave's job is to remove them.
- `notes` - the thing a reader could not infer.
- `deprecated` - set it rather than deleting the row.

## The coverage artefact and the drift gate

`supabase/reference-coverage.json` is generated (`npm run coverage`) and
committed, like the schema snapshot. It carries counts and a route
digest - never paths, hosts or payloads - so the gate works in a public
repository with no database access. `tests/checks/reference-drift.test.js`
holds phantom and absent at zero, keeps the badge counts non-increasing,
and fails when the artefact is older than the newest migration touching
the reference tables. `tests/unit/route-extract.test.js` and
`call-extract.test.js` benchmark the extractors against synthetic fixture
controllers, so the diff itself stays honest without the LP source.

## Per-wave procedure

Each code-review wave closes with a reference pass over its slice.

1. Filter the coverage report to the slice's route prefixes.
2. Read each controller action: signature, attributes, `Result`
   branches, and the DTO it takes and returns.
3. Write or correct the rows in one transaction, in tag order.
4. Drop the `unverified` and `gap` badges the wave has answered, and add
   the answers to the spec's gap-register topic rather than deleting the
   question.
5. Regenerate the coverage artefact, commit it, confirm the gate.

Insert shape - `sort_order` keeps a tag in runbook order, and `api_tags`
gives the tag its blurb and position:

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

Correcting a path is an update, never a delete-and-insert: the row's id
is what deep links point at.

## The other two specs

- **Merchant Portal Acquiring API.** No source supplied, so nothing in it
  can be graded above `stated`. Its endpoints stay badged `unverified`
  until a source or live Swagger arrives; its gap register is the list of
  what to ask for.
- **LP Inbound Onboarding API (draft).** Design intent, not code. It stays
  draft with its `planned` badges, linked to its roadmap workstream.
