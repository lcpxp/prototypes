# Roadmap intake

The contextualisation protocol: how a new request is placed against what
already exists before anything is written. This file is the ONE home for the
five stages, the confidence bands, the calibration behind them, the outcome
vocabulary and the copy-paste SQL for every outcome.

Read docs/ROADMAP-PLAYBOOK.md first for the model and the fields; come here
before writing a single row. The `/roadmap-add` command wraps this file, and
the review ritual (docs/ROADMAP-REVIEW.md) runs it at Wave 3.

**The thresholds in "Stage 3 - Band" below are stated here and nowhere
else.** Every other document cites this file. A threshold restated in a
second place is how they drifted before, and a test now fails on it.

## Why this exists

Intake used to write what it was given. A batch of 14 items added on
2026-07-27 turned out, on review, to contain 5 rows that already existed
under different titles, 1 heading whose components had been created as
separate rows in the same session, and 3 items that were correctly distinct
but recorded no relationship to anything. All 14 landed with `department`,
`category_id` and any link null. A whole batch sharing that signature
is not fourteen lapses; it is a missing step.

Note what it was not: careless requests. Several of the new descriptions were
better than the rows that already existed - one arrived with a clear scope
against an existing row that had an empty summary and empty details. The
right answer was to carry the description onto the existing row. Nothing
could notice, so a second row was created and the good wording landed in the
wrong place.

## Stage 1 - Understand

Read the request and name what it names: a **surface** (summary page,
contract, admin tools), an **actor** (global admin, partner, merchant), a
**behaviour**, and any **scheduling word**. Those are the search handles.

Decide the request's *shape* here, before any scoring:

- If it enumerates three or more distinct pieces of work (a comma or "and"
  list of noun phrases, or a sweep word - "sweep", "overhaul", "everything")
  it is a `SPLIT` or `UMBRELLA` candidate. Ask, regardless of score. **A
  heading matches everything weakly and nothing strongly, so the score will
  never catch it** - this rule is what catches it.
- Otherwise it is a single piece of work; go to Stage 2.

## Stage 2 - Gather candidates

Search all rows, including `done` and `dropped`, via `roadmap_find`:

    -- the headline, then the full request; band on the better score
    select title, score, status, horizon, workstream_title, is_hollow,
           summary, details, links, resolution
      from roadmap_find('currency swap on the summary page', 8, 0.15);

    select * from roadmap_find(
      'currency swap on the summary page - global admin swaps all values '
      'to another currency, character swap only, no conversion', 8, 0.15);

Run both. A bare headline is precise but thin; the full request is rich but
dilutes rare handles across many common ones. Take the **higher** score per
candidate - the two disagree often enough to matter.

Then one narrow search on the rarest handle alone, restricted to parked work,
because `REVIVE` cases score low by construction (the parked row is worded
for the problem as it looked then, not as it looks now):

    select title, score, status, horizon, resolution
      from roadmap_find('IVR', 5, 0.10)
     where status = 'dropped' or horizon = 'someday';

Surface any parked hit from that search whatever its band.

## Stage 3 - Band

| Band | Score | Behaviour |
| --- | --- | --- |
| High | >= 0.65 | Present the candidate, recommend an outcome, apply on one click |
| Medium | 0.40 - 0.65 | Present as options with the distinction spelled out; recommend, and say what would make it the other way |
| Low | 0.22 - 0.40 | Apply as new. Mention the neighbour in one line of the confirmation - do not ask |
| None | < 0.22 | Apply silently. Report one line |

A low-band match never generates a question. Restraint is a feature: a system
that questions every adjacent match gets switched off. Two adjustments on top:

- A **hollow** candidate (`is_hollow` - no summary and no details) in the
  medium band is a strong `ENRICH` signal: recommend `ENRICH`, not `NEW`.
  Three of the five 2026-07-27 duplicates matched a hollow row.
- A **parked** candidate found by the narrow search is surfaced at any band,
  as a `REVIVE` option.

### The calibration

Bands were fitted against the 2026-07-27 batch replayed read-only, each item
scored only against rows that existed before it. Best score per item:

    0.861  Currency Swap on summary page          -> duplicate
    0.794  Contract - Summary page: Sites/Totals  -> duplicate
    0.741  Quantity value on pricing lines ...    -> duplicate
    0.528  Split Unity enrolment buttons ...      -> duplicate
    0.464  Screening check toggles should work    -> distinct (real neighbour)
    0.427  Every application value adjustable     -> duplicate
    0.365  Show IVR lead information ...          -> distinct
    0.327  Automation sweep: CRM, Daopay ...      -> umbrella (caught at Stage 1)
    0.285  Capture acquirer name for site ...     -> distinct
    0.241  Processed Fees not Initiated           -> new
    0.237  Lower Pricing Minimums                 -> new
    0.216  Product Visible Description            -> new
    0.206  Date of birth output off by one day    -> new, deliberately unlinked
    0.186  New "Ad-hoc" billing frequency type    -> new

0.65 is the highest threshold that keeps three duplicates in High with zero
false positives. 0.40 is set just under the lowest true duplicate (0.427) and
admits one genuine neighbour at 0.464 - which is a correct medium, not a
false positive: the owner kept those two rows distinct and would want the
relationship offered. 0.22 sits above the date-of-birth case (0.206), which
must never fire: that is a timezone parse defect and "Fix date fields to
handle UK standard inputs only" is input-format restriction. Same code
region, different work, deliberately not linked.

The scorer weights query tokens by inverse document frequency, so a rare
handle ("IVR", "currency") outweighs a ubiquitous one ("page",
"application"), and damps queries under three informative tokens, so a
one-word query ("CRM") does not score 1.0 against every row containing that
word. Both were needed: without IDF, duplicates and noise overlap.

### The known limit of a lexical score

This calibration holds for a **lexical** scorer, and its weakness is
measured, not theoretical. The same row, reworded once, collapses from High
to Low - which is the band that applies silently:

| Query | Score | Band |
| --- | --- | --- |
| "date of birth off by one" | 0.956 | High |
| "customer birthday displaying a day earlier than entered" | 0.265 | Low |
| "currency swap on the summary page" | 0.976 | High |
| "let an admin change every amount to a different currency before signing" | 0.310 | Low |

Duplicate work is reworded, not retitled, so the commonest duplicate is the
one this scorer is least able to see. Until semantic recall lands, treat a
Low-band result on a request that *reads* like an existing item as worth one
manual `roadmap_find` on a synonym of the rarest handle.

## Stage 4 - Generate options and recommend

Every response carries a recommended outcome with its reasoning, plus the
credible alternatives. Never a bare list - an option list with no
recommendation moves the work back onto the owner, which is the problem being
solved.

| Outcome | Use when |
| --- | --- |
| `NEW` | Nothing comparable exists |
| `ENRICH` | The row exists but is thinner than the request |
| `MERGE` | Two live rows are the same work |
| `PROMOTE` | It exists but is scheduled later than now needed |
| `REVIVE` | It exists as `dropped` or `someday` and the need has returned |
| `ASSOCIATE` | Genuinely distinct but related |
| `SPLIT` | The request contains more than one piece of work |
| `UMBRELLA` | The request is a heading over work already captured |
| `UNRELATED` | Adjacent but distinct; insert standalone, do not link |

When the request is better described than the row it matches, the description
moves onto the existing row: the owner's words are the asset.

## Stage 5 - Apply and record

    -- ENRICH: the owner's words are the asset. The row keeps its id,
    -- status, parent and history; it gains the better description.
    update work_items
       set summary = 'Global admin can swap every value on the Summary page to another currency',
           details = 'Character swap only - no FX conversion. Confirmation step before applying.'
     where title = 'Adapt overall application currency on the Summary page (admin tool)';

    -- MERGE: keep the older/better-placed row, retire the other with a
    -- resolution naming the survivor and a duplicate_of link to it. Never
    -- delete. Both statements belong in ONE transaction: the duplicate_of
    -- constraint checks the retired row is dropped, and it is deferred so
    -- the order within the transaction does not matter.
    begin;
    update work_items
       set status = 'dropped',
           resolution = 'Duplicate: merged into "Quantity values on pricing lines" (19 Jul) - same feature.'
     where title = 'Quantity value on pricing lines during workflow question configuration';
    insert into knowledge_links (from_type, from_id, to_type, to_id, kind, note, confidence)
    select 'work_item', (select id from work_items where title = 'Quantity value on pricing lines during workflow question configuration'),
           'work_item', (select id from work_items where title = 'Quantity values on pricing lines'),
           'duplicate_of', 'Same feature, raised twice.', 'confirmed';
    commit;

    -- PROMOTE: it exists, it is just scheduled too late.
    update work_items set horizon = 'now' where title = 'Inbound API';
    -- or, for a whole workstream and its children:
    select roadmap_move_workstream(
      (select id from work_items where title = 'Insights' and level = 'workstream'), 'now');

    -- REVIVE: reopen, carry the new context in, say what changed.
    update work_items
       set status = 'planned', horizon = 'next', resolution = null,
           details = coalesce(details || E'\n\n', '') || 'Revived 28 Jul: the need returned when ...'
     where title = 'Resolve read-only IVR / adjust live applications';

    -- ASSOCIATE: genuinely distinct, but do not lose the relationship.
    -- relates_to is the general "related but distinct" mechanism, not a
    -- bug-tracking special case; it does not roll up onto the gantt.
    insert into knowledge_links (from_type, from_id, to_type, to_id, kind, confidence)
    select 'work_item', (select id from work_items where title = 'Screening check toggles should work'),
           'work_item', (select id from work_items where title = 'Harden screening checks'),
           'relates_to', 'confirmed';

    -- UMBRELLA: a coordination row, not build work. Link the components.
    update work_items
       set details = 'Coordination row: carries no build work, do not schedule or estimate directly.'
     where title = 'Automation sweep: CRM submission, Daopay, screening and notifications';
    insert into knowledge_links (from_type, from_id, to_type, to_id, kind, confidence)
    select 'work_item', c.id, 'work_item',
           (select id from work_items where title = 'Automation sweep: CRM submission, Daopay, screening and notifications'),
           'part_of', 'confirmed'
      from work_items c
     where c.title in ('Daopay: notifications to Daopay', 'Daopay: notifications to PXP account managers and PXP underwriting');

For anything other than `NEW`, write the reasoning down so the next session
inherits the judgement rather than re-deriving it:

    insert into work_notes (kind, body, work_item_id)
    values ('decision',
            'ENRICH over NEW: the 23 Jul row covered the same ground but was hollow; '
            'the new description was more specific, so it moved onto the existing row.',
            (select id from work_items where title = 'Adapt overall application currency on the Summary page (admin tool)'));

State how to reverse the change in the confirmation line. Nothing is deleted,
so every outcome has an undo: `ENRICH` restores the previous text, `MERGE`
clears `status` and `resolution` on the retired row and closes the link
(`valid_to`),
`PROMOTE` and `REVIVE` put the bands back.

## The link vocabulary

Relationships are rows in `knowledge_links`, not a column on the item. Eight
kinds, grouped on the W3C SKOS split between hierarchical and associative
relations. `relates_to` is the general "related but distinct" mechanism, replacing the
old `relates_to_id` column: same intent, but typed, unlimited per row, dated,
and readable from both ends.

| Kind | Reads forward | Reads back | Use when |
| --- | --- | --- | --- |
| `duplicate_of` | Duplicate of | Has duplicate | Same work, recorded twice. The FROM row must be `dropped` - a constraint enforces it |
| `supersedes` | Supersedes | Superseded by | Same territory, but the newer framing is the live one |
| `part_of` | Part of | Includes | A component of a coordination row. Unlike `parent_id` it does NOT roll up onto the gantt |
| `blocks` | Blocks | Blocked by | The FROM row must land before the TO row can proceed |
| `relates_to` | Related to | Related to | Genuinely distinct but adjacent. The default; symmetric |
| `distinct_from` | Distinct from | Distinct from | Adjudicated as NOT the same work. Symmetric |
| `about` | About | Described by | A note, document, term or capability describes the TO row |
| `affects` | Affects | Affected by | Delivering this work changed that capability |

Reach for `relates_to` by default, not only for bugs: it does not promote what
it points at, so it costs nothing to record and it is how the next session
learns that two pieces of work touch.

**`distinct_from` is the one that pays for the vocabulary.** It records that a
pair was examined and judged different - "Automate enrolling partners to
Unity" against "...to LaunchPad", "VFS partner flow" against "Xolvis partner
flow" - so the standing sweeps **suppress** that pair from future candidate
lists instead of raising it every review. Use it the moment a candidate is
rejected, with the reason in `note`. An adjudication that is not recorded is
one the owner has to make again.

    -- ASSOCIATE, the common case
    insert into knowledge_links (from_type, from_id, to_type, to_id, kind, note, confidence)
    select 'work_item', (select id from work_items where title = 'Screening check toggles should work'),
           'work_item', (select id from work_items where title = 'Harden screening checks'),
           'relates_to', 'Same screening surface, different work.', 'confirmed';

    -- Record a rejected candidate so it is never re-raised
    insert into knowledge_links (from_type, from_id, to_type, to_id, kind, note, confidence)
    select 'work_item', (select id from work_items where title = 'Automate enrolling partners to Unity'),
           'work_item', (select id from work_items where title = 'Automate enrolling partners to LaunchPad'),
           'distinct_from', 'Different target platforms; the enrolment flows do not share code.', 'confirmed';

    -- Close a link rather than deleting it: the graph keeps what was believed, and when
    update knowledge_links set valid_to = now()
     where id = '...' and valid_to is null;

Two rules the schema enforces, so they cannot quietly lapse: a pair may not
hold both a hierarchical (`part_of`) and an associative (`relates_to`,
`distinct_from`) link at once, and `duplicate_of` requires the retired row to
be `dropped`. Every link carries `confidence`: a link written by an assistant
is `proposed` until the owner confirms it.

### Adjudicating the migrated links

The 35 links carried over from `relates_to_id` on 2026-08-09 are all
`relates_to` / `proposed`, because the column recorded that two rows were
connected but not how. Their real kinds are largely recoverable. Work them in
owner-confirmed waves, grouped - never one at a time:

    -- What is still unadjudicated, grouped by the kind the evidence suggests
    select case
             when a.resolution ilike 'duplicate%' or a.resolution ilike '%merged into%'
               then 'duplicate_of'
             when a.resolution ilike '%supersed%' then 'supersedes'
             when b.details ilike '%coordination row%' then 'part_of'
             else 'relates_to (no evidence either way)'
           end as suggests,
           count(*), array_agg(a.title order by a.title)
      from knowledge_links l
      join work_items a on a.id = l.from_id
      join work_items b on b.id = l.to_id
     where l.confidence = 'proposed' and l.valid_to is null
     group by 1 order by 2 desc;

Present each group as ONE clickable confirm-all. On confirmation, retype the
link rather than editing in place, so the change is visible in the graph's
history:

    update knowledge_links set valid_to = now() where id = '<old>';
    insert into knowledge_links (from_type, from_id, to_type, to_id, kind, note, confidence)
    values ('work_item', '<from>', 'work_item', '<to>', 'part_of',
            'Component of the automation sweep; confirmed <date>.', 'confirmed');

A `duplicate_of` will be refused unless the retired row is `dropped`. That is
the constraint doing its job: two live rows found in August 2026 - "Currency
Swap on summary page" and "Terminal financing admin toggles (enable /
disable)" - carry duplicate resolutions without being retired, and must be
resolved by the owner before their links can be typed.

## Batches

A batch is one conversation, not fourteen. Compare it against history **and
against itself** - the 2026-07-27 umbrella and its own components were
created side by side, unlinked, because nothing did the second comparison:

    -- self-diff: score each new line against the others in the same batch
    select a.title, b.title, f.score
      from unnest(array['line one', 'line two', 'line three']) with ordinality a(title, i),
           unnest(array['line one', 'line two', 'line three']) with ordinality b(title, j),
           lateral roadmap_find(a.title, 5, 0.40) f
     where a.i < b.j and f.title = b.title;

Then come back **once**: the clean items applied, the flagged ones grouped
into a single pass. Fourteen sequential questions is a failure even if every
one is correct.

If a batch would land with `department` and `category_id` uniformly null
and no links at all, the classification step has been skipped. Offer the
classification as part of the same pass rather than writing unclassified rows.

## The standing sweeps

Contextualisation is not only an add-time step: the Unity enrolment pair were
both already in the data when the duplicate was found. Wave 0 of the review
ritual runs both of these and reports them.

    -- high-band pairs already in the data and not linked
    with live as (
      select id, title, concat_ws(' ', title, summary, details) q, parent_id
        from work_items
       where status not in ('done', 'dropped') and level in ('workstream', 'item')
    )
    select l.title, f.title, f.score, f.status, f.horizon
      from live l, lateral roadmap_find(l.q, 3, 0.65, l.id) f
      join work_items w on w.id = f.id
     where not exists (
             select 1 from knowledge_links k
              where k.valid_to is null
                and ((k.from_id = l.id and k.to_id = f.id)
                  or (k.from_id = f.id and k.to_id = l.id)))
       and coalesce(w.parent_id, '00000000-0000-0000-0000-000000000000') <> l.id
     order by f.score desc;

    -- hollow rows worth filling while the area is in hand
    select title, status, horizon, workstream_title from roadmap_searchable
     where is_hollow and status not in ('done', 'dropped') order by horizon, priority;

Because the lexical scorer misses rewordings, a title-similarity sweep catches
a class the score does not. It surfaces more noise, so it is a periodic pass
rather than a per-review one:

    select a.title, b.title, round(similarity(a.title, b.title)::numeric, 2) as trgm
      from work_items a join work_items b on a.id < b.id
     where similarity(a.title, b.title) >= 0.45
       and not exists (
             select 1 from knowledge_links k
              where k.valid_to is null
                and ((k.from_id = a.id and k.to_id = b.id)
                  or (k.from_id = b.id and k.to_id = a.id)))
     order by 3 desc;
