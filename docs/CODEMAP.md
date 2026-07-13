# Code map

GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.
Purpose: lets an agent locate any file or symbol from this single
document instead of walking the tree or reading whole files.

| File | Lines | Purpose |
|---|---:|---|
| .githooks/pre-commit | 20 |  |
| .gitignore | 20 |  |
| .gitmessage | 12 |  |
| CLAUDE.md | 158 | CLAUDE.md |
| README.md | 18 | LPio |
| assets/css/base.css | 96 | base.css - Reset, typography and global element styles. |
| assets/css/components.css | 286 | components.css - Reusable interface components: cards, forms, |
| assets/css/layout.css | 124 | layout.css - Navigation, page scaffold and grids. |
| assets/css/pages.css | 200 | pages.css - Page-specific styling: the login screen and the |
| assets/css/tokens.css | 149 | tokens.css - Design tokens for the LPio hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/config.example.js | 17 | config.example.js |
| assets/js/core/guard.js | 100 | guard.js - Blocks unauthenticated access to protected pages and |
| assets/js/core/registry.js | 68 | registry.js - Single source of truth for the hub's modules, the |
| assets/js/core/supabase.js | 40 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/ui.js | 102 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/dashboard.js | 116 | dashboard.js - Renders module cards, counts and recent activity |
| assets/js/pages/gallery.js | 55 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/reference.js | 240 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/users.js | 170 | users.js - User and access management for modules/users/. |
| dashboard.html | 47 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 100 | Architecture |
| docs/DESIGN.md | 90 | Design standards |
| docs/HARNESS.md | 108 | Verification harness and working process |
| docs/ROADMAP.md | 33 | Roadmap |
| docs/SECURITY.md | 76 | Security model |
| docs/SESSIONS.md | 92 | Session log |
| docs/SETUP.md | 43 | Setup and day-to-day use |
| index.html | 42 | Sign in - LPio / LaunchPad IO |
| modules/prototypes/index.html | 41 | Prototypes - LPio / LaunchPad IO |
| modules/reference/index.html | 49 | API reference - LPio / LaunchPad IO |
| modules/users/index.html | 43 | Users - LPio / LaunchPad IO |
| package.json | 12 |  |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| silos/index.html | 56 | Project silos - LPio / LaunchPad IO |
| silos/tooling/index.html | 41 | Tooling silo - LPio / LaunchPad IO |
| supabase/policies.sql | 166 | ------------------------------------------------------------------ |
| supabase/schema.sql | 152 | ------------------------------------------------------------------ |
| supabase/seed.sql | 122 | ------------------------------------------------------------------ |
| tests/checks/security.test.js | 74 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 33 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 97 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 60 | tests/checks/style.test.js - Design-system gates. |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/size-budget.json | 22 |  |
| tests/unit/registry.test.js | 55 | tests/unit/registry.test.js - Benchmarks for the module registry, |
| tests/unit/ui.test.js | 60 | tests/unit/ui.test.js - Benchmarks for assets/js/core/ui.js. |

## JavaScript symbol index

| Symbol | Location |
|---|---|
| App.canAccess | assets/js/core/guard.js:65 |
| App.onAuthed | assets/js/core/guard.js:71 |
| App.moduleHref | assets/js/core/registry.js:64 |
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
| codeblock() | assets/js/pages/reference.js:19 |
| paramsTable() | assets/js/pages/reference.js:30 |
| endpointBlock() | assets/js/pages/reference.js:49 |
| groupByTag() | assets/js/pages/reference.js:73 |
| render() | assets/js/pages/reference.js:87 |
| endpointsFromOpenApi() | assets/js/pages/reference.js:136 |
| loadSpec() | assets/js/pages/reference.js:163 |
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
