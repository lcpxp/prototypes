# 90 - Refactor, optimise and re-navigate

The ninth workstream, opened 2026-08-27. The eight before it built the
system; this one makes it maintainable by the sessions that come after.

## Why

Five measured facts, not impressions:

1. **Three files were frozen at their cap.** `supabase/policies.sql` at
   500 of 500 with an exception note reading "Exit plan: none" - the next
   RLS policy would fail the build. `roadmap-detail.js` had 2 lines of
   headroom, `roadmap.js` had 9.
2. **Dead code the suite enforced.** The inline theme guard on all 24
   pages read `localStorage.getItem("theme")`; `theme.js` writes
   `"lpio-theme"`. Both arrived in `f294629` and `git log -S'setItem("theme"'`
   returns nothing - no version ever wrote the bare key.
3. **The size budget stopped constraining anything** - 41 exceptions over
   39 over-soft files, each with an exit plan nobody took.
4. **The navigation aids misled.** `docs/CODEMAP.md` was 966 lines, 624 of
   them private helpers (ten `esc()`, six `el()`, six `day()`) against 21
   `App.*` entries. `App.refRender` lived in `reference-render.js`; two
   shared surfaces were called `App._rmd` and `App._rmv`.
5. **`assets/js/pages/` was 50 files in one directory**, the roadmap
   family alone being 10 of them.

## The rule this work runs on

Nothing here changes what a user sees. Where a change would be visible it
is raised as a question and NOT taken (see Open questions).

## Baseline, captured 2026-08-27 before any change

    npm test                 545 pass / 0 fail
    npm run audit            over soft 0, policies 106, migrations 54, in step
    knowledge ceilings       unchanged throughout: this work writes no rows

Browser baseline, all 24 pages rendered against fixture data in Chromium:

    pages swept              24, zero page errors, zero bad assets
    board states             8 (4 levels x 2 layouts), screenshot each
    golden exports           roadmap-export.csv 3,692 B
                             roadmap-kpi-export.json 8,591 B
                             drawer innerText 407 chars
    persisted preferences    6 keys, identical after reload

### Per-page asset weight (local CSS+JS)

| Page | Reqs | CSS | Bytes | Gzip |
|---|---:|---:|---:|---:|
| modules/roadmap/index.html | 35 | 11 | 317,177 | 87,578 |
| modules/app-review/wave.html | 24 | 8 | 197,065 | 53,658 |
| modules/prototypes/daopay/application.html | 23 | 9 | 199,507 | 52,754 |
| modules/prototypes/daopay/applications.html | 22 | 9 | 182,038 | 48,717 |
| modules/platform/index.html | 21 | 7 | 174,858 | 48,653 |
| modules/portal-review/wave.html | 21 | 7 | 171,321 | 47,231 |
| modules/portal-review/index.html | 21 | 7 | 171,285 | 47,175 |
| modules/portal-review/triage.html | 21 | 7 | 170,346 | 47,081 |
| modules/backlog/index.html | 21 | 7 | 168,550 | 47,209 |
| modules/prototypes/pci/demo.html | 20 | 8 | 181,023 | 47,769 |
| dashboard.html | 20 | 8 | 162,799 | 44,791 |
| modules/prototypes/ideas.html | 20 | 7 | 153,731 | 42,904 |
| modules/app-review/index.html | 19 | 7 | 160,582 | 43,905 |
| modules/reference/index.html | 19 | 6 | 159,049 | 43,751 |
| modules/prototypes/pci/reports.html | 19 | 8 | 158,437 | 42,302 |
| modules/prototypes/index.html | 18 | 7 | 143,966 | 39,929 |
| modules/integrations/index.html | 17 | 6 | 140,403 | 39,253 |
| modules/users/index.html | 17 | 6 | 143,170 | 40,177 |
| modules/prototypes/daopay/index.html | 17 | 7 | 135,915 | 37,557 |
| modules/prototypes/pci/index.html | 17 | 7 | 135,915 | 37,557 |
| modules/prototypes/pci/dashboard.html | 17 | 8 | 149,642 | 39,700 |
| modules/prototypes/gdpr/index.html | 15 | 6 | 129,575 | 36,045 |
| modules/prototypes/website-screening/index.html | 15 | 6 | 129,575 | 36,045 |
| index.html (login) | 9 | 6 | 58,732 | 15,525 |

The roadmap page is the outlier on every axis and the only page over 250KB.

### Core include matrix, measured

Universal on all 23 protected pages (9): `supabase.js` `registry.js`
`guard.js` `ui.js` `search.js` `tools.js` `send-tool.js`
`daopay-admin-tool.js` `theme.js`.
Per page (5): `detail.js` (10 pages), `blocks.js` (6), `links.js` (2:
platform, roadmap), `drawer.js` (1: app-review/wave), `sprints.js` (1:
roadmap).
Login only: `auth.js`, plus `supabase.js` and `theme.js`; no `guard.js`.

CLAUDE.md named 7 of the 14, `docs/ARCHITECTURE.md` named 7, and
`structure.test.js` enforced 5. None mentioned `links.js`, `detail.js`,
`blocks.js`, `drawer.js`, `sprints.js` or `send-tool.js`.

## Three suspected defects that were NOT defects

Recorded because acting on any of them would have broken something, and
because the next session will suspect the same three.

**Error handling.** `npm run audit` reported `.then / .catch = 35 / 4`,
which reads like 31 unhandled rejections. It is not: the Supabase client
resolves with `{data, error}` rather than rejecting, and `tools.js:197`
and `links.js:101` fold an error into an empty result inside the handler.
The one path that genuinely throws (`work-items-data.js`, 7 sites) has all
four of its callers on the two-argument `.then(ok, err)` form -
`lazy-detail.js:95`, `roadmap-export.js:73`, `backlog-export.js:74`, and
`roadmap.js:355` via `App.lazyDetail`. The metric was wrong, not the code.

**Design tokens.** 26 of 170 tokens have no `var(--x)` reference in any
stylesheet, and none of them is dead. `triage_categories.colour_token` is
a DATABASE COLUMN holding a token name; `appreview-render.js:28` builds
`var(--<token>)` from the row at render time. `portal_links.icon` is a
second such channel into `tools.js`'s `ICONS`. Both degrade silently: a
missing token falls through to neutral defaults and the row just goes
grey. Static analysis cannot see either. Prune nothing; gate it instead.

**Broken doc links.** Two documents under `docs/` - a ROADMAP-PROCESS and
a SESSIONS file, both long gone - are still cited but absent. Both citations live in immutable content - two applied
migrations and the closed sessions archive - so "fixing" them would mean
editing an applied migration. The gate excludes those two trees.

## The trap that would have bitten

`tests/checks/render-coverage.test.js` binds **19 of its 44 COVERAGE
entries to a specific source filename**. Moving four constants out of
`roadmap-detail.js` failed it with 17 rows of "allows 'idea' but
… never names it". Every split, rename and move in this workstream must
re-point the matching entries. This is a checklist item, not a surprise.

## Verification method

Chromium plus the globally installed Playwright, driven from the session
scratchpad so the repo gains no dependency. A stub replaces
`window.supabase.createClient` with a fixture-backed chainable client and
a signed-in session, so `guard.js` admits the page and no network is
touched. Per phase: the full suite, `npm run audit`, a 24-page render
sweep asserting zero page errors and zero non-200 local assets, and a
behaviour transcript plus golden export bodies diffed against the
baseline. A phase lands only when the transcript diff is empty, every
comparable screenshot is pixel-identical, and the suite is green.

The sweep's 404 check was itself tested: a deliberately renamed script
made the page report `OK` with 39 App surfaces and 140 nodes - it looked
fine and would have passed the unit suite - while the sweep caught it.

The reference is a git worktree of the pre-refactor commit served beside
the working tree, so every phase compares against the same fixed point
rather than against the previous phase. Two things had to be pinned
before the comparison meant anything, both found by running the harness
twice over IDENTICAL code:

- **The clock is frozen** at 2026-08-27T12:00:00Z. Two prototypes render
  today's date into their tables and the roadmap JSON export stamps
  `generated_at`; a session spanning midnight made proto-pci-reports
  differ by two days and read as a regression. Freezing it also made the
  JSON export byte-comparable, which it was not before.
- **Two screenshots are transient** and differ run to run whatever the
  code does: `prefs-set.png` and `theme-dark.png`, both taken
  mid-interaction. They are skipped loudly, not quietly, and what they
  showed is covered deterministically elsewhere - the preference keys and
  board shape in the transcript, plus `prefs-after-reload.png`, which is
  pixel-stable.

With those two fixed, two runs of identical code produce no unexplained
difference: 34 of 34 comparable screenshots pixel-identical, three
byte-identical goldens, and an identical transcript.

## Phases

- [x] 0 Pin the App surface and per-page includes
- [x] 1 Remove the dead theme guard
- [x] 2 Unfreeze the capped files
- [x] 3 Rebuild the size budget
- [x] 4 Small provable cleanups
- [ ] 5 Structure and naming, one move per file
- [x] 6 Gate the two unwatched contracts (taken before 5, so the link gate protects the moves)
- [ ] 7 One home for every instruction
- [ ] 8 Navigation and performance
- [ ] 9 Close out

## Open questions for the owner

Both remove a nav icon from pages, so neither is taken here. `ui.js:213`
renders the slot only `if (App.daopayAdminTool)`, so dropping the script
removes the icon from that page - confirmed in the browser, where
`#daopay-admin-trigger` and `#send-tool-trigger` both appear in the nav on
the roadmap page.

1. `daopay-admin-tool.js` (7,935 B) is a DaoPay-reviewer console tool
   loaded on all 23 protected pages. Everywhere, or only inside the
   DaoPay prototype?
2. `send-tool.js` (8,257 B), "Acquirer send", same shape, same question.

Together ~16KB uncompressed on every page load.

## Where this plan was wrong

Filled in as it happens; the part a later wave needs.

- Phase 6 was moved BEFORE phase 5. The link gate catches a citation
  broken by a file move, which is exactly what phase 5 does 270 times, so
  building it first turns it from a record of the damage into a guard
  against it.
- Two "new file" traps, the same shape both times: `gen-surface.js` and
  the link gate both read `git ls-files`, so a module that is written but
  not yet `git add`ed is invisible to them. The surface baseline recorded
  nothing for it and passed; the link gate did not scan its own header
  until it was tracked, then flagged itself. Both now say so in a
  comment. Write the file, add it, THEN regenerate.
- Phase 2's documented seams were both wrong. `size-budget.json` proposed
  splitting the details/notes parsers out of `roadmap-detail.js` and the
  page-load fetch out of `roadmap.js`. The better seams were the DOM-free
  value helpers (already half-exposed as `App._rmd`) and the ten
  localStorage keys with eight hand-rolled `try/catch` blocks. An exit
  plan written when a file crosses its cap is a guess; the seam is
  obvious only once something forces you to look again.
