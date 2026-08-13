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
rows and `work_items.milestone_id` is never rendered in the drawer at
all. `work_item_phases` has zero rows and gets a whole drawer section.
`work_item_dependencies` is described in docs/ARCHITECTURE.md and does
not exist.

**Global search covers six sources** - prototypes, endpoints, work
items, capabilities, profiles, integrations. It does not cover work
notes (174), work documents (16), domain terms (34), journey stages
(13), API topics (22), specs, future prototypes or portal links. The
richest narrative content in the system is unfindable from the nav.

## The completeness contract

Three mechanisms, in order of how much they buy.

### 1. A shared detail panel with a known-fields map and an overflow

`assets/js/pages/roadmap-detail.js` already has the right idea in one
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
key, value stringified, arrays joined, objects shown as nested pairs.
An explicit `hidden` list covers the genuinely internal (`id`,
`sort_order`, foreign keys already rendered as their resolved title).
Everything not mapped and not hidden **appears**, under a heading that
says what it is: "Also recorded against this".

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

### 3. Gates that keep it true

`tests/checks/render-coverage.test.js`, repo-local, no network:

- parse the `check (... in (...))` constraints out of
  `supabase/schema/*.sql` for every table a page renders, and assert
  each allowed value appears in a renderer's map or in a declared
  exclusion list with a reason. This is the generalisation of the
  existing platform-knowledge test, which was written after three
  capability kinds rendered nowhere for a week;
- assert every `link_entity_types` key has an href builder in
  `App.itemHref` and a label in `App.registry.linkKinds`;
- assert every column in the rendered tables appears in a field map or
  a hidden list - so adding a column forces a decision about it in the
  same commit;
- assert `App.blocks.render` has a default branch.

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
| Roadmap drawer | Adopt `App.detail`; entity-aware links; overflow row; blocks; inbound references; drop the phases section with its table |
| Backlog | Notes against documents; document detail as a panel, not a two-field modal; adopt the same panel |
| Platform | Cross-type links; adopt the panel for a capability; keep the Coverage panel, add "links to nothing" to it |
| Reference | Adopt `App.blocks`; endpoint panel gains typed links once `endpoint` is a linkable type; show spec-level provenance and coverage |
| Integrations | Detail modal becomes the panel; `detail` jsonb rendered through `App.detail.facts`, so a new key appears without a code change |
| Users | Panel for a profile: grants, role, and the module access matrix in one place |
| App review | Already close to this shape; align its drawer to the five zones and reuse `App.drawer` |
| Prototypes | Panel for a prototype and for an idea (70-PROTOTYPE-IDEAS.md) |
| Global search | Add every remaining source; see below |

## Global search, completed

`assets/js/core/search.js` gains sources for work notes, work
documents, domain terms, journey stages, API topics, API specs, future
prototypes and review findings. Each needs a `keys` gate, a display
column, and an `App.itemHref` case. The result grouping already
handles arbitrary sources, so this is additive.

Two refinements worth doing at the same time: show the source group's
label on every result (it already does), and let a result carry a
one-line snippet of the matched text, because searching notes without
seeing why a note matched is close to useless.

## Removals in the same programme

Per CLAUDE.md: superseded schema goes once nothing reads it, and git
is its history.

- `roadmap_milestones`, `work_items.milestone_id` - zero rows, never
  rendered. One migration, plus the schema file and the snapshot.
- `work_item_phases` and the drawer's phases section - zero rows. If
  phased delivery returns, it returns as `work_items` children, which
  is the mechanism that is actually in use.
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
