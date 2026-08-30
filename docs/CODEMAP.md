# Code map

GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.

Where to start: **docs/NAVIGATION.md** answers "I want to change X".
This file answers "where is it".

## Public surface

Everything one file can call in another. A surface in
`assets/js/pages/<module>/` is named for its directory, so
`App.appReviewRender` lives under `app-review/`.

| Surface | Defined in |
|---|---|
| `App.access` | assets/js/core/guard.js:93 (+2 more) |
| `App.accessReady` | assets/js/core/guard.js:92 |
| `App.appReview` | assets/js/pages/app-review/model.js:224 |
| `App.appReviewDetail` | assets/js/pages/app-review/detail.js:175 |
| `App.appReviewFindings` | assets/js/pages/app-review/findings.js:138 |
| `App.appReviewRender` | assets/js/pages/app-review/render.js:281 |
| `App.backlogExport` | assets/js/pages/backlog/export.js:80 |
| `App.backlogView` | assets/js/pages/backlog/backlog.js:388 |
| `App.blocks` | assets/js/core/blocks.js:104 (+4 more) |
| `App.canAccess` | assets/js/core/guard.js:88 |
| `App.copyText` | assets/js/core/ui.js:51 |
| `App.csvFromRows` | assets/js/core/ui.js:95 |
| `App.daopayAdminTool` | assets/js/core/console-tools.js:289<br>assets/js/core/console-tools.js:290 |
| `App.dashboardCards` | assets/js/pages/dashboard/cards.js:25 (+9 more) |
| `App.dashboardStrip` | assets/js/pages/dashboard/strip.js:53 (+4 more) |
| `App.db` | assets/js/core/supabase.js:31 (+2 more) |
| `App.deepLinkScroll` | assets/js/core/ui.js:173 |
| `App.departmentLabel` | assets/js/core/registry.js:312 |
| `App.detail` | assets/js/core/detail.js:37 (+5 more) |
| `App.download` | assets/js/core/ui.js:75 (+3 more) |
| `App.drawer` | assets/js/core/drawer.js:35 |
| `App.escape` | assets/js/core/ui.js:17 |
| `App.flashLabel` | assets/js/core/ui.js:44 (+2 more) |
| `App.futurePrototypesTable` | assets/js/pages/gallery.js:18 |
| `App.ideasView` | assets/js/pages/ideas/render.js:37 (+7 more) |
| `App.itemHref` | assets/js/core/registry.js:243 |
| `App.lazyDetail` | assets/js/pages/shared/lazy-detail.js:46 |
| `App.linkHref` | assets/js/core/registry.js:286 |
| `App.links` | assets/js/core/links.js:28 (+4 more) |
| `App.methodBadge` | assets/js/core/ui.js:27 |
| `App.moduleHref` | assets/js/core/registry.js:233 |
| `App.notice` | assets/js/core/ui.js:65 |
| `App.onAuthed` | assets/js/core/guard.js:116 (+3 more) |
| `App.onThemeChange` | assets/js/core/ui.js:345 |
| `App.pciInterstitial` | assets/js/pages/pci/interstitial.js:21 |
| `App.pciIxopay` | assets/js/pages/pci/ixopay.js:130 |
| `App.platformKnowledge` | assets/js/pages/platform/knowledge.js:193 |
| `App.platformView` | assets/js/pages/platform/platform.js:232 |
| `App.portalReview` | assets/js/pages/portal-review/model.js:43 (+12 more) |
| `App.portalReviewRender` | assets/js/pages/portal-review/render.js:72 (+5 more) |
| `App.referenceRender` | assets/js/pages/reference/render.js:273 |
| `App.referenceTopics` | assets/js/pages/reference/topics.js:43 |
| `App.registry` | assets/js/core/registry.js:21 |
| `App.requireAuth` | assets/js/core/guard.js:31 |
| `App.roadmapDetail` | assets/js/pages/roadmap/detail-export.js:218 (+5 more) |
| `App.roadmapDetailValues` | assets/js/pages/roadmap/detail-values.js:100 |
| `App.roadmapDrawer` | assets/js/pages/roadmap/drawer.js:19 |
| `App.roadmapExport` | assets/js/pages/roadmap/export.js:99 |
| `App.roadmapPrefs` | assets/js/pages/roadmap/prefs.js:52 |
| `App.roadmapView` | assets/js/pages/roadmap/views-breakdown.js:58 (+4 more) |
| `App.roadmapViewsShared` | assets/js/pages/roadmap/views.js:385 |
| `App.root` | assets/js/core/guard.js:29 (+7 more) |
| `App.search` | assets/js/core/search.js:347 |
| `App.sendTool` | assets/js/core/console-tools.js:209<br>assets/js/core/console-tools.js:210 |
| `App.session` | assets/js/core/guard.js:39 |
| `App.sprints` | assets/js/core/sprints.js:103 |
| `App.statusBadge` | assets/js/core/ui.js:35 |
| `App.store` | assets/js/core/ui.js:138 |
| `App.theme` | assets/js/core/theme.js:65 |
| `App.tools` | assets/js/core/tools.js:63 (+6 more) |
| `App.usersView` | assets/js/pages/users.js:192 |
| `App.workItemsData` | assets/js/pages/shared/work-items-data.js:162 (+3 more) |

## Files by area

### assets/js/core/

Shared runtime. Loaded on every protected page in the order set by assets/js/core/includes.json.

| File | Lines | Purpose |
|---|---:|---|
| auth.js | 54 | auth.js - Login page logic for index.html. |
| blocks.js | 139 | blocks.js - The typed-block renderer, in one place. |
| config.example.js | 18 | config.example.js - OPTIONAL local override. |
| console-tools.js | 311 | console-tools.js - The nav's console-snippet tools: Acquirer send (App.sendTool) and DaoPay admin (App.daopayAdminTool). |
| detail.js | 142 | detail.js - The completeness contract for rendering a row. |
| drawer.js | 112 | drawer.js - A shared slide-over dialog surface. |
| guard.js | 145 | guard.js - Blocks unauthenticated access to protected pages and enforces per-module access. |
| includes.json | 111 | The core script include order, in one place. Every protected page loads these in this sequence; tests/checks/structure.test.js enforces it, and CLAUDE.md and docs/ARCHITECTURE.md cite this file rather than restating it. It was stated in three places before, and all three were stale: none of them mentioned links.js, detail.js, blocks.js, drawer.js, sprints.js or send-tool.js, and the gate checked five of the fourteen. |
| links.js | 144 | links.js - The typed knowledge graph, resolved for rendering. |
| registry.js | 319 | registry.js - Single source of truth for the hub's modules, the Supabase tables they read, and role names. |
| search.js | 356 | search.js - Global header search (App.search). |
| sprints.js | 115 | sprints.js - The sprint + date engine (App.sprints). |
| supabase.js | 36 | supabase.js - Initialises the Supabase client as App.db. |
| theme.js | 84 | theme.js - Light/dark theme control. |
| tools.js | 217 | tools.js - The nav's outbound links to external tools, rendered as icon buttons beside the theme switch. |
| ui.js | 370 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy, downloads and the guarded localStorage helper (App.store). |

### assets/js/pages/

Page modules, one directory per module, mirroring modules/. A file here attaches App.<camelCase(directory)>...

| File | Lines | Purpose |
|---|---:|---|
| app-review/board.js | 233 | app-review/board.js - The triage board page for modules/app-review/wave.html: state, fetching, wiring and the filter interactions. |
| app-review/detail.js | 207 | app-review/detail.js - The drawer body for one application. |
| app-review/findings.js | 145 | app-review/findings.js - The cross-record half of the review model: duplicates, the partner-blocker rollup, and the findings that fire when a record's own state disagrees with its evidence. |
| app-review/model.js | 240 | app-review/model.js - What the board derives from a single row: its group, its age, its state marker, what it is waiting on, and the orderings built from those. |
| app-review/render.js | 292 | app-review/render.js - The board's HTML builders. |
| app-review/waves.js | 163 | app-review/waves.js - The wave list for modules/app-review/index.html, plus the standing watch list above it. |
| backlog/backlog.js | 393 | backlog/backlog.js - The master work list for modules/backlog/. |
| backlog/export.js | 87 | backlog/export.js - The backlog's CSV export: the column order, the flat record builder and the wiring. |
| daopay/app.js | 275 | daopay/app.js - The application summary page in the Daopay replica: composition, state and behaviour. |
| daopay/data.js | 251 | daopay/data.js - Fixture data and the role switch for the Daopay EU onboarding replica (modules/prototypes/daopay/). |
| daopay/list.js | 114 | daopay/list.js - The Applications list in the Daopay replica. |
| daopay/sections.js | 238 | daopay/sections.js - The markup for each section of the application summary page, in the portal's own order. |
| daopay/shell.js | 96 | daopay/shell.js - Shared chrome for the Daopay replica pages: the black portal header, the navigation sider, and the role switch that flips between the PXP and Daopay views of the same page. |
| daopay/sim.js | 169 | daopay/sim.js - The simulation layer for the Daopay replica: the toast stack, the email prompt, and the stepped progress modal that stands in for e-signature and the automated handoff. |
| dashboard/cards.js | 240 | dashboard/cards.js - The dashboard's four card sections: API reference, reviews, knowledge and tools (docs/plan/50-DASHBOARD.md). |
| dashboard/dashboard.js | 261 | dashboard/dashboard.js - Fetches and orchestrates the landing page (docs/plan/50-DASHBOARD.md). |
| dashboard/strip.js | 131 | dashboard/strip.js - The now/next strip, the dashboard's headline (docs/plan/50-DASHBOARD.md). |
| gallery.js | 115 | gallery.js - Prototype registry for modules/prototypes/. |
| ideas/ideas.js | 71 | ideas/ideas.js - modules/prototypes/ideas.html. |
| ideas/render.js | 177 | ideas/render.js - The prototype ideas board's builders (App.ideasView). |
| integrations.js | 126 | integrations.js - Integration overview for modules/integrations/. |
| pci/interstitial.js | 144 | pci/interstitial.js - The PCI compliance "checkout interstitial" for the PXP replica. |
| pci/ixopay.js | 132 | pci/ixopay.js - In-page mock of the IXOPAY vendor client and its webhook/event bus for the PCI prototype. |
| pci/portal.js | 302 | pci/portal.js - The PXP Partner Portal replica: the "Merchant Prescreen & Quote" wizard. |
| pci/reports.js | 54 | pci/reports.js - Compliance reporting view for the PCI prototype, rendered from the IXOPAY mock's getReport(): portfolio totals, compliance status breakdown, webhooks outstanding, and the chases / follow-ups IXOPAY has performed. |
| platform/knowledge.js | 202 | platform/knowledge.js - The parts of the platform knowledge base the capability catalogue alone cannot show (App.platformKnowledge). |
| platform/platform.js | 327 | platform/platform.js - The platform product-knowledge viewer for modules/platform/. |
| portal-review/board.js | 142 | portal-review/board.js - modules/portal-review/wave.html. |
| portal-review/model.js | 208 | portal-review/model.js - Every derivation the portal review board needs, as pure functions (App.portalReview). |
| portal-review/render.js | 249 | portal-review/render.js - The portal review board's HTML builders (App.portalReviewRender). |
| portal-review/triage.js | 108 | portal-review/triage.js - modules/portal-review/triage.html. |
| portal-review/waves.js | 129 | portal-review/waves.js - modules/portal-review/index.html. |
| reference/reference.js | 309 | reference/reference.js - The reference viewer ("swagger") for modules/reference/. |
| reference/render.js | 288 | reference/render.js - Pure HTML builders for the reference viewer. |
| reference/topics.js | 48 | reference/topics.js - Pure HTML builders for api_topics rows: the narrative sections of a spec (overview, conventions, runbooks, accepted values, gap registers). |
| roadmap/detail-export.js | 223 | roadmap/detail-export.js - The AI-optimised JSON and the flat CSV exports for the roadmap (App.roadmapDetail.toKpiItem / toKpiRoadmap / toCsvRoadmap). |
| roadmap/detail-values.js | 124 | roadmap/detail-values.js - Formatting and derivation for the roadmap item drawer and both of its exports (App.roadmapDetailValues). |
| roadmap/detail.js | 438 | roadmap/detail.js - Pure builders for the roadmap item drawer and the AI-optimised JSON export (App.roadmapDetail). |
| roadmap/drawer.js | 97 | roadmap/drawer.js - The item detail drawer surface for the roadmap home: open/close, the ?item=<id> deep-link URL sync, and in-drawer navigation (a related-item link or a nested step row swaps the drawer to that item). |
| roadmap/export.js | 101 | roadmap/export.js - The roadmap home's export dropdown wiring and the small download helpers it shares with the detail drawer (App.roadmapExport). |
| roadmap/prefs.js | 106 | roadmap/prefs.js - The roadmap board's remembered view state (App.roadmapPrefs): which level and layout, and the eight view-only preferences that are NOT part of the shareable hash. |
| roadmap/roadmap.js | 449 | roadmap/roadmap.js - The roadmap home for modules/roadmap/. |
| roadmap/views-breakdown.js | 60 | roadmap/views-breakdown.js - The Detailed breakdown for the roadmap home: the Category -> Area -> item drill-down shown under the Work Items and Backlog levels when Detailed is on. |
| roadmap/views-cascade.js | 206 | roadmap/views-cascade.js - The Cascade layout for the roadmap home: the same work as stacked stage bands (Now/Next/Later, plus Parked for Backlog). |
| roadmap/views-exec.js | 102 | roadmap/views-exec.js - The Executive (Categories) board for the roadmap home: a department-first rollup of active work - each department, the categories it owns and their item counts, expanding to item rows when Detailed is on. |
| roadmap/views-timeline.js | 213 | roadmap/views-timeline.js - The Timeline layout for the roadmap home: the continuous Delivered\|Now\|Next\|Later\|Parked axis where a bar SPANS the columns it runs across. |
| roadmap/views.js | 413 | roadmap/views.js - Pure HTML builders for the roadmap home (modules/roadmap/). |
| shared/lazy-detail.js | 111 | shared/lazy-detail.js - Fetching a row's heavy fields when the detail surface opens, instead of carrying them for every row on page load. |
| shared/proto-svg.js | 125 | shared/proto-svg.js - Inline SVG diagram viewer for a prototype overview page. |
| shared/work-items-data.js | 172 | shared/work-items-data.js - The reads over work_items and work_notes that the list pages deliberately no longer carry. |
| users.js | 207 | users.js - User and access management for modules/users/. |

### assets/css/

Stylesheets, loaded as a fixed stack: tokens, base, layout, components, pages, then page sheets. Every value comes from tokens.css.

| File | Lines | Purpose |
|---|---:|---|
| app-review-detail.css | 112 | app-review-detail.css - The application review detail drawer: the slide-over surface and the blocks inside it (findings, mail trail, confirmation state, record metadata). |
| app-review.css | 378 | app-review.css - The application review board and wave list. |
| base.css | 111 | base.css - Reset, typography and global element styles. |
| components.css | 478 | components.css - Reusable interface components: cards, forms, buttons, notices, tables, badges and toggles. |
| console-tool.css | 71 | console-tool.css - The modal shared by the nav's console-snippet tools (send-tool.js and daopay-admin-tool.js): a wide dialog with a header bar, a scrolling code block per snippet and a collapsed details section. |
| dashboard.css | 218 | dashboard.css - The rebuilt landing page (docs/plan/50-DASHBOARD.md). |
| ideas.css | 92 | ideas.css - The prototype ideas board and the gallery strip that points at it (docs/plan/70-PROTOTYPE-IDEAS.md). |
| layout.css | 395 | layout.css - Navigation, page scaffold and grids. |
| login.css | 163 | login.css - Sign-in page only. |
| pages.css | 308 | pages.css - The reference viewer ("swagger") page. |
| platform.css | 149 | platform.css - The platform knowledge page (modules/platform/). |
| portal-review.css | 269 | portal-review.css - The portal review board (docs/PORTAL-REVIEW.md). |
| prototype.css | 88 | prototype.css - Shared styles for a prototype's LPio-framed overview page: the meta row, sections, step sequence, backlog list and the diagram figure. |
| pxp-daopay.css | 212 | pxp-daopay.css - The Daopay EU onboarding replica layered on the PXP |
| pxp-pci.css | 124 | pxp-pci.css - The PCI feature layered on the PXP replica: the wizard |
| pxp-sim.css | 191 | pxp-sim.css - The simulation layer for the Daopay replica: the toast stack, the modal shell used by the email prompt and the stepped progress runs, and the spinner/tick each step cycles through. |
| pxp.css | 218 | pxp.css - PXP Partner Portal replica shell for the PCI prototype (modules/prototypes/pci/demo.html). |
| roadmap-detail.css | 354 | roadmap-detail.css - Coarse progress bars, the expanded Executive child lists, and the right-hand item detail drawer. |
| roadmap-themes.css | 30 | roadmap-themes.css - The theme accent map: one rule per roadmap_categories.key, each setting the accent and soft tint that a lane label, card border, dot or rail reads. |
| roadmap-views.css | 439 | roadmap-views.css - The roadmap home's level views (Executive theme rollup, Team, Backlog) in Timeline and Cascade layouts, plus the level switcher. |
| roadmap.css | 410 | roadmap.css - The roadmap board (modules/roadmap/). |
| skeleton.css | 57 | skeleton.css - The loading placeholder for a region whose content arrives after first paint. |
| tokens.css | 444 | tokens.css - Design tokens for the LPio hub. |

### modules/

One folder per module, named for its registry key. Pages are shells; the logic is in assets/js/pages/.

| File | Lines | Purpose |
|---|---:|---|
| app-review/index.html | 69 | Application review - LPio / LaunchPad IO |
| app-review/wave.html | 94 | Wave - Application review - LPio / LaunchPad IO |
| backlog/index.html | 93 | Backlog - LPio / LaunchPad IO |
| integrations/index.html | 58 | Integrations - LPio / LaunchPad IO |
| platform/index.html | 58 | Platform - LPio / LaunchPad IO |
| portal-review/index.html | 79 | Portal review - LPio / LaunchPad IO |
| portal-review/triage.html | 52 | Triage - Portal review - LPio / LaunchPad IO |
| portal-review/wave.html | 61 | Wave - Portal review - LPio / LaunchPad IO |
| prototypes/daopay/application.html | 46 | Application summary - PXP replica - LPio |
| prototypes/daopay/applications.html | 45 | Applications - PXP replica - LPio |
| prototypes/daopay/daopay-flow.svg | 171 |  |
| prototypes/daopay/index.html | 250 | Daopay user role - EU merchant onboarding - LPio / LaunchPad IO |
| prototypes/gdpr/index.html | 44 | GDPR compliance prototype - LPio / LaunchPad IO |
| prototypes/ideas.html | 54 | Prototype ideas - LPio / LaunchPad IO |
| prototypes/index.html | 59 | Prototypes - LPio / LaunchPad IO |
| prototypes/pci/dashboard.html | 62 | Dashboard - PXP replica - LPio |
| prototypes/pci/demo.html | 82 | Merchant Prescreen and Quote - PXP replica - LPio |
| prototypes/pci/index.html | 151 | PCI compliance prototype - LPio / LaunchPad IO |
| prototypes/pci/pci-workflow.svg | 62 |  |
| prototypes/pci/reports.html | 72 | Compliance reporting - PXP replica - LPio |
| prototypes/website-screening/index.html | 45 | Website screening prototype - LPio / LaunchPad IO |
| reference/index.html | 71 | API reference - LPio / LaunchPad IO |
| roadmap/index.html | 134 | Roadmap - LPio / LaunchPad IO |
| users/index.html | 51 | Users - LPio / LaunchPad IO |

### supabase/migrations/

Applied migrations. Immutable once run - never edited, never reflowed.

| File | Lines | Purpose |
|---|---:|---|
| 20260713000000_module_access_and_function_hardening.sql | 93 | ---------------------------------------------------------------- Applied to the live project on 2026-07-13 via the Supabase MCP migration runner. |
| 20260713100000_api_spec_families.sql | 11 | Group api_specs rows into distinct reference sites. |
| 20260713110000_integrations.sql | 43 | Integrations overview: one row per third-party service connected to Launchpad. |
| 20260713120000_roadmap.sql | 135 | Roadmap skeleton. |
| 20260713130000_work_areas_and_backlog.sql | 187 | Work areas, backlog and intake framework (see docs/WORKFLOW.md). |
| 20260713140000_performance_rls_and_indexes.sql | 197 | ------------------------------------------------------------------ |
| 20260713150000_profiles_update_recursion_fix.sql | 28 | The profiles update policy compared role against a subselect on profiles itself, which re-enters the table's own RLS policies and recurses. |
| 20260714000000_api_reference_detail.sql | 34 | Reference detail columns so comprehensive API material lives |
| 20260714100000_api_reference_structure.sql | 119 | Generic reference structure so any comprehensive API guide fits the standard viewer without new code or schema per source: api_tags per-spec tag catalogue. |
| 20260715000000_roadmap_board_categories_presentation.sql | 60 | ------------------------------------------------------------------ |
| 20260715120000_platform_product_knowledge.sql | 86 | ---------------------------------------------------------------- 20260715120000_platform_product_knowledge.sql The Platform product-knowledge domain: the durable, queryable description of what Launchpad is and does today. |
| 20260716000000_roadmap_audience_and_area_theme.sql | 35 | ---------------------------------------------------------------- 20260716000000_roadmap_audience_and_area_theme.sql Roadmap refinement: the two-level taxonomy and the audience axis. |
| 20260716120000_roadmap_spans_and_backlog_horizons.sql | 25 | ------------------------------------------------------------------ |
| 20260716140000_unify_work_items.sql | 195 | ------------------------------------------------------------------ |
| 20260717000000_pxp_roadmap_fields.sql | 120 | ------------------------------------------------------------------ |
| 20260717120000_work_item_department.sql | 25 | ------------------------------------------------------------------ |
| 20260718120000_work_item_parent.sql | 36 | ---------------------------------------------------------------- 20260718120000_work_item_parent.sql Add an optional parent_id to work_items so a coarse item can break into ordered sub-steps that are themselves first-class work items (e.g. |
| 20260720000000_workstreams_and_visibility.sql | 98 | ---------------------------------------------------------------- 20260720000000_workstreams_and_visibility.sql Name the high-level layer and give it a shareholder-clean projection. |
| 20260720130000_category_department_and_fix_relates.sql | 74 | ---------------------------------------------------------------- 20260720130000_category_department_and_fix_relates.sql Two additive columns that finalise the work model (see docs/ROADMAP-PLAYBOOK.md and docs/DESIGN.md): 1. |
| 20260722000000_future_prototypes.sql | 68 | ------------------------------------------------------------- future_prototypes: a pre-draft shortlist of prototype ideas held for future reference. |
| 20260722153355_restore_roadmap_current_security_invoker.sql | 14 | ---------------------------------------------------------------- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations. |
| 20260722153511_roadmap_current_canonical_column_order.sql | 43 | ---------------------------------------------------------------- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations. |
| 20260722160000_work_item_associated_departments.sql | 68 | ---------------------------------------------------------------- 20260722160000_work_item_associated_departments.sql Business area associations for work_items. |
| 20260722170000_roadmap_move_workstream_cascade.sql | 65 | ------------------------------------------------------------------ |
| 20260722190000_work_item_deliverable_level.sql | 23 | Deliverables: a third presentation level for work_items. |
| 20260724142347_add_context_tables_domain_terms_journey_stages.sql | 90 | ---------------------------------------------------------------- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations. |
| 20260727210907_add_assignee_to_work_items.sql | 39 | ---------------------------------------------------------------- RECONSTRUCTED 2026-08-09 from supabase_migrations.schema_migrations. |
| 20260728094808_roadmap_find_idf_weighting.sql | 18 | ---------------------------------------------------------------- Ledger placeholder. |
| 20260728120000_roadmap_searchable_and_find.sql | 190 | Contextualisation read surface: roadmap_searchable + roadmap_find. |
| 20260730120000_app_review.sql | 334 | ------------------------------------------------------------- App Review: waves of merchant application triage. |
| 20260809120000_schema_catchup_and_delete_guard.sql | 64 | ---------------------------------------------------------------- Bring a fresh project to the state the live one is already in, and close one long-standing hazard. |
| 20260809130647_knowledge_links_typed_vocabulary.sql | 340 | ---------------------------------------------------------------- Applied 2026-08-09 as knowledge_links_typed_vocabulary. |
| 20260809131500_backfill_relates_to_id_into_knowledge_links.sql | 25 | ---------------------------------------------------------------- Applied 2026-08-09. |
| 20260809132000_roadmap_searchable_links.sql | 50 | ---------------------------------------------------------------- Applied 2026-08-09. |
| 20260809132500_knowledge_graph_symmetric_both_ends.sql | 34 | ---------------------------------------------------------------- Applied 2026-08-09. |
| 20260809132501_roadmap_find_prune_stoplist.sql | 145 | ---------------------------------------------------------------- Applied 2026-08-09. |
| 20260809132701_product_capability_knowledge_kinds.sql | 15 | ---------------------------------------------------------------- Applied 2026-08-09. |
| 20260809133000_drop_relates_to_id.sql | 44 | ---------------------------------------------------------------- Applied 2026-08-09. |
| 20260809133500_roadmap_find_returns_links.sql | 206 | ---------------------------------------------------------------- Applied 2026-08-09. |
| 20260810215935_work_items_historic_at_latch.sql | 15 | Delivered work splits into two columns on the board: Completed (a rolling freshness window) and Historic. |
| 20260810220039_rename_historic_at_to_previously_completed_at.sql | 13 | The board's delivered columns are "Recently completed" and "Previously completed". |
| 20260811220737_portal_links.sql | 51 | ---------------------------------------------------------------- portal_links: outbound tool links rendered as icon buttons in the top nav. |
| 20260813223937_dashboard_summary.sql | 126 | ---------------------------------------------------------------- The dashboard rebuild (docs/plan/50-DASHBOARD.md). |
| 20260813230545_portal_review.sql | 285 | ---------------------------------------------------------------- Portal review (docs/plan/60-PORTAL-REVIEW.md). |
| 20260813233000_dashboard_summary_portal_waves.sql | 132 | The dashboard's Reviews section now covers both reviews. |
| 20260813234500_prototype_ideas.sql | 73 | Prototype ideas and plans (docs/plan/70-PROTOTYPE-IDEAS.md). |
| 20260816112327_work_items_board_view.sql | 35 | ---------------------------------------------------------------- work_items_board: every work_items column except details. |
| 20260816114710_work_item_embeddings.sql | 72 | ---------------------------------------------------------------- The semantic channel's store. |
| 20260816114803_pg_net_for_embeddings.sql | 6 | Kept as history: pg_net was enabled here and dropped again three migrations later, once measurement showed it cannot be awaited inside a transaction. |
| 20260816114921_embed_functions.sql | 137 | ---------------------------------------------------------------- The embedding plumbing: Postgres calls the `embed` Edge Function, waits for the answer and stores the vectors itself. |
| 20260816115026_embed_over_synchronous_http.sql | 68 | ---------------------------------------------------------------- Correction, made on measurement rather than reasoning: pg_net cannot be awaited. |
| 20260816115048_embed_text_window.sql | 21 | gte-small has a 512-token context and truncates past it, so sending a 9KB write-up buys nothing except edge-worker memory - and a batch of sixteen untrimmed items failed outright with WORKER_RESOURCE_LIMIT (HTTP 546). |
| 20260816115506_roadmap_find_semantic_channel.sql | 163 | ---------------------------------------------------------------- The semantic channel, blended into roadmap_find. |
| 20260816115826_embed_batch_of_four.sql | 104 | Two corrections found while writing the schema file, applied so the repo and the database say the same thing. |
| 20260830214715_pin_search_path_on_remaining_functions.sql | 77 | ---------------------------------------------------------------- pin_search_path_on_remaining_functions Sixteen of the eighteen functions in supabase/schema/ already set search_path = public, as do all three in policies.sql. |
| 20260830215036_revoke_execute_on_embed_functions.sql | 24 | ------------------------------------------------------------------ |

### supabase/schema/

Schema, one file per domain, run in lexical order.

| File | Lines | Purpose |
|---|---:|---|
| 00_core.sql | 79 | ---------------------------------------------------------------- 00_core.sql - Users, access grants and shared plumbing. |
| 10_reference.sql | 145 | ---------------------------------------------------------------- 10_reference.sql - The API reference domain: specs, endpoints, tag catalogue and narrative topics. |
| 20_portal.sql | 196 | ---------------------------------------------------------------- 20_portal.sql - Portal content domains: the integrations overview, the prototype gallery registry and the nav's outbound tool links. |
| 30_work.sql | 449 | ---------------------------------------------------------------- 30_work.sql - The working-record domain: shared area taxonomy, roadmap/backlog work items, intake and notes (see docs/WORKFLOW.md). |
| 31_roadmap_search.sql | 289 | Roadmap search: the contextualisation read surface. |
| 32_roadmap_board.sql | 158 | ---------------------------------------------------------------- 32_roadmap_board.sql - The roadmap's read-and-operate surface: the human-readable board view and the one operation that moves a whole workstream. |
| 33_links.sql | 345 | ---------------------------------------------------------------- 33_links.sql - The knowledge graph: typed, dated, owner-confirmed links between anything the system knows. |
| 34_embeddings.sql | 240 | ---------------------------------------------------------------- 34_embeddings.sql - The semantic channel's store and its plumbing. |
| 40_platform.sql | 78 | ---------------------------------------------------------------- 40_platform.sql - Platform product-knowledge domain. |
| 45_context.sql | 67 | ---------------------------------------------------------------- 45_context.sql - Platform context that is neither a capability nor roadmap work: the terminology glossary and the canonical onboarding lifecycle. |
| 50_review.sql | 317 | ---------------------------------------------------------------- 50_review.sql - Application review: waves of merchant application triage against LaunchPad records (see docs/APP-REVIEW.md). |
| 51_review_guards.sql | 104 | ---------------------------------------------------------------- 51_review_guards.sql - The application-review guards, split out of 50_review.sql when that file reached its size-budget exception. |
| 52_portal_review.sql | 249 | ------------------------------------------------------------------ |
| 90_dashboard.sql | 176 | ---------------------------------------------------------------- 90_dashboard.sql - Cross-domain functions. |

### supabase/

Policies, seed data, Edge Functions, and the generated snapshot the drift gate reads.

| File | Lines | Purpose |
|---|---:|---|
| functions/embed/index.ts | 61 |  |
| knowledge-coverage.json | 83 |  |
| policies.sql | 513 | ---------------------------------------------------------------- policies.sql - Row Level Security. |
| reference-coverage.json | 80 |  |
| schema-snapshot.json | 1319 |  |
| seed.sql | 514 | ---------------------------------------------------------------- seed.sql - OPTIONAL sample data. |

### tests/checks/

Repo-wide gates. These encode the CLAUDE.md rules as executable checks, so they hold when prose is forgotten.

| File | Lines | Purpose |
|---|---:|---|
| db-style-contract.test.js | 118 | tests/checks/db-style-contract.test.js - The database names styles. |
| knowledge-drift.test.js | 142 | tests/checks/knowledge-drift.test.js - Keeps what the system was told from quietly decaying. |
| knowledge-links.test.js | 143 | tests/checks/knowledge-links.test.js - The link vocabulary gate. |
| links.test.js | 112 | tests/checks/links.test.js - Internal references resolve. |
| one-home.test.js | 136 | tests/checks/one-home.test.js - One concept, one home. |
| perf.test.js | 271 | tests/checks/perf.test.js - Performance gates. |
| reference-drift.test.js | 167 | tests/checks/reference-drift.test.js - Keeps the API reference from drifting further from the code it documents. |
| render-coverage.test.js | 351 | tests/checks/render-coverage.test.js - Nothing stored-but-invisible. |
| roadmap-intake.test.js | 102 | tests/checks/roadmap-intake.test.js - Contextualisation gates. |
| schema-drift.test.js | 193 | tests/checks/schema-drift.test.js - The repo must describe the database. |
| security.test.js | 205 | tests/checks/security.test.js - Security gates. |
| size.test.js | 115 | tests/checks/size.test.js - File size budgets. |
| structure.test.js | 319 | tests/checks/structure.test.js - Page structure gates. |
| style.test.js | 89 | tests/checks/style.test.js - Design-system gates. |
| surface.test.js | 128 | tests/checks/surface.test.js - The refactor safety net. |

### tests/unit/

Behaviour benchmarks, mirroring assets/js/pages/.

| File | Lines | Purpose |
|---|---:|---|
| app-review/detail.test.js | 130 | tests/unit/app-review/detail.test.js - The application drawer's Record block, on the completeness contract (docs/plan/40-SURFACING.md). |
| app-review/findings.test.js | 136 | tests/unit/app-review/findings.test.js - Benchmarks for the |
| app-review/model.test.js | 318 | tests/unit/app-review/model.test.js - Benchmarks for the application review derivations (App.appReview in appreview-model.js), loaded in a Node vm. |
| backlog/detail.test.js | 131 | tests/unit/backlog/detail.test.js - The backlog's two modals, both on the completeness contract (docs/plan/40-SURFACING.md). |
| backlog/export.test.js | 155 | tests/unit/backlog/export.test.js - The backlog CSV export (App.backlogExport), split out of backlog.js with the builder. |
| blocks.test.js | 119 | tests/unit/blocks.test.js - The typed-block renderer. |
| call-extract.test.js | 156 | tests/unit/call-extract.test.js - Benchmarks for the call-site extractor (scripts/extract-calls.js), inventory C of docs/plan/20-API-REFERENCE.md. |
| coverage-reconcile.test.js | 278 | tests/unit/coverage-reconcile.test.js - Benchmarks for the coverage arithmetic in scripts/gen-coverage.js. |
| daopay/role.test.js | 207 | tests/unit/daopay/role.test.js - Benchmarks for the Daopay scoped role (assets/js/pages/daopay/data.js and daopay-app.js). |
| dashboard/cards.test.js | 270 | tests/unit/dashboard/cards.test.js - The dashboard's four card sections (docs/plan/50-DASHBOARD.md). |
| dashboard/strip.test.js | 164 | tests/unit/dashboard/strip.test.js - The dashboard's headline strip (docs/plan/50-DASHBOARD.md). |
| detail.test.js | 199 | tests/unit/detail.test.js - The completeness contract. |
| gallery-future.test.js | 91 | tests/unit/gallery-future.test.js - Benchmarks for the prototype gallery's ideas strip (App.futurePrototypesTable in assets/js/pages/gallery.js, which now delegates to App.ideasView). |
| ideas/render.test.js | 166 | tests/unit/ideas/render.test.js - The prototype ideas board (docs/plan/70-PROTOTYPE-IDEAS.md). |
| links.test.js | 203 | tests/unit/links.test.js - The typed knowledge graph, resolved. |
| pci/ixopay.test.js | 81 | tests/unit/pci/ixopay.test.js - Benchmarks for the PCI prototype's mock IXOPAY client (assets/js/pages/pci/ixopay.js). |
| platform/knowledge.test.js | 249 | tests/unit/platform/knowledge.test.js - The stores the capability catalogue could not show. |
| platform/render.test.js | 167 | tests/unit/platform/render.test.js - Benchmarks for the platform viewer's pure builders (App.platformView in assets/js/pages/ platform.js). |
| portal-review/model.test.js | 286 | tests/unit/portal-review/model.test.js - The portal review board's model and its renderer (docs/plan/60-PORTAL-REVIEW.md). |
| reference/render.test.js | 212 | tests/unit/reference/render.test.js - Benchmarks for the reference viewer's HTML builders (assets/js/pages/reference/render.js). |
| registry.test.js | 92 | tests/unit/registry.test.js - Benchmarks for the module registry, the single source of truth for navigation, dashboard cards and access-control keys. |
| render-fallbacks.test.js | 163 | tests/unit/render-fallbacks.test.js - Two renderers that handled the values they were written for and quietly mishandled the rest. |
| roadmap/child-order.test.js | 84 | tests/unit/roadmap/child-order.test.js - Benchmarks for how a workstream's nested work items stack and colour. |
| roadmap/detail-export.test.js | 212 | tests/unit/roadmap/detail-export.test.js - Benchmarks for the AI-optimised JSON export and the CSV builders (toKpiItem, toKpiRoadmap, toCsvRoadmap, csvFromRows). |
| roadmap/detail.test.js | 377 | tests/unit/roadmap/detail.test.js - Benchmarks for the item detail drawer (App.roadmapDetail.drawerHtml). |
| roadmap/export.test.js | 119 | tests/unit/roadmap/export.test.js - The roadmap's export dropdown wiring (App.roadmapExport.wire). |
| roadmap/views-custom.test.js | 258 | tests/unit/roadmap/views-custom.test.js - Benchmarks for the roadmap |
| roadmap/views-exec.test.js | 49 | tests/unit/roadmap/views-exec.test.js - Benchmarks for the Executive (Categories) board, split from roadmap-views.test.js per its size-budget exit plan. |
| roadmap/views.test.js | 475 | tests/unit/roadmap/views.test.js - Benchmarks for the roadmap home's pure builders (App.roadmapView in roadmap-views.js + the exec board in roadmap-views-exec.js + the cascade half in roadmap-views-cascade.js). |
| route-extract.test.js | 108 | tests/unit/route-extract.test.js - Benchmarks for the route extractor (scripts/extract-routes.js), inventory A of docs/plan/20-API-REFERENCE.md. |
| search.test.js | 259 | tests/unit/search.test.js - Benchmarks for assets/js/core/search.js. |
| shared/lazy-detail.test.js | 184 | tests/unit/shared/lazy-detail.test.js - The lazy detail loader (docs/plan/80-LOAD-SPEED.md). |
| shared/work-items-data.test.js | 219 | tests/unit/shared/work-items-data.test.js - The reads that replace what the list pages stopped carrying (docs/plan/80-LOAD-SPEED.md). |
| sprints.test.js | 81 | tests/unit/sprints.test.js - Benchmarks for the sprint engine (App.sprints in assets/js/core/sprints.js). |
| tools-warm.test.js | 184 | tests/unit/tools-warm.test.js - Benchmarks for the Splunk warm-up in assets/js/core/tools.js: the front door opened before the search so the deep link lands on results rather than the tool's error page. |
| tools.test.js | 224 | tests/unit/tools.test.js - Benchmarks for assets/js/core/tools.js. |
| ui.test.js | 130 | tests/unit/ui.test.js - Benchmarks for assets/js/core/ui.js. |

### tests/

Shared fixtures and the budgets the gates read.

| File | Lines | Purpose |
|---|---:|---|
| fixtures/controllers/ComposedController.cs | 22 |  |
| fixtures/controllers/NamedSlotsController.cs | 17 |  |
| fixtures/controllers/NotAController.cs | 10 |  |
| fixtures/controllers/RetiredController.cs | 18 |  |
| fixtures/controllers/TokenController.cs | 16 |  |
| fixtures/controllers/UnversionedWidgetsController.cs | 18 |  |
| fixtures/services/api-base.token.ts | 24 |  |
| fixtures/services/bases.service.ts | 61 |  |
| fixtures/services/shapes.service.ts | 112 |  |
| knowledge-budget.json | 34 | Declared allowances for knowledge decay, enforced by tests/checks/knowledge-drift.test.js against the generated supabase/knowledge-coverage.json. Same ratchet idiom as tests/reference-budget.json: each number is a CEILING, not a target, and a session that fixes rows lowers it in the same commit. The gates that came before this one check structure - that a vocabulary is documented, that a stored value renders, that the reference matches the code. This one checks CONTENT: whether what the system was told is still anchored, sourced and reachable. Four figures are already at 0 and are the interesting ones, because they are the promise being kept: every glossary term has a definition and a source, every journey stage has a source, every source document has a digest, and no finding claims a promotion with nothing behind it. Those must not rise. The rest are the honest backlog, and docs/HANDOVER-CONTEXT.md is the session that closes them. |
| lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| lib/roadmap.js | 87 | tests/lib/roadmap.js - Shared loader and dataset for the roadmap view benchmarks (roadmap-views.test.js, roadmap-views-custom.test.js). |
| page-weight-budget.json | 103 | Per-page ceilings on local CSS+JS: the number of requests and their total uncompressed bytes. Seeded from the measured weight on 2026-08-29 with ~15% headroom, so a page cannot quietly double. This is a ratchet, not a target - lowering a ceiling after real work is welcome; raising one means saying why in the commit. The site has no build step, so these are the bytes a visitor actually fetches. |
| reference-budget.json | 28 | Declared allowances for API reference drift, enforced by tests/checks/reference-drift.test.js against the generated supabase/reference-coverage.json. Each number is a CEILING, not a target: a session that fixes rows lowers the ceiling in the same commit, and the ceiling can never rise without the owner agreeing to it in the commit message. This is the size-budget.json idiom applied to content: the gate cannot be turned on at zero because the work has not been done yet, but it can stop things getting worse from the day it lands. |
| size-budget.json | 46 | Line budgets per file type, enforced by tests/checks/size.test.js. soft = a warning that a split is due; hard = a failure, split before extending. Line count is only a PROXY for what actually degrades a reader, which is one concept stated in two places saying slightly different things - and that is enforced directly by the one-home gate. Where the two disagree, the one-home gate wins: a longer single file beats the same rule restated in three shorter ones. |
| surface-baseline.json | 817 | Generated baseline read by tests/checks/surface.test.js. Regenerate DELIBERATELY with `npm run surface` when a surface or an include genuinely changes, and read the diff: the point of this file is that such a change is a reviewable line, not a silent side effect. |

### scripts/

Generators: the codemap, the schema snapshot, coverage, knowledge, the audit.

| File | Lines | Purpose |
|---|---:|---|
| audit.js | 222 | scripts/audit.js - One-screen repo health report. |
| extract-calls.js | 336 | scripts/extract-calls.js - Reads a LaunchPad front-end checkout and emits the routes it actually calls: one entry per this.http.<verb> call site, with the URL expression resolved to a route key. |
| extract-routes.js | 165 | scripts/extract-routes.js - Reads a LaunchPad API checkout and emits its route inventory as JSON: one entry per [Http*] action attribute, composed onto its controller [Route], with the version resolved. |
| gen-codemap.js | 208 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| gen-coverage.js | 387 | scripts/gen-coverage.js - Generates supabase/reference-coverage.json, the repo's committed account of how far the API reference matches the code it documents. |
| gen-knowledge.js | 164 | scripts/gen-knowledge.js - Generates supabase/knowledge-coverage.json, the repo's committed account of whether what the system was told is still anchored, sourced and reachable. |
| gen-snapshot.js | 148 | scripts/gen-snapshot.js - Generates supabase/schema-snapshot.json, |
| gen-surface.js | 84 | scripts/gen-surface.js - Regenerates tests/surface-baseline.json. |

### docs/plan/

Workstream records. Each keeps the account of where its plan was wrong, which is the part a later wave needs.

| File | Lines | Purpose |
|---|---:|---|
| 00-PROGRAMME.md | 275 | Alignment programme |
| 10-CODE-REVIEW.md | 272 | Reviewing the LaunchPad codebase How to work through the two supplied repositories so that what comes out is usable as fact rather than as impression. |
| 20-API-REFERENCE.md | 412 | Aligning API reference 2.0 with the code The reference is the most consequential thing in the portal, because it is the surface people act on. |
| 30-KNOWLEDGE.md | 320 | Writing verified findings into the system |
| 40-SURFACING.md | 339 | Nothing buried, anywhere in the portal The system stores more than it shows. |
| 50-DASHBOARD.md | 278 | Rebuilding the dashboard *BUILT 2026-08-13.** What follows is the plan as written, with corrections where the build found the figures or the shape wrong. |
| 60-PORTAL-REVIEW.md | 339 | Portal review, as a feature *BUILT 2026-08-13.** Schema, area map, pages, protocol and command all landed. |
| 70-PROTOTYPE-IDEAS.md | 237 | Prototype ideas and plans *BUILT 2026-08-13.** Schema, board, gallery strip, protocol and command all landed. |
| 80-LOAD-SPEED.md | 451 | 80 - Stop loading item detail text on first paint The last workstream in the programme, and deliberately the narrowest. |
| 90-REFACTOR.md | 273 | 90 - Refactor, optimise and re-navigate The ninth workstream, opened 2026-08-27. |

### docs/sessions-archive/

Closed session history. Read-only; its references describe the repo as it was.

| File | Lines | Purpose |
|---|---:|---|
| 2026-07-log-final.md | 902 | Session log Rolling record of work on this repository. |
| 2026-07.md | 189 | Session log archive - 2026-07 (earlier entries) Older checkpoints moved out of docs/SESSIONS.md to keep it within its line budget. |
| README.md | 13 | Session archive (closed) Read-only history. |

### docs/

Architecture, security, design, and the operating protocols.

| File | Lines | Purpose |
|---|---:|---|
| APP-REVIEW.md | 258 | Application review playbook The operating manual for a review wave. |
| ARCHITECTURE.md | 280 | Architecture How the portal fits together. |
| CHANGELOG.md | 517 | Changelog All notable user-facing changes to LPio, newest first. |
| COPILOT.md | 207 | Copilot capture protocol How a knowledge round with an external document assistant runs: choosing the gaps, writing the request, validating the answer, storing what survives. |
| DESIGN.md | 140 | Design standards The visual and writing rules for every page in this portal. |
| HANDOVER-CONTEXT.md | 188 | Context-gathering handover A prompt for a claude.ai session with the Supabase connector. |
| HARNESS.md | 161 | Verification harness and working process How every change to this repository is made, verified and recorded. |
| KNOWLEDGE-MODEL.md | 230 | The knowledge model Why the roadmap and platform knowledge are shaped the way they are. |
| NAVIGATION.md | 64 | Navigation *I want to change X - what do I read?** docs/CODEMAP.md answers *where is it*. |
| PLATFORM.md | 201 | Platform product-knowledge protocol How the durable, structured answer to "what is Launchpad, what does it do, what is in place today" gets built and kept current. |
| PORTAL-REVIEW.md | 208 | Portal review playbook How a portal review wave is opened, walked, answered, verified, triaged and closed. |
| PROTOTYPE-IDEAS.md | 150 | Prototype ideas and plans How an idea for a prototype is captured, prioritised, planned and promoted. |
| ROADMAP-INTAKE.md | 425 | Roadmap intake The contextualisation protocol: how a new request is placed against what already exists before anything is written. |
| ROADMAP-PLAYBOOK.md | 272 | Roadmap playbook The operating manual for the roadmap: the model, every field, the copy-paste operations and the quick-capture recipe. |
| ROADMAP-REVIEW.md | 130 | Roadmap review The review ritual: "let's go through the roadmap", or `/roadmap`. |
| ROADMAP.md | 261 | Roadmap Future direction for the hub, plus the working guide for the roadmap board. |
| SECURITY.md | 110 | Security model This repository is public. |
| SETUP.md | 54 | Setup and day-to-day use The app ships with the public Supabase config built into assets/js/core/supabase.js, so it runs and deploys with no configuration step. |
| SPRINTS.md | 109 | Sprints and dates How the roadmap connects sprints, calendar dates, quarters and the high-level Now / Next / Later bands. |
| STATE.md | 40 | Current state Updated: 2026-08-30 (refactor workstream closed; sense check logged below) # In progress Nothing. |
| VALUE-CAPTURE.md | 71 | Value capture session |
| WORKFLOW.md | 132 | Work intake and backlog workflow How working sessions between the repo owner and Claude turn supplied material and discussion into durable, queryable records. |

### .claude/

Slash commands and the permission settings a session runs under.

| File | Lines | Purpose |
|---|---:|---|
| commands/app-review.md | 45 | Work an application review wave - extract screenshots into rows, classify, reconcile against the mail trail |
| commands/portal-review.md | 49 | Work a portal review wave - walk the area map, record findings as they are made, fold in answers, triage into roadmap work |
| commands/prototype-idea.md | 43 | Capture a prototype idea in one line, or run the review pass that prioritises and plans them |
| commands/roadmap-add.md | 42 | Quick-capture or update roadmap work from a one-line request, applied straight to Supabase |
| commands/roadmap.md | 39 | Run the roadmap review ritual - a quick, clickable pass over Now/Next, promotions, new work and decisions |
| settings.json | 50 | Committed, shared permissions for a session in this repo: an allow list covering the routine commands (npm/node, read-only and write git, the search tools, a local http server, file reads and edits) and a deny list that blocks the hard rules mechanically - reading config.js or .env, force-pushing, git add -f, rm -rf. .claude/settings.local.json is per-developer and gitignored. |

### .github/

CI: the test-and-deploy workflow.

| File | Lines | Purpose |
|---|---:|---|
| workflows/deploy.yml | 53 | Deploy to GitHub Pages Every push to main runs the test suite and, if green, publishes the site to GitHub Pages for review. |

### (root)

Repository root.

| File | Lines | Purpose |
|---|---:|---|
| .githooks/pre-commit | 29 | Pre-commit gate. Fast, zero dependencies. |
| .gitignore | 24 | Local configuration containing Supabase keys. Never commit. |
| .gitmessage | 12 | <type>: <imperative summary, max 60 chars> |
| CLAUDE.md | 265 |  |
| README.md | 29 | LPio A login-gated project hub: dashboard, API reference material and prototypes, organised as modules around a central dashboard. |
| dashboard.html | 121 | Dashboard - LPio / LaunchPad IO |
| index.html | 68 | Sign in - LPio / LaunchPad IO |
| package.json | 17 | LPio / LaunchPad IO - static shell of a login-gated project hub. Content lives in Supabase. |

## Conventions for agents

- Read docs/NAVIGATION.md, docs/STATE.md and CLAUDE.md before anything else.
- Jump via the file:line references above; read targeted ranges, not whole files.
- The core include order is assets/js/core/includes.json. The size budgets are
  tests/size-budget.json. Both are the one home for their numbers.
- The suite in tests/ is the definition of done.
