# 105 - The measured position

The evidence base for the presentation-readiness programme. Split from
docs/plan/100-PRESENTATION-READINESS.md at the line trigger that file's
own acknowledgement named, once D9 to D12 landed. 100 carries the
decisions, Session A and the open questions; 110-BENEFIT-CONTENT.md
carries the content standard and Session B.

This is the file to re-run at the end. "Rows with a business benefit
went from 22 to N" is the single most useful sentence the programme can
close on, and it needs a before to be a sentence at all.

Public repo: process only. No item titles, no benefit text, no
departmental verdicts. Those live in Supabase.

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

### 8. The partner audience is a third of the roadmap and is not tagged

Measured after D9 named partner staff as a first-class audience: **52 of
the 176 open rows mention a partner in their title, summary or details**
- 30% of the roadmap. Within that, at least three partner shapes are
named separately: 17 rows mention the EIT model, 9 mention PFAC, 3
mention referral.

Against that, Sales and Commercial - the function closest to the partner
relationship - owns 16 open rows and is carried as an association on 4.

So the single largest cross-cutting concern in the roadmap has no
representation in the field that is supposed to make cross-cutting
concerns visible. This is finding 2 restated with a number large enough
to act on, and it is the best available test of whether the A4 sweep
worked: if a partner-shaped filter still returns 20 rows when the text
says 52, the sweep is not finished.

It also raises a question the granular tier has to answer (Q26): whether
a partner benefit can be written once, or whether a PFAC partner, an EIT
partner and a referral partner want different things and the line has to
say which.

The merchant contributor case D9 describes is already on the roadmap as
live work rather than an intention - which is what makes `merchant_value`
worth keeping as a field even though it will usually be empty.
