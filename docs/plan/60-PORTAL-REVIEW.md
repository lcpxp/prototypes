# Portal review, as a feature

**BUILT 2026-08-13.** Schema, area map, pages, protocol and command
all landed. What the build changed is recorded at the end.

The wave 4 review board is the most effective thing in the supplied
material. It ran five waves, recorded 183 findings, and ended
with a production release that came back clean. It is also a
single 1,300-line HTML file with its content compiled into a JavaScript
constant, which means every wave was a rebuild and nothing it learned
is queryable.

This workstream turns the method into a portal feature: a portal
review wave that can be opened, filled from a chat session, walked in
the browser, triaged into roadmap work, and closed - with the residue
archived rather than thrown away.

The sibling is application review. docs/APP-REVIEW.md governs that,
and this feature copies its architecture deliberately: waves as
objects, three concepts never collapsed, revisions written by trigger,
read-only in the browser, every write from a session.

## What the board did that must survive

Read out of the file itself, not remembered.

**A stable map of the thing being reviewed.** Thirty-nine areas in six
parts - "Where you land, as an admin" (8), "The onboarding flow, step
by step" (14), "Configuration" (7), "Integrations and automation" (2),
"Stepping back" (2), "As an agent, and partner teams" (6). Areas 01
and 02 were merged once they turned out to be one screen, so the codes
run to 34 across 33 numbered areas. The map outlived every wave, and
walking it in order stopped the review becoming a list of whatever was
most annoying that day.

**Waves as lenses, not repeats.** Wave 3 was explicitly "a different
lens rather than another sweep: the portal seen as a logged-in agent".
Nothing already raised was re-asked; the same fault seen through the
agent's eyes became evidence on the existing entry, never a new one.

**Coverage made visible.** A rail with a dot per area - hollow for
never walked, one colour per wave walked - a per-part "N of M walked"
line, and an amber badge counting open items per area.

**A walker.** "Next area" stepped through unwalked areas in order,
skipping anything done. Trivial mechanically; it is what made a
thirty-nine-area sweep finishable.

**Four states per finding, treated differently.** Open items lead;
fixed collapse into "verify (N)"; closed into "not proceeding (N)" so
they cannot be raised again; things that worked well into their own
list - and recording those mattered, because a review that records
only faults reads as a worse system than it is.

**Verification as a distinct act.** "Anything answered done is
verified by Luke, not taken on trust." A developer marking something
done moved it to *awaiting verification*, never to closed - the same
shape as `confirmed_at` in application review, for the same reason.

**A raise count**, because "a re-raise is a deliberate signal that the
item still matters".

**A standing brief.** Ten standing asks carried into every wave until
delivered or closed by the owner, plus settled decisions and what has
left the review - one place, always one click away.

**Findings tied to roadmap work.** Each area listed the roadmap items
touching it and each entry its related workstreams; lifted-out
findings stayed visible, marked with where they went.

**Provenance on answers.** Every response carried who gave it.

## What to drop

The board's two export buttons and the whole markdown-document
pipeline. The document was the deliverable when the reader was a
developer outside the system; here the portal *is* the deliverable and
the roadmap is where the output lands.

Also drop the compiled-in content model: `MODEL`, `REVIEW`, `BRIEF`, `PASS2`, `PASS3` and `WAVE` all become rows.

## The schema

Extends `supabase/schema/50_review.sql` rather than starting a new
domain: waves, verification and revisions are the same concepts. Split
the file at the same time - it is at its budget exception already and
the two guard functions are the declared seam.

**`review_waves` gains one column.**

    alter table public.review_waves
      add column kind text not null default 'application'
        check (kind in ('application', 'portal', 'code'));

`portal` is a walkthrough wave; `code` is a wave of findings from a
code-review slice (10-CODE-REVIEW.md). Same table, same lifecycle,
same `carried_from_wave_id`; `review_waves.notes` carries the standing
brief, so no new column.

**`review_areas`** - the durable map, not per-wave.

    id, part text not null, code text not null unique,
    title text not null, note text, sort_order integer,
    retired_at timestamptz, created_at, updated_at

`part` groups; `code` is the human handle ("01", "A3"); `note` is the
area-level caveat the board used for "areas 01 and 02 are the same
screen - merged, so nothing is recorded twice". `retired_at` closes an
area that no longer exists without deleting the findings against it.

**`review_area_passes`** - coverage, one row per area walked per wave:
`wave_id`, `area_id`, `walked_at`, `walked_by`, keyed on the first
two. This is `PASS2`/`PASS3` as data, and the rail's dots and every
"N of M walked" figure derive from it.

**`review_findings`** - the entry.

    id, wave_id, area_id, ref text, title text not null, body text,
    kind        check in ('issue','question','works','note'),
    state       check in ('open','answered','verified','closed'),
    emphasis    check in ('lead','bug','blocker'),
    visibility  check in ('full','roadmap_only','internal'),
    disposition check in ('promoted','merged','archived','parked'),
    standing boolean default false,
    owner_action boolean default false,
    environment text,
    response text, response_by text, responded_at timestamptz,
    verified_at timestamptz, verified_by uuid references profiles,
    verification_note text,
    promoted_work_item_id uuid references work_items on delete set null,
    raised_count integer not null default 1,
    carried_from_finding_id uuid references review_findings,
    blocks jsonb not null default '[]'::jsonb,
    resolution text, resolved_at, deleted_at, created_at, updated_at

Design notes, each earning its column:

- **`state` and `disposition` are different questions**, and
  collapsing them is the mistake application review learned not to
  make. `state` is where the finding stands with the developers,
  `disposition` what the review decided at close; a finding can be
  `closed` and `promoted` at once.
- **`verified_at` is never set by a session.** Same rule as
  `confirmed_at`: a developer says done, the reviewer verifies. The
  strongest position a session may take is `state = 'answered'`.
- **`environment`** exists because the review lost real time to
  environment behaviour read as defects - screening on returned
  contracts, the underwriting email, Pending Merchant Signature. One
  that turns out to be configuration records where, not deleted.
- **`blocks`** is the typed-block bag, rendered by the shared renderer
  from 40-SURFACING.md, so a finding can carry a table, a values list
  or a code snippet without a schema change. This is the answer to
  "no matter what new content is added it will always be shown".
- **`visibility`** replaces the board's `roadmapOnly` and `chatOnly`
  flags: `roadmap_only` is kept out of the developer conversation,
  `internal` is for the call only. **`raised_count`** carries the
  re-raise signal across waves.

**`review_finding_revisions`** - written by trigger on every change to
`state`, `disposition`, `emphasis` or `response`, like
`review_revisions`, so the caller cannot skip it.

**Two new link entity types**, so findings join the graph rather than
growing reference columns of their own:

    insert into link_entity_types (key, table_name, label, sort_order)
    values ('finding', 'review_findings', 'Review finding', 90),
           ('review_area', 'review_areas', 'Review area', 100);

Then the board's `rel` array is `finding → work_item` links of kind
`relates_to`, and the per-area "roadmap items touching this area" line
is `review_area → work_item`. Both were unnavigable title strings in
the old board.

**Policies.** Browser reads only, behind a `portal-review` module
grant. Writes are separate insert/update policies for the service
connection, wrapped in scalar subselects, no `for all`, never
reachable from a browser session. Written out one by one in
`policies.sql` as that file requires. Add the module key to
`assets/js/core/registry.js`, the source of truth for access keys.

## The protocol document

`docs/PORTAL-REVIEW.md`, sibling of docs/APP-REVIEW.md, plus its
`/portal-review` command. It is the one home for:

- what a portal wave is and how it differs from an application wave;
- the lens convention - a wave is a lens, and nothing already raised
  is re-asked;
- the four states, the two dispositions axis, and the verification
  rule;
- the "write it at the moment it is made" rule, quoted from the
  board's own maintainer note: *every ask is written into the record
  at the moment it is made; nothing lives only in the chat; an ask
  made in passing while discussing something else still gets a row*;
- the standing-ask convention;
- the copy-paste SQL for open, add, answer, carry forward, close.

It must not restate the roadmap intake protocol; the promotion pass
cites docs/ROADMAP-INTAKE.md for lookup and confidence bands and
docs/ROADMAP-PLAYBOOK.md for the fields, the same way
docs/ROADMAP-REVIEW.md does. Add it to the `CITERS` list in
`tests/checks/roadmap-intake.test.js` so the one-home gate covers it.

## The session workflow

The ask in the owner's words: spam findings into a chat, have them
land accurately, keep them rolling fresh, then review the lot.

1. **Open a wave.** `/portal-review start "<name>" --lens "<the pass>"`.
   Carries forward standing asks and unresolved findings from the
   previous wave, each with `carried_from_finding_id` and
   `raised_count + 1`.
2. **Walk and dictate.** The owner narrates; the session writes each
   finding as it is made, into the area it belongs to, and stamps the
   pass row. It states back per area what it recorded - the board's
   discipline of a short table for sign-off before writing.
3. **Fold in developer answers.** A response sets `state='answered'`
   with `response_by`. Never `verified`.
4. **Verify.** The owner walks the answered list and says which hold.
   Only then `state='verified'`.
5. **Close and triage.** The promotion pass, below.

Between steps the board is live: the owner refreshes and sees exactly
what the session recorded, which is the check that keeps a fast
dictation honest.

## The promotion pass

The step the old board never had, and the reason findings accumulated
in a document. At close, every finding gets a disposition:

- **`promoted`** - becomes a `work_items` row, `promoted_work_item_id`
  set, linked both ways. Follow docs/ROADMAP-INTAKE.md: search first,
  and prefer adding detail to an existing row over creating a new one
  - the board's own rule was "a finding gets its own row only if Luke
  says so".
- **`merged`** - folded into an existing item as a note; the item is
  linked, no new row.
- **`parked`** - real, not now. Lands at `someday` with a note
  recording the review it came from.
- **`archived`** - an artefact of the review, not future work. Stays
  in the wave, closed, findable, never surfaced again. This is the
  "bury un-needed details" half of the ask, and it is a status with a
  resolution, never a delete.

The triage view lists every finding in the closing wave grouped by
proposed disposition with its area, emphasis and links, so the owner
can walk it in one pass. The session proposes; the owner decides;
nothing is promoted without a yes.

## The pages

`modules/portal-review/`, mirroring `modules/app-review/`:

- **`index.html`** - waves. The standing asks across all waves at the
  top (the board's most valuable panel), then open waves, then closed
  ones with their outcome line.
- **`wave.html`** - the board. Rail with coverage dots and open
  counts, part headings with "N of M walked", the walker, wave filter
  chips, and per-area sections with open findings leading and the
  three collapsed groups beneath. The standing brief in a details
  panel at the top, from `review_waves.notes`.
- **`triage.html`** - the promotion pass, grouped by disposition, with
  a running count of what is promoted, merged, parked and archived.

Behaviour reuses what exists: `App.drawer` for the finding detail,
`App.detail` and `App.blocks` from 40-SURFACING.md, `App.itemHref` for
every link out. Page modules stay under budget by splitting model from
render, as the app-review module already does (`appreview-model.js`,
`appreview-render.js`, `appreview-board.js`).

**Derived, never stored** - the same discipline application review
uses: coverage percentages, open counts per area, the three-way
grouping, the walker's queue, and the raise-count emphasis are all
computed at render time from the rows.

## The triage view is a reading surface

Settled: the board never writes. `triage.html` renders the closing
wave grouped by proposed disposition, with counts, so the owner can
read the whole set in one pass and say what changes; the session
applies it. No buttons that mutate a row, no inline disposition
picker, no "narrow" write policy for one column - see the principle in
00-PROGRAMME.md.

That constraint shapes the view rather than limiting it: because the
page is only ever a rendering of state, it can afford to show
everything at once - every finding, its area, its emphasis, its links,
its raise count, and the disposition proposed for it. An editable
board would trade that density for controls.

## Done when

- A wave can be opened, walked, answered, verified, triaged and closed
  entirely through `/portal-review` plus the browser.
- The area map is data; adding an area is an insert.
- Coverage, counts and grouping are derived at render time.
- Every promoted finding has a work item and a two-way link; every
  archived one has a resolution and stays findable.
- The next wave starts with the standing asks and the carried findings
  already in place, each with its raise count.

## What landed, 2026-08-13

Everything above except the code-wave variant, which shares the schema
(`review_waves.kind = 'code'`) and needs no further work to use.

- **Schema** (migration `20260813230545`): `review_areas`,
  `review_area_passes`, `review_findings`,
  `review_finding_revisions`, plus `review_waves.kind`. Two
  constraints the plan implied and the database now enforces: a
  `promoted` finding must name its work item, and an `archived` one
  must carry a resolution. `50_review.sql` was split at its declared
  seam, with the two guards moving to `51_review_guards.sql`.
- **The area map is loaded**: 39 areas in 6 parts, read out of the
  board file rather than retyped, with the 01/02 merge note intact.
- **47 of the board's 65 area/roadmap pairs resolved** to real work
  items and are now `review_area -> work_item` links. The other 18
  named titles that no longer exist - "Unity integration", "Unity:
  Merchant", "Admin tools", "Partner Type Enablement" and the rest of
  the Unity family - because the roadmap has been restructured since
  ("Unity Finalisation" is the workstream now). Mapping them would
  have been inference written as fact, so they are left for the first
  wave to resolve against the live roadmap. That gap is the finding.
- **`review_waves` is shared, so its read policy widened** to either
  grant. Gating it on `app-review` alone would have hidden a portal
  reviewer's own waves from them - a bug the shared table introduces
  and which is easy to miss until somebody without both grants looks.
- **A finding has no link destination, by design.** It exists only
  inside its wave and a `knowledge_links` row carries no wave id, so
  there is no address that reaches it from the link alone. Like
  `note`, it renders as its name and its type. The area map does have
  a home - it outlives every wave - so it is anchored on the index.

The render-coverage gate did its job twice here: it refused the five
new vocabularies until they had a renderer, and it refused the
`finding` anchor until a page could actually reach it.
