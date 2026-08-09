# Roadmap review

The review ritual: "let's go through the roadmap", or `/roadmap`. A tight,
clickable pass over Now/Next, promotions, new work and decisions, plus the
deeper waves offered only after the core is done.

The model and the field reference are in docs/ROADMAP-PLAYBOOK.md; the
contextualisation protocol Wave 3 runs, and the confidence bands it uses, are
in docs/ROADMAP-INTAKE.md.

## How a wave works

Each wave is ONE `AskUserQuestion` with options pre-computed from the data,
and every answer maps to a specific `work_items` (or, in the sync wave,
context) write from the playbook's operations. Never a wall of text, never a
bare list: an option list with no recommendation moves the work back onto the
owner, which is the thing the ritual exists to avoid.

Waves 0 to 5 are the 2-5 minute core. Do them in order, then stop.

## Wave 0 - Orient (no question)

Read `roadmap_current` and open `work_notes` (`status='active'`). Show,
briefly: the Now items, the Next items, what changed since the last review
(max `updated_at`), and the counts.

Load the platform context for the areas in play - `product_capabilities`,
`domain_terms`, `journey_stages`, `integrations` and facts - per
docs/PLATFORM.md.

Add two standing lines from the search surface (both queries in
docs/ROADMAP-INTAKE.md, "The standing sweeps"): any **hollow rows** in those
areas, and any **high-band pair already in the data** and not linked. Report
them and move on - Wave 0 asks nothing.

## Wave 1 - Now integrity

For each Now item: on track / done / slipping / drop. Apply to `status`,
`progress`, `horizon`.

## Wave 2 - Capacity

Now holds whatever is genuinely in flight - there is no cap on how many items
or workstreams sit there. Promote Next items on evidence
(`horizon='now'`); demote when confidence drops.

## Wave 3 - New capture

"Anything new?" Then contextualise each line per docs/ROADMAP-INTAKE.md, and
the batch against itself as well as against history - an umbrella and its own
components arriving together is the commonest miss.

Come back ONCE: the clean items applied, the flagged ones grouped into a
single pass. Fourteen sequential questions is a failure even if every one is
correct. If the batch would land with `department`, `category_id` and
`relates_to_id` uniformly null, the classification step has been skipped -
offer the classification in that same pass rather than writing unclassified
rows.

## Wave 4 - Context sync (always, both ways)

The roadmap and the platform knowledge base are two views of one reality and
must be kept in step in BOTH directions, on every review and material edit.
The context lives in `product_capabilities`, `domain_terms`,
`journey_stages`, `integrations` and `work_notes` of kind `'fact'` - see
docs/PLATFORM.md.

- **Context -> roadmap.** From the context loaded in Wave 0, let it sharpen
  the items in play: a summary, a dependency, a term the item assumes, the
  lifecycle stage it touches, the capability it extends. Offer these as
  concrete assertions to apply.
- **Roadmap -> context.** When work moves - promoted, delivered, dropped,
  rescoped - ask what it changes about the platform: a capability now live or
  partial, a new integration, a term or stage that shifted.
- **The golden rule: every assertion is owner-validated**, both directions,
  as a clickable choice rather than a wall of text. Nothing lands on the AI's
  own authority. Record what was confirmed: a `work_notes` decision, plus
  provenance (source and date) on any context row.

Skip this wave only when there is genuinely nothing to sync, and say so.

## Wave 5 - Confirm

Summarise every edit made (roadmap and context), write ONE `work_notes`
decision capturing the session's reasoning, record any confirmed context
updates with provenance, then stop.

## The deeper waves

Only after the core, offer these as further clickable options: reprioritise
within a theme; review Later bets; revive parked/someday work; scope a
workstream into items; rebalance departments; delivered cleanup; and
shareholder-ready export prep before a meeting.

`/roadmap <name>` jumps straight to one of them (for example `shareholder`,
`later`, `parked`, `workstream`) after Wave 0, instead of running the full
core.

## Rules that keep it trustworthy

- **Now reflects what is genuinely in flight**: size it to real capacity, not
  a fixed count - there is no cap on the number of items or workstreams in Now.
- **Detail decays by column**: Now items are spec'd (summaries), Next are
  validated problems, Later are one-line bets. Do not over-write Later rows.
- **Never lose a decision**: every move gets a `resolution` and/or a
  `work_notes` decision row.
- **Nothing is written blind**: every new item is placed against what already
  exists first, at review as well as at capture - the duplicates found in
  July were both already in the data.
- **Hollow rows attract re-raises**: a row with no `summary` and no `details`
  gets re-requested by someone who cannot see it is covered. Fill them while
  the area is in hand (`roadmap_searchable.is_hollow`).
- **Keep context in step**: every review and material edit syncs both ways
  with the platform knowledge base, and every synced assertion is
  owner-validated before it lands.
- **Public repo**: real merchant, partner and staff detail lives only in
  Supabase, never in git, seed.sql, commit messages or docs. All DOM output
  goes through `App.escape`.

## Structural refinement

Distinct from the review ritual above: when the *shape* of the roadmap needs
reworking - the taxonomy, the horizons, the views - that is done as a
wave-by-wave conversation resolving one structural fork per wave, then
applied as database edits and, where the shape of the views changes, a repo
change. The July 2026 refinement (`work_documents`, kind `discussion`) is the
worked template.

Cadence: revisit priorities and horizons each cycle; re-confirm the theme set
when the portfolio shifts.
