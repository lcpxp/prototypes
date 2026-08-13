# Nothing buried, anywhere in the portal

The system stores more than it shows. This workstream makes "everything
recorded against a thing is visible when you open that thing" a
property of the code rather than a promise, and does it in a layout
that stays readable as the amount recorded grows.

The rule, stated once: **a value that is stored and not rendered is a
defect.** Not a backlog item - a defect, caught by a test.

## What is buried today

Each of these was found in the current code and data, not supposed.

**The link renderers understand two shapes out of forty-nine.**
`assets/js/pages/roadmap.js` fetches `knowledge_links` selecting
`from_id, to_id, kind, note, confidence` - **without `from_type` or
`to_type`** - and resolves the other end through a work-items map, so
it can only render work_item→work_item.
`assets/js/pages/platform.js` has the mirror limitation: capability→
capability only. Seven entity types are registered, giving 49 ordered
pairs; **two of them render**. Today that hides four links - a term
about a work item, a term superseding a term, a document about an
area, a document about a capability - which sounds small until you
notice it is also the reason the graph has not grown: there is no
point writing a link that cannot be seen.

**Unknown block kinds are silently dropped.** `blockHtml` exists twice
- `platform.js:94` and `reference-topics.js:69` - both implementing
p, note, code, table, kv and values, and both skipping anything else.
Skipping was a deliberate forward-compatibility choice so content
could lead the code. It is exactly the wrong default for this ask: it
means a new block kind ships to the database and shows nothing, with
no error and no trace.

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

### 2. One block renderer, and unknown kinds render generically

Extract `blockHtml` to `assets/js/core/blocks.js`, delete both copies,
and change the fallback: an unrecognised kind renders its `title` (or
its kind name) and its contents as a definition list, in a muted
"unrecognised block" treatment. Content can still lead the code - the
point of the original decision - but it lands visibly, and the muted
treatment is the prompt to write a proper renderer.

Add `App.blocks.render` to the reference viewer, the platform page,
the roadmap drawer (so a work item can carry typed blocks), the review
board and the prototype ideas page. One vocabulary, one renderer, six
surfaces.

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

## Making links entity-aware

The specific fix, since it is small and unblocks the rest.

    App.db.from(App.registry.tables.knowledgeLinks)
      .select("from_type, from_id, to_type, to_id, kind, note, confidence")
      .is("valid_to", null);

Index each link under both ends, carrying the type at each end. A
resolver takes `(type, id)` and returns `{ title, href }` from
whichever map is loaded, and falls back to the type's label plus a
short id when the target is not in the current page's data - "Capability
(not loaded)" as a link is still better than silence, and the href
still works.

`App.registry.linkKinds` already holds the readings; `link_entity_types`
holds the labels. Neither needs a change. `App.itemHref` needs a case
for each entity type - `note`, `term`, `stage` and `document` have no
destination today, which is its own burying problem: add anchors on
the platform and backlog pages so they can be addressed.

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
