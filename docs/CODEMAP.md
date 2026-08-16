# Code map

GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.
Purpose: lets an agent locate any file or symbol from this single
document instead of walking the tree or reading whole files.

| File | Lines | Purpose |
|---|---:|---|
| .claude/commands/app-review.md | 45 |  |
| .claude/commands/portal-review.md | 49 |  |
| .claude/commands/prototype-idea.md | 43 |  |
| .claude/commands/roadmap-add.md | 42 |  |
| .claude/commands/roadmap.md | 39 |  |
| .claude/settings.json | 49 |  |
| .githooks/pre-commit | 29 |  |
| .github/workflows/deploy.yml | 53 |  |
| .gitignore | 24 |  |
| .gitmessage | 12 |  |
| CLAUDE.md | 262 | CLAUDE.md |
| README.md | 29 | LPio |
| assets/css/app-review-detail.css | 112 | app-review-detail.css - The application review detail drawer: the |
| assets/css/app-review.css | 378 | app-review.css - The application review board and wave list. |
| assets/css/base.css | 111 | base.css - Reset, typography and global element styles. |
| assets/css/components.css | 478 | components.css - Reusable interface components: cards, forms, |
| assets/css/console-tool.css | 71 | console-tool.css - The modal shared by the nav's console-snippet |
| assets/css/dashboard.css | 218 | dashboard.css - The rebuilt landing page (docs/plan/50-DASHBOARD.md). |
| assets/css/ideas.css | 92 | ideas.css - The prototype ideas board and the gallery strip that |
| assets/css/layout.css | 395 | layout.css - Navigation, page scaffold and grids. |
| assets/css/login.css | 163 | login.css - Sign-in page only. Loaded after the core layers on |
| assets/css/pages.css | 308 | pages.css - The reference viewer ("swagger") page. Everything |
| assets/css/platform.css | 149 | platform.css - The platform knowledge page (modules/platform/). |
| assets/css/portal-review.css | 269 | portal-review.css - The portal review board (docs/PORTAL-REVIEW.md). |
| assets/css/prototype.css | 88 | prototype.css - Shared styles for a prototype's LPio-framed overview |
| assets/css/pxp-daopay.css | 212 | pxp-daopay.css - The Daopay EU onboarding replica layered on the PXP |
| assets/css/pxp-pci.css | 124 | pxp-pci.css - The PCI feature layered on the PXP replica: the wizard |
| assets/css/pxp-sim.css | 191 | pxp-sim.css - The simulation layer for the Daopay replica: the toast |
| assets/css/pxp.css | 218 | pxp.css - PXP Partner Portal replica shell for the PCI prototype |
| assets/css/roadmap-detail.css | 385 | roadmap-detail.css - Coarse progress bars, the expanded Executive |
| assets/css/roadmap-themes.css | 30 | roadmap-themes.css - The theme accent map: one rule per |
| assets/css/roadmap-views.css | 439 | roadmap-views.css - The roadmap home's level views (Executive theme |
| assets/css/roadmap.css | 410 | roadmap.css - The roadmap board (modules/roadmap/). A page sheet, |
| assets/css/tokens.css | 444 | tokens.css - Design tokens for the LPio hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/blocks.js | 139 | blocks.js - The typed-block renderer, in one place. |
| assets/js/core/config.example.js | 18 | config.example.js - OPTIONAL local override. |
| assets/js/core/daopay-admin-tool.js | 182 | daopay-admin-tool.js - A nav icon that opens two browser-console |
| assets/js/core/detail.js | 142 | detail.js - The completeness contract for rendering a row. |
| assets/js/core/drawer.js | 112 | drawer.js - A shared slide-over dialog surface. |
| assets/js/core/guard.js | 145 | guard.js - Blocks unauthenticated access to protected pages and |
| assets/js/core/links.js | 144 | links.js - The typed knowledge graph, resolved for rendering. |
| assets/js/core/registry.js | 308 | registry.js - Single source of truth for the hub's modules, the |
| assets/js/core/search.js | 350 | search.js - Global header search (App.search). Renders results for |
| assets/js/core/send-tool.js | 195 | send-tool.js - A nav icon that opens the acquirer send snippet: a |
| assets/js/core/sprints.js | 115 | sprints.js - The sprint + date engine (App.sprints). Pure, no DOM, |
| assets/js/core/supabase.js | 36 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/theme.js | 79 | theme.js - Light/dark theme control. |
| assets/js/core/tools.js | 121 | tools.js - The nav's outbound links to external tools, rendered as |
| assets/js/core/ui.js | 312 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/appreview-board.js | 233 | appreview-board.js - The triage board page for |
| assets/js/pages/appreview-detail.js | 207 | appreview-detail.js - The drawer body for one application. A pure |
| assets/js/pages/appreview-findings.js | 145 | appreview-findings.js - The cross-record half of the review model: |
| assets/js/pages/appreview-model.js | 240 | appreview-model.js - What the board derives from a single row: its |
| assets/js/pages/appreview-render.js | 292 | appreview-render.js - The board's HTML builders. Data in, string |
| assets/js/pages/appreview-waves.js | 163 | appreview-waves.js - The wave list for modules/app-review/index.html, |
| assets/js/pages/backlog.js | 383 | backlog.js - The master work list for modules/backlog/. |
| assets/js/pages/daopay-app.js | 275 | daopay-app.js - The application summary page in the Daopay replica: |
| assets/js/pages/daopay-data.js | 251 | daopay-data.js - Fixture data and the role switch for the Daopay EU |
| assets/js/pages/daopay-list.js | 114 | daopay-list.js - The Applications list in the Daopay replica. |
| assets/js/pages/daopay-sections.js | 238 | daopay-sections.js - The markup for each section of the application |
| assets/js/pages/daopay-shell.js | 96 | daopay-shell.js - Shared chrome for the Daopay replica pages: the |
| assets/js/pages/daopay-sim.js | 169 | daopay-sim.js - The simulation layer for the Daopay replica: the |
| assets/js/pages/dashboard-cards.js | 240 | dashboard-cards.js - The dashboard's four card sections: API |
| assets/js/pages/dashboard-strip.js | 131 | dashboard-strip.js - The now/next strip, the dashboard's headline |
| assets/js/pages/dashboard.js | 261 | dashboard.js - Fetches and orchestrates the landing page |
| assets/js/pages/gallery.js | 115 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/ideas-render.js | 177 | ideas-render.js - The prototype ideas board's builders |
| assets/js/pages/ideas.js | 71 | ideas.js - modules/prototypes/ideas.html. Fetch and wiring; every |
| assets/js/pages/integrations.js | 126 | integrations.js - Integration overview for modules/integrations/. |
| assets/js/pages/lazy-detail.js | 111 | lazy-detail.js - Fetching a row's heavy fields when the detail |
| assets/js/pages/pci-interstitial.js | 144 | pci-interstitial.js - The PCI compliance "checkout interstitial" for |
| assets/js/pages/pci-ixopay.js | 132 | pci-ixopay.js - In-page mock of the IXOPAY vendor client and its |
| assets/js/pages/pci-portal.js | 302 | pci-portal.js - The PXP Partner Portal replica: the "Merchant |
| assets/js/pages/pci-reports.js | 54 | pci-reports.js - Compliance reporting view for the PCI prototype, |
| assets/js/pages/platform-knowledge.js | 202 | platform-knowledge.js - The parts of the platform knowledge base the |
| assets/js/pages/platform.js | 327 | platform.js - The platform product-knowledge viewer for |
| assets/js/pages/portalreview-board.js | 142 | portalreview-board.js - modules/portal-review/wave.html. One wave: |
| assets/js/pages/portalreview-model.js | 208 | portalreview-model.js - Every derivation the portal review board |
| assets/js/pages/portalreview-render.js | 249 | portalreview-render.js - The portal review board's HTML builders |
| assets/js/pages/portalreview-triage.js | 108 | portalreview-triage.js - modules/portal-review/triage.html. The |
| assets/js/pages/portalreview-waves.js | 129 | portalreview-waves.js - modules/portal-review/index.html. The wave |
| assets/js/pages/proto-svg.js | 125 | proto-svg.js - Inline SVG diagram viewer for a prototype overview |
| assets/js/pages/reference-render.js | 287 | reference-render.js - Pure HTML builders for the reference viewer. |
| assets/js/pages/reference-topics.js | 47 | reference-topics.js - Pure HTML builders for api_topics rows: the |
| assets/js/pages/reference.js | 309 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/roadmap-data.js | 40 | roadmap-data.js - The roadmap's per-item reads: the fields fetched |
| assets/js/pages/roadmap-detail-export.js | 223 | roadmap-detail-export.js - The AI-optimised JSON and the flat CSV |
| assets/js/pages/roadmap-detail.js | 479 | roadmap-detail.js - Pure builders for the roadmap item drawer and the |
| assets/js/pages/roadmap-drawer.js | 97 | roadmap-drawer.js - The item detail drawer surface for the roadmap |
| assets/js/pages/roadmap-export.js | 76 | roadmap-export.js - The roadmap home's export dropdown wiring and the |
| assets/js/pages/roadmap-views-breakdown.js | 60 | roadmap-views-breakdown.js - The Detailed breakdown for the roadmap |
| assets/js/pages/roadmap-views-cascade.js | 206 | roadmap-views-cascade.js - The Cascade layout for the roadmap home: |
| assets/js/pages/roadmap-views-exec.js | 102 | roadmap-views-exec.js - The Executive (Categories) board for the |
| assets/js/pages/roadmap-views-timeline.js | 213 | roadmap-views-timeline.js - The Timeline layout for the roadmap home: |
| assets/js/pages/roadmap-views.js | 413 | roadmap-views.js - Pure HTML builders for the roadmap home |
| assets/js/pages/roadmap.js | 524 | roadmap.js - The roadmap home for modules/roadmap/. A read-only, |
| assets/js/pages/users.js | 207 | users.js - User and access management for modules/users/. |
| dashboard.html | 130 | Dashboard - LPio / LaunchPad IO |
| docs/APP-REVIEW.md | 258 | Application review playbook |
| docs/ARCHITECTURE.md | 281 | Architecture |
| docs/CHANGELOG.md | 470 | Changelog |
| docs/COPILOT.md | 207 | Copilot capture protocol |
| docs/DESIGN.md | 140 | Design standards |
| docs/HANDOVER-CONTEXT.md | 169 | Context-gathering handover |
| docs/HARNESS.md | 151 | Verification harness and working process |
| docs/KNOWLEDGE-MODEL.md | 187 | The knowledge model |
| docs/PLATFORM.md | 201 | Platform product-knowledge protocol |
| docs/PORTAL-REVIEW.md | 208 | Portal review playbook |
| docs/PROTOTYPE-IDEAS.md | 150 | Prototype ideas and plans |
| docs/ROADMAP-INTAKE.md | 405 | Roadmap intake |
| docs/ROADMAP-PLAYBOOK.md | 272 | Roadmap playbook |
| docs/ROADMAP-REVIEW.md | 130 | Roadmap review |
| docs/ROADMAP.md | 261 | Roadmap |
| docs/SECURITY.md | 110 | Security model |
| docs/SETUP.md | 54 | Setup and day-to-day use |
| docs/SPRINTS.md | 109 | Sprints and dates |
| docs/STATE.md | 40 | Current state |
| docs/VALUE-CAPTURE.md | 71 | Value capture session |
| docs/WORKFLOW.md | 132 | Work intake and backlog workflow |
| docs/plan/00-PROGRAMME.md | 270 | Alignment programme |
| docs/plan/10-CODE-REVIEW.md | 272 | Reviewing the LaunchPad codebase |
| docs/plan/20-API-REFERENCE.md | 412 | Aligning API reference 2.0 with the code |
| docs/plan/30-KNOWLEDGE.md | 320 | Writing verified findings into the system |
| docs/plan/40-SURFACING.md | 339 | Nothing buried, anywhere in the portal |
| docs/plan/50-DASHBOARD.md | 278 | Rebuilding the dashboard |
| docs/plan/60-PORTAL-REVIEW.md | 339 | Portal review, as a feature |
| docs/plan/70-PROTOTYPE-IDEAS.md | 237 | Prototype ideas and plans |
| docs/plan/80-LOAD-SPEED.md | 338 | 80 - Stop loading item detail text on first paint |
| docs/sessions-archive/2026-07-log-final.md | 902 | Session log |
| docs/sessions-archive/2026-07.md | 189 | Session log archive - 2026-07 (earlier entries) |
| docs/sessions-archive/README.md | 13 | Session archive (closed) |
| index.html | 76 | Sign in - LPio / LaunchPad IO |
| modules/app-review/index.html | 78 | Application review - LPio / LaunchPad IO |
| modules/app-review/wave.html | 103 | Wave - Application review - LPio / LaunchPad IO |
| modules/backlog/index.html | 98 | Backlog - LPio / LaunchPad IO |
| modules/integrations/index.html | 67 | Integrations - LPio / LaunchPad IO |
| modules/platform/index.html | 67 | Platform - LPio / LaunchPad IO |
| modules/portal-review/index.html | 88 | Portal review - LPio / LaunchPad IO |
| modules/portal-review/triage.html | 61 | Triage - Portal review - LPio / LaunchPad IO |
| modules/portal-review/wave.html | 70 | Wave - Portal review - LPio / LaunchPad IO |
| modules/prototypes/daopay/application.html | 55 | Application summary - PXP replica - LPio |
| modules/prototypes/daopay/applications.html | 54 | Applications - PXP replica - LPio |
| modules/prototypes/daopay/daopay-flow.svg | 171 |  |
| modules/prototypes/daopay/index.html | 259 | Daopay user role - EU merchant onboarding - LPio / LaunchPad IO |
| modules/prototypes/gdpr/index.html | 53 | GDPR compliance prototype - LPio / LaunchPad IO |
| modules/prototypes/ideas.html | 63 | Prototype ideas - LPio / LaunchPad IO |
| modules/prototypes/index.html | 68 | Prototypes - LPio / LaunchPad IO |
| modules/prototypes/pci/dashboard.html | 71 | Dashboard - PXP replica - LPio |
| modules/prototypes/pci/demo.html | 91 | Merchant Prescreen and Quote - PXP replica - LPio |
| modules/prototypes/pci/index.html | 160 | PCI compliance prototype - LPio / LaunchPad IO |
| modules/prototypes/pci/pci-workflow.svg | 62 |  |
| modules/prototypes/pci/reports.html | 81 | Compliance reporting - PXP replica - LPio |
| modules/prototypes/website-screening/index.html | 54 | Website screening prototype - LPio / LaunchPad IO |
| modules/reference/index.html | 80 | API reference - LPio / LaunchPad IO |
| modules/roadmap/index.html | 140 | Roadmap - LPio / LaunchPad IO |
| modules/users/index.html | 60 | Users - LPio / LaunchPad IO |
| package.json | 16 |  |
| scripts/audit.js | 169 | scripts/audit.js - One-screen repo health report. Read-only; reuses |
| scripts/extract-calls.js | 336 | scripts/extract-calls.js - Reads a LaunchPad front-end checkout and |
| scripts/extract-routes.js | 165 | scripts/extract-routes.js - Reads a LaunchPad API checkout and emits |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| scripts/gen-coverage.js | 346 | scripts/gen-coverage.js - Generates supabase/reference-coverage.json, |
| scripts/gen-knowledge.js | 160 | scripts/gen-knowledge.js - Generates supabase/knowledge-coverage.json, |
| scripts/gen-snapshot.js | 136 | scripts/gen-snapshot.js - Generates supabase/schema-snapshot.json, |
| supabase/knowledge-coverage.json | 78 |  |
| supabase/migrations/20260713000000_module_access_and_function_hardening.sql | 93 | ------------------------------------------------------------------ |
| supabase/migrations/20260713100000_api_spec_families.sql | 11 | Group api_specs rows into distinct reference sites. Keys mirror |
| supabase/migrations/20260713110000_integrations.sql | 43 | Integrations overview: one row per third-party service connected |
| supabase/migrations/20260713120000_roadmap.sql | 135 | Roadmap skeleton. Four tables designed so every future roadmap |
| supabase/migrations/20260713130000_work_areas_and_backlog.sql | 187 | Work areas, backlog and intake framework (see docs/WORKFLOW.md). |
| supabase/migrations/20260713140000_performance_rls_and_indexes.sql | 197 | ------------------------------------------------------------------ |
| supabase/migrations/20260713150000_profiles_update_recursion_fix.sql | 28 | The profiles update policy compared role against a subselect on |
| supabase/migrations/20260714000000_api_reference_detail.sql | 34 | Reference detail columns so comprehensive API material lives |
| supabase/migrations/20260714100000_api_reference_structure.sql | 119 | Generic reference structure so any comprehensive API guide fits |
| supabase/migrations/20260715000000_roadmap_board_categories_presentation.sql | 60 | ------------------------------------------------------------------ |
| supabase/migrations/20260715120000_platform_product_knowledge.sql | 86 | ------------------------------------------------------------------ |
| supabase/migrations/20260716000000_roadmap_audience_and_area_theme.sql | 35 | ------------------------------------------------------------------ |
| supabase/migrations/20260716120000_roadmap_spans_and_backlog_horizons.sql | 25 | ------------------------------------------------------------------ |
| supabase/migrations/20260716140000_unify_work_items.sql | 195 | ------------------------------------------------------------------ |
| supabase/migrations/20260717000000_pxp_roadmap_fields.sql | 120 | ------------------------------------------------------------------ |
| supabase/migrations/20260717120000_work_item_department.sql | 25 | ------------------------------------------------------------------ |
| supabase/migrations/20260718120000_work_item_parent.sql | 36 | ------------------------------------------------------------------ |
| supabase/migrations/20260720000000_workstreams_and_visibility.sql | 98 | ------------------------------------------------------------------ |
| supabase/migrations/20260720130000_category_department_and_fix_relates.sql | 74 | ------------------------------------------------------------------ |
| supabase/migrations/20260722000000_future_prototypes.sql | 68 | --------------------------------------------------------------- |
| supabase/migrations/20260722153355_restore_roadmap_current_security_invoker.sql | 14 | ------------------------------------------------------------------ |
| supabase/migrations/20260722153511_roadmap_current_canonical_column_order.sql | 43 | ------------------------------------------------------------------ |
| supabase/migrations/20260722160000_work_item_associated_departments.sql | 68 | ------------------------------------------------------------------ |
| supabase/migrations/20260722170000_roadmap_move_workstream_cascade.sql | 65 | ------------------------------------------------------------------ |
| supabase/migrations/20260722190000_work_item_deliverable_level.sql | 23 | Deliverables: a third presentation level for work_items. A deliverable |
| supabase/migrations/20260724142347_add_context_tables_domain_terms_journey_stages.sql | 90 | ------------------------------------------------------------------ |
| supabase/migrations/20260727210907_add_assignee_to_work_items.sql | 39 | ------------------------------------------------------------------ |
| supabase/migrations/20260728094808_roadmap_find_idf_weighting.sql | 18 | ------------------------------------------------------------------ |
| supabase/migrations/20260728120000_roadmap_searchable_and_find.sql | 190 | Contextualisation read surface: roadmap_searchable + roadmap_find. |
| supabase/migrations/20260730120000_app_review.sql | 334 | --------------------------------------------------------------- |
| supabase/migrations/20260809120000_schema_catchup_and_delete_guard.sql | 64 | ------------------------------------------------------------------ |
| supabase/migrations/20260809130647_knowledge_links_typed_vocabulary.sql | 340 | ------------------------------------------------------------------ |
| supabase/migrations/20260809131500_backfill_relates_to_id_into_knowledge_links.sql | 25 | ------------------------------------------------------------------ |
| supabase/migrations/20260809132000_roadmap_searchable_links.sql | 50 | ------------------------------------------------------------------ |
| supabase/migrations/20260809132500_knowledge_graph_symmetric_both_ends.sql | 34 | ------------------------------------------------------------------ |
| supabase/migrations/20260809132501_roadmap_find_prune_stoplist.sql | 145 | ------------------------------------------------------------------ |
| supabase/migrations/20260809132701_product_capability_knowledge_kinds.sql | 15 | ------------------------------------------------------------------ |
| supabase/migrations/20260809133000_drop_relates_to_id.sql | 44 | ------------------------------------------------------------------ |
| supabase/migrations/20260809133500_roadmap_find_returns_links.sql | 206 | ------------------------------------------------------------------ |
| supabase/migrations/20260810215935_work_items_historic_at_latch.sql | 15 | Delivered work splits into two columns on the board: Completed (a |
| supabase/migrations/20260810220039_rename_historic_at_to_previously_completed_at.sql | 13 | The board's delivered columns are "Recently completed" and "Previously |
| supabase/migrations/20260811220737_portal_links.sql | 51 | ------------------------------------------------------------------ |
| supabase/migrations/20260813223937_dashboard_summary.sql | 126 | ------------------------------------------------------------------ |
| supabase/migrations/20260813230545_portal_review.sql | 285 | ------------------------------------------------------------------ |
| supabase/migrations/20260813233000_dashboard_summary_portal_waves.sql | 132 | The dashboard's Reviews section now covers both reviews. A wave |
| supabase/migrations/20260813234500_prototype_ideas.sql | 73 | Prototype ideas and plans (docs/plan/70-PROTOTYPE-IDEAS.md). |
| supabase/policies.sql | 419 | ------------------------------------------------------------------ |
| supabase/reference-coverage.json | 80 |  |
| supabase/schema-snapshot.json | 1122 |  |
| supabase/schema/00_core.sql | 79 | ------------------------------------------------------------------ |
| supabase/schema/10_reference.sql | 145 | ------------------------------------------------------------------ |
| supabase/schema/20_portal.sql | 196 | ------------------------------------------------------------------ |
| supabase/schema/30_work.sql | 449 | ------------------------------------------------------------------ |
| supabase/schema/31_roadmap_search.sql | 220 | Roadmap search: the contextualisation read surface. |
| supabase/schema/32_roadmap_board.sql | 115 | ------------------------------------------------------------------ |
| supabase/schema/33_links.sql | 345 | ------------------------------------------------------------------ |
| supabase/schema/40_platform.sql | 78 | ------------------------------------------------------------------ |
| supabase/schema/45_context.sql | 67 | ------------------------------------------------------------------ |
| supabase/schema/50_review.sql | 317 | ------------------------------------------------------------------ |
| supabase/schema/51_review_guards.sql | 104 | ------------------------------------------------------------------ |
| supabase/schema/52_portal_review.sql | 249 | ------------------------------------------------------------------ |
| supabase/schema/90_dashboard.sql | 176 | ------------------------------------------------------------------ |
| supabase/seed.sql | 514 | ------------------------------------------------------------------ |
| tests/checks/knowledge-drift.test.js | 138 | tests/checks/knowledge-drift.test.js - Keeps what the system was |
| tests/checks/knowledge-links.test.js | 143 | tests/checks/knowledge-links.test.js - The link vocabulary gate. |
| tests/checks/perf.test.js | 128 | tests/checks/perf.test.js - Performance gates. |
| tests/checks/reference-drift.test.js | 167 | tests/checks/reference-drift.test.js - Keeps the API reference from |
| tests/checks/render-coverage.test.js | 351 | tests/checks/render-coverage.test.js - Nothing stored-but-invisible. |
| tests/checks/roadmap-intake.test.js | 147 | tests/checks/roadmap-intake.test.js - Contextualisation gates. |
| tests/checks/schema-drift.test.js | 152 | tests/checks/schema-drift.test.js - The repo must describe the |
| tests/checks/security.test.js | 116 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 35 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 162 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 89 | tests/checks/style.test.js - Design-system gates. |
| tests/fixtures/controllers/ComposedController.cs | 22 |  |
| tests/fixtures/controllers/NamedSlotsController.cs | 17 |  |
| tests/fixtures/controllers/NotAController.cs | 10 |  |
| tests/fixtures/controllers/RetiredController.cs | 18 |  |
| tests/fixtures/controllers/TokenController.cs | 16 |  |
| tests/fixtures/controllers/UnversionedWidgetsController.cs | 18 |  |
| tests/fixtures/services/api-base.token.ts | 24 |  |
| tests/fixtures/services/bases.service.ts | 61 |  |
| tests/fixtures/services/shapes.service.ts | 112 |  |
| tests/knowledge-budget.json | 32 |  |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/lib/roadmap.js | 87 | tests/lib/roadmap.js - Shared loader and dataset for the roadmap |
| tests/reference-budget.json | 28 |  |
| tests/size-budget.json | 197 |  |
| tests/unit/appreview-detail.test.js | 130 | tests/unit/appreview-detail.test.js - The application drawer's Record |
| tests/unit/appreview-findings.test.js | 136 | tests/unit/appreview-findings.test.js - Benchmarks for the |
| tests/unit/appreview-model.test.js | 318 | tests/unit/appreview-model.test.js - Benchmarks for the application |
| tests/unit/backlog-detail.test.js | 131 | tests/unit/backlog-detail.test.js - The backlog's two modals, both |
| tests/unit/blocks.test.js | 119 | tests/unit/blocks.test.js - The typed-block renderer. |
| tests/unit/call-extract.test.js | 156 | tests/unit/call-extract.test.js - Benchmarks for the call-site |
| tests/unit/coverage-reconcile.test.js | 278 | tests/unit/coverage-reconcile.test.js - Benchmarks for the coverage |
| tests/unit/daopay-role.test.js | 207 | tests/unit/daopay-role.test.js - Benchmarks for the Daopay scoped |
| tests/unit/dashboard-cards.test.js | 270 | tests/unit/dashboard-cards.test.js - The dashboard's four card |
| tests/unit/dashboard-strip.test.js | 164 | tests/unit/dashboard-strip.test.js - The dashboard's headline strip |
| tests/unit/detail.test.js | 199 | tests/unit/detail.test.js - The completeness contract. |
| tests/unit/gallery-future.test.js | 91 | tests/unit/gallery-future.test.js - Benchmarks for the prototype |
| tests/unit/ideas.test.js | 166 | tests/unit/ideas.test.js - The prototype ideas board |
| tests/unit/lazy-detail.test.js | 184 | tests/unit/lazy-detail.test.js - The lazy detail loader |
| tests/unit/links.test.js | 203 | tests/unit/links.test.js - The typed knowledge graph, resolved. |
| tests/unit/pci-ixopay.test.js | 81 | tests/unit/pci-ixopay.test.js - Benchmarks for the PCI prototype's |
| tests/unit/platform-knowledge.test.js | 249 | tests/unit/platform-knowledge.test.js - The stores the capability |
| tests/unit/platform-render.test.js | 167 | tests/unit/platform-render.test.js - Benchmarks for the platform |
| tests/unit/portalreview.test.js | 286 | tests/unit/portalreview.test.js - The portal review board's model |
| tests/unit/reference-render.test.js | 212 | tests/unit/reference-render.test.js - Benchmarks for the reference |
| tests/unit/registry.test.js | 92 | tests/unit/registry.test.js - Benchmarks for the module registry, |
| tests/unit/render-fallbacks.test.js | 163 | tests/unit/render-fallbacks.test.js - Two renderers that handled the |
| tests/unit/roadmap-child-order.test.js | 84 | tests/unit/roadmap-child-order.test.js - Benchmarks for how a |
| tests/unit/roadmap-detail-export.test.js | 211 | tests/unit/roadmap-detail-export.test.js - Benchmarks for the |
| tests/unit/roadmap-detail.test.js | 376 | tests/unit/roadmap-detail.test.js - Benchmarks for the item detail |
| tests/unit/roadmap-views-custom.test.js | 258 | tests/unit/roadmap-views-custom.test.js - Benchmarks for the roadmap |
| tests/unit/roadmap-views-exec.test.js | 49 | tests/unit/roadmap-views-exec.test.js - Benchmarks for the Executive |
| tests/unit/roadmap-views.test.js | 475 | tests/unit/roadmap-views.test.js - Benchmarks for the roadmap home's |
| tests/unit/route-extract.test.js | 108 | tests/unit/route-extract.test.js - Benchmarks for the route |
| tests/unit/search.test.js | 259 | tests/unit/search.test.js - Benchmarks for assets/js/core/search.js. |
| tests/unit/sprints.test.js | 81 | tests/unit/sprints.test.js - Benchmarks for the sprint engine |
| tests/unit/tools.test.js | 217 | tests/unit/tools.test.js - Benchmarks for assets/js/core/tools.js. |
| tests/unit/ui.test.js | 60 | tests/unit/ui.test.js - Benchmarks for assets/js/core/ui.js. |

## JavaScript symbol index

| Symbol | Location |
|---|---|
| toneClass() | assets/js/core/blocks.js:34 |
| defaultCodeblock() | assets/js/core/blocks.js:38 |
| tableBlock() | assets/js/core/blocks.js:43 |
| kvBlock() | assets/js/core/blocks.js:60 |
| valuesBlock() | assets/js/core/blocks.js:70 |
| unknownBlock() | assets/js/core/blocks.js:89 |
| copy() | assets/js/core/daopay-admin-tool.js:89 |
| fallback() | assets/js/core/daopay-admin-tool.js:102 |
| buildDialog() | assets/js/core/daopay-admin-tool.js:114 |
| esc() | assets/js/core/detail.js:39 |
| labelOf() | assets/js/core/detail.js:43 |
| isEmpty() | assets/js/core/detail.js:48 |
| valueHtml() | assets/js/core/detail.js:58 |
| App.drawer | assets/js/core/drawer.js:35 |
| isOpen() | assets/js/core/drawer.js:45 |
| focusable() | assets/js/core/drawer.js:49 |
| trapTab() | assets/js/core/drawer.js:60 |
| open() | assets/js/core/drawer.js:75 |
| close() | assets/js/core/drawer.js:91 |
| readCache() | assets/js/core/guard.js:54 |
| writeCache() | assets/js/core/guard.js:61 |
| fetchAccess() | assets/js/core/guard.js:68 |
| App.canAccess | assets/js/core/guard.js:88 |
| App.onAuthed | assets/js/core/guard.js:116 |
| enforceModule() | assets/js/core/guard.js:124 |
| App.moduleHref | assets/js/core/registry.js:222 |
| App.itemHref | assets/js/core/registry.js:232 |
| App.linkHref | assets/js/core/registry.js:275 |
| App.departmentLabel | assets/js/core/registry.js:301 |
| sources() | assets/js/core/search.js:49 |
| canReach() | assets/js/core/search.js:112 |
| moduleByKey() | assets/js/core/search.js:116 |
| specHref() | assets/js/core/search.js:120 |
| noteHref() | assets/js/core/search.js:130 |
| hrefFor() | assets/js/core/search.js:144 |
| targetMod() | assets/js/core/search.js:155 |
| clean() | assets/js/core/search.js:164 |
| selectFor() | assets/js/core/search.js:168 |
| snippet() | assets/js/core/search.js:180 |
| highlight() | assets/js/core/search.js:196 |
| badgeHtml() | assets/js/core/search.js:206 |
| buildHtml() | assets/js/core/search.js:215 |
| attach() | assets/js/core/search.js:250 |
| close() | assets/js/core/search.js:260 |
| open() | assets/js/core/search.js:269 |
| paint() | assets/js/core/search.js:274 |
| setActive() | assets/js/core/search.js:283 |
| run() | assets/js/core/search.js:295 |
| copy() | assets/js/core/send-tool.js:102 |
| fallback() | assets/js/core/send-tool.js:115 |
| buildDialog() | assets/js/core/send-tool.js:127 |
| pad2() | assets/js/core/sprints.js:31 |
| iso() | assets/js/core/sprints.js:32 |
| mod() | assets/js/core/sprints.js:35 |
| codeIndex() | assets/js/core/sprints.js:39 |
| indexToCode() | assets/js/core/sprints.js:47 |
| toMs() | assets/js/core/sprints.js:54 |
| sprintToRange() | assets/js/core/sprints.js:64 |
| dateToSprint() | assets/js/core/sprints.js:72 |
| currentSprint() | assets/js/core/sprints.js:77 |
| sprintToQuarter() | assets/js/core/sprints.js:80 |
| bandForSprint() | assets/js/core/sprints.js:93 |
| stored() | assets/js/core/theme.js:25 |
| systemTheme() | assets/js/core/theme.js:34 |
| current() | assets/js/core/theme.js:38 |
| apply() | assets/js/core/theme.js:42 |
| searchCommand() | assets/js/core/tools.js:40 |
| App.escape | assets/js/core/ui.js:11 |
| App.methodBadge | assets/js/core/ui.js:21 |
| App.statusBadge | assets/js/core/ui.js:29 |
| App.copyText | assets/js/core/ui.js:34 |
| App.notice | assets/js/core/ui.js:53 |
| App.download | assets/js/core/ui.js:63 |
| App.csvFromRows | assets/js/core/ui.js:83 |
| App.deepLinkScroll | assets/js/core/ui.js:115 |
| isCurrentPage() | assets/js/core/ui.js:127 |
| themeIcon() | assets/js/core/ui.js:135 |
| renderNav() | assets/js/core/ui.js:152 |
| App.onThemeChange | assets/js/core/ui.js:287 |
| param() | assets/js/pages/appreview-board.js:32 |
| day() | assets/js/pages/appreview-board.js:36 |
| renderAll() | assets/js/pages/appreview-board.js:46 |
| renderFiltered() | assets/js/pages/appreview-board.js:63 |
| renderWaveHead() | assets/js/pages/appreview-board.js:73 |
| openApplication() | assets/js/pages/appreview-board.js:91 |
| toggleCategory() | assets/js/pages/appreview-board.js:105 |
| soloGroup() | assets/js/pages/appreview-board.js:115 |
| wire() | assets/js/pages/appreview-board.js:128 |
| loadEvidence() | assets/js/pages/appreview-board.js:161 |
| day() | assets/js/pages/appreview-detail.js:30 |
| block() | assets/js/pages/appreview-detail.js:36 |
| paragraph() | assets/js/pages/appreview-detail.js:42 |
| confirmation() | assets/js/pages/appreview-detail.js:52 |
| findingsHtml() | assets/js/pages/appreview-detail.js:66 |
| trailHtml() | assets/js/pages/appreview-detail.js:77 |
| triggerHtml() | assets/js/pages/appreview-detail.js:104 |
| dateRow() | assets/js/pages/appreview-detail.js:131 |
| metadataHtml() | assets/js/pages/appreview-detail.js:133 |
| App.appReviewDetail | assets/js/pages/appreview-detail.js:175 |
| duplicateKeys() | assets/js/pages/appreview-findings.js:27 |
| duplicateKeyOf() | assets/js/pages/appreview-findings.js:39 |
| partnerBlockers() | assets/js/pages/appreview-findings.js:47 |
| findings() | assets/js/pages/appreview-findings.js:64 |
| groupOf() | assets/js/pages/appreview-model.js:59 |
| split() | assets/js/pages/appreview-model.js:67 |
| categoryCounts() | assets/js/pages/appreview-model.js:77 |
| ageOf() | assets/js/pages/appreview-model.js:103 |
| marker() | assets/js/pages/appreview-model.js:128 |
| triggerOf() | assets/js/pages/appreview-model.js:150 |
| doNowOrder() | assets/js/pages/appreview-model.js:165 |
| carryForward() | assets/js/pages/appreview-model.js:186 |
| visible() | assets/js/pages/appreview-model.js:210 |
| index() | assets/js/pages/appreview-model.js:218 |
| rowStyle() | assets/js/pages/appreview-render.js:28 |
| markerGlyph() | assets/js/pages/appreview-render.js:48 |
| splitHtml() | assets/js/pages/appreview-render.js:72 |
| partnerPanelHtml() | assets/js/pages/appreview-render.js:86 |
| doNowItem() | assets/js/pages/appreview-render.js:106 |
| doNowHtml() | assets/js/pages/appreview-render.js:119 |
| legendHtml() | assets/js/pages/appreview-render.js:159 |
| flagsHtml() | assets/js/pages/appreview-render.js:200 |
| ageCell() | assets/js/pages/appreview-render.js:227 |
| rowHtml() | assets/js/pages/appreview-render.js:239 |
| boardHtml() | assets/js/pages/appreview-render.js:264 |
| waveHref() | assets/js/pages/appreview-waves.js:19 |
| day() | assets/js/pages/appreview-waves.js:25 |
| triggerCell() | assets/js/pages/appreview-waves.js:35 |
| watchingHtml() | assets/js/pages/appreview-waves.js:48 |
| wavesHtml() | assets/js/pages/appreview-waves.js:87 |
| bandOf() | assets/js/pages/backlog.js:34 |
| fmtDate() | assets/js/pages/backlog.js:40 |
| badges() | assets/js/pages/backlog.js:44 |
| dateCell() | assets/js/pages/backlog.js:65 |
| itemFactsHtml() | assets/js/pages/backlog.js:70 |
| documentFactsHtml() | assets/js/pages/backlog.js:101 |
| names() | assets/js/pages/backlog.js:126 |
| openItemModal() | assets/js/pages/backlog.js:128 |
| openDocumentModal() | assets/js/pages/backlog.js:134 |
| filteredItems() | assets/js/pages/backlog.js:140 |
| ordered() | assets/js/pages/backlog.js:156 |
| toCsvRecord() | assets/js/pages/backlog.js:172 |
| exportCsv() | assets/js/pages/backlog.js:197 |
| renderItems() | assets/js/pages/backlog.js:204 |
| renderDocuments() | assets/js/pages/backlog.js:241 |
| fillFilters() | assets/js/pages/backlog.js:277 |
| save() | assets/js/pages/daopay-app.js:31 |
| stamp() | assets/js/pages/daopay-app.js:33 |
| pad() | assets/js/pages/daopay-app.js:35 |
| generateContract() | assets/js/pages/daopay-app.js:43 |
| generateKyc() | assets/js/pages/daopay-app.js:57 |
| sendContract() | assets/js/pages/daopay-app.js:74 |
| handoff() | assets/js/pages/daopay-app.js:112 |
| approveAndSendKyc() | assets/js/pages/daopay-app.js:126 |
| applyStatus() | assets/js/pages/daopay-app.js:157 |
| closeMenus() | assets/js/pages/daopay-app.js:206 |
| wire() | assets/js/pages/daopay-app.js:212 |
| run() | assets/js/pages/daopay-app.js:260 |
| free() | assets/js/pages/daopay-app.js:262 |
| render() | assets/js/pages/daopay-app.js:266 |
| currentRole() | assets/js/pages/daopay-data.js:41 |
| can() | assets/js/pages/daopay-data.js:46 |
| tone() | assets/js/pages/daopay-data.js:185 |
| statusOptions() | assets/js/pages/daopay-data.js:190 |
| persist() | assets/js/pages/daopay-data.js:222 |
| resetState() | assets/js/pages/daopay-data.js:234 |
| rows() | assets/js/pages/daopay-list.js:29 |
| chip() | assets/js/pages/daopay-list.js:36 |
| merchantCell() | assets/js/pages/daopay-list.js:41 |
| actionsCell() | assets/js/pages/daopay-list.js:49 |
| body() | assets/js/pages/daopay-list.js:55 |
| render() | assets/js/pages/daopay-list.js:74 |
| chip() | assets/js/pages/daopay-sections.js:27 |
| btn() | assets/js/pages/daopay-sections.js:32 |
| statusBar() | assets/js/pages/daopay-sections.js:38 |
| summary() | assets/js/pages/daopay-sections.js:46 |
| steps() | assets/js/pages/daopay-sections.js:89 |
| contractTable() | assets/js/pages/daopay-sections.js:100 |
| contracts() | assets/js/pages/daopay-sections.js:123 |
| kyc() | assets/js/pages/daopay-sections.js:134 |
| checks() | assets/js/pages/daopay-sections.js:144 |
| bank() | assets/js/pages/daopay-sections.js:181 |
| documents() | assets/js/pages/daopay-sections.js:190 |
| fees() | assets/js/pages/daopay-sections.js:207 |
| record() | assets/js/pages/daopay-sections.js:219 |
| navItems() | assets/js/pages/daopay-shell.js:38 |
| withRole() | assets/js/pages/daopay-shell.js:51 |
| roleSwitch() | assets/js/pages/daopay-shell.js:57 |
| header() | assets/js/pages/daopay-shell.js:65 |
| stack() | assets/js/pages/daopay-sim.js:34 |
| remove() | assets/js/pages/daopay-sim.js:57 |
| openModal() | assets/js/pages/daopay-sim.js:67 |
| done() | assets/js/pages/daopay-sim.js:96 |
| advance() | assets/js/pages/daopay-sim.js:132 |
| advance() | assets/js/pages/daopay-sim.js:158 |
| esc() | assets/js/pages/dashboard-cards.js:19 |
| plural() | assets/js/pages/dashboard-cards.js:20 |
| waveSize() | assets/js/pages/dashboard-cards.js:138 |
| esc() | assets/js/pages/dashboard-strip.js:33 |
| isFinished() | assets/js/pages/dashboard-strip.js:38 |
| order() | assets/js/pages/dashboard-strip.js:45 |
| band() | assets/js/pages/dashboard-strip.js:101 |
| el() | assets/js/pages/dashboard.js:33 |
| canReach() | assets/js/pages/dashboard.js:35 |
| hide() | assets/js/pages/dashboard.js:40 |
| fill() | assets/js/pages/dashboard.js:45 |
| moduleByKey() | assets/js/pages/dashboard.js:52 |
| hrefFor() | assets/js/pages/dashboard.js:56 |
| renderNowNext() | assets/js/pages/dashboard.js:63 |
| renderReference() | assets/js/pages/dashboard.js:74 |
| renderReviews() | assets/js/pages/dashboard.js:87 |
| renderKnowledge() | assets/js/pages/dashboard.js:100 |
| renderTools() | assets/js/pages/dashboard.js:107 |
| cardHtml() | assets/js/pages/dashboard.js:115 |
| renderModules() | assets/js/pages/dashboard.js:131 |
| activitySources() | assets/js/pages/dashboard.js:146 |
| loadActivity() | assets/js/pages/dashboard.js:164 |
| loadCoverage() | assets/js/pages/dashboard.js:213 |
| showDeniedNotice() | assets/js/pages/dashboard.js:223 |
| load() | assets/js/pages/dashboard.js:233 |
| App.futurePrototypesTable | assets/js/pages/gallery.js:18 |
| isPci() | assets/js/pages/gallery.js:47 |
| card() | assets/js/pages/gallery.js:53 |
| renderFuture() | assets/js/pages/gallery.js:98 |
| esc() | assets/js/pages/ideas-render.js:21 |
| labelOf() | assets/js/pages/ideas-render.js:40 |
| el() | assets/js/pages/ideas.js:13 |
| prototypeHref() | assets/js/pages/ideas.js:15 |
| load() | assets/js/pages/ideas.js:21 |
| safeUrl() | assets/js/pages/integrations.js:15 |
| modalHtml() | assets/js/pages/integrations.js:24 |
| openModal() | assets/js/pages/integrations.js:56 |
| tableHtml() | assets/js/pages/integrations.js:62 |
| App.lazyDetail | assets/js/pages/lazy-detail.js:46 |
| loaded() | assets/js/pages/lazy-detail.js:58 |
| open() | assets/js/pages/lazy-detail.js:64 |
| settle() | assets/js/pages/lazy-detail.js:79 |
| close() | assets/js/pages/pci-interstitial.js:26 |
| finish() | assets/js/pages/pci-interstitial.js:27 |
| shell() | assets/js/pages/pci-interstitial.js:28 |
| q() | assets/js/pages/pci-interstitial.js:31 |
| on() | assets/js/pages/pci-interstitial.js:32 |
| head() | assets/js/pages/pci-interstitial.js:34 |
| foot() | assets/js/pages/pci-interstitial.js:38 |
| ask() | assets/js/pages/pci-interstitial.js:44 |
| compliantPath() | assets/js/pages/pci-interstitial.js:61 |
| enrolReview() | assets/js/pages/pci-interstitial.js:88 |
| enrolEmail() | assets/js/pages/pci-interstitial.js:110 |
| sent() | assets/js/pages/pci-interstitial.js:129 |
| makeRef() | assets/js/pages/pci-ixopay.js:27 |
| isoInMonths() | assets/js/pages/pci-ixopay.js:28 |
| count() | assets/js/pages/pci-ixopay.js:29 |
| emitWebhook() | assets/js/pages/pci-ixopay.js:31 |
| emitEvent() | assets/js/pages/pci-ixopay.js:36 |
| advance() | assets/js/pages/pci-ixopay.js:41 |
| el() | assets/js/pages/pci-portal.js:15 |
| renderStepper() | assets/js/pages/pci-portal.js:46 |
| nav() | assets/js/pages/pci-portal.js:64 |
| field() | assets/js/pages/pci-portal.js:71 |
| stepApplication() | assets/js/pages/pci-portal.js:75 |
| stepSites() | assets/js/pages/pci-portal.js:104 |
| feeRow() | assets/js/pages/pci-portal.js:120 |
| pciFeeRow() | assets/js/pages/pci-portal.js:127 |
| stepProducts() | assets/js/pages/pci-portal.js:136 |
| stepPass() | assets/js/pages/pci-portal.js:158 |
| stepSummary() | assets/js/pages/pci-portal.js:163 |
| renderStep() | assets/js/pages/pci-portal.js:178 |
| wireStep() | assets/js/pages/pci-portal.js:190 |
| onContinue() | assets/js/pages/pci-portal.js:211 |
| goTo() | assets/js/pages/pci-portal.js:226 |
| openSiteModal() | assets/js/pages/pci-portal.js:236 |
| buildDrawer() | assets/js/pages/pci-portal.js:260 |
| renderQuote() | assets/js/pages/pci-portal.js:273 |
| openQuote() | assets/js/pages/pci-portal.js:288 |
| closeQuote() | assets/js/pages/pci-portal.js:289 |
| addPciFee() | assets/js/pages/pci-portal.js:290 |
| stat() | assets/js/pages/pci-reports.js:16 |
| esc() | assets/js/pages/platform-knowledge.js:23 |
| byOrder() | assets/js/pages/platform-knowledge.js:24 |
| section() | assets/js/pages/platform-knowledge.js:26 |
| gaps() | assets/js/pages/platform-knowledge.js:38 |
| stat() | assets/js/pages/platform-knowledge.js:56 |
| coverageHtml() | assets/js/pages/platform-knowledge.js:61 |
| lifecycleHtml() | assets/js/pages/platform-knowledge.js:116 |
| glossaryHtml() | assets/js/pages/platform-knowledge.js:136 |
| factsHtml() | assets/js/pages/platform-knowledge.js:155 |
| sourcesHtml() | assets/js/pages/platform-knowledge.js:179 |
| kindsIn() | assets/js/pages/platform.js:38 |
| blockHtml() | assets/js/pages/platform.js:45 |
| maturityChips() | assets/js/pages/platform.js:49 |
| capabilityLinks() | assets/js/pages/platform.js:63 |
| day() | assets/js/pages/platform.js:92 |
| capabilityFacts() | assets/js/pages/platform.js:100 |
| capabilityCard() | assets/js/pages/platform.js:112 |
| byOrder() | assets/js/pages/platform.js:125 |
| groupByArea() | assets/js/pages/platform.js:129 |
| sectionHeading() | assets/js/pages/platform.js:144 |
| renderUnknown() | assets/js/pages/platform.js:156 |
| pageHtml() | assets/js/pages/platform.js:173 |
| rows() | assets/js/pages/platform.js:283 |
| el() | assets/js/pages/portalreview-board.js:15 |
| esc() | assets/js/pages/portalreview-board.js:16 |
| waveId() | assets/js/pages/portalreview-board.js:18 |
| workItemHref() | assets/js/pages/portalreview-board.js:22 |
| walkNext() | assets/js/pages/portalreview-board.js:30 |
| load() | assets/js/pages/portalreview-board.js:44 |
| live() | assets/js/pages/portalreview-model.js:20 |
| groupOf() | assets/js/pages/portalreview-model.js:35 |
| esc() | assets/js/pages/portalreview-render.js:22 |
| day() | assets/js/pages/portalreview-render.js:23 |
| labelOf() | assets/js/pages/portalreview-render.js:80 |
| chips() | assets/js/pages/portalreview-render.js:88 |
| metaLine() | assets/js/pages/portalreview-render.js:107 |
| trail() | assets/js/pages/portalreview-render.js:120 |
| el() | assets/js/pages/portalreview-triage.js:17 |
| esc() | assets/js/pages/portalreview-triage.js:18 |
| workItemHref() | assets/js/pages/portalreview-triage.js:20 |
| countsHtml() | assets/js/pages/portalreview-triage.js:36 |
| load() | assets/js/pages/portalreview-triage.js:45 |
| el() | assets/js/pages/portalreview-waves.js:15 |
| esc() | assets/js/pages/portalreview-waves.js:16 |
| waveHref() | assets/js/pages/portalreview-waves.js:18 |
| standingHtml() | assets/js/pages/portalreview-waves.js:22 |
| waveList() | assets/js/pages/portalreview-waves.js:41 |
| mapHtml() | assets/js/pages/portalreview-waves.js:58 |
| load() | assets/js/pages/portalreview-waves.js:83 |
| sanitize() | assets/js/pages/proto-svg.js:22 |
| fallback() | assets/js/pages/proto-svg.js:51 |
| openOverlay() | assets/js/pages/proto-svg.js:59 |
| codeblock() | assets/js/pages/reference-render.js:18 |
| specOverview() | assets/js/pages/reference-render.js:32 |
| paramsTable() | assets/js/pages/reference-render.js:69 |
| headersTable() | assets/js/pages/reference-render.js:88 |
| statusClass() | assets/js/pages/reference-render.js:106 |
| responsesBlock() | assets/js/pages/reference-render.js:114 |
| badgeList() | assets/js/pages/reference-render.js:134 |
| curlExample() | assets/js/pages/reference-render.js:149 |
| endpointBody() | assets/js/pages/reference-render.js:170 |
| endpointBlock() | assets/js/pages/reference-render.js:185 |
| groupByTag() | assets/js/pages/reference-render.js:204 |
| matches() | assets/js/pages/reference-render.js:234 |
| endpointsFromOpenApi() | assets/js/pages/reference-render.js:244 |
| blockHtml() | assets/js/pages/reference-topics.js:22 |
| topicBlock() | assets/js/pages/reference-topics.js:28 |
| context() | assets/js/pages/reference.js:32 |
| render() | assets/js/pages/reference.js:36 |
| hydrate() | assets/js/pages/reference.js:90 |
| applyFilter() | assets/js/pages/reference.js:116 |
| setAllOpen() | assets/js/pages/reference.js:123 |
| loadSpec() | assets/js/pages/reference.js:130 |
| fillPicker() | assets/js/pages/reference.js:189 |
| wireContent() | assets/js/pages/reference.js:218 |
| openHashTarget() | assets/js/pages/reference.js:247 |
| loadNotes() | assets/js/pages/roadmap-data.js:23 |
| toKpiItem() | assets/js/pages/roadmap-detail-export.js:18 |
| toKpiRoadmap() | assets/js/pages/roadmap-detail-export.js:116 |
| flattenItem() | assets/js/pages/roadmap-detail-export.js:149 |
| toCsvRoadmap() | assets/js/pages/roadmap-detail-export.js:209 |
| esc() | assets/js/pages/roadmap-detail.js:33 |
| day() | assets/js/pages/roadmap-detail.js:34 |
| dateRange() | assets/js/pages/roadmap-detail.js:35 |
| byPhase() | assets/js/pages/roadmap-detail.js:40 |
| sprintRange() | assets/js/pages/roadmap-detail.js:44 |
| cap() | assets/js/pages/roadmap-detail.js:50 |
| keyLabel() | assets/js/pages/roadmap-detail.js:51 |
| titleOf() | assets/js/pages/roadmap-detail.js:52 |
| listText() | assets/js/pages/roadmap-detail.js:56 |
| ordinal() | assets/js/pages/roadmap-detail.js:58 |
| clean() | assets/js/pages/roadmap-detail.js:67 |
| attrs() | assets/js/pages/roadmap-detail.js:79 |
| bandText() | assets/js/pages/roadmap-detail.js:80 |
| row() | assets/js/pages/roadmap-detail.js:88 |
| businessAreaLabels() | assets/js/pages/roadmap-detail.js:93 |
| note() | assets/js/pages/roadmap-detail.js:98 |
| assigneeText() | assets/js/pages/roadmap-detail.js:116 |
| priorityBand() | assets/js/pages/roadmap-detail.js:132 |
| priorityLabel() | assets/js/pages/roadmap-detail.js:138 |
| progressCell() | assets/js/pages/roadmap-detail.js:148 |
| relatedRows() | assets/js/pages/roadmap-detail.js:173 |
| milestoneText() | assets/js/pages/roadmap-detail.js:213 |
| sourceText() | assets/js/pages/roadmap-detail.js:223 |
| parseDetails() | assets/js/pages/roadmap-detail.js:238 |
| detailsHtml() | assets/js/pages/roadmap-detail.js:254 |
| extraAttrRows() | assets/js/pages/roadmap-detail.js:265 |
| noteRow() | assets/js/pages/roadmap-detail.js:279 |
| notesHtml() | assets/js/pages/roadmap-detail.js:294 |
| phasesHtml() | assets/js/pages/roadmap-detail.js:312 |
| factFields() | assets/js/pages/roadmap-detail.js:355 |
| factsHtml() | assets/js/pages/roadmap-detail.js:415 |
| drawerHtml() | assets/js/pages/roadmap-detail.js:427 |
| App.roadmapDrawer | assets/js/pages/roadmap-drawer.js:19 |
| setItemParam() | assets/js/pages/roadmap-drawer.js:29 |
| openDrawer() | assets/js/pages/roadmap-drawer.js:59 |
| closeDrawer() | assets/js/pages/roadmap-drawer.js:70 |
| downloadJson() | assets/js/pages/roadmap-export.js:19 |
| safeName() | assets/js/pages/roadmap-export.js:24 |
| wire() | assets/js/pages/roadmap-export.js:34 |
| setOpen() | assets/js/pages/roadmap-export.js:37 |
| breakdownItemRow() | assets/js/pages/roadmap-views-breakdown.js:18 |
| breakdown() | assets/js/pages/roadmap-views-breakdown.js:31 |
| areaSort() | assets/js/pages/roadmap-views-breakdown.js:34 |
| catBlock() | assets/js/pages/roadmap-views-breakdown.js:38 |
| contCard() | assets/js/pages/roadmap-views-cascade.js:22 |
| fullCard() | assets/js/pages/roadmap-views-cascade.js:33 |
| cardIn() | assets/js/pages/roadmap-views-cascade.js:58 |
| bandHead() | assets/js/pages/roadmap-views-cascade.js:80 |
| offBand() | assets/js/pages/roadmap-views-cascade.js:88 |
| themeSection() | assets/js/pages/roadmap-views-cascade.js:93 |
| inBandFn() | assets/js/pages/roadmap-views-cascade.js:101 |
| bandsSimple() | assets/js/pages/roadmap-views-cascade.js:107 |
| bandsGrouped() | assets/js/pages/roadmap-views-cascade.js:132 |
| block() | assets/js/pages/roadmap-views-cascade.js:155 |
| cascade() | assets/js/pages/roadmap-views-cascade.js:169 |
| execLive() | assets/js/pages/roadmap-views-exec.js:20 |
| execDeptGroups() | assets/js/pages/roadmap-views-exec.js:30 |
| countLabel() | assets/js/pages/roadmap-views-exec.js:50 |
| execItemRow() | assets/js/pages/roadmap-views-exec.js:55 |
| execCatRow() | assets/js/pages/roadmap-views-exec.js:68 |
| execDeptSection() | assets/js/pages/roadmap-views-exec.js:79 |
| execBoard() | assets/js/pages/roadmap-views-exec.js:89 |
| timelineOrder() | assets/js/pages/roadmap-views-timeline.js:22 |
| bandHeadCell() | assets/js/pages/roadmap-views-timeline.js:35 |
| timelineGrid() | assets/js/pages/roadmap-views-timeline.js:52 |
| placeItem() | assets/js/pages/roadmap-views-timeline.js:115 |
| placedWithChildren() | assets/js/pages/roadmap-views-timeline.js:140 |
| timeline() | assets/js/pages/roadmap-views-timeline.js:155 |
| markRecency() | assets/js/pages/roadmap-views.js:64 |
| presentationLabel() | assets/js/pages/roadmap-views.js:73 |
| hzIdx() | assets/js/pages/roadmap-views.js:76 |
| doneCol() | assets/js/pages/roadmap-views.js:80 |
| colStart() | assets/js/pages/roadmap-views.js:82 |
| colEnd() | assets/js/pages/roadmap-views.js:87 |
| isParked() | assets/js/pages/roadmap-views.js:93 |
| isActive() | assets/js/pages/roadmap-views.js:94 |
| bandVisible() | assets/js/pages/roadmap-views.js:102 |
| productItems() | assets/js/pages/roadmap-views.js:111 |
| isFix() | assets/js/pages/roadmap-views.js:119 |
| topLevel() | assets/js/pages/roadmap-views.js:127 |
| barKids() | assets/js/pages/roadmap-views.js:134 |
| deliverablesOf() | assets/js/pages/roadmap-views.js:142 |
| inDepartment() | assets/js/pages/roadmap-views.js:150 |
| byDepartment() | assets/js/pages/roadmap-views.js:160 |
| expandUnpicked() | assets/js/pages/roadmap-views.js:189 |
| bugRank() | assets/js/pages/roadmap-views.js:208 |
| wsRank() | assets/js/pages/roadmap-views.js:209 |
| byOrder() | assets/js/pages/roadmap-views.js:210 |
| childOrder() | assets/js/pages/roadmap-views.js:219 |
| context() | assets/js/pages/roadmap-views.js:223 |
| themeIdOf() | assets/js/pages/roadmap-views.js:247 |
| groupBy() | assets/js/pages/roadmap-views.js:249 |
| catClass() | assets/js/pages/roadmap-views.js:254 |
| pickOn() | assets/js/pages/roadmap-views.js:263 |
| isUnpicked() | assets/js/pages/roadmap-views.js:264 |
| isExcluded() | assets/js/pages/roadmap-views.js:267 |
| pickCls() | assets/js/pages/roadmap-views.js:270 |
| pickBox() | assets/js/pages/roadmap-views.js:273 |
| progressOf() | assets/js/pages/roadmap-views.js:289 |
| themeLabel() | assets/js/pages/roadmap-views.js:301 |
| bandLabel() | assets/js/pages/roadmap-views.js:305 |
| endBandLabel() | assets/js/pages/roadmap-views.js:306 |
| areaTitleOf() | assets/js/pages/roadmap-views.js:307 |
| childItems() | assets/js/pages/roadmap-views.js:311 |
| childStats() | assets/js/pages/roadmap-views.js:312 |
| stepRow() | assets/js/pages/roadmap-views.js:320 |
| checklistHtml() | assets/js/pages/roadmap-views.js:329 |
| itemListHtml() | assets/js/pages/roadmap-views.js:339 |
| freshnessHtml() | assets/js/pages/roadmap-views.js:345 |
| emptyNotice() | assets/js/pages/roadmap-views.js:350 |
| teamMember() | assets/js/pages/roadmap-views.js:361 |
| teamList() | assets/js/pages/roadmap-views.js:369 |
| visibleDetail() | assets/js/pages/roadmap-views.js:375 |
| breakdown() | assets/js/pages/roadmap-views.js:380 |
| find() | assets/js/pages/roadmap.js:62 |
| readState() | assets/js/pages/roadmap.js:65 |
| stored() | assets/js/pages/roadmap.js:70 |
| hashFor() | assets/js/pages/roadmap.js:75 |
| readDelivered() | assets/js/pages/roadmap.js:79 |
| readExpanded() | assets/js/pages/roadmap.js:87 |
| readWide() | assets/js/pages/roadmap.js:95 |
| readDepartment() | assets/js/pages/roadmap.js:103 |
| readCustom() | assets/js/pages/roadmap.js:113 |
| readUnpicked() | assets/js/pages/roadmap.js:116 |
| persistUnpicked() | assets/js/pages/roadmap.js:120 |
| syncCustomBody() | assets/js/pages/roadmap.js:126 |
| readHiddenBands() | assets/js/pages/roadmap.js:132 |
| persistHidden() | assets/js/pages/roadmap.js:140 |
| viewData() | assets/js/pages/roadmap.js:147 |
| exportRows() | assets/js/pages/roadmap.js:153 |
| render() | assets/js/pages/roadmap.js:160 |
| renderDelivered() | assets/js/pages/roadmap.js:178 |
| renderExpanded() | assets/js/pages/roadmap.js:183 |
| renderToggle() | assets/js/pages/roadmap.js:190 |
| renderBugToggle() | assets/js/pages/roadmap.js:198 |
| renderWideToggle() | assets/js/pages/roadmap.js:209 |
| tabs() | assets/js/pages/roadmap.js:216 |
| renderControls() | assets/js/pages/roadmap.js:225 |
| set() | assets/js/pages/roadmap.js:239 |
| notice() | assets/js/pages/users.js:15 |
| roleBadge() | assets/js/pages/users.js:28 |
| roleCell() | assets/js/pages/users.js:34 |
| toggleCell() | assets/js/pages/users.js:50 |
| trailingColumns() | assets/js/pages/users.js:73 |
| render() | assets/js/pages/users.js:86 |
| load() | assets/js/pages/users.js:121 |
| saveToggle() | assets/js/pages/users.js:156 |
| saveRole() | assets/js/pages/users.js:175 |
| row() | scripts/audit.js:12 |
| head() | scripts/audit.js:13 |
| testTotals() | scripts/audit.js:17 |
| overSoft() | scripts/audit.js:34 |
| tablesMissingPolicy() | scripts/audit.js:50 |
| themeGuardAnomalies() | scripts/audit.js:63 |
| thenBalance() | scripts/audit.js:74 |
| stalePaths() | scripts/audit.js:88 |
| snapshotSummary() | scripts/audit.js:103 |
| toJs() | scripts/extract-calls.js:72 |
| stripParamTypes() | scripts/extract-calls.js:76 |
| lens() | scripts/extract-calls.js:92 |
| evaluate() | scripts/extract-calls.js:99 |
| relativeKey() | scripts/extract-calls.js:107 |
| firstArg() | scripts/extract-calls.js:119 |
| walk() | scripts/extract-calls.js:137 |
| collectShared() | scripts/extract-calls.js:152 |
| extractFile() | scripts/extract-calls.js:176 |
| digestOf() | scripts/extract-calls.js:280 |
| extractDir() | scripts/extract-calls.js:285 |
| normalisePath() | scripts/extract-routes.js:38 |
| routeKey() | scripts/extract-routes.js:46 |
| controllerName() | scripts/extract-routes.js:50 |
| baseRoute() | scripts/extract-routes.js:60 |
| joinRoute() | scripts/extract-routes.js:74 |
| lineOf() | scripts/extract-routes.js:80 |
| extractFile() | scripts/extract-routes.js:87 |
| walk() | scripts/extract-routes.js:107 |
| digestOf() | scripts/extract-routes.js:120 |
| extractDir() | scripts/extract-routes.js:125 |
| firstLineMatching() | scripts/gen-codemap.js:22 |
| purposeOf() | scripts/gen-codemap.js:30 |
| symbolsOf() | scripts/gen-codemap.js:41 |
| collapsedKeys() | scripts/gen-coverage.js:117 |
| declaredOn() | scripts/gen-coverage.js:137 |
| callState() | scripts/gen-coverage.js:151 |
| reconcile() | scripts/gen-coverage.js:170 |
| build() | scripts/gen-coverage.js:252 |
| dig() | scripts/gen-knowledge.js:115 |
| build() | scripts/gen-knowledge.js:119 |
| sorted() | scripts/gen-snapshot.js:91 |
| write() | scripts/gen-snapshot.js:101 |
| seededKinds() | tests/checks/knowledge-links.test.js:22 |
| cdnPages() | tests/checks/perf.test.js:17 |
| sqlWithoutComments() | tests/checks/perf.test.js:22 |
| constraints() | tests/checks/render-coverage.test.js:49 |
| linkEntitiesBlock() | tests/checks/render-coverage.test.js:78 |
| schemaFiles() | tests/checks/schema-drift.test.js:32 |
| schemaText() | tests/checks/schema-drift.test.js:35 |
| migrationFiles() | tests/checks/schema-drift.test.js:38 |
| jwtRole() | tests/checks/security.test.js:27 |
| htmlPages() | tests/checks/structure.test.js:19 |
| protectedPages() | tests/checks/structure.test.js:22 |
| scriptSrcs() | tests/checks/structure.test.js:25 |
| trackedFiles() | tests/lib/repo.js:13 |
| read() | tests/lib/repo.js:19 |
| isTextFile() | tests/lib/repo.js:23 |
| lineOf() | tests/lib/repo.js:28 |
| loadView() | tests/lib/roadmap.js:12 |
| sampleData() | tests/lib/roadmap.js:36 |
| load() | tests/unit/appreview-detail.test.js:16 |
| app() | tests/unit/appreview-detail.test.js:46 |
| loadFindings() | tests/unit/appreview-findings.test.js:20 |
| plain() | tests/unit/appreview-findings.test.js:31 |
| app() | tests/unit/appreview-findings.test.js:35 |
| loadModel() | tests/unit/appreview-model.test.js:20 |
| plain() | tests/unit/appreview-model.test.js:33 |
| categories() | tests/unit/appreview-model.test.js:39 |
| statuses() | tests/unit/appreview-model.test.js:55 |
| app() | tests/unit/appreview-model.test.js:68 |
| load() | tests/unit/backlog-detail.test.js:17 |
| item() | tests/unit/backlog-detail.test.js:43 |
| doc() | tests/unit/backlog-detail.test.js:52 |
| load() | tests/unit/blocks.test.js:18 |
| load() | tests/unit/daopay-role.test.js:18 |
| load() | tests/unit/dashboard-cards.test.js:17 |
| load() | tests/unit/dashboard-strip.test.js:16 |
| ws() | tests/unit/dashboard-strip.test.js:30 |
| load() | tests/unit/detail.test.js:20 |
| loadBuilder() | tests/unit/gallery-future.test.js:21 |
| idea() | tests/unit/gallery-future.test.js:37 |
| load() | tests/unit/ideas.test.js:17 |
| idea() | tests/unit/ideas.test.js:36 |
| load() | tests/unit/lazy-detail.test.js:20 |
| fakeTimer() | tests/unit/lazy-detail.test.js:31 |
| harness() | tests/unit/lazy-detail.test.js:49 |
| load() | tests/unit/links.test.js:23 |
| load() | tests/unit/pci-ixopay.test.js:16 |
| load() | tests/unit/platform-knowledge.test.js:22 |
| sample() | tests/unit/platform-knowledge.test.js:44 |
| loadView() | tests/unit/platform-render.test.js:15 |
| sampleData() | tests/unit/platform-render.test.js:33 |
| load() | tests/unit/portalreview.test.js:18 |
| f() | tests/unit/portalreview.test.js:47 |
| loadApp() | tests/unit/reference-render.test.js:13 |
| loadApp() | tests/unit/registry.test.js:12 |
| sandboxWith() | tests/unit/render-fallbacks.test.js:27 |
| familyData() | tests/unit/roadmap-child-order.test.js:20 |
| order() | tests/unit/roadmap-child-order.test.js:41 |
| load() | tests/unit/roadmap-detail-export.test.js:17 |
| sample() | tests/unit/roadmap-detail-export.test.js:39 |
| ctxOf() | tests/unit/roadmap-detail-export.test.js:65 |
| plain() | tests/unit/roadmap-detail-export.test.js:66 |
| load() | tests/unit/roadmap-detail.test.js:16 |
| sample() | tests/unit/roadmap-detail.test.js:38 |
| ctxOf() | tests/unit/roadmap-detail.test.js:64 |
| familyData() | tests/unit/roadmap-views-custom.test.js:84 |
| count() | tests/unit/roadmap-views.test.js:23 |
| load() | tests/unit/search.test.js:15 |
| loadSprints() | tests/unit/sprints.test.js:13 |
| load() | tests/unit/tools.test.js:15 |
| fakeDb() | tests/unit/tools.test.js:136 |
| loadApp() | tests/unit/ui.test.js:13 |

## Conventions for agents

- Read this map, docs/STATE.md (current state) and CLAUDE.md before anything else.
- Jump to symbols with the file:line references above; read targeted ranges, not whole files.
- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.
