# Navigation

**I want to change X - what do I read?**

docs/CODEMAP.md answers *where is it*. This answers *where do I start*,
which is the question a session actually opens with. Read CLAUDE.md
first; it is binding, and it is short.

## The shape, in four sentences

Pages are shells under `modules/`, one folder per registry key. Their
logic is in `assets/js/pages/<module>/`, mirroring it, and a file there
attaches `App.<camelCase(module)>...` so a surface says where it lives.
Everything shared is in `assets/js/core/`, loaded in the order set by
`assets/js/core/includes.json`. All content is in Supabase; this repo
holds structure, styling and rendering only.

## By intent

| I want to... | Start here |
|---|---|
| Change how a page looks | `assets/css/` - the layer stack is tokens, base, layout, components, pages, then the page sheet. Values come from `tokens.css`, never inline. docs/DESIGN.md is binding. |
| Change what a page shows | `assets/js/pages/<module>/`. The entry file is named for its folder; the rest are its parts. |
| Add a page to an existing module | A shell under `modules/<key>/`, scripts in the order from `assets/js/core/includes.json`, `data-root` and `data-module` on `<body>`. |
| Add a whole module | A folder under `modules/`, a directory under `assets/js/pages/`, and an entry in `assets/js/core/registry.js`. Nav and dashboard cards follow from the registry - never hand-edit them. |
| Change something shared by every page | `assets/js/core/`. Adding a core module means an include on 23 pages, so prefer extending `ui.js`. |
| Change the nav, escaping, badges, downloads or stored preferences | `assets/js/core/ui.js` - `App.escape`, `App.store`, `App.download`, `App.csvFromRows`. |
| Work on the roadmap board | `assets/js/pages/roadmap/`: `roadmap.js` wires it, `views*.js` lay it out, `detail*.js` build the drawer, `prefs.js` remembers the view. |
| Work on a review board | `assets/js/pages/app-review/` or `portal-review/`: `model.js` derives, `render.js` draws, `board.js` and `waves.js` wire. |
| Change a table, a column or a policy | `supabase/schema/<domain>.sql` and `supabase/policies.sql`, in the same commit, applied as a migration. Then `npm run snapshot`. |
| Add roadmap work, or review the roadmap | Database only, no repo change. docs/ROADMAP-INTAKE.md then docs/ROADMAP-PLAYBOOK.md; docs/ROADMAP-REVIEW.md for the ritual. |
| Triage a wave of applications | docs/APP-REVIEW.md. Database only. |
| Record work material or platform knowledge from chat | docs/WORKFLOW.md, docs/PLATFORM.md. Database only. |
| Understand why the knowledge model is shaped this way | docs/KNOWLEDGE-MODEL.md. |
| Know what is half-finished right now | docs/STATE.md. It is the resume point and never grows. |

## The rules that are enforced, not advised

Each of these is a gate in `tests/checks/`, so forgetting the prose does
not get past it.

| Rule | Where it lives | What holds it |
|---|---|---|
| The core script order | `assets/js/core/includes.json` | `structure.test.js` |
| File size budgets | `tests/size-budget.json` | `size.test.js` |
| Confidence bands | `docs/ROADMAP-INTAKE.md` | `one-home.test.js` |
| Every App surface and page include | `tests/surface-baseline.json` | `surface.test.js` |
| A colour named by the database has a token | `assets/css/tokens.css` | `db-style-contract.test.js` |
| Internal references resolve | - | `links.test.js` |
| No secret, no hex outside tokens.css, no emoji | - | `security.test.js`, `style.test.js` |

Two of those are worth knowing before you touch anything:
`triage_categories.colour_token` and `portal_links.icon` hold the *name*
of a token and an icon, resolved at render time. Nothing static can see
those references, and both fail silently - a row just goes grey. Do not
prune an "unused" token by grep.

## Verifying

`npm test` is the definition of done. `npm run audit` is the one-screen
health report. `npm run map` regenerates docs/CODEMAP.md and llms.txt;
never hand-edit either. Browser behaviour - auth redirects, live queries
- is verified by hand against the change's own commit.
