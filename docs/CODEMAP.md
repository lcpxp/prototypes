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
| CLAUDE.md | 175 | CLAUDE.md |
| README.md | 18 | LPio |
| assets/css/base.css | 96 | base.css - Reset, typography and global element styles. |
| assets/css/components.css | 354 | components.css - Reusable interface components: cards, forms, |
| assets/css/layout.css | 126 | layout.css - Navigation, page scaffold and grids. |
| assets/css/login.css | 159 | login.css - Sign-in page only. Loaded after the core layers on |
| assets/css/pages.css | 204 | pages.css - The reference viewer ("swagger") page. Everything |
| assets/css/tokens.css | 151 | tokens.css - Design tokens for the LPio hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/config.example.js | 18 | config.example.js - OPTIONAL local override. |
| assets/js/core/guard.js | 137 | guard.js - Blocks unauthenticated access to protected pages and |
| assets/js/core/registry.js | 129 | registry.js - Single source of truth for the hub's modules, the |
| assets/js/core/supabase.js | 36 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/ui.js | 102 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/backlog.js | 244 | backlog.js - Rolling work items for modules/backlog/. |
| assets/js/pages/dashboard.js | 118 | dashboard.js - Renders module cards, counts and recent activity |
| assets/js/pages/gallery.js | 55 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/integrations.js | 115 | integrations.js - Integration overview for modules/integrations/. |
| assets/js/pages/reference.js | 208 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/roadmap.js | 114 | roadmap.js - Roadmap view for modules/roadmap/. |
| assets/js/pages/users.js | 170 | users.js - User and access management for modules/users/. |
| dashboard.html | 49 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 188 | Architecture |
| docs/DESIGN.md | 95 | Design standards |
| docs/HARNESS.md | 108 | Verification harness and working process |
| docs/ROADMAP.md | 38 | Roadmap |
| docs/SECURITY.md | 80 | Security model |
| docs/SESSIONS.md | 356 | Session log |
| docs/SETUP.md | 53 | Setup and day-to-day use |
| docs/WORKFLOW.md | 94 | Work intake and backlog workflow |
| index.html | 68 | Sign in - LPio / LaunchPad IO |
| modules/backlog/index.html | 76 | Backlog - LPio / LaunchPad IO |
| modules/integrations/index.html | 52 | Integrations - LPio / LaunchPad IO |
| modules/prototypes/index.html | 44 | Prototypes - LPio / LaunchPad IO |
| modules/reference/index.html | 64 | API reference - LPio / LaunchPad IO |
| modules/roadmap/index.html | 45 | Roadmap - LPio / LaunchPad IO |
| modules/users/index.html | 45 | Users - LPio / LaunchPad IO |
| package.json | 12 |  |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| silos/index.html | 58 | Project silos - LPio / LaunchPad IO |
| silos/tooling/index.html | 43 | Tooling silo - LPio / LaunchPad IO |
| supabase/migrations/20260713000000_module_access_and_function_hardening.sql | 93 | ------------------------------------------------------------------ |
| supabase/migrations/20260713100000_api_spec_families.sql | 11 | Group api_specs rows into distinct reference sites. Keys mirror |
| supabase/migrations/20260713110000_integrations.sql | 43 | Integrations overview: one row per third-party service connected |
| supabase/migrations/20260713120000_roadmap.sql | 135 | Roadmap skeleton. Four tables designed so every future roadmap |
| supabase/migrations/20260713130000_work_areas_and_backlog.sql | 187 | Work areas, backlog and intake framework (see docs/WORKFLOW.md). |
| supabase/migrations/20260713140000_performance_rls_and_indexes.sql | 197 | ------------------------------------------------------------------ |
| supabase/migrations/20260713150000_profiles_update_recursion_fix.sql | 28 | The profiles update policy compared role against a subselect on |
| supabase/policies.sql | 234 | ------------------------------------------------------------------ |
| supabase/schema.sql | 446 | ------------------------------------------------------------------ |
| supabase/seed.sql | 298 | ------------------------------------------------------------------ |
| tests/checks/perf.test.js | 75 | tests/checks/perf.test.js - Performance gates. |
| tests/checks/security.test.js | 113 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 33 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 102 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 60 | tests/checks/style.test.js - Design-system gates. |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/size-budget.json | 22 |  |
| tests/unit/registry.test.js | 70 | tests/unit/registry.test.js - Benchmarks for the module registry, |
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
| App.moduleHref | assets/js/core/registry.js:125 |
| App.escape | assets/js/core/ui.js:11 |
| App.methodBadge | assets/js/core/ui.js:21 |
| App.statusBadge | assets/js/core/ui.js:29 |
| App.copyText | assets/js/core/ui.js:34 |
| isCurrentPage() | assets/js/core/ui.js:47 |
| renderNav() | assets/js/core/ui.js:53 |
| fmtDate() | assets/js/pages/backlog.js:22 |
| kvHtml() | assets/js/pages/backlog.js:26 |
| badges() | assets/js/pages/backlog.js:35 |
| openItemModal() | assets/js/pages/backlog.js:41 |
| openDocumentModal() | assets/js/pages/backlog.js:61 |
| filteredItems() | assets/js/pages/backlog.js:76 |
| renderItems() | assets/js/pages/backlog.js:89 |
| renderDocuments() | assets/js/pages/backlog.js:124 |
| fillFilters() | assets/js/pages/backlog.js:158 |
| loadCounts() | assets/js/pages/dashboard.js:13 |
| cardHtml() | assets/js/pages/dashboard.js:25 |
| visibleModules() | assets/js/pages/dashboard.js:41 |
| renderCards() | assets/js/pages/dashboard.js:47 |
| loadRecent() | assets/js/pages/dashboard.js:56 |
| showDeniedNotice() | assets/js/pages/dashboard.js:101 |
| safeUrl() | assets/js/pages/integrations.js:15 |
| modalHtml() | assets/js/pages/integrations.js:19 |
| openModal() | assets/js/pages/integrations.js:47 |
| tableHtml() | assets/js/pages/integrations.js:53 |
| render() | assets/js/pages/reference.js:22 |
| applyFilter() | assets/js/pages/reference.js:70 |
| setAllOpen() | assets/js/pages/reference.js:77 |
| loadSpec() | assets/js/pages/reference.js:83 |
| fillPicker() | assets/js/pages/reference.js:130 |
| itemHtml() | assets/js/pages/roadmap.js:20 |
| horizonHtml() | assets/js/pages/roadmap.js:36 |
| areaHtml() | assets/js/pages/roadmap.js:50 |
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
| loadApp() | tests/unit/registry.test.js:12 |
| loadApp() | tests/unit/ui.test.js:13 |

## Conventions for agents

- Read this map, docs/SESSIONS.md (latest checkpoint) and CLAUDE.md before anything else.
- Jump to symbols with the file:line references above; read targeted ranges, not whole files.
- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.
