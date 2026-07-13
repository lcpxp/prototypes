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
| CLAUDE.md | 169 | CLAUDE.md |
| README.md | 18 | LPio |
| assets/css/base.css | 96 | base.css - Reset, typography and global element styles. |
| assets/css/components.css | 351 | components.css - Reusable interface components: cards, forms, |
| assets/css/layout.css | 126 | layout.css - Navigation, page scaffold and grids. |
| assets/css/login.css | 159 | login.css - Sign-in page only. Loaded after the core layers on |
| assets/css/pages.css | 168 | pages.css - The reference viewer ("swagger") page. Everything |
| assets/css/tokens.css | 151 | tokens.css - Design tokens for the LPio hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/config.example.js | 18 | config.example.js - OPTIONAL local override. |
| assets/js/core/guard.js | 100 | guard.js - Blocks unauthenticated access to protected pages and |
| assets/js/core/registry.js | 118 | registry.js - Single source of truth for the hub's modules, the |
| assets/js/core/supabase.js | 36 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/ui.js | 102 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/dashboard.js | 116 | dashboard.js - Renders module cards, counts and recent activity |
| assets/js/pages/gallery.js | 55 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/integrations.js | 115 | integrations.js - Integration overview for modules/integrations/. |
| assets/js/pages/reference.js | 269 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/roadmap.js | 108 | roadmap.js - Roadmap view for modules/roadmap/. |
| assets/js/pages/users.js | 170 | users.js - User and access management for modules/users/. |
| dashboard.html | 47 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 141 | Architecture |
| docs/DESIGN.md | 95 | Design standards |
| docs/HARNESS.md | 108 | Verification harness and working process |
| docs/ROADMAP.md | 38 | Roadmap |
| docs/SECURITY.md | 79 | Security model |
| docs/SESSIONS.md | 222 | Session log |
| docs/SETUP.md | 53 | Setup and day-to-day use |
| index.html | 66 | Sign in - LPio / LaunchPad IO |
| modules/integrations/index.html | 50 | Integrations - LPio / LaunchPad IO |
| modules/prototypes/index.html | 42 | Prototypes - LPio / LaunchPad IO |
| modules/reference/index.html | 51 | API reference - LPio / LaunchPad IO |
| modules/roadmap/index.html | 43 | Roadmap - LPio / LaunchPad IO |
| modules/users/index.html | 43 | Users - LPio / LaunchPad IO |
| package.json | 12 |  |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| silos/index.html | 56 | Project silos - LPio / LaunchPad IO |
| silos/tooling/index.html | 41 | Tooling silo - LPio / LaunchPad IO |
| supabase/migrations/20260713000000_module_access_and_function_hardening.sql | 93 | ------------------------------------------------------------------ |
| supabase/migrations/20260713100000_api_spec_families.sql | 11 | Group api_specs rows into distinct reference sites. Keys mirror |
| supabase/migrations/20260713110000_integrations.sql | 43 | Integrations overview: one row per third-party service connected |
| supabase/migrations/20260713120000_roadmap.sql | 135 | Roadmap skeleton. Four tables designed so every future roadmap |
| supabase/policies.sql | 250 | ------------------------------------------------------------------ |
| supabase/schema.sql | 265 | ------------------------------------------------------------------ |
| supabase/seed.sql | 192 | ------------------------------------------------------------------ |
| tests/checks/security.test.js | 109 | tests/checks/security.test.js - Security gates. |
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
| App.canAccess | assets/js/core/guard.js:65 |
| App.onAuthed | assets/js/core/guard.js:71 |
| App.moduleHref | assets/js/core/registry.js:114 |
| App.escape | assets/js/core/ui.js:11 |
| App.methodBadge | assets/js/core/ui.js:21 |
| App.statusBadge | assets/js/core/ui.js:29 |
| App.copyText | assets/js/core/ui.js:34 |
| isCurrentPage() | assets/js/core/ui.js:47 |
| renderNav() | assets/js/core/ui.js:53 |
| countRows() | assets/js/pages/dashboard.js:10 |
| cardHtml() | assets/js/pages/dashboard.js:17 |
| visibleModules() | assets/js/pages/dashboard.js:33 |
| renderCards() | assets/js/pages/dashboard.js:39 |
| loadRecent() | assets/js/pages/dashboard.js:54 |
| showDeniedNotice() | assets/js/pages/dashboard.js:99 |
| safeUrl() | assets/js/pages/integrations.js:15 |
| modalHtml() | assets/js/pages/integrations.js:19 |
| openModal() | assets/js/pages/integrations.js:47 |
| tableHtml() | assets/js/pages/integrations.js:53 |
| codeblock() | assets/js/pages/reference.js:19 |
| paramsTable() | assets/js/pages/reference.js:30 |
| endpointBlock() | assets/js/pages/reference.js:49 |
| groupByTag() | assets/js/pages/reference.js:73 |
| render() | assets/js/pages/reference.js:87 |
| endpointsFromOpenApi() | assets/js/pages/reference.js:136 |
| familyOf() | assets/js/pages/reference.js:163 |
| loadSpec() | assets/js/pages/reference.js:170 |
| itemHtml() | assets/js/pages/roadmap.js:20 |
| horizonHtml() | assets/js/pages/roadmap.js:36 |
| areaHtml() | assets/js/pages/roadmap.js:48 |
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
