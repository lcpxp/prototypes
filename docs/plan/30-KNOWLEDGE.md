# Writing verified findings into the system

**WAVE 1 RUN 2026-08-13: the style load is done.** Fifteen `styling`
rows landed against the existing `core-frontend` area (no new area was
needed - the intake lookup found "Front end" already there), with six
work notes and twelve links. What the verification changed is recorded
inline below.

Where a fact goes once a code-review wave has established it, how it
gets there, and how style knowledge - which the system currently holds
none of - gets captured properly.

The protocols already exist: docs/PLATFORM.md governs platform
knowledge, docs/WORKFLOW.md governs work intake, docs/ROADMAP-INTAKE.md
governs contextualisation and holds the confidence bands. This file
does not restate any of them. It says which destination a code-derived
fact belongs in, what the style load contains, and what has to change
so nothing lands somewhere invisible.

## The routing decision

Four destinations, one question each. Ask them in order and stop at
the first yes.

| Ask | If yes | Destination |
|---|---|---|
| Is this about the API surface - a route, its shape, its values? | | `api_endpoints` / `api_topics` (20-API-REFERENCE.md) |
| Is this what the platform *is* or *does* today? | | `product_capabilities`, graded |
| Does this change what we believe about a piece of planned work? | | a `work_notes` row against that `work_items` row |
| Is it a defect, a risk, or a question for the developers? | | the findings register (60-PORTAL-REVIEW.md) |

Two facts can come from one reading, and should be split rather than
compressed: "screening runs on a returned signed contract" is a
capability; "and only on production" is a note on the capability *and*
an environment fact that belongs in the spec's conventions topic. The
link graph is how the two stay joined.

## What the style load contains

`product_capabilities.kind` has allowed `styling` since August 2026
and **zero rows use it**. The LP front end has a written,
enforced design system; capturing it is the single highest-value
knowledge load available, because it is what lets a prototype be built
that looks like the real thing without guessing.

First, the boundary, restated once because it is easy to blur: this is
the **product's** styling. LPIO's own visual rules stay in
docs/DESIGN.md and `assets/css/tokens.css`, which remain their one
home. A styling capability row never describes this portal.

Fifteen rows, one discrete fact each, all in a `product` area (create
a "Design system" area if none fits), all `source_document_id` →
the `codereview` document holding the verbatim extract of
`src/styles/styling-rules.md` and the portal's own CLAUDE.md.

| Key | Fact |
|---|---|
| `style-architecture` | CUBE CSS with Every Layout primitives; one compiled stylesheet; `global.scss` is a manifest, not a stylesheet |
| `style-layers` | Cascade order: tokens, reset, compositions, blocks, utilities - and what each layer may and may not do |
| `style-tokens` | Where values live: `_theme`, `_typography`, `_breakpoints`, `global/_variables`; SCSS mirrors of the CSS variables |
| `style-no-component-css` | New components get no stylesheet; existing ones are being deleted module by module; `blocks/_legacy.scss` is drained, never added to |
| `style-spacing` | Blocks never set margin; `.stack` / `.flow` own sibling space; `--gutter` and `--flow-space` are the knobs; auto margins are alignment, in `utilities/_align.scss` |
| `style-compositions` | The eight primitives - flow, stack, cluster, repel, grid, switcher, with-sidebar, wrapper - layout only, never appearance |
| `style-variants` | Variants and exceptions are both `data-*` attributes; a variant is a closed set the block offers, an exception is a one-off |
| `style-buttons` | `.button` plus `data-button-variant` (secondary, primary, negative) and the exception modifiers |
| `style-dialogs` | The three composed components; `data-dialog-size` s to xxxxl, 400px to 1600px, default m; width is a CSS variant, not a service argument |
| `style-tables` | Semantic tables, no grid library; `.data-table-card` is the scroll container; fixed layout so every column needs `--col-width`; `--table-min-width`, `data-sticky`, `data-col`, the sort-header directive |
| `style-typography` | Typography mixins rather than hardcoded sizes |
| `style-colour` | Theme variables for text, labels and hints; tag colours come from the `TagColor` enum, not from CSS |
| `style-icons` | One SVG sprite, referenced by `use`, coloured through `currentColor` on the parent |
| `style-tone` | **Sentence case for all UI text** - titles, labels, buttons, column headers, nav items |
| `style-testids` | The `data-testid` convention: kebab-case, `[name]-form`, `[control]-input`, `[action]-btn`, applied to forms, critical controls, action elements and dynamic content; an external Playwright suite depends on them, so they are contract, not decoration. **Landed `partial`, not `live`** - see below |

Each row uses the typed `blocks` vocabulary the viewer already
renders: a `p` for the statement, a `kv` for the named values, a
`values` block for a closed set, a `code` block for the canonical
markup, and a `note` for the trap. Fourteen are `maturity 'live'` and
all fifteen are `verified = true`, because they are read from a ruleset
that the codebase enforces - grade `verified-code`, citation in the
source document.

The `values` block turned out to be the wrong shape for most of these:
its renderer draws each value as a bare code chip, and every set here
carries an explanation per value. They became a lead-in `p` plus a `kv`
instead. Two key names were also wrong on the first write - `kv` reads
`items`, not `pairs` - which renders an empty table with no error
anywhere. docs/PLATFORM.md now carries the check that catches it.

`style-testids` is the exception to `live`, and it is the wave's most
useful finding. The convention is fully documented in
`DATA-TEST-LOCATOR.md`, but **20 `data-testid` attributes exist across
the whole front end** (15 `-btn`, 4 `-form`, 1 `-input`) against 339
`.button` usages alone. Reading the document without counting would
leave a session believing there is a stable locator surface to test
against. There is a convention; there is not yet coverage - so the row
is `partial`, and says why.

Three other measurements sharpened a row rather than confirming it:

- **Composition usage.** The ruleset says "prefer `.flow`" and cites
  ~378 `.stack` usages. Counted across all templates: `.stack` 490,
  `.cluster` 240, `.repel` 50, `.flow` 26, `.grid` 12, `.wrapper` 3,
  `.switcher` 1, `.with-sidebar` 1. The gap between the advice and the
  practice is widening, not closing.
- **Icon colouring.** The ruleset says icon paths use `currentColor`.
  They carry no `fill` at all; the mechanism is a global
  `svg { fill: currentColor }` in the reset. Same outcome, but a path
  pasted in *with* its own fill silently ignores the parent, which the
  stated version does not warn about.
- **Dialog sizes.** Confirmed exactly: seven steps, 400px to 1600px,
  `m` (600px) the default.

One caution worth its own `note` block: the ruleset describes a
migration in progress. "There are no component stylesheets left" and
"existing component stylesheets are being deleted module by module"
appear in the same source.

**Resolved by checking, 2026-08-13: the migration is finished.** The
supplied checkout has zero `.scss` files outside `src/styles`, zero
components using `styleUrl`, and no `blocks/_legacy.scss` at all - 53
named block files and nothing else. The prose lags the code, so
`style-no-component-css` records the rule as absolute and carries a
note saying the source says otherwise. This is the general shape of
what a wave is for: the document and the code disagreed, and only
counting settled it.

## What the technical load contains

**WAVE 2 RUN 2026-08-13: done.** Ten `technical` rows landed against
the same `core-frontend` area, plus ten links and two work notes. The
numbers below are what the checkout actually contains, counted rather
than recalled; where the plan's prose and the code differed, the row
records the code.

Two `technical` rows existed. The supplied source supports roughly ten
more, and they are what a session needs to answer "how is this built".

**Front end.** Angular 20 with the CLI and no state library - RxJS
BehaviorSubjects at service level, signals in newer components. Azure
MSAL against B2C. Two tenants with separate route trees, layouts and
guards: `/pxp` behind a global-admin guard, `/app/:tenantId` behind a
tenant guard that global admins pass unconditionally - which is the
mechanism behind "view as partner". A load-user guard runs first on
both trees and bootstraps sales-team membership. Three roles drive
every check. A global HTTP error interceptor means components do not
handle errors. Loading state is local to the owner of the operation;
there is no global loading service. There is no unit-test suite, by
decision; changes are type-checked with the Angular compiler because
it checks templates under strict mode, and the QA Playwright suite
lives outside the repository.

**API.** Onion architecture over four source layers plus a host
project. A `Result<T>` pattern for every fallible operation, converted
to HTTP at the edge. URL-segment versioning with per-version Swagger.
SmartEnum for rich enumerations. Converters per layer transformation.
Entity Framework with migrations, SQL Server in Docker for local and
test, and three test projects - unit, integration with behavioural
step definitions, and end-to-end using the screenplay pattern.

Every one of those sentences is `verified-code` with a citation. None
of them names a host, a key or an environment URL.

### What wave 2 measured

| Claim | Counted |
|---|---|
| Onion layers | Domain, Application, Infrastructure, Presentation, Host - 219 converter types across the outer three |
| Controllers | 53 files, **51 live**: `InputsController` and `InputValuesController` are commented out entirely, three actions each |
| Routes | 552 over the 51, split 376 v1 / 150 v2 / **26 with no version segment at all** |
| SmartEnum | 73 files reference it |
| Migrations | 210 in `src/Infrastructure/Migrations` |
| API tests | three projects: Unit, Integration (47 step/feature files), E2E (8 screenplay files) |
| Angular | 20.3, no state library; **34 files use signals against 19 using BehaviorSubject** |
| Guards | eight, not three - `pxp-admin`, `partner-admin`, `partner-tenant`, `v2-user`, `application`, `onboarding-flow`, `product`, `sales-team-query-param` |
| Interceptors | exactly one, `api-response-error` |
| Front-end specs | **zero** `.spec.ts` files |

Two of those change what the plan said. The signals migration is
already past halfway, so signals are the house style rather than the
new thing. And the plan described "three roles drive every check"
where the code has **eight guards** - roles and guards are not the
same count, and a session reasoning about access from the role count
alone would miss five of the checks.

The most useful row is the one that says least on its own:
`tech-fe-testing` is `partial`, not `live`, because the decision to
skip unit tests rests on an external Playwright suite whose
`data-testid` locators appear 20 times in the entire front end. Each
fact is defensible alone; together they say the front end has
materially less automated cover than either implies. That pairing is
recorded as a `relates_to` link rather than as prose in one row, so
neither can be read without the other.

## Terms, stages and the shared taxonomy

**Domain terms.** 34 rows exist. A code wave produces new ones with a
definition that can be cited rather than recalled - priceable event,
enrolled service, adaptive pricing, multi-MID, terminal financing,
onboarding flow step, rate sheet category, service fee category. Set
`verified` only where the definition comes from the code's own naming
and behaviour, and set `source` to the citation.

**Journey stages.** 13 rows exist, and the reference already badges
endpoints `Step 4` through `Step 13`, so the two agree by hand today.
A wave should reconcile the stage list against the onboarding-flow
step definitions in code and against the walkthrough's own area
ordering, then make the agreement structural: link each stage to the
endpoints that serve it (see the entity-type change below) instead of
restating the number in a badge label.

**Work areas.** 27 rows, 21 product-scoped. Before creating an area,
run the lookup docs/ROADMAP-INTAKE.md requires - the July 2026 batch
landed five duplicates because intake never looked at what existed.

## Context onto existing work items

This is the output the owner asked for by name, and the one that will
be skipped if it is not made explicit. For each active work item in a
reviewed slice, the wave writes at least one `work_notes` row, or
records that no code bears on it.

Note kinds, used precisely:

- `fact` - what the code does, cited. "Risk and acquirer are sourced
  from the merchant rather than the latest application."
- `decision` - a choice already taken that the item must respect.
- `risk` - something that makes the item harder or more dangerous than
  it reads. The acquirer flag is the worked example: clearing it
  commits to a full suite of screening flows, products and pricing.
- `question` - anything `inferred` or `assumed`. Never write an
  inference as a `fact`.
- `action` - a concrete follow-up, which usually means it should be a
  work item instead.

A note never closes an item. Code saying "this is built" against an
item saying "planned" produces a `fact` note plus a `question` for the
owner; the status change is the owner's.

## The link graph, and one schema change

50 live links: 43 work_item→work_item, 3 capability→capability, and
four others that render on no page at all. The graph is almost
entirely one shape because the renderers understand two shapes out of
a possible 49 - cause and effect, not coincidence (40-SURFACING.md
fixes the rendering; this fixes the content).

Seven entity types are registered: work_item, note, capability, term,
document, stage, area. **`endpoint` is missing**, so the reference -
the richest body of structured knowledge in the system - cannot be
linked to anything. Add it:

    insert into link_entity_types (key, table_name, label, sort_order)
    values ('endpoint', 'api_endpoints', 'API endpoint', 80);

That is a seed row, not a schema change, but it needs its migration
and its snapshot regeneration like any other. With it, a wave can
record the links that make the system coherent:

| Link | Reading |
|---|---|
| capability → endpoint | `about` - this capability is served by these endpoints |
| stage → endpoint | `part_of` - this journey stage is these calls, in this order |
| work_item → capability | `affects` - this planned work changes this capability |
| work_item → endpoint | `affects` - this work changes this endpoint |
| term → capability | `about` - the glossary entry for this capability |
| document → anything | `about` - the evidence behind the row |

Every link an assistant writes is `proposed` until the owner confirms
it; that is already how `knowledge_links.confidence` works, and the
owner-review wave in docs/STATE.md's next steps is where they get
confirmed.

## Cleaning up what is already buried

Three jobs, all data, all small, all worth doing before the next
capture round adds to the pile.

1. **Twenty orphan notes** - 15 decisions and 5 facts anchored to no
   item, no document and no area. They render nowhere. Read each,
   attach it to what it concerns, or close it as `superseded` with the
   reason in the body. Then add the gate: a check that no active note
   has all three anchors null.
2. **Seven cross-type links** render nowhere today. Once 40-SURFACING
   lands they appear; until then, do not add more and assume they are
   visible.
3. **`work_item_dependencies`** is documented in docs/ARCHITECTURE.md
   and does not exist in the database. Either build it or remove the
   sentence. Recommendation: remove it - `knowledge_links` with kind
   `blocks` already does the job, and two mechanisms for one job is
   the exact ambiguity CLAUDE.md exists to prevent.

## Retrieval - what this is all for

The test of a knowledge load is not that it stored cleanly, it is that
the next session can answer a question from it without re-reading the
source. Three questions to check against after each wave:

- "What does LP do about screening today, and what is planned?"
  should be one query against `product_capabilities` plus `work_items`
  for the same area.
- "Build me a prototype of the merchant list that looks right" should
  be answerable from the styling rows alone, with no access to the
  LP repository.
- "Which endpoints does the contract stage use?" should be a link
  traversal, not a search.

If any of the three still needs the source, the wave is not finished.

## Done when

- Fifteen styling rows and roughly ten technical rows exist, all
  `verified-code` with citations, all rendered on the platform page.
- The platform page's Coverage panel names fewer gaps after each wave
  than before it, and the count is the wave's headline.
- Every active work item in a reviewed area carries code-derived
  context or an explicit "no code bearing on this".
- Zero orphan notes, and a gate that keeps it that way.
- `endpoint` is a linkable entity type and the reference is joined to
  the capabilities and stages it serves.
