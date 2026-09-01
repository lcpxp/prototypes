# 101 - The decisions register

Twenty-one decisions taken for the presentation-readiness programme,
newest first in the numbering rather than in the file. This is a lookup
table: docs/plan/100-PRESENTATION-READINESS.md cites D-numbers from its
steps, docs/plan/110-BENEFIT-CONTENT.md from its waves, and neither
restates one.

Split from 100 on 2026-09-01, reversing a call made two commits earlier
that the decisions belong beside the steps they justify. True at
thirteen carried inline; false at twenty-one, which stopped being a
narrative and became a register - consulted by number, like the working
rules in 102.

Public repo: process only.
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

**D14. The route to market gets a field - `sales_route`, direct or
partner.** Revised 2026-09-01. The first version of this decision gave
partner *type* a field, on the reading that PFAC, EIT and referral
partners want materially different things. The owner's account of the
sales structure corrects it: Partner Sales is one managed group - ISOs,
ISVs, PFACs and referrals - run by account managers, given a similar
demo and similar access. The distinction that carries weight is not
among partner types but between **Direct Sales**, where PXP staff
onboard merchants into PXP, and **Partner Sales**, where a partner's
staff do.

So the field is the route, not the type. It answers "what are we
building for partner-led onboarding as against our own staff", which is
the question the roadmap cannot answer today and the one that decides
which of the two staff audiences in D9 a benefit is written for. Partner
type stays in prose; if a real divergence shows up in the theme waves it
can be added beneath the route later, and finding 8's 52 rows are where
that would surface.

**D15. The session is in three days, and the presentation surface
already exists.** Both halves matter.

The surface first, because it removes work rather than adding it:
modules/roadmap/ already carries a department filter, a per-row picker
for hiding individual rows (the custom view), hide-delivered,
hide-fixes, a detailed toggle and a wide mode. That is the whole of what
the session needs to drive. **Nothing on the presentation surface has to
be built.** What is wrong is entirely data, and data is the thing three
days can actually move.

The timebox second. This plan as written is three to six weeks of work.
Three days does not compress it; it selects from it. The selection is
below, and the rule behind it is that anything which does not change
what appears on screen when a department filter is applied waits.

**D17. The attribution rulings.** Settled 2026-09-01 against the six
framings, and recorded as a table because they are findings applied, not
principles. Each follows D1 - accountable for the outcome, tested by
where the benefit lands.

| Block | Owner | Associated | Why |
| --- | --- | --- | --- |
| Contract overhaul | Legal & Compliance | Product, Operations | The contract is Legal's artefact; the tooling is how they manage it |
| Pricing lines, service fees, minimums, ceilings | Sales & Commercial | Product, Finance | Pricing exists to sell; what a rate looks like is a commercial call |
| The pricing engine | Product & Technology | Sales, Finance | Driven by the KPI portal, which Product and Technology hosts and manages |
| Insights & Reporting | Operations & Onboarding | Finance | The insight sets measure operational flow, and Operations acts on them |
| Acquiring | Product & Technology | Risk & Underwriting | Acquirer enablement is platform and integration work |
| Defects, wherever they sit | Product & Technology | the area's owner | A defect's owner is whoever repairs it, not whoever trips over it |
| PFAC enablement, in full | Sales & Commercial | - | Sales-owned end to end; the owner's "also core launchpad" waits on D2's constraint |
| KPI data | Product & Technology | Operations | They host and manage the KPI portal |

Applied 2026-09-01: pricing lines and every child to Sales, Product
associated at the workstream only - the filter pulls children through
from an associated parent, so eleven tags were unnecessary. KPI data
re-owned, band deliberately untouched: the attribution was wrong, the
priority was not re-judged. PFAC enablement and every child to Sales.

**D18. Product and Technology owns two things, not one.** The framing
correction that matters most, because it changes what the largest
department is for. Product owns the platform; Technology owns product;
and Technology owns *other* products that LaunchPad both sells and
integrates with - core services built and managed there, Unity among
them. So Product and Technology is not the residual bucket and not
merely the enabler: it is the platform owner and the supplier of the
products and services the platform depends on.

This narrows what `core_launchpad` (D2) is for. If Technology already
owns the platform and the core services, the fallback is needed less
often than D2 assumed, and reaching for it should be rarer still.

**D19. Operations wants the automation and the AI, and is not
squeamish about either.** An earlier framing here warned against
leading with AI. That was wrong: the COO and Operations are pushing it,
and the alignment being sought is around AI plus tracking, reporting,
dashboards and integrations. Their frame is the removal of every manual
step, the monitoring of whatever stage, step or role is slowing an
application, and the tracking of leads and applications end to end.

**D20. Finance and Revenue is deliberately last.** Least important
currently, by the owner's own call - which changes D11's opening order
and is a sequencing statement, not a judgement of worth. Their real ask
is narrower and more concrete than the insight sets they nominally
owned: invoice detail, commissioning, lease against rental against
purchase, and clear access to the commercial information carried on
contracts. That is contract-adjacent, which puts Finance closer to
Legal's set than to Operations'.

**D21. The COO's requirements were captured; the source document was
not. Corrected 2026-09-01.** This decision previously said the
requirements "were never stored" and that Operations had "the thinnest
provenance of the six". A verification pass against the source text
shows that was wrong: the content was extracted thoroughly.

Against roughly thirty-five points in the source, all but five are
present, several near-verbatim, and several rows carry the attribution
in their own text. The baseline metric list was extracted as ten
deliverables under one workstream - which is why an item-level search
found nothing and reported a gap that did not exist.

The real finding is narrower and stands: **the source document was never
stored**, so the content is present but uncitable, and a later session
cannot check an extraction against what it came from. The owner has
ruled that this source stays out of the repository and out of
`work_documents`, so the gap is accepted deliberately rather than
closed, and accuracy rule 1 is unenforceable for these rows specifically.

Two failure modes, both worth keeping: a coverage gate counts the
quality of what was stored and never the fact of what was not; and a
search at the wrong altitude reports absence with exactly the confidence
of a search at the right one.

**D14. The route to market gets a field - `sales_route`, direct or
partner.** Revised 2026-09-01. The first version of this decision gave
partner *type* a field, on the reading that PFAC, EIT and referral
partners want materially different things. The owner's account of the
sales structure corrects it: Partner Sales is one managed group - ISOs,
ISVs, PFACs and referrals - run by account managers, given a similar
demo and similar access. The distinction that carries weight is not
among partner types but between **Direct Sales**, where PXP staff
onboard merchants into PXP, and **Partner Sales**, where a partner's
staff do.

So the field is the route, not the type. It answers "what are we
building for partner-led onboarding as against our own staff", which is
the question the roadmap cannot answer today and the one that decides
which of the two staff audiences in D9 a benefit is written for. Partner
type stays in prose; if a real divergence shows up in the theme waves it
can be added beneath the route later, and finding 8's 52 rows are where
that would surface.

**D15. The session is in three days, and the presentation surface
already exists.** Both halves matter.

The surface first, because it removes work rather than adding it:
modules/roadmap/ already carries a department filter, a per-row picker
for hiding individual rows (the custom view), hide-delivered,
hide-fixes, a detailed toggle and a wide mode. That is the whole of what
the session needs to drive. **Nothing on the presentation surface has to
be built.** What is wrong is entirely data, and data is the thing three
days can actually move.

The timebox second. This plan as written is three to six weeks of work.
Three days does not compress it; it selects from it. The selection is
below, and the rule behind it is that anything which does not change
what appears on screen when a department filter is applied waits.

**D17. The attribution rulings.** Settled 2026-09-01 against the six
framings, and recorded as a table because they are findings applied, not
principles. Each follows D1 - accountable for the outcome, tested by
where the benefit lands.

| Block | Owner | Associated | Why |
| --- | --- | --- | --- |
| Contract overhaul | Legal & Compliance | Product, Operations | The contract is Legal's artefact; the tooling is how they manage it |
| Pricing lines, service fees, minimums, ceilings | Sales & Commercial | Product, Finance | Pricing exists to sell; what a rate looks like is a commercial call |
| The pricing engine | Product & Technology | Sales, Finance | Driven by the KPI portal, which Product and Technology hosts and manages |
| Insights & Reporting | Operations & Onboarding | Finance | The insight sets measure operational flow, and Operations acts on them |
| Acquiring | Product & Technology | Risk & Underwriting | Acquirer enablement is platform and integration work |
| Defects, wherever they sit | Product & Technology | the area's owner | A defect's owner is whoever repairs it, not whoever trips over it |
| PFAC enablement, in full | Sales & Commercial | - | Sales-owned end to end; the owner's "also core launchpad" waits on D2's constraint |
| KPI data | Product & Technology | Operations | They host and manage the KPI portal |

Applied 2026-09-01: pricing lines and every child to Sales, Product
associated at the workstream only - the filter pulls children through
from an associated parent, so eleven tags were unnecessary. KPI data
re-owned, band deliberately untouched: the attribution was wrong, the
priority was not re-judged. PFAC enablement and every child to Sales.

**D18. Product and Technology owns two things, not one.** The framing
correction that matters most, because it changes what the largest
department is for. Product owns the platform; Technology owns product;
and Technology owns *other* products that LaunchPad both sells and
integrates with - core services built and managed there, Unity among
them. So Product and Technology is not the residual bucket and not
merely the enabler: it is the platform owner and the supplier of the
products and services the platform depends on.

This narrows what `core_launchpad` (D2) is for. If Technology already
owns the platform and the core services, the fallback is needed less
often than D2 assumed, and reaching for it should be rarer still.

**D19. Operations wants the automation and the AI, and is not
squeamish about either.** An earlier framing here warned against
leading with AI. That was wrong: the COO and Operations are pushing it,
and the alignment being sought is around AI plus tracking, reporting,
dashboards and integrations. Their frame is the removal of every manual
step, the monitoring of whatever stage, step or role is slowing an
application, and the tracking of leads and applications end to end.

**D20. Finance and Revenue is deliberately last.** Least important
currently, by the owner's own call - which changes D11's opening order
and is a sequencing statement, not a judgement of worth. Their real ask
is narrower and more concrete than the insight sets they nominally
owned: invoice detail, commissioning, lease against rental against
purchase, and clear access to the commercial information carried on
contracts. That is contract-adjacent, which puts Finance closer to
Legal's set than to Operations'.

**D21. The COO's requirements were never stored, and Operations goes
first because of it.** Checked rather than assumed on 2026-09-01: the
database holds six `work_notes` decisions recording how the roadmap
*responded* to the COO's asks, and several item summaries cite "the COO
priority note" as their source - but no such document exists in
`work_documents`. The requirements were triaged and the outcomes kept;
the source itself was never captured.

Three consequences:

- Operations is the largest department and would have had the thinnest
  provenance of the six, its framing resting on inference from decisions
  rather than on the source. Accuracy rule 1 exists to stop exactly that.
- docs/WORKFLOW.md requires raw material *and* a digest in
  `work_documents`. The `documents.no_digest` gate holds at zero and
  cannot see this, because a gate can only count documents that exist.
  That is a blind spot worth recording: the harness measures the quality
  of what was stored, never the fact of what was not.
- Four open rows currently diverge from what the COO asked for. One is
  settled (D17 moves the payment service work to Now with Operations
  associated); the other three - the Onboarding API pull model, terminal
  financing, and the ixopay work - stay open until the text is read
  rather than the note about it.

So the order changes: the email is stored with a digest, its
requirements are extracted, and Operations' attribution and benefit
content are worked first. Everything else in the day-1 cut follows it.

