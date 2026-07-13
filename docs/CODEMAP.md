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
| assets/css/main.css | 586 | main.css - Layout and components. Values come from tokens.css only. |
| assets/css/tokens.css | 81 | tokens.css - Design tokens for the onboarding portal prototype hub. |
| assets/js/core/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/core/config.example.js | 17 | config.example.js |
| assets/js/core/guard.js | 45 | guard.js - Blocks unauthenticated access to protected pages. |
| assets/js/core/supabase.js | 40 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/core/ui.js | 97 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/pages/dashboard.js | 103 | dashboard.js - Renders module cards, counts and recent activity |
| assets/js/pages/gallery.js | 55 | gallery.js - Prototype registry for modules/prototypes/. |
| assets/js/pages/reference.js | 240 | reference.js - The reference viewer ("swagger") for modules/reference/. |
| assets/js/pages/users.js | 58 | users.js - User list for modules/users/, read from the profiles table. |
| dashboard.html | 42 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 94 | Architecture |
| docs/DESIGN.md | 62 | Design standards |
| docs/HARNESS.md | 108 | Verification harness and working process |
| docs/SECURITY.md | 70 | Security model |
| docs/SESSIONS.md | 92 | Session log |
| index.html | 39 | Sign in - LPio / LaunchPad IO |
| modules/prototypes/index.html | 38 | Prototypes - LPio / LaunchPad IO |
| modules/reference/index.html | 46 | API reference - LPio / LaunchPad IO |
| modules/users/index.html | 37 | Users - LPio / LaunchPad IO |
| package.json | 12 |  |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| silos/index.html | 53 | Project silos - LPio / LaunchPad IO |
| silos/tooling/index.html | 38 | Tooling silo - LPio / LaunchPad IO |
| supabase/policies.sql | 121 | ------------------------------------------------------------------ |
| supabase/schema.sql | 131 | ------------------------------------------------------------------ |
| supabase/seed.sql | 122 | ------------------------------------------------------------------ |
| tests/checks/security.test.js | 74 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 33 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 73 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 47 | tests/checks/style.test.js - Design-system gates. |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/size-budget.json | 26 |  |
| tests/unit/ui.test.js | 60 | tests/unit/ui.test.js - Benchmarks for assets/js/core/ui.js. |

## JavaScript symbol index

| Symbol | Location |
|---|---|
| App.onAuthed | assets/js/core/guard.js:30 |
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
| codeblock() | assets/js/pages/reference.js:19 |
| paramsTable() | assets/js/pages/reference.js:30 |
| endpointBlock() | assets/js/pages/reference.js:49 |
| groupByTag() | assets/js/pages/reference.js:73 |
| render() | assets/js/pages/reference.js:87 |
| endpointsFromOpenApi() | assets/js/pages/reference.js:136 |
| loadSpec() | assets/js/pages/reference.js:163 |
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
| loadApp() | tests/unit/ui.test.js:13 |

## Conventions for agents

- Read this map, docs/SESSIONS.md (latest checkpoint) and CLAUDE.md before anything else.
- Jump to symbols with the file:line references above; read targeted ranges, not whole files.
- File size budgets live in tests/size-budget.json; the suite in tests/ is the definition of done.
