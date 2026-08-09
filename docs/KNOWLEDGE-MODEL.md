# The knowledge model

Why the roadmap and platform knowledge are shaped the way they are. Not a
how-to - the operating manuals are docs/ROADMAP-PLAYBOOK.md,
docs/ROADMAP-INTAKE.md, docs/ROADMAP-REVIEW.md and docs/PLATFORM.md. This
file is the reasoning behind them, written down because the decisions here
are the ones a future session is most likely to reverse by accident.

## What the knowledge layer is

One graph over the things this system knows. Seven node types -
`work_items`, `work_notes`, `product_capabilities`, `domain_terms`,
`work_documents`, `journey_stages`, `work_areas` - joined by one typed edge
table, `knowledge_links` (supabase/schema/33_links.sql).

The shape is chosen so a cluster view is *possible* later. No visualisation
work is in scope, and none should be started on the strength of that
sentence; the point is only that the connectivity is real data rather than
prose, so anything that wants to traverse it can.

## Why an absolute score, not a rank

This is the section most likely to be "improved" back into brokenness, so it
comes first.

Intake bands a candidate's score to decide **whether to speak at all**. The
most important band is `None (< 0.22) -> apply silently`. That requires an
absolute, calibratable number.

The standard hybrid-search recipe is reciprocal rank fusion: order by
`1/(k + rank)` summed across channels. With the usual `k = 50`, the best
possible score is `1/51 + 1/51`, about 0.039 - **and the top hit scores
approximately that whatever its quality**, because rank fusion deliberately
discards magnitude. That is correct for "return the best ten documents" and
wrong here: under RRF there is always a rank 1, so the None band cannot
exist and restraint becomes impossible.

Any future fusion must therefore be a **weighted blend of calibrated
scores**, not a rank fusion. Reference: the RRF recipe at
https://supabase.com/docs/guides/ai/hybrid-search, which is a good design
for a different problem.

## Why lexical and semantic must be fused, not swapped

`roadmap_find`'s IDF weighting is hard-won and wins where a general-purpose
embedding is weakest: rare handles the model has never seen. Measured on the
live corpus, the rarest partner name scores IDF 4.228, `ivr` 3.977 and
`currency` 3.776, against `merchant` at 1.130.

It loses, badly, on rewording. The same row, asked for twice:

| Query | Score | Band |
| --- | --- | --- |
| "date of birth off by one" | 0.956 | High |
| "customer birthday displaying a day earlier than entered" | 0.265 | Low |
| "currency swap on the summary page" | 0.976 | High |
| "let an admin change every amount to a different currency before signing" | 0.310 | Low |

Two items, one rewording each, both collapsing from "present the candidate"
to "apply silently". Duplicate work is reworded, not retitled, so the
commonest duplicate is the one a lexical scorer is least able to see. Neither
channel is sufficient; the answer is to add the second and blend, keeping the
first intact.

A note on the model: `gte-small` produces normalised 384-dimension vectors
whose cosine similarities are compressed - unrelated short texts sit around
0.70-0.80, near-duplicates around 0.90+. Raw cosine would flood every band,
so the semantic channel needs an affine rescale with the floor and ceiling
fitted against labelled pairs, not guessed.

## Why a curated stoplist, not a threshold

The first instinct on finding a bad word list is to delete it and let IDF
decide. That was tried and rejected on measurement, which is worth recording
so it is not tried again.

The list was genuinely holding the wrong words - `new` (IDF 2.563), `add`
(2.203) and `set` (2.063) were being discarded while `merchant` (1.130)
sailed through. But a minimum-IDF floor cannot fix it, because in this corpus
function words and real handles **interleave**: `when` (2.618) and `should`
(2.563) score exactly as high as `page` (2.618) and `new` (2.563). At 239
documents, document frequency is too noisy a proxy for "function word".

A curated closed-class list is the right tool. It was holding the wrong
words, which is a different problem with a different fix.

## Why typed links, not a second column

`work_items.relates_to_id` was one nullable uuid carrying four meanings -
duplicate of, component of, superseded by, related to - with a ceiling of one
relationship per row, and direction meaning something different depending on
which of the four you were looking at. Telling them apart meant reading
`resolution` prose.

Two failures it allowed, both live in the data when this was written:

- `Currency Swap on summary page` sat on the Next band as `status='idea'`
  with a resolution reading *"Duplicate: description migrated onto the
  pre-existing ..."*. A known duplicate, on the board.
- `Terminal financing admin toggles (enable / disable)` was dropped as a
  duplicate with its survivor named only in prose and `relates_to_id` null.
  Its twin scores trigram 1.00 against it and is still `idea`.

A constraint requiring `duplicate_of` to point away from a `dropped` row
catches the first at write time. A typed link catches the second by making
the survivor data rather than a sentence.

## The SKOS frame

The eight kinds follow the W3C SKOS split (https://www.w3.org/TR/skos-reference/)
between **hierarchical** relations (`broader`/`narrower`: an inverse pair,
deliberately non-transitive) and **associative** ones (`related`: symmetric).
That is also where the clash rule comes from: SKOS holds that a pair may not
be both, so `part_of` and `relates_to` cannot coexist on one pair, and the
schema enforces it.

Symmetric kinds are stored once, in canonical endpoint order, and read from
both ends by the `knowledge_graph` view. Storing once and reading twice are
separate concerns - conflating them is a real bug this project shipped and
then fixed within the hour, which is why the distinction is spelled out here
and pinned by a test.

## Why links are bi-temporal

A link is **closed** (`valid_to` set), never deleted, so the graph answers
"what did we believe, and when". This is the edge-invalidation model temporal
knowledge graphs use for agent memory (see the Zep architecture paper,
https://arxiv.org/pdf/2501.13956), and it is the same rule the rest of this
system already follows for rows.

It is what makes "how does this feature work" answerable over time: the
original context plus every change since, each change dated, none
overwritten. `product_capabilities` rows are not yet bi-temporal; that is a
separate workstream, deliberately not smuggled in here.

## Why `distinct_from` pays for the whole vocabulary

A negative label is standard entity-resolution practice: once a pair is
adjudicated a non-match, the decision is persisted so neither the system nor
a person re-litigates it.

There was previously no way to say it at all. A trigram sweep over titles at
0.45 and above returns 42 pairs, 39 of them unlinked - including
`Automate enrolling partners to Unity` against `...to LaunchPad` (0.66), and
a pair of identically-shaped partner-flow rows for two different partners
(0.54) - both genuinely different work. Those were re-examined at every
review because nothing recorded that they had already been judged.
`distinct_from` turns a domain judgement into data. (Partner names stay in
Supabase; the scores are the point here, not who they belong to.)

## Why the repo must describe the database

On 2026-08-09 the live project carried two `work_items` columns declared in
no schema file - while `supabase/schema/31_roadmap_search.sql` *selected* one
of them, so the schema directory could not be run against a fresh project.
Five applied migrations had no file in the repo. Nothing caught any of it.

The rule that follows: the database describes itself into
`supabase/schema-snapshot.json`, that file is committed, and
`tests/checks/schema-drift.test.js` asserts the repo accounts for everything
in it. Migrations join on **name**, not version - repo filenames carry
rounded timestamps while the ledger records real apply times.

## Why line count was the wrong gate

The old 200/300 markdown budget was a proxy for what actually degrades
instruction adherence: one concept stated in two places saying slightly
different things. The proxy misfired. Forcing the playbook to split is what
put the confidence bands in three separate documents, which then needed a
test to keep them identical - a rule generating the defect its own test
caught, while accumulating an exceptions block longer than several of the
files it exempted.

The budget is now 300/500 and the real invariant is enforced directly: a
threshold, a vocabulary or a protocol lives in exactly one file and is cited
everywhere else. When the two disagree, the one-home gate wins - a longer
single file beats the same number stated in three shorter ones.

## What is deliberately not here

- **No visualisation.** The connectivity exists; drawing it is not scoped.
- **No bi-temporality on capability rows yet.** Links first.
- **No HNSW index.** A sequential scan over a few hundred 384-float vectors
  is well under a millisecond. Add
  `using hnsw (embedding vector_cosine_ops)` when any embedded table passes
  roughly 5,000 rows, and not before.
