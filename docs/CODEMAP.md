# Code map

GENERATED FILE - do not edit by hand. Regenerate with `npm run map`.
Purpose: lets an agent locate any file or symbol from this single
document instead of walking the tree or reading whole files.

| File | Lines | Purpose |
|---|---:|---|
| .githooks/pre-commit | 20 |  |
| .gitignore | 19 |  |
| .gitmessage | 12 |  |
| CLAUDE.md | 148 | CLAUDE.md |
| README.md | 59 | LPio - LaunchPad IO |
| assets/css/main.css | 586 | main.css - Layout and components. Values come from tokens.css only. |
| assets/css/tokens.css | 81 | tokens.css - Design tokens for the onboarding portal prototype hub. |
| assets/js/auth.js | 54 | auth.js - Login page logic for index.html. |
| assets/js/config.example.js | 17 | config.example.js |
| assets/js/dashboard.js | 74 | dashboard.js - Loads counts and recent activity for dashboard.html. |
| assets/js/gallery.js | 55 | gallery.js - Prototype registry for prototypes/index.html. |
| assets/js/guard.js | 45 | guard.js - Blocks unauthenticated access to protected pages. |
| assets/js/reference.js | 240 | reference.js - The reference viewer ("swagger") for reference.html. |
| assets/js/supabase.js | 40 | supabase.js - Initialises the Supabase client as App.db. |
| assets/js/ui.js | 93 | ui.js - Shared UI: top navigation, HTML escaping, badges, copy. |
| assets/js/users.js | 58 | users.js - User list for users.html, read from the profiles table. |
| dashboard.html | 65 | Dashboard - LPio / LaunchPad IO |
| docs/ARCHITECTURE.md | 86 | Architecture |
| docs/DESIGN.md | 62 | Design standards |
| docs/HARNESS.md | 108 | Verification harness and working process |
| docs/SECURITY.md | 70 | Security model |
| docs/SESSIONS.md | 92 | Session log |
| index.html | 39 | Sign in - LPio / LaunchPad IO |
| package.json | 12 |  |
| prototypes/index.html | 36 | Prototypes - LPio / LaunchPad IO |
| reference.html | 45 | Developer material - LPio / LaunchPad IO |
| scripts/gen-codemap.js | 107 | scripts/gen-codemap.js - Generates docs/CODEMAP.md and llms.txt. |
| setup-harness.sh | 775 | ================================================================== |
| silos/index.html | 52 | Project silos - LPio / LaunchPad IO |
| silos/tooling/index.html | 37 | Tooling silo - LPio / LaunchPad IO |
| supabase/policies.sql | 121 | ------------------------------------------------------------------ |
| supabase/schema.sql | 131 | ------------------------------------------------------------------ |
| supabase/seed.sql | 122 | ------------------------------------------------------------------ |
| tests/checks/security.test.js | 72 | tests/checks/security.test.js - Security gates. |
| tests/checks/size.test.js | 33 | tests/checks/size.test.js - File size budgets. |
| tests/checks/structure.test.js | 72 | tests/checks/structure.test.js - Page structure gates. |
| tests/checks/style.test.js | 47 | tests/checks/style.test.js - Design-system gates. |
| tests/lib/repo.js | 33 | tests/lib/repo.js - Shared helpers for the benchmark suite. |
| tests/size-budget.json | 26 |  |
| tests/unit/ui.test.js | 60 | tests/unit/ui.test.js - Functioning benchmarks for assets/js/ui.js. |
| users.html | 36 | Users - LPio / LaunchPad IO |

## JavaScript symbol index

| Symbol | Location |
|---|---|
| countRows() | assets/js/dashboard.js:8 |
| setStat() | assets/js/dashboard.js:15 |
| loadRecent() | assets/js/dashboard.js:20 |
| App.onAuthed | assets/js/guard.js:30 |
| codeblock() | assets/js/reference.js:19 |
| paramsTable() | assets/js/reference.js:30 |
| endpointBlock() | assets/js/reference.js:49 |
| groupByTag() | assets/js/reference.js:73 |
| render() | assets/js/reference.js:87 |
| endpointsFromOpenApi() | assets/js/reference.js:136 |
| loadSpec() | assets/js/reference.js:163 |
| App.escape | assets/js/ui.js:11 |
| App.methodBadge | assets/js/ui.js:21 |
| App.statusBadge | assets/js/ui.js:29 |
| App.copyText | assets/js/ui.js:34 |
| renderNav() | assets/js/ui.js:45 |
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
