# Code map

GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.
Purpose: lets an agent locate any file or symbol from this single
document instead of walking the tree or reading whole files.

| File | Lines | Purpose |
|---|---:|---|
| .githooks/pre-commit | 20 |  |
| .github/workflows/deploy.yml | 53 |  |
| .gitignore | 20 |  |
| .gitmessage | 12 |  |
| CLAUDE.md | 179 | CLAUDE.md |
| README.md | 17 | LPio |
| assets/css/base.css | 98 | base.css - Reset, typography and global element styles. |
| assets/css/components.css | 426 | components.css - Reusable interface components: cards, forms, |
| assets/css/layout.css | 320 | layout.css - Navigation, page scaffold and grids. |
| assets/css/login.css | 163 | login.css - Sign-in page only. Loaded after the core layers on |
| assets/css/pages.css | 302 | pages.css - The reference viewer ("swagger") page. Everything |
| assets/css/roadmap-detail.css | 151 | roadmap-detail.css - Coarse progress bars, the expanded Executive |
| assets/css/roadmap-views.css | 233 | roadmap-views.css - The roadmap home's level views (Executive theme |
| assets/css/roadmap.css | 285 | roadmap.css - The roadmap board (modules/roadmap/). A page sheet, |
| assets/css/tokens.css | 307 | tokens.css - Design tokens for the LPio hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/config.example.js | 18 | config.example.js - OPTIONAL local override. |
| assets/js/core/guard.js | 137 | guard.js - Blocks unauthenticated access to protected pages and |
| assets/js/core/registry.js | 156 | registry.js - Single source of truth for the hub's modules, the |
| assets/js/core/search.js | 104 | search.js - Global header search (App.search). Renders results for |
| assets/js/core/sprints.js | 115 | sprints.js - The sprint + date engine (App.sprints). Pure, no DOM, |
| assets/js/core/supabase.js | 36 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/theme.js | 79 | theme.js - Light/dark theme control. |
| assets/js/core/ui.js | 205 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/backlog.js | 278 | backlog.js - The master work list for modules/backlog/. |
| assets/js/pages/dashboard.js | 160 | dashboard.js - Renders module cards, counts and recent activity |
| assets/js/pages/gallery.js | 55 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/integrations.js | 115 | integrations.js - Integration overview for modules/integrations/. |
| assets/js/pages/platform.js | 201 | platform.js - The platform product-knowledge viewer for |
| assets/js/pages/reference-render.js | 287 | reference-render.js - Pure HTML builders for the reference viewer. |
| assets/js/pages/reference-topics.js | 112 | reference-topics.js - Pure HTML builders for api_topics rows: the |
| assets/js/pages/reference.js | 296 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/roadmap-detail.js | 197 | roadmap-detail.js - Pure builders for the roadmap item drawer and the |
| assets/js/pages/roadmap-views.js | 367 | roadmap-views.js - Pure HTML builders for the roadmap home |
| assets/js/pages/roadmap.js | 273 | roadmap.js - The roadmap home for modules/roadmap/. A read-only, |
| assets/js/pages/users.js | 170 | users.js - User and access management for modules/users/. |
| dashboard.html | 61 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 224 | Architecture |
| docs/DESIGN.md | 140 | Design standards |
| docs/HARNESS.md | 108 | Verification harness and working process |
| docs/PLATFORM.md | 104 | Platform product-knowledge protocol |
| docs/ROADMAP-PROCESS.md | 124 | Roadmap process |
| docs/ROADMAP.md | 206 | Roadmap |
| docs/SECURITY.md | 80 | Security model |
| docs/SESSIONS.md | 858 | Session log |
| docs/SETUP.md | 54 | Setup and day-to-day use |
| docs/SPRINTS.md | 109 | Sprints and dates |
| docs/WORKFLOW.md | 106 | Work intake and backlog workflow |
| docs/sessions-archive/2026-07.md | 189 | Session log archive - 2026-07 (earlier entries) |
| index.html | 76 | Sign in - LPio / LaunchPad IO |
| modules/backlog/index.html | 124 | Backlog - LPio / LaunchPad IO |
| modules/integrations/index.html | 94 | Integrations - LPio / LaunchPad IO |
| modules/platform/index.html | 88 | Platform - LPio / LaunchPad IO |
| modules/prototypes/index.html | 86 | Prototypes - LPio / LaunchPad IO |
| modules/reference/index.html | 107 | API reference - LPio / LaunchPad IO |
| modules/roadmap/index.html | 123 | Roadmap - LPio / LaunchPad IO |
| modules/users/index.html | 87 | Users - LPio / LaunchPad IO |
| package.json | 12 |  |
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
| supabase/policies.sql | 245 | ------------------------------------------------------------------ |
| supabase/schema/00_core.sql | 79 | ------------------------------------------------------------------ |
| supabase/schema/10_reference.sql | 145 | ------------------------------------------------------------------ |
| supabase/schema/20_portal.sql | 57 | ------------------------------------------------------------------ |
| supabase/schema/30_work.sql | 326 | ------------------------------------------------------------------ |
| supabase/schema/40_platform.sql | 65 | ------------------------------------------------------------------ |
| supabase/schema/90_dashboard.sql | 44 | ------------------------------------------------------------------ |
| supabase/seed.sql | 492 | ------------------------------------------------------------------ |
| tests/checks/perf.test.js | 77 | tests/checks/perf.test.js - Performance gates. |
| tests/checks/security.test.js | 116 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 33 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 102 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 68 | tests/checks/style.test.js - Design-system gates. |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/size-budget.json | 22 |  |
| tests/unit/platform-render.test.js | 127 | tests/unit/platform-render.test.js - Benchmarks for the platform |
| tests/unit/reference-render.test.js | 212 | tests/unit/reference-render.test.js - Benchmarks for the reference |
| tests/unit/registry.test.js | 92 | tests/unit/registry.test.js - Benchmarks for the module registry, |
| tests/unit/roadmap-detail.test.js | 132 | tests/unit/roadmap-detail.test.js - Benchmarks for the item detail |
| tests/unit/roadmap-views.test.js | 229 | tests/unit/roadmap-views.test.js - Benchmarks for the roadmap home's |
| tests/unit/sprints.test.js | 81 | tests/unit/sprints.test.js - Benchmarks for the sprint engine |
| tests/unit/ui.test.js | 60 | tests/unit/ui.test.js - Benchmarks for assets/js/core/ui.js. |

## JavaScript symbol index

| Symbol | Location |
|---|---|
| readCache() | assets/js/core/guard.js:51 |
| writeCache() | assets/js/core/guard.js:58 |
| fetchAccess() | assets/js/core/guard.js:65 |
| App.canAccess | assets/js/core/guard.js:85 |
| App.onAuthed | assets/js/core/guard.js:108 |
| enforceModule() | assets/js/core/guard.js:116 |
| App.moduleHref | assets/js/core/registry.js:143 |
| App.departmentLabel | assets/js/core/registry.js:149 |
| sources() | assets/js/core/search.js:21 |
| canReach() | assets/js/core/search.js:35 |
| moduleByKey() | assets/js/core/search.js:39 |
| clean() | assets/js/core/search.js:43 |
| render() | assets/js/core/search.js:45 |
| attach() | assets/js/core/search.js:67 |
| close() | assets/js/core/search.js:74 |
| run() | assets/js/core/search.js:79 |
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
| isCurrentPage() | assets/js/core/ui.js:47 |
| themeIcon() | assets/js/core/ui.js:55 |
| renderNav() | assets/js/core/ui.js:72 |
| App.onThemeChange | assets/js/core/ui.js:180 |
| bandOf() | assets/js/pages/backlog.js:34 |
| fmtDate() | assets/js/pages/backlog.js:40 |
| kvHtml() | assets/js/pages/backlog.js:44 |
| badges() | assets/js/pages/backlog.js:53 |
| openItemModal() | assets/js/pages/backlog.js:59 |
| openDocumentModal() | assets/js/pages/backlog.js:83 |
| filteredItems() | assets/js/pages/backlog.js:98 |
| ordered() | assets/js/pages/backlog.js:114 |
| renderItems() | assets/js/pages/backlog.js:121 |
| renderDocuments() | assets/js/pages/backlog.js:158 |
| fillFilters() | assets/js/pages/backlog.js:192 |
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
| safeUrl() | assets/js/pages/integrations.js:15 |
| modalHtml() | assets/js/pages/integrations.js:19 |
| openModal() | assets/js/pages/integrations.js:47 |
| tableHtml() | assets/js/pages/integrations.js:53 |
| toneClass() | assets/js/pages/platform.js:24 |
| codeblock() | assets/js/pages/platform.js:28 |
| tableBlock() | assets/js/pages/platform.js:33 |
| kvBlock() | assets/js/pages/platform.js:50 |
| valuesBlock() | assets/js/pages/platform.js:59 |
| blockHtml() | assets/js/pages/platform.js:75 |
| maturityChips() | assets/js/pages/platform.js:96 |
| capabilityCard() | assets/js/pages/platform.js:101 |
| byOrder() | assets/js/pages/platform.js:110 |
| groupByArea() | assets/js/pages/platform.js:114 |
| sectionHeading() | assets/js/pages/platform.js:126 |
| pageHtml() | assets/js/pages/platform.js:134 |
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
| fillPicker() | assets/js/pages/reference.js:191 |
| wireContent() | assets/js/pages/reference.js:220 |
| esc() | assets/js/pages/roadmap-detail.js:33 |
| day() | assets/js/pages/roadmap-detail.js:34 |
| dateRange() | assets/js/pages/roadmap-detail.js:35 |
| byPhase() | assets/js/pages/roadmap-detail.js:40 |
| sprintRange() | assets/js/pages/roadmap-detail.js:44 |
| clean() | assets/js/pages/roadmap-detail.js:51 |
| attrs() | assets/js/pages/roadmap-detail.js:63 |
| bandText() | assets/js/pages/roadmap-detail.js:64 |
| row() | assets/js/pages/roadmap-detail.js:72 |
| note() | assets/js/pages/roadmap-detail.js:75 |
| phasesHtml() | assets/js/pages/roadmap-detail.js:80 |
| drawerHtml() | assets/js/pages/roadmap-detail.js:94 |
| toKpiItem() | assets/js/pages/roadmap-detail.js:136 |
| toKpiRoadmap() | assets/js/pages/roadmap-detail.js:177 |
| presentationLabel() | assets/js/pages/roadmap-views.js:46 |
| hzIdx() | assets/js/pages/roadmap-views.js:49 |
| colStart() | assets/js/pages/roadmap-views.js:53 |
| colEnd() | assets/js/pages/roadmap-views.js:58 |
| isParked() | assets/js/pages/roadmap-views.js:64 |
| isActive() | assets/js/pages/roadmap-views.js:65 |
| productItems() | assets/js/pages/roadmap-views.js:67 |
| byOrder() | assets/js/pages/roadmap-views.js:70 |
| context() | assets/js/pages/roadmap-views.js:74 |
| themeIdOf() | assets/js/pages/roadmap-views.js:87 |
| groupBy() | assets/js/pages/roadmap-views.js:89 |
| catClass() | assets/js/pages/roadmap-views.js:94 |
| progressOf() | assets/js/pages/roadmap-views.js:103 |
| themeLabel() | assets/js/pages/roadmap-views.js:115 |
| bandLabel() | assets/js/pages/roadmap-views.js:119 |
| endBandLabel() | assets/js/pages/roadmap-views.js:120 |
| freshnessHtml() | assets/js/pages/roadmap-views.js:122 |
| emptyNotice() | assets/js/pages/roadmap-views.js:127 |
| timelineOrder() | assets/js/pages/roadmap-views.js:136 |
| timelineGrid() | assets/js/pages/roadmap-views.js:144 |
| placeItem() | assets/js/pages/roadmap-views.js:168 |
| themeLane() | assets/js/pages/roadmap-views.js:176 |
| execLive() | assets/js/pages/roadmap-views.js:193 |
| execItemRow() | assets/js/pages/roadmap-views.js:203 |
| execThemeBlock() | assets/js/pages/roadmap-views.js:214 |
| execDetail() | assets/js/pages/roadmap-views.js:226 |
| block() | assets/js/pages/roadmap-views.js:228 |
| execLanes() | assets/js/pages/roadmap-views.js:242 |
| teamList() | assets/js/pages/roadmap-views.js:252 |
| timeline() | assets/js/pages/roadmap-views.js:256 |
| itemCard() | assets/js/pages/roadmap-views.js:280 |
| themeBlock() | assets/js/pages/roadmap-views.js:295 |
| themeBlocks() | assets/js/pages/roadmap-views.js:305 |
| bandHead() | assets/js/pages/roadmap-views.js:312 |
| bandsCascade() | assets/js/pages/roadmap-views.js:320 |
| cascade() | assets/js/pages/roadmap-views.js:343 |
| find() | assets/js/pages/roadmap.js:41 |
| readState() | assets/js/pages/roadmap.js:44 |
| stored() | assets/js/pages/roadmap.js:49 |
| hashFor() | assets/js/pages/roadmap.js:54 |
| readDelivered() | assets/js/pages/roadmap.js:58 |
| readExpanded() | assets/js/pages/roadmap.js:66 |
| render() | assets/js/pages/roadmap.js:71 |
| renderDelivered() | assets/js/pages/roadmap.js:78 |
| renderExpanded() | assets/js/pages/roadmap.js:83 |
| download() | assets/js/pages/roadmap.js:89 |
| safeName() | assets/js/pages/roadmap.js:100 |
| tabs() | assets/js/pages/roadmap.js:105 |
| renderControls() | assets/js/pages/roadmap.js:114 |
| set() | assets/js/pages/roadmap.js:125 |
| openDrawer() | assets/js/pages/roadmap.js:181 |
| closeDrawer() | assets/js/pages/roadmap.js:195 |
| notice() | assets/js/pages/users.js:15 |
| roleBadge() | assets/js/pages/users.js:24 |
| roleCell() | assets/js/pages/users.js:30 |
| toggleCell() | assets/js/pages/users.js:46 |
| render() | assets/js/pages/users.js:57 |
| load() | assets/js/pages/users.js:89 |
| saveToggle() | assets/js/pages/users.js:123 |
| saveRole() | assets/js/pages/users.js:142 |
| firstLineMatching() | scripts/gen-codemap.js:22 |
| purposeOf() | scripts/gen-codemap.js:30 |
| symbolsOf() | scripts/gen-codemap.js:41 |
| cdnPages() | tests/checks/perf.test.js:17 |
| sqlWithoutComments() | tests/checks/perf.test.js:22 |
| jwtRole() | tests/checks/security.test.js:27 |
| htmlPages() | tests/checks/structure.test.js:14 |
| protectedPages() | tests/checks/structure.test.js:17 |
| scriptSrcs() | tests/checks/structure.test.js:20 |
| trackedFiles() | tests/lib/repo.js:13 |
| read() | tests/lib/repo.js:19 |
| isTextFile() | tests/lib/repo.js:23 |
| lineOf() | tests/lib/repo.js:28 |
| loadView() | tests/unit/platform-render.test.js:15 |
| sampleData() | tests/unit/platform-render.test.js:31 |
| loadApp() | tests/unit/reference-render.test.js:13 |
| loadApp() | tests/unit/registry.test.js:12 |
| load() | tests/unit/roadmap-detail.test.js:13 |
| sample() | tests/unit/roadmap-detail.test.js:31 |
| ctxOf() | tests/unit/roadmap-detail.test.js:57 |
| plain() | tests/unit/roadmap-detail.test.js:58 |
| loadView() | tests/unit/roadmap-views.test.js:19 |
| count() | tests/unit/roadmap-views.test.js:32 |
| sampleData() | tests/unit/roadmap-views.test.js:36 |
| loadSprints() | tests/unit/sprints.test.js:13 |
| loadApp() | tests/unit/ui.test.js:13 |

## Conventions for agents

- Read this map, docs/SESSIONS.md (latest checkpoint) and CLAUDE.md before anything else.
- Jump to symbols with the file:line references above; read targeted ranges, not whole files.
- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.
