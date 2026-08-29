# Nothing buried, anywhere in the portal

The system stores more than it shows. This workstream makes "everything
recorded against a thing is visible when you open that thing" a
property of the code rather than a promise, and does it in a layout
that stays readable as the amount recorded grows.

The rule, stated once: **a value that is stored and not rendered is a
defect.** Not a backlog item - a defect, caught by a test.

## What is buried today

Each of these was found in the current code and data, not supposed.

**The link renderers understood two shapes out of forty-nine.**
FIXED 2026-08-13. `roadmap.js` fetched `knowledge_links` without
`from_type` or `to_type` and resolved the far end through a work-items
map; `platform.js` resolved capability→capability only. Seven entity
types give 49 ordered pairs and two rendered, which hid four live
links and, more to the point, was why the graph had stopped growing -
there is no point writing a link nobody can see. `App.links`
(assets/js/core/links.js) now indexes any pair under both ends,
fetches titles by id one query per type present, and renders a target
with a page as a link, one without a page as its name and type, and
one that cannot be read as its type alone. Never as silence.

**Unknown block kinds were silently dropped.** FIXED 2026-08-13.
`blockHtml` existed twice - `platform.js` and `reference-topics.js` -
both implementing p, note, code, table, kv and values, and both
skipping anything else. Skipping was a deliberate forward-compatibility
choice so content could lead the code; the cost was that a new kind
shipped to the database and showed nothing, with no error and no
trace. `assets/js/core/blocks.js` is now the single renderer, and an
unrecognised kind renders its own keys as a definition list in a muted
"provisional" treatment. Content still leads the code; it just lands
visibly, and the muted treatment is the prompt to write a real
renderer. Deleting the two copies took platform.js back under its soft
line budget.

**Twenty notes are anchored to nothing** and appear on no page. Forty-
six more are anchored to a document; the backlog page reads documents
but renders no notes against them.

**Dead surfaces sit beside live ones.** `roadmap_milestones` has zero
rows and `work_items.milestone_id` was never rendered in the drawer at
all - FIXED 2026-08-13, once the table was kept rather than dropped.
`work_item_phases` has zero rows and gets a whole drawer section.
`work_item_dependencies` is described in docs/ARCHITECTURE.md and does
not exist.

**Global search covers six sources** - prototypes, endpoints, work
items, capabilities, profiles, integrations. It does not cover work
notes (now 180), work documents (17), domain terms (34), journey
stages (13), API topics (22), specs, prototype ideas or review
findings. The richest narrative content in the system is unfindable
from the nav. FIXED 2026-08-13; see "Global search, completed" below.
Portal links were considered and left out: a tool link is a nav icon
with an external target, not content, and putting internal URLs in a
result list is a different decision from making them clickable.

## The completeness contract

Three mechanisms, in order of how much they buy.

### 1. A shared detail panel with a known-fields map and an overflow - LANDED

`assets/js/pages/roadmap/detail.js` already has the right idea in one
place: `KNOWN_ATTRS` names the attribute keys the drawer renders by
hand, and `extraAttrRows` renders *everything else in the bag* as a
generic fact row, so a new or legacy key is never stored-but-invisible.
That pattern becomes the contract, generalised from one jsonb column
to every entity in the portal.

New shared module `assets/js/core/detail.js`, providing:

    App.detail.panel(spec)      the five-zone panel, below
    App.detail.facts(row, map)  ordered known fields, then overflow
    App.detail.links(type, id)  entity-aware typed relationships
    App.detail.related(type,id) everything that points AT this row
    App.detail.provenance(row)  source document, grade, verified state

`App.detail.facts` takes the row and an ordered field map. It renders
the mapped fields with their labels and formatters, then walks every
remaining key on the row and renders it generically - label from the
key, arrays joined, nested objects shown as their own pairs rather
than as `[object Object]`, booleans as Yes and No because `false` is a
fact and not an absence. An explicit `hidden` list covers the
genuinely internal (`id`, `sort_order`, a key already rendered as its
resolved title). Everything not mapped and not hidden **appears**,
under a heading that says what it is: "Also recorded against this".

Landed 2026-08-13 with thirteen benchmarks, the first of which is the
ask itself: give the builder a key no spec has ever heard of and
require it in the output. The first adopter is the integrations detail
modal, which listed five columns by hand - so a column added to that
table was fetched and then silently dropped. It now fetches the whole
row, because a page that renders everything it fetches has no reason
to fetch less. A gate holds the adoption, and removing the overflow
branch fails five benchmarks.

The roadmap drawer followed on the same day - the surface the ask names
directly. It keeps its own row layout (a bordered two-column grid per
row), which it could not have done if adopting the contract meant
adopting `.detail-facts`; so the builder took a `markup` skin, and two
further options the drawer needed and every later adopter will:
`also`, naming the further columns one row already speaks for (Dates
renders `starts_on` AND `ends_on`, so `ends_on` must not also appear
in the overflow), and `multi`, for a field that emits zero or many
rows rather than one, which is what typed links are. Its 36 fact rows
are now a declared field list, and a column added to `work_items`
tomorrow renders with no edit to `roadmap-detail.js`.

The remaining four followed the same day, and each turned up a column
that was genuinely buried rather than only theoretically at risk:

- **Platform card.** `tags` was neither fetched nor shown. The fetch
  named eleven columns; it is now `select("*")`, because a card that
  renders everything it is handed has no reason to be handed less.
- **Backlog.** Two hand-written pair lists, sixteen labels and six.
  `work_documents.supersedes_id` was stored and shown nowhere - a
  replaced document kept its back-link and no reader could see it,
  which is the whole point of never deleting the row. `content` is the
  one column hidden for a reason other than "shown elsewhere": it is
  unbounded pasted material and the page loads every document.
- **Users.** A table, not a panel, so the contract applies to its
  header: named columns lead, then whatever else the rows carry, each
  labelled through `App.detail.labelOf`. The header used to end in a
  hard-coded "Added".
- **Review board drawer.** Nine hand-written pairs against a
  twenty-eight column table. Four columns were fetched (the board
  selects `*`) and rendered nowhere:
  `carried_from_application_id`, `resolved_at`, `created_at`,
  `updated_at`.

Two gates hold the set. `CONTRACT_ADOPTERS` fails if an adopter goes
back to a hand-written list; and every page under `modules/` that
loads an adopting module must load `core/detail.js`, which caught
`app-review/wave.html` - the drawer lives there, not on `index.html`,
so a gate scanning only index pages would have called it clean while
it threw on first render.

The roadmap's own fetch named all 39 `work_items` columns by hand,
which capped the guarantee at whatever that line remembered; it is now
`select("*")` - the same payload today, and a live contract tomorrow.

### 2. One block renderer, unknown kinds render generically - DONE

Landed 2026-08-13 as `assets/js/core/blocks.js`, with both copies
deleted and eleven benchmarks, including one that asserts neither page
keeps a private copy of the vocabulary. `opts.codeblock` lets the
reference viewer pass its richer code treatment; everything else
renders identically on both surfaces.

Still to adopt it: the roadmap drawer (so a work item can carry typed
blocks), the review board and the prototype ideas page. One
vocabulary, one renderer, and the remaining surfaces inherit the
generic fallback for free.

### 3. Gates that keep it true - LANDED

`tests/checks/render-coverage.test.js`, repo-local, no network. It
parses all 36 `check (... in (...))` constraints out of
`supabase/schema/*.sql` and holds three vocabularies:

- **every constraint value has a declared home** - a named renderer
  that must mention each value, or `generic` with the reason it needs
  no per-value branch. A constraint with no entry at all fails, so
  adding a vocabulary forces a decision in the same commit. Checked
  both ways: a new value with no label, and a whole new constraint
  nobody declared;
- **every `link_entity_types` key** is mirrored in
  `registry.linkEntities` with the same table, a label and a title
  column, and every type with a page declares an anchor;
- **`App.blocks.render` has a default branch**, and neither page keeps
  a private copy of the block vocabulary.

Two refinements the writing surfaced. A vocabulary already held by a
stricter benchmark is delegated with `ownedBy` rather than checked
twice, and the delegation is itself asserted. And one genuine hole is
now named rather than assumed fine: `knowledge_links.confidence`
carries the proposed/confirmed distinction through `App.links` and no
page displays it, so a reader cannot tell an assistant's guess from
the owner's decision. The gate caps declared holes at three.

Still to come: the per-column check, which needs the field maps the
shared detail panel introduces.

`tests/unit/detail.test.js` benchmarks the overflow behaviour
directly: given a row with a key no map knows, the panel contains it.
That test is the ask, expressed as an assertion.

## The five-zone panel

Completeness without layout is a data dump. The panel is always the
same five zones in the same order, so a reader learns the shape once
and every entity in the portal reads the same way.

**1. Identity.** Eyebrow (theme, spec, area - what kind of thing this
is), title, one-line status, progress or maturity indicator. Never
scrolls out of reach; on a drawer it is sticky.

**2. Narrative.** Summary, then the parsed detail sections. The
existing `parseDetails` in roadmap-detail.js already turns the
pseudo-labelled `details` blob into titled sections - keep it, and
extend the label list rather than reformatting stored text.

**3. Facts.** The definition list: known fields in a fixed order, then
"Also recorded against this" for the overflow. Two columns on wide
screens, one on narrow. Empty fields are omitted, never rendered
blank.

**4. Structure.** What this thing contains and what it belongs to:
child items, deliverables, endpoints under a tag, capabilities under
an area. Collapsible, open by default when short.

**5. Context.** Everything pointing at it, in one place: typed links
out and in, notes and decisions, source documents, review findings,
and the provenance line. Collapsible, with counts on the summary so a
closed section still says how much is behind it.

Rules that keep it usable as content grows:

- Zones 4 and 5 collapse; 1 to 3 never do.
- A collapsed section always shows its count. "Notes and decisions
  (12)" is information; "Notes and decisions" is a mystery box.
- Ordering inside a zone is stable and stated: active before resolved,
  newest first within each, links grouped by family.
- Long values truncate with the full value in `title`, never with a
  hard cut and no recovery.
- Deep links address zones: `?item=<id>#context` opens the drawer with
  Context expanded and scrolled to.
- Every list item that names another entity is a link to that entity's
  own panel, built through `App.itemHref` - so the graph is walkable,
  not just visible.

## Making links entity-aware - DONE

Landed 2026-08-13 as `assets/js/core/links.js` plus
`App.registry.linkEntities` and `App.linkHref`. `App.links.index`
indexes each link under both ends carrying the type at each;
`App.links.loadTitles` fetches display names by id, one query per
entity type actually present, so a page with no cross-type links
issues no extra request; `App.links.resolve` returns the reading, the
target's name, its type label and an href where one exists.

Both renderers use it, and 30 benchmarks hold it - including one that
indexes all 49 ordered pairs, because two of them rendering was the
whole bug.

Destinations followed on the same day. `term`, `stage` and `area` are
anchored on the platform page and `document` on the backlog page, each
by row id rather than by key or slug - a link carries an id, and an
anchor a link cannot address is not a destination. `linkEntities`
gained an `anchor` per type so `App.linkHref` addresses the row rather
than routing every type through `App.itemHref`, which would have sent
a term to `#capability-<id>`.

`note` is the only type left without a page, by design: a note always
renders inside the thing it is about, so it has no standalone home.
Links to one render as name plus type, flat.

## Per-surface work

| Surface | Change |
|---|---|
| Roadmap drawer | DONE for facts, links and the overflow. Left: typed blocks, inbound references |
| Backlog | DONE for both modals. Left: notes rendered against a document |
| Platform | DONE for links and the capability card. Left: "links to nothing" in the Coverage panel |
| Reference | Adopt `App.blocks`; endpoint panel gains typed links once `endpoint` is a linkable type; show spec-level provenance and coverage |
| Integrations | Detail modal becomes the panel; `detail` jsonb rendered through `App.detail.facts`, so a new key appears without a code change |
| Users | DONE: the register derives its trailing columns. A per-profile panel is not needed - profiles has five columns and the table shows them all |
| App review | DONE for the Record block. Left: align the drawer to the five zones and reuse `App.drawer` |
| Prototypes | Panel for a prototype and for an idea (70-PROTOTYPE-IDEAS.md) |
| Global search | Add every remaining source; see below |

## Global search, completed - DONE 2026-08-13

`assets/js/core/search.js` went from six sources to fourteen: work
notes, work documents, domain terms, journey stages, API topics, API
specs, prototype ideas and review findings all joined the six that
were there. The snippet landed too - a result windows the matched text
rather than showing a first line, because searching 180 notes without
seeing why one matched is close to useless.

Where a row goes turned out to be three cases, not one, and naming
them is what kept it honest:

- **`entity`** - the row's `linkEntities` type, so `App.linkHref`
  builds the address from the same anchor a knowledge link uses. One
  home for "where does a row of this type live", and it means a search
  result and a link in a drawer open the same place.
- **`href`** - a per-row builder, for rows whose destination depends on
  the row rather than its type. A note lives inside whatever it is
  about (work item, then document, then nowhere - twenty are anchored
  to nothing); a finding lives inside its wave; a topic inside its
  spec.
- **neither** - `App.itemHref`, right for anything its module routes by
  id or path.

A benchmark walks every source and fails if any of them produces no
address, because a search that finds something and then lands on a
module index has lost it.

The cost is one request per reachable source per query: fourteen for a
viewer with every grant, up from six. Each is an indexed ilike with a
limit of five, debounced, with stale responses dropped.

## Removals in the same programme

Per CLAUDE.md: superseded schema goes once nothing reads it, and git
is its history.

- **`roadmap_milestones` and `work_item_phases`: LEFT ALONE, decided
  2026-08-13 by the owner.** Both hold zero rows, `milestone_id` is
  never rendered and the drawer's phases section renders nothing when
  empty rather than breaking. Removing them changes nothing a user
  sees and nothing a test checks, so the case for it was tidiness
  rather than need - and a destructive migration wants a better reason
  than that. If phased delivery is ever used, the section already
  works. Do not re-propose this without a concrete problem it solves.
- The `work_item_dependencies` paragraph in docs/ARCHITECTURE.md -
  describes a table that does not exist. `knowledge_links` with kind
  `blocks` is the live mechanism.

Each removal is its own commit with its own changelog line, and each
must show the drift gate green afterwards.

## Done when

- Opening any entity in the portal shows every value stored against
  it, including values no renderer was written for.
- `render-coverage` fails the build when a new column, enum value,
  block kind or entity type has nowhere to render.
- One block renderer, one detail panel, one link resolver, used by
  every page.
- Search reaches every content table.
- No dead columns, no dead sections, and ARCHITECTURE.md describes
  only what exists.
