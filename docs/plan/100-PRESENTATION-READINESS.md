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

Twenty-one, recorded in docs/plan/101-DECISIONS.md and cited by number
from the steps below. They stopped being a narrative and became a
register, so they live where a register belongs.

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

**D16. Content is seeded, then iterated, then confirmed.** The method
for the rows that need the owner: the owner supplies a concise summary
for a handful of central rows; that content is iterated out across the
other rows it legitimately covers; the cycle repeats until everything is
populated.

This is faster than asking row by row and it is the only approach that
fits three days. It also runs directly at accuracy rule 3, which forbids
propagating by resemblance - so the two are reconciled explicitly rather
than left to collide:

- Owner-supplied content is recorded once as a `work_notes` row anchored
  to the central item, and that note is the evidence.
- A row receiving iterated content **cites that note**. If it cannot -
  if the only thing connecting it to the seed is that the titles rhyme -
  it does not receive it.
- Iteration travels by parentage, theme, explicit link or the owner
  saying so. Never by similarity, and never by the embedding index.
- Every iterated row lands `drafted`. The seed row is `confirmed` where
  the owner wrote it. The gap between those two counts is the honest
  measure of how far one answer was stretched.

## The three-day cut

What lands before the session, in order, with the reason each earns its
place. Everything not named here is deferred, and the deferred list is
stated after it so that nothing is quietly dropped.

**Day 1 - attribution, because it is what breaks the department view.**
One migration adds `business_benefit`, `benefit_type`, `benefit_status`,
`partner_type`, and the granular tier of D9 (`pxp_staff_value` renamed
from the empty `pxp_value`, `partner_staff_value` new,
`merchant_value` unchanged). Then the 79 conflicts of finding 1, in
roughly eight theme waves, Products & Pricing and Acquiring first
because they hold 27 of the 79 between them. Then the association sweep
of A4, derived first and validated per department. Ends with the walk:
all six filters applied in turn, looking for what is missing and what
does not belong.

**Day 2 - benefit, where it will actually be read.** The 27 workstreams,
because those are the bars on screen and the drawers most likely to be
opened. Then the items on the `now` and `next` bands beneath them. The
25 no-evidence rows (finding 9) come first as a single named list rather
than spread through the queue, worked by the seeded method D16 sets out.

**Day 3 - the drawer, then close.** Benefit moves above the fact grid
and the grid is regrouped, which is the one front-end change that
changes what a stakeholder sees when you click in. Then propagation of
everything supplied on days 1 and 2 across related rows, a re-measure
against 105, `roadmap_embed_refresh()`, and docs/STATE.md.

The drawer change is deliberately not last-minute work on the day
before; if it goes wrong there has to be time to revert it.

### Deferred, and named so it is a decision

- The `departments` table and stored rank (D4, D11). Not needed: the
  session filters one department at a time and the rank is never
  rendered. Registry order serves until it is built.
- The registry-to-table call-site conversion (D8). Already deferred; the
  timebox settles it.
- The coverage gates and knowledge-budget figures (A8). These stop the
  work decaying, which matters after the session and not before it.
- Deliverable-level benefit (D10). Inherits; nothing to do.
- Reconciling docs/VALUE-CAPTURE.md against this programme (A9).
- Confirming every drafted benefit. Three days will not do it, which is
  exactly why `benefit_status` is in the day-1 migration rather than a
  later refinement: it is the difference between "149 rows have a
  benefit" and a claim nobody can size.

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

Sixteen decisions are settled (D1 to D16) and the timebox has closed
most of what was open - a question whose answer only changes deferred
work is not a question worth asking this week. What remains is what
Session A needs to start, and what it will need on the way.

### Needed to start

**Q26. What already sits under the wrong department, that you know of?**
D12 makes the filtered view a source of truth, and the one failure it
cannot self-detect is a row that is present and should not be - a count
cannot see that, only a person can. Anything you already know saves a
wave off day 1. None is a fine answer; the walk is designed to find them.

**Q30. The six department framings.** You asked me to draft and you
correct. They are the yardstick the association sweep is measured
against, so they are needed before the sweep, not after it - drafted in
chat, not in this file.

**Q31. The central rows for the seeded method (D16).** I will propose
the handful I think are most central - the ones whose content will
travel furthest across the other 25 and beyond - and you correct the
selection before writing any of it. Choosing the wrong seeds wastes the
scarcest input in the programme, which is your time on day 2.

### Needed on the way, not now

- Which partner shapes actually diverge, once the first partner-heavy
  theme wave is in front of you (D14 gives the field; the vocabulary
  can be set when the rows are on screen).
- The rank order, if the department walk moves it (D11 holds it at
  delivery load until then).
- Whether any of the 25 should be dropped rather than answered - a
  judgement better made looking at the list than in advance.

### Deferred with their work

Everything in the deferred list above carries its own open questions -
the rank's storage, the gate ceilings, whether VALUE-CAPTURE.md is
superseded, whether the drawer needs a separate stakeholder mode. They
are recorded in the git history of this file rather than kept live here,
because a question list that outlives its decision point is how a plan
starts reading as a backlog.

## Resume

Read CLAUDE.md, docs/STATE.md, then this file. D1 to D4 are settled.
Session A is not started until Q16 to Q19 are answered; Session B is not
started until Session A's schema and drawer changes are committed and
green, and its parked-ownership list exists.
