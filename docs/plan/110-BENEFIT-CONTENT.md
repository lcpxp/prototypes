# 110 - Business benefit: the content standard and Session B

Session B of the presentation-readiness programme. Its decisions (D1 to
D13) and risks live in docs/plan/100-PRESENTATION-READINESS.md, the
figures it works against in docs/plan/105-MEASURED-POSITION.md, and the
accuracy discipline and propagation rule that bind every wave in
docs/plan/102-WORKING-RULES.md. None of those is restated here; this
file is the content standard and the waves that apply it.

Split from 100 at the line trigger its own acknowledgement named, once
D5 to D8 landed.

Public repo: process only. No item titles, no benefit text, no
departmental verdicts. Those live in Supabase.

## What business benefit has to mean

Not a restatement of the feature. "Merchants can be onboarded faster"
is not a benefit if the item is called "speed up onboarding" - that is
the title in different words. A benefit answers at least one of:

- **Who stops doing something.** Named team, named manual step, rough
  volume or frequency.
- **What stops going wrong.** The failure mode today, and what it costs
  when it fires - rework, a regenerated contract, a lost merchant, an
  escalation.
- **What we can sell or keep that we cannot today.** A partner type, a
  deal, an acquirer, a region, a retention risk.
- **What a decision-maker can see that they cannot today.** Only where
  the decision changes as a result; "visibility" alone is not a benefit.
- **What we are obliged to do.** Compliance, audit, contractual or
  acquirer-mandated. Say which obligation.

A named cost, a named failure, a named beneficiary. That is the bar, and
a draft that does not clear it gets rejected rather than softened.

Where a row is simply broken, the honest benefit is a **cost of leaving
it**: what happens today, how often, who absorbs it. Not everything
needs a business case; a defect needs a price.

## The four fields and their altitudes

Per D3, D5 and D9. The altitude is the whole point: two fields answering
one question is the duplication finding 4 warned about; four fields
answering at four different altitudes is a hierarchy.

- **`business_benefit`** - required, and the primary field. The
  departmental and PXP-wide reading: what this buys the business as a
  commercial and operational entity. This is what a stakeholder deck
  leads with and what the drawer shows first.
- **`pxp_staff_value`** - optional. What changes for the PXP person
  onboarding a direct merchant. Renamed from `pxp_value`, which is free
  to rename because it holds no rows.
- **`partner_staff_value`** - optional, and new. What changes for a
  partner company's staff onboarding merchants into PXP. This audience
  had no field at all and is one of the two the work is actually for.
- **`merchant_value`** - optional, and expected to be empty far more
  often than not. The merchant is the end customer being onboarded, and
  usually benefits only through how the work changes what PXP or partner
  staff do with their details. The intended merchant contributor role -
  a merchant completing their own details - is the limited case where a
  direct merchant benefit is real.

Optional means *where appropriate*, not *where convenient*. The
distinction that matters, from D9: **an empty `merchant_value` is
usually the correct answer**, and the coverage gate must never treat it
as a defect. Gating it would manufacture up to 149 false gaps and push a
session into writing merchant-framed text that misdescribes who the work
is for. `pxp_staff_value` and `partner_staff_value` are the two where an
empty field on a row squarely about onboarding is worth a second look.

Deliverables (D10) inherit their parent's fields and write their own
only where the reading genuinely differs.

`benefit_type` (D6) is required alongside `business_benefit`, from the
seven: cost removed, failure prevented, revenue enabled, revenue
retained, decision enabled, obligation met, defect cost.

## The second audience: stories and collateral

D5 is the reason the granular tier exists at all, and it changes how the
text is written. This content is not only read in a deck - it is the
source material for **user stories** and, later, **marketing
collateral**. Two consequences, both binding on every wave:

**Write each granular field so a role and a change of behaviour are both
present.** A user story needs a role, a capability and a reason. D9
supplies the roles - a PXP onboarding operator, a partner company's
staff member, and in the limited case a merchant contributor - so the
role comes from which field the text sits in, the capability from the
item itself, and the reason is what the field must supply. So "faster
onboarding" fails twice over, no role and no behaviour, where "an
operator stops re-keying details that arrived in the application" gives
a story writer everything but the verb.

The partner field is the one to watch. It is new, its audience is
outside PXP, and it is the likeliest source of collateral - so a line
there that only parses internally has failed at the job the field was
added for.

**Keep it free of internal shorthand.** Collateral is written for people
outside PXP. A benefit that only parses if you already know the platform
cannot be lifted into anything customer-facing, and rewriting 176 of
them later costs more than writing them plainly once.

The test to apply before accepting any draft: could somebody who has
never seen this roadmap turn this line into a user story without asking
a question? If not, it is not finished.

This does not mean writing stories in these fields. The fields hold
benefit prose; the stories are generated from it later, and the JSON
export is what carries it to whoever generates them - which is why A7
keeps the exports in step with the drawer rather than behind it.

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

## How content goes wrong here

The accuracy discipline in 102 gives the six rules. These are the six
specific ways this dataset will break them, written down because a
failure mode you can name is one you can check for.

**Restating the title.** "Merchants can be onboarded faster" against an
item called "speed up onboarding". The check: cover the title and read
the benefit. If it no longer says anything, it never did.

**Writing a merchant benefit where there is none.** D9's correction, and
the one this plan already made once. The merchant is usually not the
beneficiary. An empty `merchant_value` is the right answer far more
often than a filled one, and a session that fills all three granular
fields on every row has misunderstood the model rather than been
thorough.

**Propagating by resemblance.** Finding 8 counted 52 rows mentioning a
partner, and they do not all mean the same partner. A benefit written
for one partner shape, fanned across rows that share the word, produces
content that is wrong in a way nobody catches - it reads correctly and
describes the wrong thing. Propagate by parentage, theme, explicit link
or owner instruction. Never by similarity.

**Inheriting onto a child that does something else.** A workstream's
benefit frames its children; it does not describe them. Where a child's
share of the parent benefit cannot be stated in a sentence, that is a
signal the child may not belong under that parent - which is a finding
worth more than the benefit would have been.

**Naming a department the row does not carry.** If the benefit lands on
Operations and the row is owned by Product, one of the two is wrong.
Raise it; do not quietly write around it. Session A's parked list exists
for exactly this collision and this is the pass most likely to find the
ones it missed.

**Confirming by silence.** A wave presented and not objected to is not a
wave confirmed. Those rows stay `drafted`, and the count is reported at
close rather than rounded away.

## The wave ritual

Five to eight rows at a time. Ask, wait, write that batch, move on.

1. **Derive everything first.** Before asking about any row, read its
   summary, details, tags, parent workstream, source document, work
   notes and knowledge links. Most rows already carry enough to draft a
   credible benefit. Ask the owner to confirm or correct a draft; never
   ask for what the system already holds.
2. **Draft two or three candidates** where a benefit needs a sentence
   from the owner, and let them pick, edit or reject. Composing from
   nothing is the slowest possible way to spend an owner's attention.
3. **Frame each wave with the parent's agreed benefit**, so the question
   is "what is this one's share of that" rather than a cold start.
4. **Show the exact rows before writing them.**
5. **Nothing is invented.** Where the owner does not know, write a
   `work_notes` row with `kind='question'` anchored to the item. A
   recorded question is a better state than a confident sentence nobody
   checked - and a plausible business case is indistinguishable from a
   checked one to everybody except the person it embarrasses.
6. **Nothing is deleted.** Close with a status and a resolution.
7. **A link written here is `proposed`** until the owner confirms it in
   as many words.

No emojis. Plain, specific, sentence case, per CLAUDE.md.

## Resume

Read CLAUDE.md, docs/STATE.md, docs/plan/100-PRESENTATION-READINESS.md,
then this file. Session B does not start until Session A's schema and
drawer changes are committed and green, and its parked-ownership list
exists. Then work B1 to B7 in order; the queue query and the progress
check are the same shape as the ones in docs/VALUE-CAPTURE.md, widened
to the four fields.

## The queue and the measure

Two queries, the same shape as docs/VALUE-CAPTURE.md's, widened to the
four fields and the drafted/confirmed state. The queue drives each wave;
the measure is what the programme closes on.

    -- The queue: open rows with no business benefit, most-read first
    select wi.id, wi.level, wi.title, rc.label as theme,
           wi.horizon, wi.priority, wi.department,
           (wi.source_document_id is not null) as has_source,
           length(coalesce(wi.details,'')) as details_len
    from work_items wi
    left join roadmap_categories rc on rc.id = wi.category_id
    where wi.status not in ('done','dropped')
      and wi.level <> 'deliverable'
      and coalesce(wi.business_benefit,'') = ''
    order by
      case wi.level when 'workstream' then 0 else 1 end,
      case wi.horizon when 'now' then 0 when 'next' then 1
                      when 'later' then 2 else 3 end,
      wi.priority;

    -- The measure: coverage and how much of it is checked
    select count(*) as open_rows,
      count(*) filter (where coalesce(business_benefit,'') <> '') as with_benefit,
      count(*) filter (where benefit_status = 'confirmed') as confirmed,
      count(*) filter (where benefit_status = 'drafted') as drafted,
      count(*) filter (where coalesce(pxp_staff_value,'') <> '') as pxp_staff,
      count(*) filter (where coalesce(partner_staff_value,'') <> '') as partner_staff,
      count(*) filter (where coalesce(merchant_value,'') <> '') as merchant
    from work_items
    where status not in ('done','dropped') and level <> 'deliverable';

The second query is the close-out. Report both numbers, never just the
first: "benefit coverage went from 22 to 149" says nothing useful if 130
of those are unconfirmed drafts, and saying so is the difference between
a report and a claim.

Then `select * from roadmap_embed_refresh();`, because every benefit
written leaves that row's vector describing text that no longer exists.
