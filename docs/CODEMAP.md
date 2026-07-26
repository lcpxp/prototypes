# Code map

GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.
Purpose: lets an agent locate any file or symbol from this single
document instead of walking the tree or reading whole files.

| File | Lines | Purpose |
|---|---:|---|
| .claude/commands/roadmap-add.md | 30 |  |
| .claude/commands/roadmap.md | 55 |  |
| .claude/settings.json | 49 |  |
| .githooks/pre-commit | 29 |  |
| .github/workflows/deploy.yml | 53 |  |
| .gitignore | 24 |  |
| .gitmessage | 12 |  |
| CLAUDE.md | 205 | CLAUDE.md |
| README.md | 17 | LPio |
| assets/css/base.css | 98 | base.css - Reset, typography and global element styles. |
| assets/css/components.css | 447 | components.css - Reusable interface components: cards, forms, |
| assets/css/layout.css | 351 | layout.css - Navigation, page scaffold and grids. |
| assets/css/login.css | 163 | login.css - Sign-in page only. Loaded after the core layers on |
| assets/css/pages.css | 308 | pages.css - The reference viewer ("swagger") page. Everything |
| assets/css/prototype.css | 88 | prototype.css - Shared styles for a prototype's LPio-framed overview |
| assets/css/pxp-pci.css | 124 | pxp-pci.css - The PCI feature layered on the PXP replica: the wizard |
| assets/css/pxp.css | 218 | pxp.css - PXP Partner Portal replica shell for the PCI prototype |
| assets/css/roadmap-detail.css | 264 | roadmap-detail.css - Coarse progress bars, the expanded Executive |
| assets/css/roadmap-views.css | 379 | roadmap-views.css - The roadmap home's level views (Executive theme |
| assets/css/roadmap.css | 394 | roadmap.css - The roadmap board (modules/roadmap/). A page sheet, |
| assets/css/tokens.css | 393 | tokens.css - Design tokens for the LPio hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/config.example.js | 18 | config.example.js - OPTIONAL local override. |
| assets/js/core/guard.js | 145 | guard.js - Blocks unauthenticated access to protected pages and |
| assets/js/core/registry.js | 191 | registry.js - Single source of truth for the hub's modules, the |
| assets/js/core/search.js | 226 | search.js - Global header search (App.search). Renders results for |
| assets/js/core/sprints.js | 115 | sprints.js - The sprint + date engine (App.sprints). Pure, no DOM, |
| assets/js/core/supabase.js | 36 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/theme.js | 79 | theme.js - Light/dark theme control. |
| assets/js/core/ui.js | 285 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/backlog.js | 324 | backlog.js - The master work list for modules/backlog/. |
| assets/js/pages/dashboard.js | 159 | dashboard.js - Renders module cards, counts and recent activity |
| assets/js/pages/gallery.js | 124 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/integrations.js | 114 | integrations.js - Integration overview for modules/integrations/. |
| assets/js/pages/pci-interstitial.js | 144 | pci-interstitial.js - The PCI compliance "checkout interstitial" for |
| assets/js/pages/pci-ixopay.js | 132 | pci-ixopay.js - In-page mock of the IXOPAY vendor client and its |
| assets/js/pages/pci-portal.js | 300 | pci-portal.js - The PXP Partner Portal replica: the "Merchant |
| assets/js/pages/pci-reports.js | 54 | pci-reports.js - Compliance reporting view for the PCI prototype, |
| assets/js/pages/platform.js | 202 | platform.js - The platform product-knowledge viewer for |
| assets/js/pages/proto-svg.js | 125 | proto-svg.js - Inline SVG diagram viewer for a prototype overview |
| assets/js/pages/reference-render.js | 287 | reference-render.js - Pure HTML builders for the reference viewer. |
| assets/js/pages/reference-topics.js | 112 | reference-topics.js - Pure HTML builders for api_topics rows: the |
| assets/js/pages/reference.js | 309 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/roadmap-detail.js | 377 | roadmap-detail.js - Pure builders for the roadmap item drawer and the |
| assets/js/pages/roadmap-views-breakdown.js | 60 | roadmap-views-breakdown.js - The Detailed breakdown for the roadmap |
| assets/js/pages/roadmap-views-cascade.js | 201 | roadmap-views-cascade.js - The Cascade layout for the roadmap home: |
| assets/js/pages/roadmap-views-exec.js | 102 | roadmap-views-exec.js - The Executive (Categories) board for the |
| assets/js/pages/roadmap-views-timeline.js | 175 | roadmap-views-timeline.js - The Timeline layout for the roadmap home: |
| assets/js/pages/roadmap-views.js | 403 | roadmap-views.js - Pure HTML builders for the roadmap home |
| assets/js/pages/roadmap.js | 514 | roadmap.js - The roadmap home for modules/roadmap/. A read-only, |
| assets/js/pages/users.js | 172 | users.js - User and access management for modules/users/. |
| dashboard.html | 61 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 247 | Architecture |
| docs/CHANGELOG.md | 162 | Changelog |
| docs/DESIGN.md | 140 | Design standards |
| docs/HARNESS.md | 127 | Verification harness and working process |
| docs/PLATFORM.md | 114 | Platform product-knowledge protocol |
| docs/ROADMAP-PLAYBOOK.md | 298 | Roadmap playbook |
| docs/ROADMAP-PROCESS.md | 154 | Roadmap process |
| docs/ROADMAP.md | 199 | Roadmap |
| docs/SECURITY.md | 80 | Security model |
| docs/SETUP.md | 54 | Setup and day-to-day use |
| docs/SPRINTS.md | 109 | Sprints and dates |
| docs/STATE.md | 31 | Current state |
| docs/VALUE-CAPTURE.md | 71 | Value capture session |
| docs/WORKFLOW.md | 110 | Work intake and backlog workflow |
| docs/sessions-archive/2026-07-log-final.md | 902 | Session log |
| docs/sessions-archive/2026-07.md | 189 | Session log archive - 2026-07 (earlier entries) |
| docs/sessions-archive/README.md | 13 | Session archive (closed) |
| index.html | 76 | Sign in - LPio / LaunchPad IO |
| modules/backlog/index.html | 93 | Backlog - LPio / LaunchPad IO |
| modules/integrations/index.html | 62 | Integrations - LPio / LaunchPad IO |
| modules/platform/index.html | 56 | Platform - LPio / LaunchPad IO |
| modules/prototypes/gdpr/index.html | 49 | GDPR compliance prototype - LPio / LaunchPad IO |
| modules/prototypes/index.html | 61 | Prototypes - LPio / LaunchPad IO |
| modules/prototypes/pci/dashboard.html | 67 | Dashboard - PXP replica - LPio |
| modules/prototypes/pci/demo.html | 87 | Merchant Prescreen and Quote - PXP replica - LPio |
| modules/prototypes/pci/index.html | 156 | PCI compliance prototype - LPio / LaunchPad IO |
| modules/prototypes/pci/pci-workflow.svg | 62 |  |
| modules/prototypes/pci/reports.html | 77 | Compliance reporting - PXP replica - LPio |
| modules/prototypes/website-screening/index.html | 50 | Website screening prototype - LPio / LaunchPad IO |
| modules/reference/index.html | 75 | API reference - LPio / LaunchPad IO |
| modules/roadmap/index.html | 118 | Roadmap - LPio / LaunchPad IO |
| modules/users/index.html | 55 | Users - LPio / LaunchPad IO |
| package.json | 13 |  |
| scripts/audit.js | 123 | scripts/audit.js - One-screen repo health report. Read-only; reuses |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
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
| supabase/migrations/20260722160000_work_item_associated_departments.sql | 68 | ------------------------------------------------------------------ |
| supabase/migrations/20260722170000_roadmap_move_workstream_cascade.sql | 65 | ------------------------------------------------------------------ |
| supabase/migrations/20260722190000_work_item_deliverable_level.sql | 23 | Deliverables: a third presentation level for work_items. A deliverable |
| supabase/policies.sql | 251 | ------------------------------------------------------------------ |
| supabase/schema/00_core.sql | 79 | ------------------------------------------------------------------ |
| supabase/schema/10_reference.sql | 145 | ------------------------------------------------------------------ |
| supabase/schema/20_portal.sql | 79 | ------------------------------------------------------------------ |
| supabase/schema/30_work.sql | 487 | ------------------------------------------------------------------ |
| supabase/schema/40_platform.sql | 65 | ------------------------------------------------------------------ |
| supabase/schema/45_context.sql | 67 | ------------------------------------------------------------------ |
| supabase/schema/90_dashboard.sql | 44 | ------------------------------------------------------------------ |
| supabase/seed.sql | 514 | ------------------------------------------------------------------ |
| tests/checks/perf.test.js | 77 | tests/checks/perf.test.js - Performance gates. |
| tests/checks/security.test.js | 116 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 35 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 162 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 89 | tests/checks/style.test.js - Design-system gates. |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/lib/roadmap.js | 87 | tests/lib/roadmap.js - Shared loader and dataset for the roadmap |
| tests/size-budget.json | 82 |  |
| tests/unit/gallery-future.test.js | 55 | tests/unit/gallery-future.test.js - Benchmarks for the prototype |
| tests/unit/pci-ixopay.test.js | 81 | tests/unit/pci-ixopay.test.js - Benchmarks for the PCI prototype's |
| tests/unit/platform-render.test.js | 135 | tests/unit/platform-render.test.js - Benchmarks for the platform |
| tests/unit/reference-render.test.js | 212 | tests/unit/reference-render.test.js - Benchmarks for the reference |
| tests/unit/registry.test.js | 92 | tests/unit/registry.test.js - Benchmarks for the module registry, |
| tests/unit/roadmap-child-order.test.js | 84 | tests/unit/roadmap-child-order.test.js - Benchmarks for how a |
| tests/unit/roadmap-detail.test.js | 297 | tests/unit/roadmap-detail.test.js - Benchmarks for the item detail |
| tests/unit/roadmap-views-custom.test.js | 220 | tests/unit/roadmap-views-custom.test.js - Benchmarks for the roadmap |
| tests/unit/roadmap-views.test.js | 432 | tests/unit/roadmap-views.test.js - Benchmarks for the roadmap home's |
| tests/unit/search.test.js | 142 | tests/unit/search.test.js - Benchmarks for assets/js/core/search.js. |
| tests/unit/sprints.test.js | 81 | tests/unit/sprints.test.js - Benchmarks for the sprint engine |
| tests/unit/ui.test.js | 60 | tests/unit/ui.test.js - Benchmarks for assets/js/core/ui.js. |

## JavaScript symbol index

| Symbol | Location |
|---|---|
| readCache() | assets/js/core/guard.js:54 |
| writeCache() | assets/js/core/guard.js:61 |
| fetchAccess() | assets/js/core/guard.js:68 |
| App.canAccess | assets/js/core/guard.js:88 |
| App.onAuthed | assets/js/core/guard.js:116 |
| enforceModule() | assets/js/core/guard.js:124 |
| App.moduleHref | assets/js/core/registry.js:144 |
| App.itemHref | assets/js/core/registry.js:154 |
| App.departmentLabel | assets/js/core/registry.js:184 |
| sources() | assets/js/core/search.js:24 |
| canReach() | assets/js/core/search.js:47 |
| moduleByKey() | assets/js/core/search.js:51 |
| targetMod() | assets/js/core/search.js:57 |
| clean() | assets/js/core/search.js:66 |
| selectFor() | assets/js/core/search.js:70 |
| highlight() | assets/js/core/search.js:81 |
| badgeHtml() | assets/js/core/search.js:91 |
| buildHtml() | assets/js/core/search.js:100 |
| attach() | assets/js/core/search.js:129 |
| close() | assets/js/core/search.js:139 |
| open() | assets/js/core/search.js:148 |
| paint() | assets/js/core/search.js:153 |
| setActive() | assets/js/core/search.js:162 |
| run() | assets/js/core/search.js:174 |
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
| App.onThemeChange | assets/js/core/ui.js:260 |
| bandOf() | assets/js/pages/backlog.js:34 |
| fmtDate() | assets/js/pages/backlog.js:40 |
| kvHtml() | assets/js/pages/backlog.js:44 |
| badges() | assets/js/pages/backlog.js:53 |
| openItemModal() | assets/js/pages/backlog.js:59 |
| openDocumentModal() | assets/js/pages/backlog.js:83 |
| filteredItems() | assets/js/pages/backlog.js:98 |
| ordered() | assets/js/pages/backlog.js:114 |
| toCsvRecord() | assets/js/pages/backlog.js:130 |
| exportCsv() | assets/js/pages/backlog.js:155 |
| renderItems() | assets/js/pages/backlog.js:162 |
| renderDocuments() | assets/js/pages/backlog.js:199 |
| fillFilters() | assets/js/pages/backlog.js:233 |
| loadCounts() | assets/js/pages/dashboard.js:14 |
| renderRoadmapMeter() | assets/js/pages/dashboard.js:29 |
| cardHtml() | assets/js/pages/dashboard.js:44 |
| visibleModules() | assets/js/pages/dashboard.js:60 |
| renderCards() | assets/js/pages/dashboard.js:66 |
| moduleByKey() | assets/js/pages/dashboard.js:75 |
| activitySources() | assets/js/pages/dashboard.js:82 |
| canReach() | assets/js/pages/dashboard.js:98 |
| loadActivity() | assets/js/pages/dashboard.js:103 |
| showDeniedNotice() | assets/js/pages/dashboard.js:143 |
| App.futurePrototypesTable | assets/js/pages/gallery.js:14 |
| isPci() | assets/js/pages/gallery.js:56 |
| card() | assets/js/pages/gallery.js:62 |
| renderFuture() | assets/js/pages/gallery.js:107 |
| safeUrl() | assets/js/pages/integrations.js:15 |
| modalHtml() | assets/js/pages/integrations.js:19 |
| openModal() | assets/js/pages/integrations.js:47 |
| tableHtml() | assets/js/pages/integrations.js:53 |
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
| renderStepper() | assets/js/pages/pci-portal.js:44 |
| nav() | assets/js/pages/pci-portal.js:62 |
| field() | assets/js/pages/pci-portal.js:69 |
| stepApplication() | assets/js/pages/pci-portal.js:73 |
| stepSites() | assets/js/pages/pci-portal.js:102 |
| feeRow() | assets/js/pages/pci-portal.js:118 |
| pciFeeRow() | assets/js/pages/pci-portal.js:125 |
| stepProducts() | assets/js/pages/pci-portal.js:134 |
| stepPass() | assets/js/pages/pci-portal.js:156 |
| stepSummary() | assets/js/pages/pci-portal.js:161 |
| renderStep() | assets/js/pages/pci-portal.js:176 |
| wireStep() | assets/js/pages/pci-portal.js:188 |
| onContinue() | assets/js/pages/pci-portal.js:209 |
| goTo() | assets/js/pages/pci-portal.js:224 |
| openSiteModal() | assets/js/pages/pci-portal.js:234 |
| buildDrawer() | assets/js/pages/pci-portal.js:258 |
| renderQuote() | assets/js/pages/pci-portal.js:271 |
| openQuote() | assets/js/pages/pci-portal.js:286 |
| closeQuote() | assets/js/pages/pci-portal.js:287 |
| addPciFee() | assets/js/pages/pci-portal.js:288 |
| stat() | assets/js/pages/pci-reports.js:16 |
| toneClass() | assets/js/pages/platform.js:24 |
| codeblock() | assets/js/pages/platform.js:28 |
| tableBlock() | assets/js/pages/platform.js:33 |
| kvBlock() | assets/js/pages/platform.js:50 |
| valuesBlock() | assets/js/pages/platform.js:59 |
| blockHtml() | assets/js/pages/platform.js:75 |
| maturityChips() | assets/js/pages/platform.js:96 |
| capabilityCard() | assets/js/pages/platform.js:101 |
| byOrder() | assets/js/pages/platform.js:111 |
| groupByArea() | assets/js/pages/platform.js:115 |
| sectionHeading() | assets/js/pages/platform.js:127 |
| pageHtml() | assets/js/pages/platform.js:135 |
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
| toneClass() | assets/js/pages/reference-topics.js:21 |
| tableBlock() | assets/js/pages/reference-topics.js:25 |
| kvBlock() | assets/js/pages/reference-topics.js:45 |
| valuesBlock() | assets/js/pages/reference-topics.js:55 |
| blockHtml() | assets/js/pages/reference-topics.js:69 |
| topicBlock() | assets/js/pages/reference-topics.js:93 |
| context() | assets/js/pages/reference.js:32 |
| render() | assets/js/pages/reference.js:36 |
| hydrate() | assets/js/pages/reference.js:90 |
| applyFilter() | assets/js/pages/reference.js:116 |
| setAllOpen() | assets/js/pages/reference.js:123 |
| loadSpec() | assets/js/pages/reference.js:130 |
| fillPicker() | assets/js/pages/reference.js:189 |
| wireContent() | assets/js/pages/reference.js:218 |
| openHashTarget() | assets/js/pages/reference.js:247 |
| esc() | assets/js/pages/roadmap-detail.js:33 |
| day() | assets/js/pages/roadmap-detail.js:34 |
| dateRange() | assets/js/pages/roadmap-detail.js:35 |
| byPhase() | assets/js/pages/roadmap-detail.js:40 |
| sprintRange() | assets/js/pages/roadmap-detail.js:44 |
| cap() | assets/js/pages/roadmap-detail.js:50 |
| keyLabel() | assets/js/pages/roadmap-detail.js:51 |
| titleOf() | assets/js/pages/roadmap-detail.js:52 |
| listText() | assets/js/pages/roadmap-detail.js:56 |
| clean() | assets/js/pages/roadmap-detail.js:60 |
| attrs() | assets/js/pages/roadmap-detail.js:72 |
| bandText() | assets/js/pages/roadmap-detail.js:73 |
| row() | assets/js/pages/roadmap-detail.js:81 |
| businessAreaLabels() | assets/js/pages/roadmap-detail.js:86 |
| note() | assets/js/pages/roadmap-detail.js:91 |
| extraAttrRows() | assets/js/pages/roadmap-detail.js:101 |
| notesHtml() | assets/js/pages/roadmap-detail.js:108 |
| phasesHtml() | assets/js/pages/roadmap-detail.js:119 |
| drawerHtml() | assets/js/pages/roadmap-detail.js:133 |
| toKpiItem() | assets/js/pages/roadmap-detail.js:205 |
| toKpiRoadmap() | assets/js/pages/roadmap-detail.js:281 |
| flattenItem() | assets/js/pages/roadmap-detail.js:314 |
| toCsvRoadmap() | assets/js/pages/roadmap-detail.js:361 |
| breakdownItemRow() | assets/js/pages/roadmap-views-breakdown.js:18 |
| breakdown() | assets/js/pages/roadmap-views-breakdown.js:31 |
| areaSort() | assets/js/pages/roadmap-views-breakdown.js:34 |
| catBlock() | assets/js/pages/roadmap-views-breakdown.js:38 |
| contCard() | assets/js/pages/roadmap-views-cascade.js:22 |
| fullCard() | assets/js/pages/roadmap-views-cascade.js:33 |
| cardIn() | assets/js/pages/roadmap-views-cascade.js:58 |
| isHideable() | assets/js/pages/roadmap-views-cascade.js:77 |
| bandHead() | assets/js/pages/roadmap-views-cascade.js:78 |
| offBand() | assets/js/pages/roadmap-views-cascade.js:87 |
| themeSection() | assets/js/pages/roadmap-views-cascade.js:92 |
| inBandFn() | assets/js/pages/roadmap-views-cascade.js:100 |
| bandsSimple() | assets/js/pages/roadmap-views-cascade.js:106 |
| bandsGrouped() | assets/js/pages/roadmap-views-cascade.js:131 |
| block() | assets/js/pages/roadmap-views-cascade.js:154 |
| cascade() | assets/js/pages/roadmap-views-cascade.js:168 |
| execLive() | assets/js/pages/roadmap-views-exec.js:20 |
| execDeptGroups() | assets/js/pages/roadmap-views-exec.js:30 |
| countLabel() | assets/js/pages/roadmap-views-exec.js:50 |
| execItemRow() | assets/js/pages/roadmap-views-exec.js:55 |
| execCatRow() | assets/js/pages/roadmap-views-exec.js:68 |
| execDeptSection() | assets/js/pages/roadmap-views-exec.js:79 |
| execBoard() | assets/js/pages/roadmap-views-exec.js:89 |
| timelineOrder() | assets/js/pages/roadmap-views-timeline.js:22 |
| isHideable() | assets/js/pages/roadmap-views-timeline.js:32 |
| bandHeadCell() | assets/js/pages/roadmap-views-timeline.js:37 |
| timelineGrid() | assets/js/pages/roadmap-views-timeline.js:53 |
| placeItem() | assets/js/pages/roadmap-views-timeline.js:87 |
| placedWithChildren() | assets/js/pages/roadmap-views-timeline.js:107 |
| timeline() | assets/js/pages/roadmap-views-timeline.js:122 |
| markRecency() | assets/js/pages/roadmap-views.js:59 |
| presentationLabel() | assets/js/pages/roadmap-views.js:68 |
| hzIdx() | assets/js/pages/roadmap-views.js:71 |
| doneCol() | assets/js/pages/roadmap-views.js:75 |
| colStart() | assets/js/pages/roadmap-views.js:77 |
| colEnd() | assets/js/pages/roadmap-views.js:82 |
| isParked() | assets/js/pages/roadmap-views.js:88 |
| isActive() | assets/js/pages/roadmap-views.js:89 |
| bandVisible() | assets/js/pages/roadmap-views.js:97 |
| productItems() | assets/js/pages/roadmap-views.js:101 |
| isFix() | assets/js/pages/roadmap-views.js:109 |
| topLevel() | assets/js/pages/roadmap-views.js:117 |
| barKids() | assets/js/pages/roadmap-views.js:124 |
| deliverablesOf() | assets/js/pages/roadmap-views.js:132 |
| inDepartment() | assets/js/pages/roadmap-views.js:140 |
| byDepartment() | assets/js/pages/roadmap-views.js:150 |
| expandUnpicked() | assets/js/pages/roadmap-views.js:179 |
| bugRank() | assets/js/pages/roadmap-views.js:198 |
| wsRank() | assets/js/pages/roadmap-views.js:199 |
| byOrder() | assets/js/pages/roadmap-views.js:200 |
| childOrder() | assets/js/pages/roadmap-views.js:209 |
| context() | assets/js/pages/roadmap-views.js:213 |
| themeIdOf() | assets/js/pages/roadmap-views.js:237 |
| groupBy() | assets/js/pages/roadmap-views.js:239 |
| catClass() | assets/js/pages/roadmap-views.js:244 |
| pickOn() | assets/js/pages/roadmap-views.js:253 |
| isUnpicked() | assets/js/pages/roadmap-views.js:254 |
| isExcluded() | assets/js/pages/roadmap-views.js:257 |
| pickCls() | assets/js/pages/roadmap-views.js:260 |
| pickBox() | assets/js/pages/roadmap-views.js:263 |
| progressOf() | assets/js/pages/roadmap-views.js:279 |
| themeLabel() | assets/js/pages/roadmap-views.js:291 |
| bandLabel() | assets/js/pages/roadmap-views.js:295 |
| endBandLabel() | assets/js/pages/roadmap-views.js:296 |
| areaTitleOf() | assets/js/pages/roadmap-views.js:297 |
| childItems() | assets/js/pages/roadmap-views.js:301 |
| childStats() | assets/js/pages/roadmap-views.js:302 |
| stepRow() | assets/js/pages/roadmap-views.js:310 |
| checklistHtml() | assets/js/pages/roadmap-views.js:319 |
| itemListHtml() | assets/js/pages/roadmap-views.js:329 |
| freshnessHtml() | assets/js/pages/roadmap-views.js:335 |
| emptyNotice() | assets/js/pages/roadmap-views.js:340 |
| teamMember() | assets/js/pages/roadmap-views.js:351 |
| teamList() | assets/js/pages/roadmap-views.js:359 |
| visibleDetail() | assets/js/pages/roadmap-views.js:365 |
| breakdown() | assets/js/pages/roadmap-views.js:370 |
| find() | assets/js/pages/roadmap.js:59 |
| readState() | assets/js/pages/roadmap.js:62 |
| stored() | assets/js/pages/roadmap.js:67 |
| hashFor() | assets/js/pages/roadmap.js:72 |
| readDelivered() | assets/js/pages/roadmap.js:76 |
| readExpanded() | assets/js/pages/roadmap.js:84 |
| readDepartment() | assets/js/pages/roadmap.js:92 |
| readCustom() | assets/js/pages/roadmap.js:102 |
| readUnpicked() | assets/js/pages/roadmap.js:105 |
| persistUnpicked() | assets/js/pages/roadmap.js:109 |
| syncCustomBody() | assets/js/pages/roadmap.js:115 |
| readHiddenBands() | assets/js/pages/roadmap.js:121 |
| persistHidden() | assets/js/pages/roadmap.js:129 |
| viewData() | assets/js/pages/roadmap.js:136 |
| exportRows() | assets/js/pages/roadmap.js:142 |
| render() | assets/js/pages/roadmap.js:149 |
| renderDelivered() | assets/js/pages/roadmap.js:166 |
| renderExpanded() | assets/js/pages/roadmap.js:171 |
| renderToggle() | assets/js/pages/roadmap.js:178 |
| renderBugToggle() | assets/js/pages/roadmap.js:186 |
| downloadJson() | assets/js/pages/roadmap.js:195 |
| safeName() | assets/js/pages/roadmap.js:198 |
| tabs() | assets/js/pages/roadmap.js:203 |
| renderControls() | assets/js/pages/roadmap.js:212 |
| set() | assets/js/pages/roadmap.js:226 |
| setExportOpen() | assets/js/pages/roadmap.js:322 |
| setItemParam() | assets/js/pages/roadmap.js:366 |
| openDrawer() | assets/js/pages/roadmap.js:374 |
| closeDrawer() | assets/js/pages/roadmap.js:389 |
| notice() | assets/js/pages/users.js:15 |
| roleBadge() | assets/js/pages/users.js:24 |
| roleCell() | assets/js/pages/users.js:30 |
| toggleCell() | assets/js/pages/users.js:46 |
| render() | assets/js/pages/users.js:57 |
| load() | assets/js/pages/users.js:90 |
| saveToggle() | assets/js/pages/users.js:125 |
| saveRole() | assets/js/pages/users.js:144 |
| row() | scripts/audit.js:12 |
| head() | scripts/audit.js:13 |
| testTotals() | scripts/audit.js:17 |
| overSoft() | scripts/audit.js:34 |
| tablesMissingPolicy() | scripts/audit.js:50 |
| themeGuardAnomalies() | scripts/audit.js:63 |
| thenBalance() | scripts/audit.js:74 |
| stalePaths() | scripts/audit.js:88 |
| firstLineMatching() | scripts/gen-codemap.js:22 |
| purposeOf() | scripts/gen-codemap.js:30 |
| symbolsOf() | scripts/gen-codemap.js:41 |
| cdnPages() | tests/checks/perf.test.js:17 |
| sqlWithoutComments() | tests/checks/perf.test.js:22 |
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
| loadBuilder() | tests/unit/gallery-future.test.js:14 |
| load() | tests/unit/pci-ixopay.test.js:16 |
| loadView() | tests/unit/platform-render.test.js:15 |
| sampleData() | tests/unit/platform-render.test.js:31 |
| loadApp() | tests/unit/reference-render.test.js:13 |
| loadApp() | tests/unit/registry.test.js:12 |
| familyData() | tests/unit/roadmap-child-order.test.js:20 |
| order() | tests/unit/roadmap-child-order.test.js:41 |
| load() | tests/unit/roadmap-detail.test.js:13 |
| sample() | tests/unit/roadmap-detail.test.js:32 |
| ctxOf() | tests/unit/roadmap-detail.test.js:58 |
| plain() | tests/unit/roadmap-detail.test.js:59 |
| familyData() | tests/unit/roadmap-views-custom.test.js:84 |
| count() | tests/unit/roadmap-views.test.js:23 |
| load() | tests/unit/search.test.js:15 |
| loadSprints() | tests/unit/sprints.test.js:13 |
| loadApp() | tests/unit/ui.test.js:13 |

## Conventions for agents

- Read this map, docs/STATE.md (current state) and CLAUDE.md before anything else.
- Jump to symbols with the file:line references above; read targeted ranges, not whole files.
- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.
