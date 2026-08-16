# 80 - Stop loading item detail text on first paint

The last workstream in the programme, and deliberately the narrowest.

**In one line:** the roadmap and backlog pages download the full prose
of every work item on page load, but only ever show that prose in the
drawer for one item at a time. Move it off the initial load and fetch
it when the drawer opens.

**Target:** 25% faster cold load of `modules/roadmap/index.html`,
measured rather than assumed. The measurement protocol is at the
bottom and is part of the deliverable.

**Scope discipline.** This change and nothing else. No caching layer,
no request bundling, no query consolidation, no migrating the drawer
onto `App.drawer`. Each of those is a separate piece of work, and
mixing any of them in makes this one impossible to measure - which
defeats the point of doing it.

## What is established

Checked against `main` at the time of writing, not recalled.

| where | line | what |
| --- | --- | --- |
| `assets/js/pages/roadmap.js` | 423 | `work_items` fetched with `.select("*")` - 39 columns, 267 rows |
| `assets/js/pages/backlog.js` | 333 | the same `.select("*")`, feeding the modal |
| `assets/js/pages/roadmap.js` | 432 | `work_notes` fetched, 182 rows, including `body` |
| `assets/js/pages/roadmap.js` | 487 | `item.notes` attached to each item |
| `assets/js/pages/roadmap-detail.js` | 255 | `detailsHtml` - the only board-side reader of `details` |
| `assets/js/pages/roadmap-detail.js` | 291 | the only reader of `item.notes` |

`work_items.details` (paragraphs of free text) and `work_notes.body`
are the two heavy columns. No board view touches either:
`roadmap-views.js` and its `-timeline`, `-breakdown`, `-exec` and
`-cascade` siblings render `title` and `summary` only.

`core/search.js` queries `work_notes.body` in its own request and does
not depend on the page-load fetch. It must keep working untouched.

The drawer is `assets/js/pages/roadmap-drawer.js`; `openDrawer(item)`
sets `drawerBody.innerHTML` synchronously from
`App.roadmapDetail.drawerHtml(item, ctx)`.

### Three corrections to the brief this file was written from

Recorded here rather than silently absorbed, because each one changes
the work.

1. **`details` has three readers, not two.** Besides
   `roadmap-detail.js` and `roadmap-detail-export.js`, `backlog.js:187`
   writes `details` into its own CSV export record. That is exactly
   the silently-empty-export failure the brief warns about, so the
   backlog export needs the same treatment and the same test as the
   roadmap one.
2. **`work_notes` is already a column list**, not `select("*")` - see
   `roadmap.js:432`. So it needs no board view. Drop the fetch from
   page load entirely and pull an item's notes beside its details,
   which takes a whole request off the critical path rather than
   merely shrinking it.
3. **The portal issues 401 HTTP call sites, not 405.** 00-PROGRAMME.md
   records 405 from an early estimate; `scripts/extract-calls.js`
   resolves all 401 exactly, and `this.http.<verb>` is the only
   spelling in the codebase. Not load-speed work, but corrected where
   it was found.

## The design

### 1. A board view in Postgres, not a column list in JavaScript

The comment at `roadmap.js:417` defends `select("*")`: a column added
tomorrow reaches the drawer without anyone editing a 39-name list.
That argument is correct and must survive this change. So do not
replace `select("*")` with a hand-written list.

Add a migration creating a view instead:

    create view public.work_items_board
    with (security_invoker = true) as
    select <every column except details>
    from public.work_items;

`security_invoker = true` is mandatory - the same pattern as
`20260722153355_restore_roadmap_current_security_invoker.sql`. Without
it the view runs as its owner and bypasses the RLS on `work_items`,
which would publish the whole table through the anon key. State that
explicitly in `supabase/policies.sql` in the same commit: a view is
not automatically covered by its base table's policies, and
`security_invoker` is the thing that makes it inherit them.

The client keeps `.select("*")`, pointed at the view. The column
decision now lives in SQL beside the schema - which is where a
migration is already being written whenever a column is added.

Register the view in `assets/js/core/registry.js` under `tables`. Per
CLAUDE.md, table names live there and nowhere else.

For notes: drop the page-load fetch altogether and load an item's
notes when its drawer opens. Nothing on the board reads them.

### 2. Lazy fetch on drawer open

`openDrawer(item)` gains a load step:

1. Open and render immediately from what is already in memory -
   title, summary, status, horizon, dates, assignee, links, phases.
   That is most of the drawer, and the user sees it populated at once.
2. If `item.details` has not been loaded, render a placeholder in the
   details region and fire one query: `work_items` →
   `select("details")` → `.eq("id", item.id)` → `.maybeSingle()`,
   plus that item's notes.
3. On return, write the result onto `item` so it is cached in memory,
   then replace the placeholder.
4. Reopening the same item issues no second request. Guard on whether
   the property **has been set**, not on whether it is truthy - an
   item with genuinely empty `details` must not re-fetch every time.

`App.roadmapDetail.drawerHtml` stays the pure builder it is. Give it a
way to render the details region in three states - loading, loaded,
absent - rather than moving markup construction into the drawer file.

### 3. The loading state, which is the part not to skip

An empty details region is indistinguishable from an item that has no
details. It reads as "this item has no write-up", which is worse than
a slow load because it is wrong rather than merely slow.

- **No immediate spinner.** Most fetches land in 20-60ms and a
  flashed-then-vanished spinner is noise. Set a 40ms timer; if the
  fetch resolves first, render straight to content and the placeholder
  never appears.
- **After 40ms, a skeleton, not a spinner** - two or three bars
  roughly the shape of a paragraph, so the drawer keeps its layout and
  nothing jumps when text arrives. Colours come from
  `assets/css/tokens.css`; no new values.
- **Once shown, hold it ~150ms minimum** before swapping in content.
  A fetch resolving at 45ms would otherwise flicker, which reads as a
  glitch.
- **Respect `prefers-reduced-motion`** - drop the shimmer to a static
  muted block.
- **On error, an inline message** in the details region ("Couldn't
  load the detail - try reopening"). Do not blank the drawer, do not
  throw, and do not let a failed detail fetch break the rest of the
  drawer, which is already rendered and correct.
- **Handle fast clicking.** Open A, then B before A returns: A's
  response must not paint into B's drawer. Track the in-flight request
  and discard stale responses.

### 4. The paths that still need the full text

Four routes rely on `details` being in memory, and all four must keep
working:

- **Deep link `?item=<id>`** - a page loaded straight into an open
  drawer. Same lazy path, same loading state.
- **In-drawer navigation** - the `data-item-id` click handler in
  `roadmap-drawer.js` swaps to a related item. Same lazy path.
- **Roadmap export** - `roadmap-detail-export.js` writes `details`
  into its output and `roadmap-export.js` covers the whole board. A
  board-wide export must fetch `details` for the items it is exporting
  at the moment export is pressed, not on page load.
- **Backlog export** - `backlog.js:187`, the correction above. Same
  requirement.

A silently empty `details` in an export file is data loss, so both
export paths need a test, not just a manual check.

### 5. Backlog

`backlog.js` has the same `select("*")` feeding a modal. Identical
treatment: board view for the list, lazy fetch for the modal, same
loading rules.

Leave the `select("*")` calls in `platform.js`, `ideas.js`,
`integrations.js` and the `portalreview-*` / `appreview-*` files
alone. Those tables are small and out of scope.

## Repo rules that bite here

- Schema change means a migration in `supabase/migrations/`, with the
  view's grants and RLS position in `supabase/policies.sql` in the
  same commit.
- Regenerate `supabase/schema-snapshot.json` (`npm run snapshot`) -
  `tests/checks/schema-drift.test.js` reads it and fails otherwise.
- Respect `tests/size-budget.json`. `roadmap-drawer.js` and
  `roadmap-detail.js` are both near their budgets; split rather than
  extend.
- Never hard-code a table or view name outside `registry.js`.

## Tests

Check whether these belong in the existing `tests/checks/perf.test.js`
before adding a file.

- The board query selects no `details` column - a regression guard,
  because the instinct next time someone edits that line is to put
  `*` back on the base table.
- Reopening the same item issues one fetch, not two.
- An item with empty `details` does not re-fetch on every open.
- Both export outputs carry `details` for every exported item.
- A stale response from a superseded drawer open does not paint.

## Baseline, measured 2026-08-14

Step one of the verification below, done before any change. Payload
sizes are exact, measured server-side as the JSON PostgREST would
serialise; asset sizes are from disk.

| Request | Bytes | Note |
| --- | --- | --- |
| `work_items` `select("*")` | 408,238 | 268 rows |
| the same without `details` | 305,282 | **102,956 saved, 25.2% of the request** |
| `work_notes` page-load fetch | 63,098 | 116 rows; removable entirely |
| 32 asset files | 294,726 raw / 99,306 gzipped | |
| page HTML | 6,925 raw / 1,850 gzipped | |

`details` is 46.6% of `work_items` by stored size and 131 of the 268
rows carry any. `work_notes.body` is 73% of the notes payload.

**The honest projection, and it is under target.** Removing both takes
166,054 bytes out of 772,987 uncompressed - **21.5%, not 25%.** The
plan says to report that plainly rather than adjust the claim, so:
this buys about a fifth, and the remaining cold-load time is in the 32
asset requests, which is a different piece of work.

Two caveats on the number, both of which need the browser run rather
than a server-side measurement to settle:

- These are uncompressed bytes. Everything transfers gzipped, and the
  two do not compress alike: `work_items` JSON repeats the same 39
  keys 268 times and compresses hard, while `details` is prose and
  compresses far less. The compressed saving is therefore likely to be
  a **larger** share than 21.5%, not a smaller one - but that is a
  prediction, and the DevTools run is what settles it.
- The figure ignores the other page-load requests (areas, phases,
  documents, links, categories), which shrink the denominator and
  raise the percentage slightly.

So the 25% target is plausible on compressed bytes and not established
on uncompressed ones. Record both when the change lands.

## Landed 2026-08-15: notes off the page load

The first of the two payloads, and the one needing no migration. The
roadmap no longer fetches `work_notes` at all; the drawer fetches one
item's worth when it opens.

**63,098 bytes of 772,987 - 8.2% of the uncompressed cold load**, with
the remaining 102,956 (`details`, 13.3%) still to come behind the
board view. One fewer request on the critical path as well as fewer
bytes: the notes read is gone entirely rather than narrowed.

`assets/js/pages/lazy-detail.js` is the mechanism, and it is the part
worth reusing rather than the wiring. It owns four decisions:

- **Loaded is presence, not truthiness.** An item whose notes are
  genuinely empty is loaded. Guarding on truthiness re-fetches it on
  every open, forever, and nothing ever looks wrong.
- **No placeholder before 40ms.** Most of these land in 20-60ms and a
  spinner that flashes and vanishes reads as a glitch.
- **A placeholder that appeared holds 150ms.** Otherwise a fetch
  resolving just after it went up produces the flicker the delay
  existed to prevent.
- **A superseded open never paints.** Open A, open B before A returns,
  and A's answer is cached onto A but does not touch the surface. The
  guard is on the open, not the item, so reopening the SAME item also
  supersedes.

Eleven benchmarks, timer injected so every one is an assertion rather
than a sleep. Three were verified by breaking the rule they hold.

`notesHtml` renders three states, because an empty section reads as
"none recorded" and that is a lie for the ~50ms it is wrong. The
skeleton drops to a static block under `prefers-reduced-motion`. The
per-item export chains onto the in-flight load, so exporting a drawer
opened a moment ago cannot write a file with the notes missing.

`roadmap.js` hit its hard budget doing this, so it took the exit plan
its own note had been carrying: `roadmap-data.js` now exists and holds
the per-item reads, starting with the note ordering rule.

**Still to do:** the `work_items_board` view and the lazy `details`
fetch. The mechanism is now in place, so that is the migration, the
registry entry, adding `details` to `lazyKeys`, and the backlog modal.

## How to verify the 25%

Record a baseline **before** changing anything. DevTools → Network →
disable cache → hard reload `modules/roadmap/index.html`. Note the
transferred size of the `work_items` request, of the `work_notes`
request, the total transferred, and DOMContentLoaded and Load. Repeat
after the change under the same conditions, three runs each, take the
median. Both sets of numbers go in the commit message.

If the saving lands materially under 25%, say so plainly rather than
adjusting the claim. It would mean `details` is smaller than estimated
and the remaining cold-load time is in the 32 asset requests instead -
a different piece of work. "This bought 12%, here is where the rest
is" is a better outcome than a number massaged to fit the brief.

## Definition of done

- Cold load transfers measurably less, with before and after recorded.
- The drawer opens instantly, populated, in every case.
- Detail text arrives without flicker, without an empty-looking gap,
  and without a spinner on fast fetches.
- Deep links, in-drawer navigation and both export paths unchanged in
  output.
- `npm test` green; one commit, or a short series each green on its
  own, with nothing unrelated in it.
