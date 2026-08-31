# 100 - Presentation readiness: departments, priority and benefit

The tenth workstream, opened 2026-08-31. The nine before it built the
system and made it maintainable. This one makes it **presentable**: the
roadmap is about to be shown to stakeholders from six departments, once
whole and then once per department, with the drawer clicked open live.

Public repo, so this file is process only - no item titles, no
departmental verdicts, no benefit text. All of that lives in Supabase
(`zlmkofbkobmhnslfnqsf`). Read docs/ROADMAP-PLAYBOOK.md for the model
and docs/ROADMAP-INTAKE.md for the contextualisation protocol first.

## Why: the measured position

Measured 2026-08-31 against 176 open rows (`status not in
('done','dropped')`): 27 workstreams, 122 items, 27 deliverables.

| Figure | Workstream | Item | Deliverable | Open total |
| --- | --- | --- | --- | --- |
| Open rows | 27 | 122 | 27 | 176 |
| Owner department set | 26 | 116 | 25 | 167 |
| Any association tag | 7 | 28 | 3 | 38 |
| `impact` set | 0 | 4 | 1 | 5 |
| `merchant_value` set | 0 | 0 | 0 | 0 |
| `pxp_value` set | 0 | 0 | 0 | 0 |
| A `Business benefit` line in `details` | 10 | 9 | 3 | 22 |
| Details thin or absent (<40 chars) | 3 | 49 | 18 | 70 |
| Sitting at default `priority` 100 | - | - | - | 59 |

Seven findings follow from those numbers. Each is a fact, not an
impression, and each names the decision it forces.

### 1. `department` is answering "who builds it", not "who owns it"

94 of 176 open rows carry `product_technology` - 53% of the roadmap, and
16 of the 27 workstreams. Product and Technology engineers everything, so
if the field means "who does the work" it is nearly a constant, and a
constant cannot sort, filter or present.

The evidence that this is systematic rather than a handful of slips:
`roadmap_categories.owning_department` and `work_items.department`
disagree on **60 of the 149 open rows that carry a theme** (40%). The
largest disagreements are all in one direction - a row filed under a
theme owned by Operations, Finance, Sales or Risk, but departmentally
tagged to Product and Technology: 21, 19, 9 and 7 rows respectively.

The consequence for the presentation is arithmetic. Filtered by owner
alone, the six departmental decks would carry 94, 41, 16, 10, 5 and 1
rows. Two of the six sessions have nothing to show.

### 2. The associations that would fix that are barely populated

`associated_departments` is the designed answer to finding 1: one
accountable owner, every other interested function tagged, and
`App.roadmapView.byDepartment` already filters on **owner OR
association**, with parent and child pull-through
(assets/js/pages/roadmap/views.js:160-184). The mechanism works. It is
empty: 138 of 176 open rows carry no tag at all, and the whole roadmap
holds 74 tags.

So the departmental view is not a feature to build. It is a feature that
exists and has no data in it.

### 3. A seventh owner is documented, specified, and was never made live

docs/ROADMAP-PLAYBOOK.md:101 says the vocabulary is "six business
functions ... plus core_launchpad", and :129-141 spells out the rule:
"Core LaunchPad = which platform the work is, product_technology = who
engineers it, carried as a default tag on Core LaunchPad items", closing
with "Making core_launchpad a live owner still needs a schema CHECK, a
tokens.css colour and the department filter; until then it is the
classification rule, in data only."

None of the three was done. The check constraint allows six values, the
registry lists six, `tokens.css` has no seventh hue. So the playbook
already diagnosed finding 1 and prescribed the fix, and the fix has been
sitting undone while the field it was meant to unblock filled up with
the exact default it predicted.

This is the first decision, because everything downstream inherits it.

### 4. Business benefit has four candidate homes, two of them empty and rendering

The received framing is that business benefit was never started. It is
worse than that and better than that:

- `attributes.merchant_value` and `attributes.pxp_value` exist, are
  rendered by the drawer as "Merchant value" and "PXP value" sections
  (assets/js/pages/roadmap/detail.js:426-427), are carried by the JSON
  and CSV exports, and are **0% populated on all 176 open rows**.
- docs/VALUE-CAPTURE.md is a complete written manual for filling them -
  queue query, progress check, wave ritual, resume instructions. It was
  never run.
- `impact` (low/medium/high) is set on 5 of 176 and overlaps the same
  question at a coarser grain.
- 22 rows carry the benefit as a `Business benefit:` line inside the
  `details` prose blob, which is unqueryable.

So the choice is not "invent a home". It is "pick among four, and retire
the ones that lose", and it has to be made before any content is written
because it decides what a session writes into.

### 5. Nothing anywhere holds a department's rank

The owner's requirement is that departments be prioritised against each
other, some deliberately lower. There is no column, table, registry
field or attribute that expresses this. `App.registry.departments` is an
ordered array, but the comment at registry.js:216-218 states that the
order is display order, and nothing reads it as precedence.

`work_items.priority` cannot carry it: it is a within-band sort integer,
and 59 of 176 open rows sit at its default of 100. A third of the
roadmap is unsorted, so even the ordering that does exist is thin.
`attributes.priority_band` (P1, P2) is on 7 open rows.

Department rank is therefore net-new, and it needs a home chosen on the
same one-home rule as everything else here.

### 6. The drawer puts thirty facts before the reason the work exists

`drawerHtml` (detail.js:395-432) renders in this order: head, summary,
details, the fact grid, work items, deliverables, phases, **Merchant
value, PXP value**, blockers, resolution, notes, actions.

The fact grid is 33 declared fields plus every unclaimed column
(detail.js:326-382). Clicked open in front of a stakeholder, the reader
passes Theme, Area, Workstream, links, Department, Business areas,
Assignee, Band, Status, Level, Presentation, Type, Effort, Impact,
Priority, PRD status, Project status, Progress, Milestone, Dates,
Sprints, Vertical, Team, Region, Customer, Resources, Cost, Requested
by, Source, External ref, Tags, Created, Updated before reaching why the
work is worth doing.

That order is right for an editor auditing a row and wrong for a
stakeholder being shown one. The benefit content this programme writes
would land at the bottom of that scroll.

### 7. The quality gaps a stakeholder would see first

Beyond the headline three: 37 open rows have no `type`, 172 no `effort`,
11 no theme, 4 no summary. 18 items are standalone (no parent) and so
render as their own bars, and 15 of those have thin or absent details.
The bug bucket workstream carries 7 open children and no department at
all.

## What "done" looks like

Six statements, each measurable, none of them prose:

1. Every open row has an owner department that answers "who is
   accountable and who the benefit lands on", under one written rule.
2. Every open row carries every department that would want to see it in
   their session, so six departmental filters each return a coherent,
   complete set.
3. Departments carry an explicit rank, stored in exactly one place,
   readable from the roadmap, and the ordering within each department is
   deliberate rather than the default 100.
4. Every workstream and every open item carries a business benefit that
   names a cost, a failure or an obligation, and names a beneficiary.
5. The drawer leads with what a stakeholder needs and defers what an
   editor needs, and every field this programme adds renders.
6. A gate holds each of the above at its new level, so the next session
   cannot quietly undo it.

## Two sessions, and why in this order

**Session A - attribution and structure.** Settle the ownership rule,
re-attribute all 176 rows, fill associations, establish department rank,
ship the schema and drawer changes that benefit content will need, and
put the gates in.

**Session B - benefit and content.** Fill business benefit top-down
against the settled attribution, provision the thin rows, propagate each
answer across related work, and close the rows that turn out to have no
benefit.

Attribution first, for a concrete reason: a benefit paragraph names its
beneficiary department. Written before re-attribution, all 176 would
need re-reading afterwards. Written after, each is written once. Session
A also decides where benefit text is stored and rendered, so Session B
writes into a known shape rather than a decision still open.

The honest seam: you cannot always settle ownership without knowing
where the benefit lands - "who benefits" is the best test of "who owns".
So Session A applies the rule mechanically where the rule is
unambiguous, and **parks the rows where ownership genuinely turns on the
benefit** as a named list. Session B resolves each of those as it writes
that row's benefit. Expected size of that parked list: 20 to 30 rows.
That is a seam, not a fudge, and it is stated here so it cannot be
quietly skipped.

## Session A - the work

**A1. Fix the ownership vocabulary.** Resolve finding 3. If
`core_launchpad` becomes live it needs, in one commit: the
`work_items_department_check` and `work_items_associated_departments_check`
constraints widened by migration, a `registry.departments` entry, a
`tokens.css` hue pair, and the drawer/backlog/exec renderers confirmed
to resolve it (they all go through `App.departmentLabel`, so this is a
one-line data change plus a colour). Then docs/ROADMAP-PLAYBOOK.md:101
and :129-141 stop describing a thing that does not exist.

**A2. Write the ownership rule down, once.** One paragraph, in
docs/ROADMAP-PLAYBOOK.md's Ownership section, that answers: does
`department` mean accountable-for-the-outcome, benefits-most, or
does-the-work. Everything in A3 is mechanical once this sentence exists,
and arbitrary until it does. The one-home gate
(tests/checks/roadmap-intake.test.js) means it is stated there and cited
everywhere else.

**A3. Re-attribute in waves, theme by theme.** 13 themes, each with a
declared `owning_department`, is the natural batching: it puts the 60
owner-versus-theme disagreements in front of the owner grouped by the
disagreement rather than one row at a time. Each wave shows the current
owner, the theme's owner, the proposed owner and the reason, as
clickable accept/change/park. Parked rows go on the Session B list.

**A4. Sweep associations.** For every open row, which departments want
to see it. Derived first: a row's theme owner, its parent's owner, its
own owner, and the departments named in its details are all candidate
tags before the owner is asked anything. Target: no open workstream with
zero tags, and every workstream's children inheriting at least their
parent's tag set unless deliberately narrower.

**A5. Give benefit a home.** Resolve finding 4 by decision, then
migrate: schema in supabase/schema/30_work.sql, RLS unchanged (the table
already has policies), the 22 prose `Business benefit:` lines moved into
it, `npm run snapshot` regenerated, drift gate green.

**A6. Give department rank a home.** Resolve finding 5 by decision.
Whichever wins, it is read by the roadmap for ordering and by the
departmental view for sequencing the six sessions.

**A7. Rework the drawer.** Three changes, all in detail.js,
detail-export.js and roadmap-detail.css:
- Promote benefit to a section directly under the summary, above the
  fact grid.
- Cluster the fact grid into named groups so the long tail stops
  competing with the head of the row. The shared builder
  (`App.detail.facts`) already supports an overflow bucket -
  "Also recorded against this item" - so this is a regrouping, not a
  rewrite, and the guarantee that a new column still renders holds.
- Render the new fields, and keep the JSON and CSV exports in step, so
  what a stakeholder sees and what an export carries do not diverge.

detail.js is already over its soft budget (tests/size-budget.json holds
the numbers), so this work splits it at the seam between the fact-grid
builders and the section builders rather than extending it.

**A8. Gates.** Add coverage figures to scripts/gen-knowledge.js and
ceilings to tests/knowledge-budget.json: `items.no_benefit`,
`items.no_owner_department`, `items.no_association`,
`items.at_default_priority`. Each is a ceiling that ratchets down as the
sessions land, in the same commit that lowers it. Add the benefit-type
vocabulary to tests/checks/render-coverage.test.js so a value that
renders nowhere fails the build.

**A9. Docs.** Correct the playbook drift found in finding 3. Decide
whether docs/VALUE-CAPTURE.md becomes the benefit manual or is
superseded by it - two manuals for one job is the exact thing the
one-home gate exists to stop.

## Session B - the work

**B1. The 27 workstreams first.** These are what a stakeholder reads
without the item list under them, and an item's benefit is usually a
share of its workstream's. Order: `now` and `next` bands first, because
those are the ones somebody asks about this quarter. Four have no
summary at all and need more than the rest.

**B2. The 49 thin items, grouped by workstream.** A title and a one-line
summary is not enough to draft from, so these need the owner. Each wave
is framed with its workstream's agreed benefit, so the question is
"what is this one's share of that" rather than a cold start. The
concentrations are known: 15 standalone items with no parent, then 6, 5
and 5 under three workstreams.

**B3. The items with details but no benefit.** The larger and faster
group: drafts built from the existing `What:` and `Relates to:` content,
presented in batches to accept, edit or reject.

**B4. The bug and discovery rows.** 6 typed as bugs plus the discovery
workstream's 7 children. These get a **cost of leaving it**, not a
business case: what happens today, how often, who absorbs it.

**B5. The parked ownership rows from A3.** Resolved here, where the
benefit makes the owner obvious.

**B6. The rows with no benefit.** Where neither party can say what a row
buys, that is a finding. Ask whether it should be dropped; if yes, close
with `status='dropped'` and a resolution, never delete. A shorter
roadmap believed in beats a complete one that is not.

**B7. Close out.** Re-measure every figure in the table above and show
before and after. List every question asked and not answered - that list
is as valuable as the answers. Run `select * from
roadmap_embed_refresh();` last: every benefit written leaves that row's
meaning vector describing text that no longer exists, and
`embeddings.stale` is held at 0 by a gate.

## The propagation rule

The owner's requirement that answers apply "throughout other related
work items" needs to be mechanical or it will not happen. The rule:

Every answer is recorded once at the highest level it is true, and
inherited downward. A benefit agreed for a workstream frames every child
before any child is asked about. An ownership rule agreed for one theme
applies to all its rows before the next theme is opened. A department
association agreed for a parent is proposed for every child.

Where an answer contradicts something already stored - a benefit that
implies a department the row does not carry, an ownership call that
contradicts a theme's owner - that is a **reconciliation finding**, and
it is raised, not silently resolved. Where an answer generalises beyond
its row, it is written as a `work_notes` decision anchored to the
workstream, and a `knowledge_links` row typed `relates_to`, `about` or
`affects` where it connects two records. A link written by an assistant
is `proposed` until confirmed in as many words.

Where the owner does not know, the answer is a `work_notes` row with
`kind='question'` anchored to the item. A recorded question is a better
state than a confident sentence nobody checked.

## Risks

- **Re-attribution is a presentation change to work already discussed.**
  Moving 60 rows between departments changes what each stakeholder sees
  as theirs. It is right, and it will surprise people who saw an earlier
  cut. Session A should end with a list of what moved and why.
- **Benefit text written to fill a field is worse than a blank.** A
  plausible business case is indistinguishable from a checked one, and
  it will be read under the owner's name. Nothing is invented; where
  there is no answer there is a recorded question.
- **Six departmental decks may not be six.** Legal and Compliance owns 1
  open row and is tagged on 5. Even after a full association sweep it may
  not fill a session. Better to know that now than to discover it in the
  room.
- **The drawer rework touches the most-tested page in the repo.**
  detail.js, views.js and the exports have unit suites; the change is
  safe only if those stay green and the size budget is respected rather
  than acknowledged around.

## Questions

Answer selectively. Every question below states what is already known,
what is missing, and what changes depending on the answer, so none of
them asks for a broad content fill. Tier 1 blocks Session A. Tier 2
shapes it. Tier 3 is content that only the owner holds and can be
answered at any point up to the wave that needs it.

### Tier 1 - blocks Session A

**Q1. Does `department` mean accountable, beneficiary, or builder?**
Known: 94 of 176 rows say `product_technology`, and 60 rows disagree
with their theme's owner. Missing: the sentence that settles it.
Changes: which of the 60 move, and whether the six decks are balanced.

**Q2. Does `core_launchpad` go live as a seventh owner?**
Known: the playbook specifies it, names the three things it needs, and
none were built. Missing: a yes or no. Changes: if yes, a large share of
the 94 Product and Technology rows become Core LaunchPad with Product
and Technology as an association tag, and Product's deck becomes about
platform engineering rather than everything. If no, the playbook loses
those paragraphs, because a documented option that will never exist is
drift.

**Q3. Where does business benefit live?** Four candidates, and the two
that already render are empty. Changes: everything Session B writes.
Trade-offs as I see them:
- *A new `business_benefit` column plus a checked `benefit_type`* -
  queryable ("show me everything with a revenue benefit"), renders as
  its own panel section, sorts, gates. Costs a migration and a snapshot
  regeneration. My recommendation.
- *The existing `merchant_value` / `pxp_value` pair* - zero migration,
  already rendered, already exported, already has a written manual. But
  they answer "value to whom", not "what kind of benefit", so they do
  not sort by benefit type and are not what a departmental deck needs.
- *Keep it in the `details` prose* - zero work, consistent with the 22
  rows that have it, permanently unqueryable.
- *Structured in `attributes` jsonb* - no migration, semi-queryable, and
  the reason `assignee` was moved out of jsonb into a real column was
  that the portal surfaced raw keys badly.

**Q4. Where does department rank live, and what is the rank?** Known:
nowhere holds it today. Missing: both the home and the order. Changes:
how the six sessions are sequenced and how the roadmap sorts. Homes:
a real `departments` table (queryable, one home for label, rank and
description, and it would retire the duplication between the check
constraint and the registry array); or a `rank` field on the existing
registry entries (no migration, but a database sort cannot read it).

### Tier 2 - shapes Session A

**Q5.** Should `impact` (low/medium/high, set on 5 of 176) become the
sortable coarse companion to the benefit prose, or be retired? It
overlaps benefit and is effectively unused; keeping both means two
mechanisms for one job.

**Q6.** Should a workstream's associations be the union of its
children's automatically, or set deliberately? Automatic is complete and
noisy; deliberate is clean and drifts.

**Q7.** For the departmental decks, should a department see rows it is
*associated* with as equal to rows it *owns*, or visibly secondary? The
filter currently treats them identically.

**Q8.** Are the 18 standalone items (no parent, own bar on the board)
intended as standalone, or are they orphans that belong under a
workstream? 15 of the 18 are also thin.

**Q9.** Does the drawer rework need a distinct stakeholder mode - a
cleaner render with the editorial fields hidden - or is one reordered
drawer for both audiences enough?

**Q10.** Does docs/VALUE-CAPTURE.md become the benefit manual, or is it
superseded and removed?

### Tier 3 - content only the owner holds

**Q11.** For each of the six departments, one sentence: what does that
department actually want out of this roadmap? Not their remit - what
they are hoping to see. This is the frame every benefit under them gets
written against, and it is the single highest-leverage answer in the
whole programme. Six sentences, answered one at a time if preferred.

**Q12.** Which departments are deliberately lower priority, and is that
because their work matters less, is less urgent, or is blocked on
something else? The reason changes how it is presented, and "lower
priority" said without a reason reads as a slight in the room.

**Q13.** Legal and Compliance owns 1 open row and is tagged on 5. Is
that real - a genuinely small footprint - or is compliance work sitting
under other departments' names?

**Q14.** Which three or four workstreams will the stakeholders most want
to click into? Those get the deepest content pass and the first drafts,
rather than spreading effort evenly across 27.

**Q15.** Is there a commercial frame - a target, a deal, a cost line, a
board commitment - that several of these workstreams serve? If several
benefits ladder up to one number, saying so once is worth more than 27
separate paragraphs.

## Resume

Read CLAUDE.md, docs/STATE.md, then this file. Session A is not started
until Q1 to Q4 are answered; Session B is not started until Session A's
schema and drawer changes are committed and green.
