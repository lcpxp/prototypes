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

Moved to docs/plan/105-MEASURED-POSITION.md at the line trigger this
file's own acknowledgement named. It holds the table of figures measured
2026-08-31 against 176 open rows, and the seven findings that follow
from them - department answering the wrong question, associations
empty, a seventh owner specified and never built, benefit's four
candidate homes, no home for department rank, a drawer that leads with
thirty facts, and the quality gaps a stakeholder sees first.

References below to "finding 1" and the rest point there. It is also
the file to re-run at close, because the programme's best closing
sentence is a before-and-after.

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

**D9. The audience model is PXP staff, partner staff and merchant - and
the merchant is the rarest of the three.** This corrects the framing
this plan carried through D5, which had the merchant as the primary
external beneficiary. It is not. The people who benefit from this work
are PXP staff onboarding direct merchants, and partner companies' staff
onboarding merchants into PXP. The merchant is the end customer being
onboarded - the one receiving the product - and rarely benefits from
this work except through how it changes what PXP and partner staff have
to do with their details. A merchant contributor role, letting a
merchant log in and complete their own details, is intended but is a
limited case.

Three consequences, and the second is the one that would have done real
damage:

- The three granular fields are **PXP staff, partner staff, merchant**.
  Partner staff is a first-class audience and had no field at all;
  "end user" as I first proposed it was not a real audience here.
- **An empty merchant field is a correct answer, not a gap.** Had the
  coverage gate treated it as one, it would have manufactured up to 149
  false defects and pushed a session to write merchant-framed benefit
  text that misdescribes who the work is for.
- Naming is free right now: all three attribute keys hold zero rows, so
  `pxp_value` becoming `pxp_staff_value` and a new `partner_staff_value`
  cost nothing but the decision to do it before anything is written.

**D10. Deliverables inherit their parent's benefit; one is written only
where it differs.** No gate on them, so the coverage denominator is the
149 workstreams and items. A deliverable that genuinely buys something
its parent's line does not say gets its own; the other 26 do not, and
that is finished rather than skipped.

**D11. The rank holds at delivery load for now.** Operations and
Onboarding, Product and Technology, Sales and Commercial, Finance and
Revenue, Risk and Underwriting, Legal and Compliance. Present against
where the work actually is, and let the department work move it before
Session A closes rather than settling it in advance.

**D12. The departmental view is a source-of-truth requirement, not a
framing paragraph.** This is the answer that redefines the goal, so it
is worth stating exactly. What is wanted is not an overview of each
department and the items it owns. It is that filtering the roadmap by a
department returns, legitimately and completely, the work items,
workstreams and associated material that relate to that department in
any way - and that the same data lets an assistant asked to list a
department's focus areas know comprehensively what to output.

That makes **A4, the association sweep, the critical path of Session A**
rather than a tidying pass beside the re-attribution. It also changes
the test for done. Not "each department has a sentence" but: a person
from that department, shown the filtered view, finds nothing missing
they expected and nothing present they would say does not belong.

The six framing sentences still get drafted (Q23), but their job is to
drive and validate that sweep - they are the yardstick the filtered set
is measured against, not a deliverable to present.

**D13. Nothing written by an assistant is indistinguishable from
something the owner checked.** The failure this programme most has to
avoid is not an empty field; it is a fluent, plausible benefit that
nobody verified, sitting under the owner's name in front of a board and
reading exactly like the ones that were confirmed.

So benefit content carries its own state, the same way a
`knowledge_links` row is `proposed` until confirmed: `benefit_status` is
`drafted` when a session wrote it and `confirmed` when the owner has
said so in as many words. A coverage figure counts the unconfirmed, so
drafted content is visible rather than silently permanent, and A7 makes
the drawer show the difference - a provisional benefit that renders
identically to a checked one defeats the whole mechanism at the exact
moment it matters.

This is what lets the programme move fast without lying. Drafting 124
rows is quick; confirming them is the owner's time, spent only where it
is the scarce input. The state field is what keeps those two apart.

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
declared `owning_department`, is the natural batching: it puts the 79
owner-versus-theme disagreements in front of the owner grouped by the
disagreement rather than one row at a time. Finding 1's concentration
table sets the order - two themes hold 27 of the 79 and three are
already clean, so this is roughly eight waves, not thirteen, and the
first two are the ones worth doing carefully. Each wave shows the current
owner, the theme's owner, the proposed owner and the reason, as
clickable accept/change/park. Parked rows go on the Session B list.

**A4. Sweep associations. This is the critical path.** Per D12 the
department filter has to stand up as a source of truth, so completeness
here is the deliverable, not tidiness.

Derived first, so the owner is never asked what the system already
knows: a row's theme owner, its parent's owner, its own owner, the
departments named in its details, and the far end of its
`knowledge_links` rows are all candidate tags before any question is
put. 158 links exist and none of them currently contributes to a
department association.

Then tested rather than assumed. For each of the six, the filtered set
is walked against that department's framing sentence (Q23), and the two
failures are named separately: **what is missing that they would
expect**, and **what is present that they would say does not belong**.
The second is the one a coverage count cannot see, and it is what makes
a filtered view lose its authority in a room.

Target: no open workstream with zero tags, every workstream's children
carrying at least their parent's tag set unless deliberately narrower,
and each of the six sets walked once with the owner.

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
- Render `benefit_status` visibly (D13). A drafted benefit that looks
  identical to a confirmed one defeats the mechanism at the moment it
  matters, so the drawer marks it and the deck view can exclude it.

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
ownership rule of D1, and the two working rules in
docs/plan/102-WORKING-RULES.md - are stated once and cited from there,
so no file states them twice.

## Working rules

The accuracy discipline (what may be written at all) and the propagation
rule (how an answer spreads once written) moved to
docs/plan/102-WORKING-RULES.md, so that both sessions cite one home
rather than one of them citing the other's file. Session A's waves and
Session B's are equally bound by them.

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

Q1 to Q4, Q16 to Q23 are answered and have become D1 to D12; D13
follows from the accuracy requirement rather than from a question. The
numbering is kept so the conversation and the record line up. Q24 to Q30
are what remains.

### Tier 1 - blocks Session A

**Q24. Can a partner benefit be written once, or does it depend on the
partner type?** Finding 8: 52 of 176 open rows mention a partner, and
they do not all mean the same one - 17 name EIT, 9 name PFAC, 3 name
referral. Missing: whether a PFAC partner's staff and an EIT partner's
staff want materially different things from the same work. Changes:
whether `partner_staff_value` is one line per row or has to say which
partner shape it speaks for.

**Q25. Does partner type need a field?** Follows from Q24. Today it is
only inferable from prose - no filter, no grouping, no way to answer
"what are we building for PFAC partners". If the shapes diverge, that is
a gap the same size as the department one, found the same way. If not,
this closes and nothing is built.

**Q26. What already sits under the wrong department, that you know of?**
D12 makes the filtered view a source of truth, and the failure it cannot
self-detect is a row that is present and should not be. A count cannot
see that; only a person can. Anything you already know saves a wave.

**Q27. The twenty-five rows with no evidence at all** (finding 9) have
no details, no note, no link and no source document. Anything drafted
against them is invention. They can be worked three ways and it is your
call which: you answer them in one concentrated pass, they are recorded
as open questions and presented as such, or they are candidates for
dropping on the grounds that a row nobody can say anything about may not
be real work. My reading is that the list will be a mixture of all three
and the useful thing is to see it - so the first wave of Session B could
be those 25 as a single named list rather than spread through the
queue.

**Q28. Does the deck show drafted benefits, or only confirmed?** D13
splits them. If the presentation is close, "confirmed only" may leave
gaps on screen; "show both, marked" is honest but invites the question
in the room. Changes what A7 builds and how hard the confirmation pass
is pushed before the date.

**Q29. When is the presentation?** Asked plainly because it sets every
trade-off in this plan and nothing else does. It decides whether Session
A takes the call-site change, how many confirmation passes fit, and
whether the 25 get answered or recorded. I have been sequencing on
correctness; a date lets me sequence on both.

**Q30. Should I draft the six department framings now, or in Session
A?** You asked me to draft and you correct. Per D12 they are the
yardstick the association sweep is measured against, and a test written
after the work it grades is worth less - so my preference is now, in
chat rather than in this file. Unchanged from Q27 of the last round;
restated because it is still open.

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
