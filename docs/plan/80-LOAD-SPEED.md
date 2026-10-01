# 80 - Stop loading item detail text on first paint

**Closed 2026-08-16. Folded into this outcome at release 0.1.0
(2026-10-01).** The full working record is in git history before that
release; what is kept here is the design, the measured result, and every
place the plan turned out to be wrong, because that is the part a later
wave needs.

**In one line:** the roadmap and backlog pages downloaded the full prose
of every work item, and every note, on page load, but only ever showed
it in a drawer or modal one item at a time. It now arrives when that
surface opens.

## Outcome, measured 2026-08-16

| | before | after |
| --- | --- | --- |
| `work_items` request | 388,488 | 286,068 (the board view) |
| `work_notes` request | 62,516 | 0, the request is gone |
| the other six requests | 47,071 | 47,071 |
| **data per visit** | **498,075** | **333,139** |
| assets | 298,532 (32 files) | 312,442 (35 files) |
| **first-ever visit** | **803,532** | **652,711** |

**33.1% off every visit's data, 18.8% off a first-ever cold load.** The
25% target was beaten on the repeat visit and missed on the very first
one, because the mechanism adds 13,910 bytes of cacheable assets. That is
the honest way round to state it, rather than picking whichever number
clears the bar. Payloads were measured server-side as PostgREST
serialises them; the compressed figures still want a DevTools run.

## The design

1. **A board view, not a column list in JavaScript.** `work_items_board`
   is `work_items` minus `details`, `security_invoker = on`, granted to
   `authenticated` only. Both pages keep `select("*")` against it, so a
   column added tomorrow still arrives without a fetch line being edited.
   A view freezes its column list at creation, so the snapshot records
   each view's columns and `schema-drift.test.js` fails on an accidental
   omission. A deliberate one is a line in `NARROWING_VIEWS` with its
   reason.
2. **Lazy fetch when the surface opens** (`shared/lazy-detail.js`, wired
   by `shared/work-items-data.js`). The drawer renders at once from what
   is in memory and the heavy fields fill in. Four rules:
   - Loaded is **presence**, not truthiness: an item whose details are
     genuinely empty is loaded, or it re-fetches on every open forever.
   - **No placeholder before 40ms**; most fetches land in 20-60ms and a
     flashed spinner reads as a glitch.
   - A placeholder that appeared **holds 150ms**, or a fetch landing just
     after it flickers.
   - **A superseded open never paints**: the guard is on the open, not
     the item.
3. **Three states for every late region** - waiting, failed, ready - so
   an empty region never reads as "none recorded" for the moment it is
   wrong. The skeleton lives in `assets/css/skeleton.css` and drops to a
   static block under `prefers-reduced-motion`.
4. **The exports fetch what they write.** `loadForExport(rows, keys)`
   hydrates the rows before the pure builders run - presence-guarded,
   batched at 100 ids because a whole board in a PostgREST `in.()` filter
   overflows header buffers, and answering a row RLS withheld with `null`.
   A failed read cancels the download and says so on the control that
   was pressed. The per-item export chains onto the in-flight load.

## Where the plan was wrong

Kept rather than smoothed over.

1. **`details` had three readers, not two.** The backlog CSV builder also
   wrote it, so the backlog export needed the same treatment and test.
2. **`work_notes` was already a column list**, so it needed no view; its
   page-load fetch was dropped entirely, taking a request off the
   critical path rather than narrowing one.
3. **The portal issues 401 call sites, not 405**; an early estimate,
   corrected where it was found.
4. **The regression phase one shipped.** `toKpiItem` writes `notes` for
   every row of the board-wide JSON export. Removing the page-load fetch
   left that export carrying notes only for items whose drawer had been
   opened, and `clean` dropped the empty key, so the file looked complete
   and was not. Two lessons: an audit of one field's readers must cover
   every heavy field, and "nothing on the board reads it" is not "nothing
   but the drawer reads it" - an export is not the board. That is why the
   exports were made safe before `details` came off the page load.

## How to verify a load-speed claim

Record a baseline before changing anything: DevTools, Network, cache
disabled, hard reload. Note the transferred size of each data request,
the total, and DOMContentLoaded and Load. Repeat after the change under
the same conditions, three runs each, take the median, and put both sets
in the commit message. If the saving lands under target, say so plainly
rather than adjusting the claim.
