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
| CLAUDE.md | 180 | CLAUDE.md |
| README.md | 18 | LPio |
| assets/css/base.css | 98 | base.css - Reset, typography and global element styles. |
| assets/css/components.css | 426 | components.css - Reusable interface components: cards, forms, |
| assets/css/layout.css | 183 | layout.css - Navigation, page scaffold and grids. |
| assets/css/login.css | 163 | login.css - Sign-in page only. Loaded after the core layers on |
| assets/css/pages.css | 256 | pages.css - The reference viewer ("swagger") page. Everything |
| assets/css/roadmap.css | 274 | roadmap.css - The roadmap board (modules/roadmap/). A page sheet, |
| assets/css/tokens.css | 293 | tokens.css - Design tokens for the LPio hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/config.example.js | 18 | config.example.js - OPTIONAL local override. |
| assets/js/core/guard.js | 137 | guard.js - Blocks unauthenticated access to protected pages and |
| assets/js/core/registry.js | 141 | registry.js - Single source of truth for the hub's modules, the |
| assets/js/core/supabase.js | 36 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/theme.js | 79 | theme.js - Light/dark theme control. |
| assets/js/core/ui.js | 123 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/backlog.js | 244 | backlog.js - Rolling work items for modules/backlog/. |
| assets/js/pages/dashboard.js | 119 | dashboard.js - Renders module cards, counts and recent activity |
| assets/js/pages/gallery.js | 55 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/integrations.js | 115 | integrations.js - Integration overview for modules/integrations/. |
| assets/js/pages/platform.js | 201 | platform.js - The platform product-knowledge viewer for |
| assets/js/pages/reference-render.js | 287 | reference-render.js - Pure HTML builders for the reference viewer. |
| assets/js/pages/reference-topics.js | 112 | reference-topics.js - Pure HTML builders for api_topics rows: the |
| assets/js/pages/reference.js | 296 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/roadmap.js | 224 | roadmap.js - The roadmap board for modules/roadmap/. |
| assets/js/pages/users.js | 170 | users.js - User and access management for modules/users/. |
| dashboard.html | 58 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 229 | Architecture |
| docs/DESIGN.md | 140 | Design standards |
| docs/HARNESS.md | 108 | Verification harness and working process |
| docs/PLATFORM.md | 93 | Platform product-knowledge protocol |
| docs/ROADMAP.md | 104 | Roadmap |
| docs/SECURITY.md | 80 | Security model |
| docs/SESSIONS.md | 641 | Session log |
| docs/SETUP.md | 54 | Setup and day-to-day use |
| docs/WORKFLOW.md | 95 | Work intake and backlog workflow |
| index.html | 77 | Sign in - LPio / LaunchPad IO |
| modules/backlog/index.html | 117 | Backlog - LPio / LaunchPad IO |
| modules/integrations/index.html | 93 | Integrations - LPio / LaunchPad IO |
| modules/platform/index.html | 87 | Platform - LPio / LaunchPad IO |
| modules/prototypes/index.html | 85 | Prototypes - LPio / LaunchPad IO |
| modules/reference/index.html | 106 | API reference - LPio / LaunchPad IO |
| modules/roadmap/index.html | 104 | Roadmap - LPio / LaunchPad IO |
| modules/users/index.html | 86 | Users - LPio / LaunchPad IO |
| package.json | 12 |  |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| silos/index.html | 67 | Project silos - LPio / LaunchPad IO |
| silos/tooling/index.html | 84 | Tooling silo - LPio / LaunchPad IO |
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
| supabase/policies.sql | 243 | ------------------------------------------------------------------ |
| supabase/schema/00_core.sql | 79 | ------------------------------------------------------------------ |
| supabase/schema/10_reference.sql | 145 | ------------------------------------------------------------------ |
| supabase/schema/20_portal.sql | 57 | ------------------------------------------------------------------ |
| supabase/schema/30_work.sql | 260 | ------------------------------------------------------------------ |
| supabase/schema/40_platform.sql | 63 | ------------------------------------------------------------------ |
| supabase/schema/90_dashboard.sql | 32 | ------------------------------------------------------------------ |
| supabase/seed.sql | 426 | ------------------------------------------------------------------ |
| tests/checks/perf.test.js | 77 | tests/checks/perf.test.js - Performance gates. |
| tests/checks/security.test.js | 116 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 33 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 102 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 60 | tests/checks/style.test.js - Design-system gates. |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/size-budget.json | 22 |  |
| tests/unit/platform-render.test.js | 127 | tests/unit/platform-render.test.js - Benchmarks for the platform |
| tests/unit/reference-render.test.js | 212 | tests/unit/reference-render.test.js - Benchmarks for the reference |
| tests/unit/registry.test.js | 70 | tests/unit/registry.test.js - Benchmarks for the module registry, |
| tests/unit/roadmap-render.test.js | 112 | tests/unit/roadmap-render.test.js - Benchmarks for the roadmap |
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
| App.moduleHref | assets/js/core/registry.js:137 |
| stored() | assets/js/core/theme.js:25 |
| systemTheme() | assets/js/core/theme.js:34 |
| current() | assets/js/core/theme.js:38 |
| apply() | assets/js/core/theme.js:42 |
| App.escape | assets/js/core/ui.js:11 |
| App.methodBadge | assets/js/core/ui.js:21 |
| App.statusBadge | assets/js/core/ui.js:29 |
| App.copyText | assets/js/core/ui.js:34 |
| isCurrentPage() | assets/js/core/ui.js:47 |
| renderNav() | assets/js/core/ui.js:53 |
| App.onThemeChange | assets/js/core/ui.js:103 |
| fmtDate() | assets/js/pages/backlog.js:22 |
| kvHtml() | assets/js/pages/backlog.js:26 |
| badges() | assets/js/pages/backlog.js:35 |
| openItemModal() | assets/js/pages/backlog.js:41 |
| openDocumentModal() | assets/js/pages/backlog.js:61 |
| filteredItems() | assets/js/pages/backlog.js:76 |
| renderItems() | assets/js/pages/backlog.js:89 |
| renderDocuments() | assets/js/pages/backlog.js:124 |
| fillFilters() | assets/js/pages/backlog.js:158 |
| loadCounts() | assets/js/pages/dashboard.js:14 |
| cardHtml() | assets/js/pages/dashboard.js:26 |
| visibleModules() | assets/js/pages/dashboard.js:42 |
| renderCards() | assets/js/pages/dashboard.js:48 |
| loadRecent() | assets/js/pages/dashboard.js:57 |
| showDeniedNotice() | assets/js/pages/dashboard.js:102 |
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
| zoneOf() | assets/js/pages/roadmap.js:33 |
| cascade() | assets/js/pages/roadmap.js:41 |
| catClass() | assets/js/pages/roadmap.js:54 |
| scopeItems() | assets/js/pages/roadmap.js:59 |
| byOrder() | assets/js/pages/roadmap.js:64 |
| tileHtml() | assets/js/pages/roadmap.js:68 |
| rowHtml() | assets/js/pages/roadmap.js:79 |
| legendHtml() | assets/js/pages/roadmap.js:105 |
| boardHtml() | assets/js/pages/roadmap.js:119 |
| draw() | assets/js/pages/roadmap.js:178 |
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
| loadView() | tests/unit/roadmap-render.test.js:14 |
| sampleData() | tests/unit/roadmap-render.test.js:31 |
| loadApp() | tests/unit/ui.test.js:13 |

## Conventions for agents

- Read this map, docs/SESSIONS.md (latest checkpoint) and CLAUDE.md before anything else.
- Jump to symbols with the file:line references above; read targeted ranges, not whole files.
- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.
