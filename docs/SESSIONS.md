# Session log

Rolling record of work on this repository. Every Claude Code session
reads the latest entry at the start and writes a checkpoint at the
end, or earlier if credits or context are running low. The rules for
when to checkpoint are in CLAUDE.md.

## Checkpoint template

Copy this block to the top of the Log section and fill it in. Newest
entries first.

    ## YYYY-MM-DD - <short title>
    Branch: <branch name>
    Completed:
    - <finished unit of work, with file paths>
    In progress:
    - <half-done item, exact file and state, e.g. "reference.js:
      params table renders, examples not yet wired">
    Next steps:
    1. <the single next action, precisely>
    2. <then this>
    Open decisions:
    - <anything awaiting the repo owner's call>

## Resume prompt template

Paste this as the first message of a new Claude Code session:

    Read CLAUDE.md in full, then read docs/SESSIONS.md and find the
    most recent checkpoint. Confirm which branch it names and check it
    out. Summarise the checkpoint back to me in three lines, then
    carry out its "Next steps" in order. Follow all rules in CLAUDE.md,
    especially the security rules and the checkpoint-before-credits
    rule. Do not start any work beyond the listed next steps without
    asking.

## Log

## 2026-07-15 - LaunchPad reference loaded; inbound-API direction filed (data only, no code)
Branch: claude/unity-api-standard-f7gm11 (restarted from main; the
prior Unity branch was already merged, so this is fresh follow-up
work on the same branch name per CLAUDE.md's merged-branch rule)
Completed:
- The LaunchPad Partner Portal API Reference v1.1 (HAR-derived
  Swagger-style HTML) was folded into the existing reference standard
  with zero code changes - the viewer is fully data-driven, so a new
  reference is a data load, not a build. Everything lives in Supabase,
  nothing in git. Kept strictly separate from the Unity reference:
  distinct spec, distinct family, distinct picker group, no content
  overlap.
- Loaded as api_specs row 9080b0a1 (family 'launchpad'): 15 api_tags
  (catalogue with descriptions + order), 7 api_topics (overview,
  conventions, auth, onboarding runbook, data model, accepted values,
  gap register), 106 api_endpoints with params (path ULIDs +
  query-string params), request/response examples, per-status
  response catalogues and step/environment/unverified badges. No
  GraphQL here, so method 'query' is unused (0 rows).
- Sanitisation was the bulk of the effort: the HAR captures leaked
  real merchant, partner and staff identifiers in several fields and
  formats (company names/numbers, addresses, phones, a live acquirer
  BID and tax ref, contact names, and - found late - list/screening
  endpoints echoing the live portal roster and a live screening-vendor
  payload). All replaced with consistent fictional personas; the two
  highest-leak enumeration/screening samples were trimmed to synthetic
  representative shapes. Because some leaks surfaced after early
  batches loaded, all LaunchPad endpoints were deleted and reloaded
  clean. Final SQL regex sweep over the loaded rows: 0 real tokens.
- Strategic context on inbound onboarding APIs (leads, static
  submissions, acquirer-specific hard-coded routes, merchant-
  contributor links) filed per docs/WORKFLOW.md: work_documents row
  55555555-...0001 (reference provenance + sanitisation, area
  reference-launchpad) and 66666666-...0001 (verbatim inbound-API
  direction, kind discussion, area integrations-launchpad-api); 4
  work_notes (1 fact, 2 decision, 1 question) and 8 backlog_items
  (4 feature, 2 consideration, 2 task) linked to the source docs.
- Verified: 106 endpoints, 15/15 tags catalogued (0 uncatalogued),
  0 PII hits, 0 query-method rows. Filing rows all present.
In progress:
- None.
Next steps:
1. Review the LaunchPad reference in the signed-in viewer; confirm it
   reads as a distinct reference site from Unity and spot-check a few
   tags against the source.
2. Work the LaunchPad inbound-API backlog (leads API, static
   submission API, acquirer routes) when that stream is picked up;
   resolve the open question note on how much dynamic questioning a
   static route may bypass before building.
3. Delete the dead bulk-load edge function from the Supabase dashboard
   (inert 410 stub, no secrets, but unused) - captured as a task
   backlog item.
4. Carry forward the still-open items from the Unity checkpoint below
   (leaked-password protection, anon-key rotation, seed.sql split).
Open decisions:
- Same verbatim-rule reading as the Unity source: the reference
  provenance doc holds provenance + sanitisation notes rather than the
  raw HTML shell, since the payload itself is fully loaded into the
  api_* tables. The inbound-API direction doc is stored verbatim.

## 2026-07-14 - Unity reference loaded; viewer standard extended (tags, topics, lazy detail)
Branch: claude/unity-api-standard-f7gm11
Completed:
- The comprehensive Unity Acquiring API reference material (209 KB
  reverse-engineered HTML, v2.0 FINAL) arrived and was ingested per
  docs/WORKFLOW.md. Everything lives in Supabase, nothing in git:
  api_specs row 13ed823c updated (title Unity Acquiring API, v2.0,
  live, environments, full B2C auth detail); 24 api_tags (area
  descriptions in runbook order); 6 api_topics (overview,
  conventions, 14-step provisioning runbook, data model, 32-enum
  accepted-values catalogue, gap register); 151 api_endpoints
  (143 REST + 8 GraphQL) with params, request/response examples,
  per-status catalogues and environment/step/verification badges.
  work_documents row 44444444-...0001 records provenance, inventory
  and redactions; 3 work_notes and 7 gap backlog_items filed.
- Redaction at ingestion: four samples in the source contained real
  merchant/staff names despite its all-dummy claim; all replaced
  with consistent fictional values before loading (detailed in the
  work_documents row). The database now scans clean.
- Schema extended once, generically, so future material needs no new
  code (migration 20260714100000_api_reference_structure, applied
  live + mirrored): api_tags (per-spec tag catalogue: description,
  order), api_topics (narrative sections as typed jsonb blocks: p,
  note, code, table, kv, values; unknown kinds skipped),
  api_endpoints.badges jsonb ([{label,tone}]), method check now
  allows 'query' for name-addressed read ops (GraphQL/RPC). RLS
  policies added in policies.sql; security advisor shows nothing
  new.
- schema.sql split into supabase/schema/ per-domain files (00_core,
  10_reference, 20_portal, 30_work, 90_dashboard), clearing the
  size-budget debt; security/perf gates now scan the directory;
  all doc references updated.
- Viewer extended: reference-topics.js renders topic blocks;
  reference-render.js gains badges, tag-catalogue ordering with
  descriptions, endpointBody split and generated curl examples;
  reference.js loads lean endpoint lists (id/method/path/tag/
  summary/badges) and hydrates heavy columns per endpoint on first
  expand, or in one batch for expand-all - large specs render fast
  and cheap. CSS tone badges and value-set styles in pages.css,
  tokens only.
- Tests 41 green, including new benchmarks for topics, badges,
  curl, catalogue ordering and lean placeholders. Verified in
  headless Chromium against a mocked Supabase API: 15/15 checks
  (topics, ordering, badges, lazy hydration, single bulk fetch on
  expand-all, filter, no console errors).
- seed.sql worked template extended: sample api_tags, an api_topics
  row exercising every block kind, and a query-style endpoint (all
  example.com values); mirrored into the live sample spec.
In progress:
- None.
Next steps:
1. Merge claude/unity-api-standard-f7gm11 to main once reviewed (it
   carries this session plus the two prior reference commits), then
   confirm the Pages deploy is green.
2. Review the reference viewer against the live Unity spec while
   signed in; spot-check a few areas against the source HTML.
3. Work the 7 gap backlog_items (capture outstanding writes in Dev).
4. Enable leaked password protection; rotate the anon key (both
   outstanding, need dashboard access).
5. seed.sql (372/300 soft) - plan a split into per-domain seeds
   before it grows again.
Open decisions:
- work_documents content for this source holds provenance +
  inventory instead of the verbatim 209 KB HTML (the payload itself
  is fully loaded into the api_* tables; rationale recorded on the
  row). Confirm the owner is happy with that reading of the
  verbatim rule for presentation-shell sources.

## 2026-07-14 - Reference viewer: full swagger-style detail from Supabase
Branch: main (continuing the performance-pass session)
Completed:
- Schema (migration 20260714000000_api_reference_detail, applied
  live and mirrored in supabase/schema.sql): api_specs gains servers
  (environments), auth (flat label/value scheme description) and
  contact; api_endpoints gains request_headers, responses (per-status
  catalogue with examples), auth_required, deprecated and notes.
  Every field optional; sparse rows render cleanly. Same tables, so
  existing RLS policies cover the new columns; security advisor
  shows nothing new.
- All reference content stays in Supabase; the repo holds only
  rendering. The seeded Merchant Onboarding sample (seed.sql and the
  live sample spec, now 6 endpoints including one deprecated) is the
  worked template with every field populated with generic
  example.com values - the pattern to follow when real material
  arrives. Real material lands as UPDATE/INSERT against the two
  empty placeholder specs (Launchpad API, Unity Merchant Portal
  API) already in the live database.
- Viewer rebuilt: pure HTML builders extracted to
  assets/js/pages/reference-render.js (App.refRender, DOM-free and
  unit-tested); reference.js keeps data loading and wiring. New UX:
  spec overview panel (environments, auth, contact), endpoint search
  filter, expand/collapse all, deprecated and public badges,
  request-headers table, response catalogue with status-family
  colour badges. CSS additions in pages.css use tokens only.
- Tests: tests/unit/reference-render.test.js (escaping, badges,
  response catalogue and fallback, overview, filter predicate,
  OpenAPI deprecated flag). Suite green (35).
- Verified in headless Chromium against a mocked Supabase API:
  overview renders, badges correct, filter narrows/restores,
  expand/collapse works, no console errors.
In progress:
- None.
Next steps:
1. When comprehensive real API material arrives in chat: file the
   raw material per docs/WORKFLOW.md, then load it as api_specs
   updates and api_endpoints rows against the placeholder specs;
   extend the schema by migration only if a genuinely new kind of
   fact appears.
2. Enable leaked password protection; rotate the anon key
   (both outstanding, need dashboard access).
3. schema.sql (~446 lines) still over the 300 soft budget: split
   into per-domain files before the next table lands.
Open decisions:
- None new.

## 2026-07-13 - Performance pass: RLS, indexes, load-path caching
Branch: claude/supabase-performance-optimization-fkvf67
Completed:
- Database (applied live as migrations 20260713140000 and
  20260713150000, mirrored in supabase/schema.sql and policies.sql):
  auth.uid() and helper calls in every policy wrapped in scalar
  subselects (initplan, once per query); admin "for all" policies
  split into insert/update/delete so selects evaluate one policy;
  covering indexes for all eight advisor-flagged foreign keys;
  dashboard_counts() RPC returns every card count in one request,
  capped at 1001. Supabase performance advisor now reports zero
  WARNs (only "unused index" INFOs on the new, still-empty indexes).
- Bug fix found by probing: the profiles update policy subselected
  profiles inside its own with check and recursed; role now read via
  SECURITY DEFINER own_role(). Members can update their own
  display_name, cannot change role; verified by SQL probes.
- Front end: guard.js caches grants in sessionStorage with
  background revalidation; dashboard.js uses the counts RPC and
  renders "1000+" at the cap; reference.js defers the heavy
  api_specs.spec jsonb to an on-demand fetch; backlog.js and
  roadmap.js fetch lists in parallel; all ten pages pin
  supabase-js@2.110.3 and preconnect to the CDN and Supabase
  origins. policies.sql restructured around a content-table loop.
- Gates: tests/checks/perf.test.js (pinned CDN version, preconnects,
  initplan wrapping, no "for all"); security gate updated to
  recognise loop-generated policies. Suite green (28).
- Verified: SQL probes live (anon reads nothing, denied member reads
  zero rows, member writes filtered, self-promotion rejected);
  headless Chromium run against a mocked Supabase API (sandbox
  blocks external origins): login, dashboard counts via one RPC,
  grant cache, lazy spec fetch, denial bounce, no console errors.
In progress:
- None.
Next steps:
1. Merge this branch to main once reviewed.
2. Enable leaked password protection in Supabase Auth settings
   (outstanding from 2026-07-13 wave 1).
3. Rotate the anon key (outstanding since 2026-07-09).
4. schema.sql (~430 lines) is over the 300 soft budget: plan a split
   into per-domain files before the next table lands.
Open decisions:
- None new; wave-2 module choice still open.

## 2026-07-13 - Backlog module, shared work areas, intake framework
Branch: claude/portal-structure-planning-r8rrkq, merged to main
Completed:
- Earlier skeleton work (spec families, integrations, roadmap)
  merged to main as a fast-forward.
- roadmap_areas renamed to work_areas with a scope column
  (product/portal): the single shared area taxonomy. Eleven real
  product feature areas inserted in the live database (QA
  automation excluded by owner instruction); the six portal areas
  kept with scope portal.
- Backlog module: backlog_items table (types consideration,
  feature, functionality, bug, improvement, task; statuses open,
  planned, in_progress, blocked, done, dropped; resolved_at stamped
  by trigger so closed items form the historic record), rendered by
  modules/backlog/ with area/type/status filters and detail modals
  (assets/js/pages/backlog.js).
- Intake framework: work_documents (raw supplied material kept
  verbatim plus distilled summary, supersede chains) and work_notes
  (decision/fact/risk/question/action records linked to areas,
  documents, backlog and roadmap items). Protocol documented in
  docs/WORKFLOW.md and pointed to from CLAUDE.md; the backlog page
  lists documents with summary modals.
- Migration 20260713130000_work_areas_and_backlog.sql applied
  live. roadmap.js now reads work_areas and skips empty areas.
In progress:
- None. Soft size budgets now exceeded on components.css (354/300),
  schema.sql (387/300) and policies.sql (305/300): before extending
  any of them again, split modal/overlay styles into their own
  sheet and split the SQL files by domain (core, reference,
  catalogues, work) keeping the same run order.
Next steps:
1. Confirm the Pages deploys for both merges are green.
2. Owner: review the eleven product area titles in work_areas
   (ampersands were normalised to "and"; edit freely in the table).
3. Owner supplies the current Notion backlog in chat; ingest it per
   docs/WORKFLOW.md (one work_documents row, backlog_items per
   entry) and close the starter item recorded against portal-core.
4. Owner supplies the standalone roadmap app; fold it into
   modules/roadmap/ over the existing tables.
Open decisions:
- Whether roadmap swimlane views should default to product areas,
  portal areas, or both (work_areas.scope makes any of these a
  filter).

## 2026-07-13 - Portal skeleton: spec families, integrations, roadmap
Branch: claude/portal-structure-planning-r8rrkq (session-designated;
merge to main when reviewed)
Completed:
- Reference split into distinct sites: api_specs gains a family
  column (launchpad, unity, integration, other), mirrored in
  App.registry.specFamilies; the picker groups specs per family
  (assets/js/pages/reference.js). Live rows created for the two spec
  shells: "Launchpad API" and "Unity Merchant Portal API".
  Migration: supabase/migrations/20260713100000_api_spec_families.sql
  (applied live).
- Integrations module: integrations table (RLS behind the
  'integrations' grant), modules/integrations/ overview table with
  native-dialog detail modals (assets/js/pages/integrations.js),
  shared modal + .kv components and --scrim token. Twelve real
  integrations inserted in the live database only; generic samples
  in seed.sql. Migration: 20260713110000_integrations.sql (applied
  live).
- Roadmap skeleton: roadmap_areas, roadmap_items,
  roadmap_milestones, roadmap_dependencies with RLS behind the
  'roadmap' grant; modules/roadmap/ renders areas by horizon
  (assets/js/pages/roadmap.js). Six real areas and five starter
  items in the live database. Migration: 20260713120000_roadmap.sql
  (applied live).
- Docs: ARCHITECTURE.md data model regrouped, SECURITY.md residual
  risks updated, ROADMAP.md points granular items at the database.
  Suite green throughout (24 checks).
In progress:
- None. components.css is over the soft size limit (351/300):
  schedule splitting modal/overlay styles into their own sheet
  before extending components.css again.
Next steps:
1. Review this branch and merge it to main (deploy workflow will
   publish; confirm the Pages deploy is green).
2. When the repo owner provides the standalone roadmap web app,
   fold it into modules/roadmap/ on top of the existing four
   roadmap tables (extend schema only if a needed concept is
   missing, as a migration).
3. Fill the two live spec shells with endpoint rows (Launchpad
   inbound flows first, then Unity Merchant Portal endpoints, then
   Unity-initiated repurchase flows as tagged sections).
4. Fill in detail JSONB (auth, data exchanged, environments, owner)
   per integration row, especially EIT which is a placeholder.
Open decisions:
- Statuses and purposes of the twelve live integration rows were
  set as best-guess placeholders (all 'live'); the repo owner
  should correct them in the database.
- Whether integration API surfaces should later become api_specs
  rows under the 'integration' family, linked from the modals.

## 2026-07-13 - Public config, sign-in redesign, Pages auto-deploy
Branch: main (trunk-based from here on)
Completed:
- Removed the setup-required screen. It fired on every deploy because
  config.js is gitignored and never ships to Pages. The public URL and
  anon key are now baked into assets/js/core/supabase.js; config.js is
  an optional local override. The credential gate decodes any committed
  JWT's role and only allows the anon key, so service_role stays
  blocked. Dropped the config.js script include from all pages.
- Redesigned the sign-in page: mobile-first flat split screen (accent
  brand panel + form), correct in light and dark. Login styles live in
  a new assets/css/login.css; the stylesheet-order gate now allows one
  page-specific sheet after the five core layers.
- Added .github/workflows/deploy.yml: push to main runs the suite on
  Node 22, then publishes to GitHub Pages (configure-pages enablement
  auto-enables Pages on first run). Definition of done now includes a
  green Pages deploy.
- Switched guidance to trunk-based in CLAUDE.md (commit straight to
  main, branches only when risky); refreshed SETUP/SECURITY/
  ARCHITECTURE/DESIGN.
- Committed in two commits and pushed to main (171f753, 91d5aae).
In progress:
- None.
Next steps:
1. Confirm the first Pages deploy is green and review the live URL
   (repo Settings > Pages, or the deploy workflow run's environment
   URL). If Pages was blocked, one-time: Settings > Pages > Source =
   GitHub Actions, then re-run the workflow.
2. Optional: rotate the anon key if desired (it is public-safe, but
   the old key predates this session); update supabase.js if rotated.
Open decisions:
- Which wave-2 module to build first from docs/ROADMAP.md.

## 2026-07-13 - Wave 1: modules restructure, CSS system, access control
Branch: claude/lcpxp-setup-structure-19n2mo
Completed:
- Restructure: pages moved under modules/ (reference, prototypes,
  users), JS split into assets/js/core/ and assets/js/pages/, new
  core/registry.js as the single source of truth for modules, tables
  and roles; nav and dashboard cards render from it. README cut to a
  high-level summary; setup moved to docs/SETUP.md; plans.md promoted
  to docs/ROADMAP.md; skeleton.patch and setup-harness.sh deleted.
- CSS: main.css replaced by tokens/base/layout/components/pages,
  mobile-first (min-width only, 36/48/64rem), logical properties,
  clamp display type, dark scheme via token overrides, toggle
  component. Gates enforce stylesheet order and ban max-width
  queries; main.css size exception removed.
- Access control: module_access table + has_module_access() applied
  to the live project as a tracked migration and mirrored in
  supabase/ (schema, policies, migrations/). Content read policies
  follow per-module grants (absence of a row = allowed; admins
  always allowed; this replaced the planned seeded-defaults trigger
  as it behaves identically with less machinery). guard.js loads the
  grant map, filters nav/cards, bounces denied users to the
  dashboard via data-module keys; users module rebuilt with role
  select + per-module toggles (admin-gated by RLS).
- Security: advisor fixes (search_path pinned, SECURITY DEFINER
  functions revoked from anon). Owner account promoted to admin per
  the documented setup step (it was still member). Temporary
  lp-test-* verification users were created and deleted afterwards.
- Verified: npm test green (23 checks/benchmarks). SQL probes: a
  denied member reads zero rows from a gated table, anon reads
  nothing. Playwright at 360/768/1280 plus dark scheme: 22 checks
  green (login, redirects, nav filtering, toggles, denial notice,
  no horizontal scroll, no console errors).
In progress:
- None.
Next steps:
1. Locally: move config.js from assets/js/config.js to
   assets/js/core/config.js (the path changed this session).
2. In Supabase Auth settings: enable leaked password protection.
3. Rotate the anon key (outstanding since 2026-07-09; old key is in
   git history) and recreate assets/js/core/config.js from it.
4. Decide on renaming the GitHub repo lcpxp/prototypes to lcpxp/lpio
   (nothing in-code depends on the name; GitHub redirects).
5. Open a PR for this branch and merge to main.
Open decisions:
- Which wave-2 module to build first from docs/ROADMAP.md (roadmap
  manager vs sprint planning vs downloadable reference material).

## 2026-07-09 - Test harness and security remediation
Branch: feat/test-harness
Completed:
- SECURITY: assets/js/config.js was tracked in this public repo
  (.gitignore had the comment but not the rule). Untracked it,
  fixed .gitignore. Keys must be rotated; old values remain in
  git history, rotation is the remediation.
- Zero-dependency test harness (node --test): security, structure,
  style and size gates in tests/checks/; behaviour benchmarks in
  tests/unit/ (ui.js App.escape and badges pinned).
- Size budgets in tests/size-budget.json; main.css 585 lines
  listed as explicit debt with an exit plan.
- Generated navigation: docs/CODEMAP.md + llms.txt via
  scripts/gen-codemap.js, refreshed by the pre-commit hook.
- Git hygiene: .githooks/pre-commit, .gitmessage template,
  npm run setup for fresh clones. docs/HARNESS.md process doc.
- Fixed hard-coded #ffffff in main.css to var(--surface).
In progress:
- None.
Next steps:
1. Rotate the Supabase anon key (Dashboard, Settings, API) and
   recreate assets/js/config.js locally from config.example.js.
2. Commit this work on feat/test-harness and merge to main.
3. Schedule the main.css split (base/components/pages) per
   tests/size-budget.json exception note.
Open decisions:
- Owner approval recorded here: tooling limited to Node built-ins
  and git only; no npm packages added (CLAUDE.md dependency rule).

## 2026-07-09 - LPio hub and silo structure
Branch: main
Completed:
- Reframed the experience around LPio / LaunchPad IO as a top-level
  project hub rather than a single onboarding portal.
- Updated navigation, dashboard copy and login copy to reflect a
  broader workspace for guidance, reference material and prototypes.
- Added a dedicated project-silo entry point at silos/ with a starter
  standalone tooling silo example.
In progress:
- None.
Next steps:
1. Add any future standalone project folders under silos/ and link them
   from silos/index.html.
2. Create the Supabase project, run schema.sql then policies.sql then
   seed.sql, create the first user, promote it to admin, and create
   assets/js/config.js locally.
3. Verify login, dashboard counts, reference viewer rendering the
   sample spec, user register, and gallery.
Open decisions:
- Hosting target (GitHub Pages assumed).
- Whether additional silo-specific pages should be created for each
  workstream as they emerge.
