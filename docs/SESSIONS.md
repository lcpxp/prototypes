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

## 2026-07-17 - Department tag on work items
Branch: claude/department-work-item-tags-i0qc34 (merged to main, fast-forward)
Completed:
- Added an optional owning-department tag to work_items: the business
  function accountable for an item (Sales & Commercial, Operations and
  Onboarding, Product and Technology, Finance and Revenue, Legal &
  Compliance, Risk & Underwriting). A coarse org-owner axis, orthogonal
  to area/theme. Nullable check-constraint column, keys lowercase with
  underscores. Migration 20260717120000_work_item_department.sql applied
  live and mirrored in schema/30_work.sql; same table so the existing
  work_items RLS covers it - security advisors show only the pre-existing,
  already-tracked warns (three SECURITY DEFINER RPCs, leaked-password
  protection). 50 live rows, 0 tagged yet (this ships the mechanism, not
  assignments).
- registry.js is the single source of truth: App.registry.departments
  (ordered {key,label}, carrying the exact mixed "&"/"and" labels) plus an
  App.departmentLabel helper, so no page hard-codes the labels. Keys mirror
  the DB check constraint.
- Surfaced: backlog gains a Department filter, table column and detail-modal
  row (backlog.js, modules/backlog/index.html); the roadmap item drawer
  shows Department and the KPI JSON export carries it (roadmap.js fetch +
  roadmap-detail.js). seed.sql tags each sample row with a different
  department so the field is exercised end to end.
- Tests: registry.test.js (department vocab + helper), roadmap-detail.test.js
  (drawer + export; its vm harness now also loads registry.js). npm test 77
  green. A throwaway Node harness drove the real backlog render path (mock
  db) and confirmed the Department column, escaped labels and the populated
  filter with no exceptions. Codemap regenerated.
- Committed in three atomic units, pushed; main fast-forwarded
  683a3ea..b880b07 (which also lands the prior unmerged branch work) and
  pushed. Both Pages workflows (Deploy to GitHub Pages, pages build and
  deployment) completed green for b880b07.
In progress:
- None.
Next steps:
1. Owner: assign departments to the 50 live work_items - a data-only pass in
   Supabase (or via an AI chat with Supabase access); the mechanism is ready.
2. Optional: add a Department filter to the roadmap board toolbar (today it
   is filterable only on the backlog; the drawer and JSON export already
   carry it).
Open decisions:
- schema/30_work.sql is now ~327 lines (over the 300 soft budget, under the
  500 hard): split it by sub-domain when next touched, per the standing note.

## 2026-07-17 - Portal feature additions + PXP-aligned roadmap depth
Branch: claude/portal-feature-additions-i9q9tw
Completed:
- Schema (migration 20260717000000_pxp_roadmap_fields.sql, applied live;
  mirrored in schema/30_work.sql, 90_dashboard.sql, policies.sql, seed.sql):
  work_items gains optional progress, prd_status, project_status,
  start_sprint/end_sprint and an attributes jsonb bag; new work_item_phases
  child table (Discovery/Build/Certification/Launch, quarter + dates + per-
  date TBC), RLS mirrors work_items; dashboard_counts() gains
  work_items_breakdown. Security advisors show only pre-existing warns.
- Sprint engine assets/js/core/sprints.js (App.sprints): date<->sprint<->
  quarter<->band, anchor 26-01 = Mon 22 Dec 2025 (26-16 = Mon 20 Jul 2026).
  docs/SPRINTS.md (calendar, distance->band table, talk-in-sprints ruleset);
  tests/unit/sprints.test.js.
- Roadmap depth: clickable items -> right-hand detail drawer
  (assets/js/pages/roadmap-detail.js: drawerHtml + toKpiItem/toKpiRoadmap,
  unit-tested), subtle coarse progress bars, Compact/Detailed toggle that
  expands the Exec rollup into per-theme child items, and item + toolbar
  Export JSON (the AI-optimised KPI-ready output). roadmap.js fetches the
  new fields + work_item_phases; roadmap-views.js does progress + expanded
  exec; assets/css/roadmap-detail.css.
- Dashboard: cross-module recent-activity feed (newest 8, access-guarded)
  and a roadmap progress meter from the breakdown (dashboard.js, pages.css).
- Global header search: assets/js/core/search.js + nav input in ui.js,
  included after ui.js on every protected page; layout.css styling.
- Docs: ROADMAP.md, ROADMAP-PROCESS.md, SECURITY.md updated.
- npm test green (75). Browser-verified (playwright, file harness) the
  drawer, board, dashboard meter/feed and header search - no console
  errors. Committed in six units and merged to main.
In progress:
- None.
Next steps:
1. Populate real work_items with progress / sprints / phases / attributes
   via Supabase per docs/SPRINTS.md when next refining the live roadmap.
2. Optional: turn the KPI JSON export into a saved artifact or a push flow
   if a direct hand-off to the KPI portal is wanted.
Open decisions:
- 30_work.sql (~316), seed.sql (~485), roadmap-views.js (~367) sit over the
  soft line budget (under hard). Split when each is next touched.

## 2026-07-16 - Unify roadmap + backlog into one work_items table; align views
Branch: claude/roadmap-views-alignment-ait350
Completed:
- Root cause of Executive "3 of 4": the two Executive layouts filtered
  differently (Timeline dropped delivered audience='team' items). Fixed
  structurally, not patched.
- Collapsed roadmap_items + backlog_items into ONE table, work_items, so
  every view is a projection of the same rows. Retired the audience flag.
  Migration 20260716140000_unify_work_items.sql (preserves UUIDs, maps
  statuses, repoints work_notes -> work_item_id, roadmap_dependencies ->
  work_item_dependencies, drops old tables, updates dashboard_counts +
  RLS) applied live: 50 rows (7 delivered, 12 active, 31 parked), old
  tables gone, advisors clean. Mirrored in schema/30_work.sql,
  policies.sql, seed.sql, schema/90_dashboard.sql.
- Views now derive from an item's own fields (done=Delivered; someday or
  dropped=Parked; rest=Active by horizon). Levels are Executive (theme
  rollup of active work, always complete - no drift), Team (active items),
  Backlog (everything incl. a Parked column). Axis extended to
  Delivered|Now|Next|Later|Parked via --tl-cols. Parked folded into
  Backlog; the separate Parked level is gone. Files:
  assets/js/pages/roadmap-views.js (rewritten), roadmap.js (levels + single
  work_items fetch), roadmap-views.css (variable columns, parked styling),
  modules/roadmap/index.html (lede).
- Backlog module (assets/js/pages/backlog.js, modules/backlog/index.html)
  now lists ALL work_items as the master table, ordered by band then
  priority, with a Band filter - the same set the roadmap draws as a gantt.
- registry.js: workItems/workItemDependencies tables; roadmap card is now
  descriptive, backlog card counts work_items. Tests rewritten
  (tests/unit/roadmap-views.test.js) incl. the delivered-item regression;
  full suite green (61 pass). Docs updated (ROADMAP, ROADMAP-PROCESS,
  ARCHITECTURE, WORKFLOW, PLATFORM, CLAUDE); codemap regenerated.
Next steps:
1. Optional: enrich the Executive lane label (currently theme + item count).
2. Optional: surface work_item_dependencies as an explicit dependency view.
Open decisions:
- None outstanding; the four view-model questions were resolved with the
  owner (exec=themes, backlog=all, parked=far-future in backlog, one table).

## 2026-07-16 - Roadmap: continuous spanning timeline, layout x level
Branch: claude/roadmap-refinement-mvc4jx
Completed:
- Made the Timeline a continuous Delivered|Now|Next|Later axis where a
  bar spans horizon (start band) through end_horizon (band it runs
  through), so long activities spill across columns. Rows order by start
  band, then span length, then priority. Timeline is now the default
  layout and both Timeline and Cascade are available on all four levels
  (Executive/Team/Backlog/Parked). Cascade repeats a spanning item under
  each band it covers. Files: assets/js/pages/roadmap-views.js (rewritten,
  App.roadmapView.timeline(data,level)/cascade(data,level)), roadmap.js
  (layout applies to every level), roadmap-views.css (4-column axis,
  done-bar style), modules/roadmap/index.html (layout toggle always shown).
- Schema: roadmap_items.end_horizon; backlog_items.horizon+end_horizon so
  backlog/parked share the timeline. Migration
  20260716120000_roadmap_spans_and_backlog_horizons.sql, mirrored in
  schema/30_work.sql, applied live.
- Data (Supabase): set the current-and-next items to span Now->Next
  (portal overhaul, admin tools, and three others) and moved the insights
  item to Next. Real names stay in Supabase only.
- Tests rewritten for the new API (58 pass incl span/ordering/spanning
  cascade); docs (ROADMAP.md, ROADMAP-PROCESS.md) updated; codemap
  regenerated. Verified visually (light+dark, no console errors).
Next steps:
1. Optional: deep-dive Product Resources & Documentation approach.
2. Optional: capture Commercial & Growth notes before it earns a theme.
Open decisions:
- Whether the Executive cascade one-pager should list all themes or only
  populated ones (current: populated only).

## 2026-07-16 - Roadmap refinement: two-level taxonomy, four altitudes
Branch: claude/roadmap-refinement-mvc4jx
Completed:
- Reworked the roadmap from a single lane x horizon board into one home
  read at four altitudes via a level switcher: Executive (C-suite
  one-pager), Team (Cascade or Timeline layout), Backlog, Parked.
  Pure builders in assets/js/pages/roadmap-views.js (App.roadmapView),
  shell in assets/js/pages/roadmap.js, styles in
  assets/css/roadmap-views.css, page modules/roadmap/index.html.
- Schema: added roadmap_items.audience (exec/team) and
  work_areas.category_id (theme -> area). Migration
  supabase/migrations/20260716000000_roadmap_audience_and_area_theme.sql,
  mirrored in schema/30_work.sql, applied live. seed.sql updated.
- Data (Supabase, live): replaced the 6 messy lanes with 13 themes,
  re-pointed all 19 items off the ops overflow, set audience, expanded
  Delivered 4 -> 7 buckets (European onboarding marked delivered, a
  product-offering enablement item added), US Market standalone. The
  real third-party names for these live only in Supabase, never in git.
  Created looser-work backlog (Legal, Product
  resources, referral setup, commissioning, auto-cancel) and 7 parked
  de-scoped rows with rationale; recorded the restructure as a
  work_documents discussion + work_notes decisions + role-list note.
- Tokens: 13 theme colour pairs (light + dark) in tokens.css; .rm-cat-*
  rules updated. Docs: new docs/ROADMAP-PROCESS.md, docs/ROADMAP.md
  rewritten for the new home. Tests green (61/61); codemap regenerated.
In progress:
- None; the milestone is complete and committed (commit "Add
  multi-altitude roadmap home") plus the Timeline + docs follow-up.
Next steps:
1. Optional: deep-dive Product Resources & Documentation approach.
2. Optional: capture Commercial & Growth notes before it earns a theme.
3. Consider wiring roadmap_dependencies for an explicit dependency cascade.
Open decisions:
- Whether the Executive view should list all 13 themes (portfolio) or
  only themes with exec items (current behaviour, cleaner one-pager).
- Whether Legal / Product Resources / Commercial & Growth graduate from
  backlog to full themes.

## 2026-07-16 - Roadmap redesign: lane x horizon grid, product-only
Branch: claude/practical-johnson-e17bva
Completed:
- Redesigned the roadmap board from the pseudo-timeline "three zone"
  layout to a birds-eye lane x horizon grid. Rows = roadmap_categories
  lanes, columns = Now/Next/Later (later absorbs someday). Density
  decays left to right (Now: summary + state label; Next: clamped
  one-line summary; Later: title-only chips). Delivered collapses into
  a native <details> disclosure. Files: assets/js/pages/roadmap.js
  (232 lines), assets/css/roadmap.css (267), modules/roadmap/index.html.
- Removed the Product/Portal/All scope toggle; the board hard-filters
  to product scope (productItems). Removed cascade()/zoneOf()/bars and
  every gradient fill (solid fills + 1px borders + text labels survive
  grayscale, mono print and forced-colors).
- Added freshness line (max updated_at) and a Download PDF action
  (@page A4 landscape + window.print(), Safari hint). Board widened to
  96rem on this page only.
- Tests green (55/55): replaced zoneOf/cascade/scopeItems benchmarks
  with columnOf/productItems/semantics/freshnessHtml in
  tests/unit/roadmap-render.test.js; added a CSS gradient guard to
  tests/checks/style.test.js. docs/ROADMAP.md rewritten, codemap
  regenerated. Committed and pushed (17d7bc6).
- Supabase data pass (project zlmkofbkobmhnslfnqsf): deleted the 5
  portal-scoped roadmap_items; recorded the decision + the removed
  rows as a work_notes 'decision' row (7f7f0ada). 0 portal / 19
  product items remain on the roadmap.
Next steps:
1. Manual acceptance (Part 4 of the plan): grayscale test, landscape
   export in Chrome/Firefox/Safari, 200% zoom reflow, headings pass,
   long-title torture, mobile export - once the branch is deployed.
2. If approved, open a PR / merge the branch to main (owner's call).
Open decisions:
- None. Portal work stays tracked in backlog_items / work_notes; the
  work_areas.scope column is retained for backlog and platform modules.

## 2026-07-15 - Platform knowledge: default assumption is shipped, not unverified
Branch: main
Completed:
- Owner decision: docs/PLATFORM.md documents what Launchpad does
  today, so the working assumption for a comprehensive current-
  capabilities overview is that everything it describes is shipped;
  later review realigns specific rows if reality has moved on, rather
  than every load starting unverified until inspected line by line.
- Applied live (Supabase, zlmkofbkobmhnslfnqsf): all 13
  product_capabilities rows from the 2026-07-15 Launchpad overview
  load updated to maturity = 'live', verified = true (two rows,
  automation-integrations and fulfilment, moved up from 'partial').
  The automation-integrations row's "confirm which integrations are
  live vs planned" caveat note was replaced with a note recording the
  owner's decision, since that question is now resolved. Confirmed by
  query: all 13 rows read maturity 'live', verified true.
- docs/PLATFORM.md: rewrote the ingestion-protocol step and the
  "Maturity and verified" section to state the new default (load as
  live/verified unless the source itself flags planned/exploratory,
  or the owner has a specific reason to doubt a row) and to frame
  verified as an explicit owner decision rather than a per-row
  inspection gate.
- supabase/schema/40_platform.sql: aligned the column comment with
  the same policy - the verified column's default stays false (a safe
  fallback for a bare, context-free insert), but ingesting a "what we
  do today" overview should set maturity 'live' and verified true
  explicitly at load time.
- Verified: npm test 52/52 green (no code changes, docs and live data
  only).
In progress:
- None.
Next steps:
1. None outstanding on the platform-knowledge domain; it now reads as
   the owner intends (documented capabilities shown as shipped).
2. Carry forward still-open items: enable leaked-password protection;
   rotate the anon key; delete the dead bulk-load edge function;
   components.css (426/300), docs/ARCHITECTURE.md (229/200) and
   seed.sql (426/300) remain over their soft budgets (all under
   hard) - plan splits before extending any of them again.
Open decisions:
- None new beyond the two carried in the 2026-07-15 Part A entry
  below (the block-renderer duplication and the maturity-badge token
  reuse).

## 2026-07-15 - Platform product-knowledge domain, Part B loaded live; merged to main
Branch: main (merged from claude/platform-knowledge-domain-k76sab,
fast-forward, then the branch was deleted)
Completed:
- Per explicit owner instruction, this session also ran Part B
  directly against the live Supabase project (zlmkofbkobmhnslfnqsf,
  confirmed via the Supabase connector before writing) rather than
  leaving it for the owner to paste into the SQL editor:
  - Applied the Part A migration live (product_capabilities table,
    indexes, trigger; work_documents.kind + 'platform'; RLS; the
    dashboard_counts() replacement) - matches supabase/migrations/
    20260715120000_platform_product_knowledge.sql exactly.
  - Inserted the 8 real capability-area work_areas rows (scope
    'product', keys dynamic-flows/product-config/automation-
    integrations/form-intelligence/contracting/fulfilment/
    application-builder/architecture). No key collisions with the 11
    pre-existing product-scope areas; work_areas now holds 19 product-
    scope rows total, confirmed by query before and after.
  - Inserted the verbatim Launchpad overview as one work_documents row
    (kind 'platform', 13,007 characters, id da1abf4d...).
  - Inserted 13 product_capabilities rows (1 overview, 1 value, 8
    capability - one per area - and 3 glance), each linked to the
    source document, verified = false throughout as specified.
  - Verified live: row counts (13 capability rows, 19 product areas,
    1 platform document, 0 verified, 5 area-less rows - all match
    expectations), and get_advisors (security) shows no new findings
    - only the pre-existing, already-tracked items (three SECURITY
    DEFINER RPCs callable by authenticated, which is intentional
    design; leaked-password protection still disabled, carried
    forward from every prior checkpoint).
- Merged claude/platform-knowledge-domain-k76sab into main as a clean
  fast-forward (no conflicts), pushed origin/main, deleted the local
  branch (remote delete was blocked by the session's git permissions;
  harmless since main is a strict fast-forward of it - no unmerged
  history is stranded there). Confirmed via the GitHub Actions API
  that both "Deploy to GitHub Pages" and "pages build and deployment"
  completed successfully for the merge commit (41dc580).
In progress:
- None on the technical side.
Next steps:
1. The one step this session did not do, and should not do on its
   own: go through the 13 product_capabilities rows and correct
   maturity/set verified = true against the real build state (per
   docs/PLATFORM.md). That confirmation requires the owner's actual
   knowledge of what is genuinely shipped versus what the marketing
   overview claims - fabricating it would misrepresent a human
   attestation that has not happened. Everything loaded is currently
   an unverified transcription of the source overview's framing.
2. Sign in and open the Platform module to read the loaded content
   against the source; spot-check the "partial" maturity calls
   (automation-integrations, fulfilment) in particular, since the
   overview's own note blocks flag those as needing confirmation.
3. Confirm the roadmap and backlog area filters now list all 19
   product areas (the 8 new ones alongside the 11 already there) -
   expected and intended, per the handoff.
4. Carry forward still-open items: enable leaked-password protection;
   rotate the anon key; delete the dead bulk-load edge function;
   components.css (426/300), docs/ARCHITECTURE.md (229/200) and
   seed.sql (426/300) remain over their soft budgets (all under
   hard) - plan splits before extending any of them again.
Open decisions:
- None new beyond the two carried in the prior entry below (the
  block-renderer duplication and the maturity-badge token reuse).

## 2026-07-15 - Platform product-knowledge domain (Part A: repo only)
Branch: claude/platform-knowledge-domain-k76sab (task-designated)
Completed:
- New domain: supabase/schema/40_platform.sql adds product_capabilities
  (the durable, queryable "what Launchpad does today" catalogue).
  Hangs off the shared work_areas taxonomy (area_id, scope 'product')
  so capability sections, roadmap swimlanes and backlog groups agree;
  source_document_id links to its verbatim work_documents row; kind
  (overview/value/capability/glance), maturity
  (live/partial/planned/exploratory) and verified drive rendering and
  the today-vs-planned discipline; blocks reuses the api_topics typed
  vocabulary (p/note/kv/table/code/values) so new facts never need a
  code change.
- work_documents.kind gains 'platform' (supabase/schema/30_work.sql)
  for the verbatim source overview.
- RLS: product_capabilities enabled and added to the content-table
  loop in supabase/policies.sql, gated on has_module_access('platform'),
  same read/admin-write pattern as every other content table.
- dashboard_counts() (supabase/schema/90_dashboard.sql) gains the
  product_capabilities count.
- Migration supabase/migrations/20260715120000_platform_product_
  knowledge.sql applies all of the above idempotently to a live
  project; carries no content data.
- Registry: new 'platform' module entry (assets/js/core/registry.js),
  positioned after reference/integrations and before roadmap, plus
  the productCapabilities table mapping. Navigation and the dashboard
  card follow from this with no other edits.
- Module: modules/platform/index.html (script/style order and
  data-root/data-module matched to every other protected page) and
  assets/js/pages/platform.js - a single file in the roadmap.js style
  (App.platformView: DOM-free pure builders, plus DOM wiring at the
  bottom). Renders an overview/value lead, one section per product
  work_area with its capability rows (maturity badge, unverified
  marker, sorted by sort_order), then an at-a-glance section; empty
  areas are skipped. The typed block renderer (p/note/kv/table/code/
  values) is a local copy of reference-topics.js's blockHtml rather
  than a cross-module dependency - noted below as a future refactor
  option, not done this session to avoid touching already-shipped,
  tested reference code for a same-day new module.
- CSS: two new badge classes in components.css (.badge.partial reuses
  --accent, .badge.exploratory reuses --violet; .badge.live and
  .badge.planned already existed for roadmap/integration statuses)
  plus small .cap-card/.cap-chips layout rules. The unverified marker
  reuses the existing .badge.tone-warn class. No new tokens were
  needed - the maturity chip reuses App.statusBadge exactly as
  roadmap/backlog statuses already do, so no token duplicated an
  existing semantic colour.
- docs/PLATFORM.md (new, 92 lines): the ingest/retrieval protocol,
  mirroring docs/WORKFLOW.md. docs/ARCHITECTURE.md data model and
  page-flow sections updated. CLAUDE.md gains one bullet under
  "Adding common things" pointing at it.
- tests/unit/platform-render.test.js: block-kind rendering and
  escaping, capability card maturity/unverified rendering, area
  grouping and sort, full-page lead/section/glance/empty-state
  assembly.
- seed.sql: one generic 'sample-capability' row (kind capability,
  unverified, one block) linked to the existing sample work area,
  proving the renderer end to end with no real content.
- Verified: npm test 52/52 green (5 new benchmarks); npm run map
  regenerated docs/CODEMAP.md (llms.txt unchanged). Headless Chromium
  against a mocked Supabase client (script-level stub, sandbox has no
  network): unauthenticated /modules/platform/ redirects to login;
  authenticated render shows the overview, value proposition, the
  Dynamic flows section with its capability and table block, the
  glance section, live/partial maturity badges and the unverified
  marker, and correctly skips an area with no capability rows; zero
  console/page errors. Separately confirmed dashboard.html's nav and
  card pick up the new module (title, stat label, count) with zero
  console errors.
In progress:
- None. Part A (this session's repo scope) is complete and green.
Next steps:
1. Part B (the real Launchpad overview and eight capability-area
   rows) is written for the owner to run directly in the Supabase SQL
   editor - it was not committed or executed by this session, per
   CLAUDE.md's real-content-never-in-git rule and the handoff's
   explicit instruction that Part B is owner-run. Nothing has been
   loaded yet: product_capabilities holds only the generic seed.sql
   sample row until the owner runs it.
2. After Part B loads: open the Platform module signed in, confirm
   the overview/value lead, all eight capability sections and the
   glance headlines render, then go through each row correcting
   maturity and setting verified = true per docs/PLATFORM.md.
3. Confirm the roadmap and backlog now offer the eight product areas
   in their area filters/swimlanes (expected consequence of reusing
   work_areas, called out in the handoff as intended).
4. Carry forward still-open items: enable leaked-password protection;
   rotate the anon key; delete the dead bulk-load edge function;
   components.css (426/300) and docs/ARCHITECTURE.md (229/200) are
   now over their soft budgets (both still well under hard) - plan
   splits before extending either again; seed.sql (426/300, also
   already over) likewise.
Open decisions:
- Whether to later factor the typed block renderer (blockHtml and its
  table/kv/values/code helpers) out of reference-topics.js and
  platform.js into one shared module now that two page modules need
  it identically - flagged as a future refactor rather than done this
  session, per the handoff's explicit fallback ("otherwise keep a
  local copy and note the duplication").
- Maturity chip colours: reused the existing status-badge machinery
  and semantic tokens (--accent, --violet) instead of adding dedicated
  --maturity-* tokens as the handoff's example suggested, since live/
  planned already had badge rules and duplicating tokens for colours
  that already exist would cut against "tokens are law" meaning one
  source of truth per colour. Worth a look if the owner wants a
  visually distinct maturity palette later.

## 2026-07-15 - PXP design elevation session
Branch: claude/lpio-design-elevation-nmc8oz (task-designated)
Completed:
- Full visual re-skin per an explicit design-authority brief (not a
  brand-compliance reskin): PXP Blue (`#292cf5`) as the one commanding
  accent, PXP Black (`#09090c`) as a fixed chrome material (the top
  nav is now near-black in both colour schemes, not just dark mode),
  and Lime (`#caff0a`) used surgically in exactly three spots - the
  nav active-page underline, the nav wordmark separator, and the
  login brand panel's wordmark separator - never as body text, a
  fill, or paired with white. Signature choice: PXP-black nav chrome
  with the lime active marker (the alternative candidates, a
  live-status dot system and a reimagined method-badge system, were
  considered and rejected/partly folded in - see below).
- assets/css/tokens.css rebuilt (light + dark, both schemes verified
  by hand-computed WCAG contrast, not just eyeballed): renamed
  --accent-strong to --accent-hover and added --accent-pressed; new
  --alt-surface (table headers), --chrome-bg/-ink/-muted/-line
  (scheme-invariant PXP Black chrome), --lime/--lime-ink (scheme-
  invariant), --gradient-brand + --plum (login only), --cyan/-violet
  text-safe derivations, a --m-query method colour (was silently
  reusing --m-patch), a three-step elevation scale (--shadow-rest/
  -raised/-overlay, replacing the old flat --shadow/--shadow-raised
  pair), a radius scale (--radius-sm 6 / --radius 8 / --radius-lg 14),
  motion tokens (--ease, --dur-fast 150ms, --dur-base 200ms) and
  --text-3xl (tokenising the login headline's clamp(), which had been
  a hard-coded per-page override).
- docs/DESIGN.md amended in the same commit as tokens.css: motion
  rule changed from "none beyond native browser behaviour" to
  restrained engineered transitions (colour/border/background/shadow
  only, 150-200ms, reduced-motion respected); palette, shadow and
  gradient-carve-out prose rewritten to match; Character section
  documents both signature devices (mono eyebrow, protected; PXP
  black nav + lime marker, new).
- components.css: cards/endpoints/modal moved onto the elevation +
  radius scale with a hover lift; buttons gained hover/pressed/focus
  states with real transitions; tables gained an --alt-surface header
  and a hover row; badges gained a currentColor marker dot before the
  mono label (get/post/put/patch/delete/query, all re-derived to the
  appendix's AA-safe values) - this is the "reimagined method badge"
  idea folded in as a CSS-only execution upgrade, not the chosen
  signature. base.css: heading tracking/line-height tightened.
- layout.css: nav rebuilt on --chrome-bg/-ink/-muted with the lime
  aria-current underline; assets/js/core/ui.js line 69 changed the
  nav-brand separator's inline style from var(--accent) to
  var(--lime) - a values-only edit (no logic change) required because
  PXP Blue on near-black chrome measures ~2.6:1, well under the 3:1
  UI floor, while lime measures 16.87:1.
- login.css: desktop brand panel now uses --gradient-brand (PXP's
  Black -> Blue -> Plum recipe) with --chrome-ink text (deliberately
  not --on-accent, which flips to dark navy in dark mode and would
  have gone invisible on the scheme-invariant gradient) and the lime
  wordmark separator; headline moved onto --text-3xl + --weight-bold.
- pages.css: reference sidebar and endpoint cards onto the elevation
  scale; .badge.query given its own --m-query/-bg instead of reusing
  --m-patch's colour.
- Verified: npm test 47/47 green throughout (committed in 5 stages,
  each independently green per the suggested commit plan). Hand-
  computed WCAG contrast for every new pairing that touches the new
  chrome surface (chrome-muted/chrome-bg 10.2:1, chrome-ink/chrome-bg
  19.89:1, lime/chrome-bg 16.87:1, the accent-on-chrome failure above)
  since the appendix only pre-verified pairings against white/paper/
  #1d2026, not against #09090c. Rendered dashboard-equivalent markup
  and the real index.html (login) through headless Chromium at 1280px
  and 360px in both colour schemes (screenshots reviewed, not
  committed - scratchpad only); no console errors beyond the expected
  sandboxed CDN fetch failure.
- Follow-up verification pass (same session, after the initial
  five commits): built a mock Supabase client (createClient shim +
  fixture data injected via Playwright addInitScript) so the real
  guarded pages render without a live session, and screenshotted all
  eight (dashboard, reference viewer, prototypes gallery, silos
  index, roadmap board, backlog, integrations, users) at 1280px and
  360px in both colour schemes, plus the integrations and backlog
  modals. Every page: no console/page errors, no document-level
  horizontal overflow at 360px (wide tables and the reference
  environments table scroll inside their own wraps as intended),
  stacked sections and full-width cards sit correctly, dark-mode
  table headers and badges read at contrast. Found and fixed one
  real issue: the global accent focus ring measured ~2.6:1 on the
  PXP Black nav (below the 3:1 UI floor), so nav focus-visible is now
  scoped to white and the sign-out pressed state settles on the
  chrome line (commit "Fix keyboard focus contrast on the dark nav").
  roadmap.css renders coherently with the new tokens untouched.
In progress:
- None. This branch is verified and ready to merge to main.
Next steps:
1. components.css is now 408 lines (over the 300 soft budget, under
   the 500 hard). Plan a split - modal/dialog styles are the obvious
   extraction - before extending it again.
2. Optional polish pass on roadmap.css: its board tiles sit flat
   (border + accent edge, no elevation) - deliberately kept for the
   print-oriented board, but could be brought onto --shadow-rest for
   consistency if desired.
3. Carry forward still-open items from prior checkpoints: enable
   leaked-password protection; rotate the anon key; delete the dead
   bulk-load edge function; seed.sql split (over the 300 soft
   budget).
Open decisions:
- Signature choice (PXP-black nav + lime marker) was made per the
  brief's explicit design-authority grant. Merged with owner
  authorisation; still worth a look against the live-status-dot or
  method-badge alternatives if the owner wants to revisit.

## 2026-07-15 - Roadmap board ported from the standalone app into the portal
Branch: claude/roadmap-feature-integration-p4aneq (task-designated)
Completed:
- Folded the standalone roadmap app into modules/roadmap/ over the
  existing roadmap tables. The visual is reproduced as a read-only,
  print-ready three-zone board; all content and the editing surface
  live in Supabase, per the repo's data-in-Supabase model. Editing is
  through an AI assistant with Supabase access (or the dashboard), not
  the page - writes are admin-only under RLS. Dropped the app's
  localStorage and the Sortable CDN dependency.
- Schema (migration 20260715000000_roadmap_board_categories_
  presentation, applied live and mirrored in supabase/schema/
  30_work.sql + policies.sql): new roadmap_categories lookup table
  (colour-lane taxonomy: key/label/description/order; RLS behind the
  roadmap grant, admin write); roadmap_items gains category_id and
  presentation (sequenced/current/ongoing/wind/bridge). Board zones
  are derived, not stored - status 'done', horizon 'someday', else by
  priority - so moving zones is a field edit. Advisor shows nothing
  new.
- Real roadmap content loaded into the live database only, never the
  repo (categories and roadmap_items rows mapped to product
  work_areas; counts confirmed by query). Pre-existing portal-tooling
  items stay under scope 'portal'; the board's Product/Portal/All
  control filters on work_areas.scope, defaulting to Product.
- Front end: assets/js/pages/roadmap.js rebuilt with pure builders on
  App.roadmapView (DOM-free, unit-tested); new page sheet
  assets/css/roadmap.css; category colour tokens (light + dark) in
  tokens.css; roadmap_categories added to registry.js. seed.sql
  sample extended to exercise the new columns and all three zones with
  generic values only.
- Signposting for AI: docs/ROADMAP.md rewritten with the board data
  model, the zone-derivation rule, and a retrieval + editing protocol
  a cold claude.ai chat with Supabase access can follow in one read.
  ARCHITECTURE.md data model updated.
- Verified: npm test 47 green (6 new roadmap-render benchmarks: zone
  derivation, cascade, scope filter, escaping, empty state). Ran the
  live payload through the actual builder in Node across all three
  scopes; zone counts, lane classes and escaping all correct.
In progress:
- None.
Next steps:
1. Review the board in the signed-in viewer (Product scope by
   default); confirm the Print or save as PDF snapshot reads well.
2. Open a claude.ai chat with Supabase access and rework priorities
   with the owner, following docs/ROADMAP.md; record decisions as
   work_notes.
3. Carry forward still-open items: enable leaked-password protection;
   rotate the anon key; delete the dead bulk-load edge function;
   seed.sql split (over the 300 soft budget).
Open decisions:
- Whether the single operational lane should later split into finer
  lanes; it currently mirrors the source app's category set.

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


Earlier checkpoints (2026-07-13 and before) are in
docs/sessions-archive/2026-07.md.
