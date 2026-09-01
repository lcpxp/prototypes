# Business benefit: the capture manual

How to fill the fields that say WHY a roadmap row exists, and how to keep
them honest. Public repo, so this file is process only - no item titles,
no benefit text, no departmental verdicts. The content lives in Supabase
(project ref `zlmkofbkobmhnslfnqsf`).

Read docs/ROADMAP-PLAYBOOK.md first for the model and the fields;
docs/ROADMAP-INTAKE.md for contextualising a request before you write.

## The four fields, and their altitudes

Real columns on `work_items`, not attribute keys. They replaced
`attributes.merchant_value` and `attributes.pxp_value` in Sept 2026 -
both had rendered in the drawer for months and held zero rows, so the
names were free to be correct.

| Field | Required | Answers |
| --- | --- | --- |
| `business_benefit` | the primary one | What this buys PXP as a commercial and operational entity |
| `pxp_staff_value` | optional | What changes for the PXP person onboarding a merchant |
| `partner_staff_value` | optional | What changes for a partner company's staff |
| `merchant_value` | optional | What changes for the merchant being onboarded |

Two more sit beside them: `benefit_type`, from a checked vocabulary, and
`benefit_status`, which is `drafted` until the owner confirms it.
`sales_route` (direct or partner) says which staff audience a benefit is
written for.

**The audience model, because getting it backwards is the easy mistake.**
The people this work benefits are PXP staff onboarding direct merchants
and partner companies' staff onboarding merchants into PXP. The merchant
is the customer being onboarded and usually benefits only through what
staff have to do with their details. **An empty `merchant_value` is
normally the correct answer**, and a row with all three granular fields
filled is more often a misunderstanding than a thorough job.

## What a benefit has to say

Not the title in different words. "Merchants can be onboarded faster" is
not a benefit for an item called "speed up onboarding". A benefit names
at least one of: who stops doing something (named team, named manual
step), what stops going wrong (the failure today and what it costs when
it fires), what can be sold or kept that cannot be today, what a
decision-maker can see that changes a decision, or what obligation is
met.

A named cost, a named failure or a named obligation, plus a named
beneficiary. Below that bar, reject the draft rather than soften it -
vaguer language survives review by saying nothing.

Where a row is simply broken, the honest type is `defect_cost` and the
honest content is a **cost of leaving it**: what happens today, how
often, who absorbs it. Not everything needs a business case; a defect
needs a price.

## benefit_type

    cost_removed        a named manual step or licence stops being paid for
    failure_prevented   a failure mode that fires today stops firing
    revenue_enabled     something sellable that cannot be sold today
    revenue_retained    something at risk of being lost is kept
    decision_enabled    a decision changes because it can now be seen
    obligation_met      compliance, audit, contractual, acquirer-mandated
    defect_cost         it is broken; this is the cost of leaving it

Rendered by `assets/js/pages/roadmap/detail-values.js` and held against
the constraint by tests/checks/render-coverage.test.js, so adding a value
without a label fails the build.

## The second audience: stories and collateral

This content is not only read in a deck. It is the source material for
user stories and, later, marketing collateral. Two consequences that bind
every wave:

- **A role and a change of behaviour in every granular line.** The role
  comes from which field the line sits in; the field must supply the
  behaviour. "Faster onboarding" fails twice - no role, no behaviour.
  "An operator stops re-keying details that arrived in the application"
  gives a story writer everything but the verb.
- **No internal shorthand.** Collateral is read outside PXP. A line that
  only parses if you already know the platform cannot be lifted, and
  rewriting them later costs more than writing them plainly once.

The test before accepting any draft: could somebody who has never seen
this roadmap turn this line into a user story without asking a question?

## The accuracy discipline

The failure to avoid is not an empty field. It is a fluent, plausible
benefit nobody verified, reading exactly like one that was checked.

1. **Derive before asking, and cite what you derived from.** Most rows
   carry details, an anchored note, a knowledge link or a source
   document. Draft from those and record which.
2. **A row with none of that is asked, never drafted.** Nothing but a
   title gives a drafter nothing to be right about. Write a `work_notes`
   row with `kind='question'` instead. This is the rule most likely to
   break under time pressure.
3. **Evidence travels with the claim.** An answer generalises to another
   row only where the same evidence holds - by parentage, by theme, by an
   explicit link, or because the owner said so. Never by resemblance:
   semantic similarity is how one benefit ends up on four rows that
   merely share vocabulary, and the embedding index makes that easy and
   invisible.
4. **Contradictions are raised, not resolved.** A benefit implying a
   department the row does not carry is a reconciliation finding.
5. **Confirmed means the owner said so**, not that they did not object to
   a batch. Silence leaves rows `drafted`, and the close-out reports how
   many.

## The wave ritual

Five to eight rows at a time. Ask, wait, write that batch, move on.

1. Read the row's summary, details, tags, parent, source document, notes
   and links before asking anything.
2. Where a sentence is needed from the owner, draft two or three
   candidates and let them pick, edit or reject. Composing from nothing
   is the slowest way to spend their attention.
3. Frame each wave with the parent's agreed benefit, so the question is
   "what is this one's share of that" rather than a cold start.
4. Show the exact rows before writing them.
5. Nothing invented, nothing deleted. Close with a status and a
   resolution; a link an assistant writes is `proposed` until confirmed.

Order: workstreams first (they are read without their children), then
items by band, then only the deliverables whose benefit genuinely differs
from their parent's - most inherit.

No emojis. Plain, specific, sentence case.

## Queue and measure

    -- The queue: open rows with no benefit, most-read first
    select wi.id, wi.level, wi.title, rc.label as theme,
           wi.horizon, wi.department,
           (wi.source_document_id is not null) as has_source,
           length(coalesce(wi.details,'')) as details_len
    from work_items wi
    left join roadmap_categories rc on rc.id = wi.category_id
    where wi.status not in ('done','dropped')
      and wi.level <> 'deliverable'
      and wi.business_benefit is null
    order by case wi.level when 'workstream' then 0 else 1 end,
             case wi.horizon when 'now' then 0 when 'next' then 1
                             when 'later' then 2 else 3 end,
             wi.priority;

    -- The measure. Report BOTH numbers, never just coverage:
    -- "149 rows have a benefit" says nothing if 130 are unchecked.
    select count(*) as open_rows,
      count(*) filter (where business_benefit is not null) as with_benefit,
      count(*) filter (where benefit_status = 'confirmed') as confirmed,
      count(*) filter (where benefit_status = 'drafted') as drafted,
      count(*) filter (where pxp_staff_value is not null) as pxp_staff,
      count(*) filter (where partner_staff_value is not null) as partner_staff,
      count(*) filter (where merchant_value is not null) as merchant
    from work_items
    where status not in ('done','dropped') and level <> 'deliverable';

`npm run knowledge` carries `items.no_benefit` and
`items.benefit_unconfirmed` as ratcheted figures, so coverage that slips
is caught rather than noticed.

## Finish every session with

    select * from roadmap_embed_refresh();

Every benefit written leaves that row's meaning vector describing text
that no longer exists. `embeddings.stale` is held at zero by a gate, so
skipping this is caught later, by someone else.
