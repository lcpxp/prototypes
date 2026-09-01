-- Business benefit as a first-class, queryable field, with the granular
-- audience tier beneath it and the route to market beside it.
--
-- Why columns rather than the attributes jsonb: the roadmap has to be
-- answerable ("every workstream with a revenue benefit"), and assignee
-- was already moved out of jsonb for the same reason - the portal
-- surfaced raw keys badly. merchant_value and pxp_value existed as
-- jsonb keys, rendered in the drawer, and held zero rows on every item,
-- so nothing is migrated and the names are free to be correct.

alter table public.work_items
  -- The primary field: what this buys PXP as a commercial and
  -- operational entity. What a stakeholder reads first.
  add column if not exists business_benefit text,

  -- The shape of that benefit, so the roadmap can be queried by it
  -- rather than only read. defect_cost is the honest answer for a row
  -- whose benefit is that it is broken: a cost of leaving it, not a
  -- business case.
  add column if not exists benefit_type text
    check (benefit_type in ('cost_removed', 'failure_prevented',
      'revenue_enabled', 'revenue_retained', 'decision_enabled',
      'obligation_met', 'defect_cost')),

  -- Drafted until the owner confirms it in as many words, the same
  -- idiom as a proposed knowledge link. A benefit an assistant wrote
  -- must never be indistinguishable from one that was checked.
  add column if not exists benefit_status text
    check (benefit_status in ('drafted', 'confirmed')),

  -- The granular tier: who feels it. All three optional, and an empty
  -- merchant_value is usually the CORRECT answer - the merchant is the
  -- customer being onboarded and rarely the beneficiary of this work.
  add column if not exists pxp_staff_value text,
  add column if not exists partner_staff_value text,
  add column if not exists merchant_value text,

  -- Direct sales (PXP staff onboarding merchants) against partner sales
  -- (a partner's staff doing it). The distinction that decides which
  -- staff audience a benefit is written for.
  add column if not exists sales_route text
    check (sales_route in ('direct', 'partner'));

-- A benefit that is stored must carry its checked/unchecked state, or
-- the whole point of benefit_status is lost the first time someone
-- forgets to set it.
alter table public.work_items
  drop constraint if exists work_items_benefit_status_present;
alter table public.work_items
  add constraint work_items_benefit_status_present
  check (business_benefit is null or benefit_status is not null);

create index if not exists work_items_benefit_type_idx
  on public.work_items (benefit_type)
  where benefit_type is not null;

create index if not exists work_items_sales_route_idx
  on public.work_items (sales_route)
  where sales_route is not null;
