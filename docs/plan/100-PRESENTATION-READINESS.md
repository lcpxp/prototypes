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

Decided (D2 below): it goes live, as a **fallback and never a
destination**. The correction that matters is to the expected volume -
the first framing of this assumed a large share of the 94 Product and
Technology rows would move to it. They should not. The classification
order is business function first, every time, and `core_launchpad` only
where no business function honestly owns the row. It is the residual
bucket that stops `product_technology` being used as one.

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

## Decisions taken

Recorded 2026-08-31, in answer to the four questions that blocked
Session A. Each is now the rule, not an option, and each names what it
settles so a later session does not reopen it.

**D1. `department` means accountable for the outcome, tested by where
the benefit lands.** Both halves, in that order: the owner is the
function answerable if the work does not land, and where accountability
is genuinely arguable the tiebreak is whose day changes when it ships.
Not who engineers it.

This makes the parked list of A3 precise rather than approximate. A row
is parked for Session B exactly when accountability and beneficiary
point at different functions, because that is the case the tiebreak
cannot settle without the benefit written. Every other row is
mechanical.

**D2. `core_launchpad` goes live, as a fallback only.** The
classification always tries the six business functions first; the
seventh is used where none of them honestly owns the row - the work is
the platform itself. Reaching for it early would recreate finding 1 with
a new label, so the wave order is: propose a business function, and only
where that proposal fails does the row become Core LaunchPad. The three
things it needs (constraint, registry entry, colour pair) are A1.

**D3. Business benefit is the primary, overarching field; the value
fields become the granular tier beneath it.** `business_benefit` answers
the departmental and PXP-wide question - what this buys the business as
a commercial and operational entity. Beneath it sit the finer readings
of who feels it: merchant, staff and end user. So the existing
`merchant_value` and `pxp_value` are not retired and not promoted -
they are re-framed as one tier down, and the overarching field they
never had is the one being added.

That hierarchy is the thing to hold. A stakeholder deck leads with
business benefit; the drawer can carry the granular reading underneath
for the person who clicks in. Two fields answering one question was the
risk in finding 4; two fields answering questions at different altitudes
is not, provided the altitudes are written down once.

**D4. Department rank is stored, never rendered.** No rank number, no
ordinal, nothing on the front end that tells a room it is sixth. It
exists to order and group - which department leads a deck, which
sequence the six sessions run in, how the roadmap sorts - and the most
accessible home is a real table, queryable in SQL, mirroring
`roadmap_categories` exactly as themes already do (key, label,
sort_order, description). That also retires the present duplication,
where the six live in a check constraint and again in a registry array
with no single home for either the vocabulary or its order.

The consequence to accept: pages that today read
`App.registry.departments` synchronously would fetch departments the way
they already fetch themes and areas. That is the consistent shape, and
it is a real change to four call sites. Q19 asks whether to take it.

**D5. The benefit tier is three fields, optional, and it has a second
audience.** Beneath `business_benefit` sit three granular readings -
merchant, staff, end user - written where appropriate rather than on
every row. `merchant_value` keeps its meaning; `pxp_value` is re-framed
as the staff reading, because PXP-the-business moved up to
`business_benefit`; the end-user reading is new.

The part that changes the work rather than the schema: this content is
not only read in a deck. It is the source material for **user stories
and later marketing collateral**. That binds how every field is written
- a role and a change of behaviour present in each granular line, and no
internal shorthand, because collateral is read by people outside PXP and
rewriting 176 rows later costs more than writing them plainly once. The
standard and its test live in docs/plan/110-BENEFIT-CONTENT.md.

**D6. Business benefit carries a checked type,** from seven values: cost
removed, failure prevented, revenue enabled, revenue retained, decision
enabled, obligation met, defect cost. This is what makes the roadmap
answerable rather than merely readable - "every workstream with a
revenue benefit, ranked" becomes a query. The seventh covers the rows
whose benefit is that they are broken, so those need no special case.
It is a vocabulary, so tests/checks/render-coverage.test.js holds it.

**D7. The rank starts from delivery load and moves toward commercial
logic, validated as we go.** Not a number settled in one sitting. The
opening order is where the work actually sits - which is a fact - and
each subsequent question is an opportunity to move it toward what
matters, which is a judgement only the owner holds.

Two consequences. `sort_order` is spaced in gaps of ten, so a
re-ordering is one update rather than six. And the rank is explicitly
provisional until Session A closes: any wave that surfaces a reason to
move a department records it, and the closing pass states the final
order and what moved it.

**D8. The registry-to-table conversion is deferred.** The `departments`
table is authoritative for rank and ordering; `App.registry.departments`
keeps serving labels synchronously to the four call sites that read it.
This is a duplication, it is temporary, and it is written down here so
it is a decision rather than a drift. It converges when the presentation
is behind us, not during it.

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

**A1. Fix the ownership vocabulary.** Per D2, `core_launchpad` goes
live as a fallback. In one commit it needs: the
`work_items_department_check` and `work_items_associated_departments_check`
constraints widened by migration, the vocabulary entry (in whichever
home D4 settles), a `tokens.css` hue pair, and the drawer/backlog/exec
renderers confirmed to resolve it - they all go through
`App.departmentLabel`, so this is a data change plus a colour. Then
docs/ROADMAP-PLAYBOOK.md:101 and :129-141 stop describing a thing that
does not exist, and gain the sentence that it is a fallback, so the next
session does not reach for it first.

**A2. Write the ownership rule down, once.** D1 and D2 go into
docs/ROADMAP-PLAYBOOK.md's Ownership section as the rule, with the
tiebreak and the fallback both stated: accountable for the outcome,
tested by where the benefit lands, business function before Core
LaunchPad. The one-home gate (tests/checks/roadmap-intake.test.js) means
it is stated there and cited everywhere else, including here.

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

**A5. Build the benefit hierarchy.** Per D3: a `business_benefit`
column as the primary field, the granular tier beneath it, and the 22
prose `Business benefit:` lines migrated into the new column so the
convention has one home rather than two. Schema in
supabase/schema/30_work.sql, RLS unchanged (the table already has
policies), `npm run snapshot` regenerated, drift gate green.

Two shapes are still open and Q16 and Q17 ask them: whether the granular
tier is the existing two fields or three, and whether business benefit
carries a checked `benefit_type` so the roadmap can be asked "show me
everything with a revenue benefit". Neither blocks the column itself.

**A6. Give departments a home, and a rank inside it.** Per D4: a
`departments` table mirroring `roadmap_categories`, carrying key, label,
sort_order and description, with `sort_order` as the rank. Read for
ordering and for sequencing the six sessions; never rendered as a
number. The migration is small; the call-site change is the real cost
and Q19 asks whether to take it now or leave the registry array in place
for this programme and converge later.

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

Moved to docs/plan/110-BENEFIT-CONTENT.md when this file reached the
line trigger its own acknowledgement named. That file carries the
content standard (what a benefit has to mean, the four fields and their
altitudes, the stories-and-collateral requirement of D5) and the seven
waves B1 to B7. The shared three - the measured position above, the
ownership rule of D1, and the propagation rule below - stay here and are
cited from there, so neither file states them twice.

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

Answer selectively. Every question states what is already known, what
is missing, and what changes depending on the answer, so none of them
asks for a broad content fill. Tier 1 blocks Session A. Tier 2 shapes
it. Tier 3 is content only the owner holds, answerable at any point up
to the wave that needs it.

Q1 to Q4 and Q16 to Q19 are answered and have become D1 to D8 above;
the numbering is kept so the conversation and the record line up. Q20 to
Q23 are what the second round opened.

### Tier 1 - blocks Session A

**Q20. What is the "end user"?** D5 names three granular audiences, and
two of them are unambiguous - the merchant, and the PXP person operating
the platform. The third is not. It could be the merchant's own customer
at the far end of a payment, or the person using the merchant-facing
portal. Missing: which. Changes: the column name, and how every one of
those lines is written - a benefit to a cardholder and a benefit to a
portal user share no vocabulary at all.

**Q21. Is `business_benefit` required on deliverables?** 27 of the 176
open rows are deliverables - drawer-only detail beneath an item, never a
bar, never read on their own. Most inherit their parent's benefit rather
than having one. Missing: whether they are in scope. Changes: the
coverage gate's denominator, and roughly 27 rows of Session B's queue.
My reading is that they inherit and the gate should measure workstreams
and items only, but that is a scoping call, not a technical one.

**Q22. Which departments already need to move?** D7 opens at delivery
load and moves toward commercial logic with validation. The one move the
commercial reading clearly implies is Sales and Commercial rising from
third; whether Product and Technology should fall correspondingly is the
part I cannot infer, because it depends on whether Product is read as
the engine or as the enabler. Any move named now saves a wave later.

**Q23. What does each department want out of this roadmap?** Promoted
from Tier 3, because after D5 it is the highest-leverage answer in the
programme. Not their remit - what they are hoping to see when they walk
in. Every benefit written under a department gets framed against it, and
it is the difference between six decks that are filtered views of one
roadmap and six decks that each answer a question somebody actually has.
Six sentences. Answer one at a time, in any order, or name the two that
matter most and leave the rest.

### Tier 2 - shapes Session A

**Q5.** `impact` (low/medium/high, set on 5 of 176) should now be
retired: D6's `benefit_type` is the sortable companion to the benefit
prose, and keeping a second, vaguer axis on the same question is two
mechanisms for one job. Confirm, or say what `impact` was meant to carry
that `benefit_type` does not.

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

Read CLAUDE.md, docs/STATE.md, then this file. D1 to D4 are settled.
Session A is not started until Q16 to Q19 are answered; Session B is not
started until Session A's schema and drawer changes are committed and
green, and its parked-ownership list exists.
