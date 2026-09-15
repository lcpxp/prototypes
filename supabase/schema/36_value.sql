-- ------------------------------------------------------------------
-- 36_value.sql - work_item_metrics: the countable half of business
-- value.
--
-- 30_work.sql already carries the PROSE half on work_items itself -
-- business_benefit (who stops doing what), benefit_type (the shape of
-- the benefit) and the three audience readings. Those say why a row
-- exists. They cannot be added up: "30 minutes saved per application"
-- inside a paragraph is invisible to a query, so a sprint's worth or a
-- workstream's worth can only ever be read one row at a time.
--
-- This table is the same claim as a number, with the basis it is per
-- and how sure we are of it. It does not replace or duplicate the
-- prose - a metric with no benefit written against it is a figure
-- nobody can interpret. Capture method: docs/VALUE-CAPTURE.md.
--
-- It lives in its own file rather than in 30_work.sql because that
-- file sits at the seam its own size-budget acknowledgement names;
-- this is a distinct subject with its own capture rules, so it is a
-- clean place to stop rather than a fragment.
-- ------------------------------------------------------------------

create table if not exists public.work_item_metrics (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null
    references public.work_items (id) on delete cascade,

  -- What kind of impact this is. Deliberately narrow: every value here
  -- is something a person can point at on a working day, which is the
  -- test a benefit has to pass anyway.
  metric_kind text not null check (metric_kind in (
    'time_saved',         -- a named manual step stops taking time
    'touches_removed',    -- an exchange, handoff or round trip stops happening
    'steps_removed',      -- a step in a process stops being performed
    'tools_removed',      -- an external tool stops being needed
    'providers_removed',  -- a provider or contract stops being held
    'lag_removed',        -- waiting time between steps disappears
    'volume_enabled',     -- something becomes possible that has no route today
    'spend_removed'       -- a cost stops being paid
  )),

  unit text not null check (unit in
    ('minutes', 'hours', 'days', 'count', 'percent', 'currency_gbp')),

  value numeric(12,2) not null check (value >= 0),

  -- What the value is PER. Without this a number is unreadable: thirty
  -- minutes per application and thirty minutes per year are different
  -- claims by three orders of magnitude.
  basis text not null check (basis in
    ('per_application', 'per_merchant', 'per_order', 'per_partner',
     'per_week', 'per_month', 'per_year', 'one_off')),

  -- The honesty valve, and the counterpart to benefit_status. An
  -- assistant writes 'estimated'. 'owner_stated' only where the owner
  -- gave the figure in as many words. 'measured' only where a source
  -- records it. A plausible number nobody checked is the failure this
  -- column exists to make visible.
  confidence text not null default 'estimated'
    check (confidence in ('estimated', 'measured', 'owner_stated')),

  note text,
  source_document_id uuid
    references public.work_documents (id) on delete set null,
  as_of date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_item_metrics_item_idx
  on public.work_item_metrics (work_item_id);
create index if not exists work_item_metrics_kind_idx
  on public.work_item_metrics (metric_kind, basis);

drop trigger if exists work_item_metrics_updated_at on public.work_item_metrics;
create trigger work_item_metrics_updated_at
  before update on public.work_item_metrics
  for each row execute function public.set_updated_at();

comment on table public.work_item_metrics is
  'The countable half of business value: what a work item changes, per what, and how sure. Companion to work_items.business_benefit. See docs/VALUE-CAPTURE.md.';

-- ---------------------------------------------------------------
-- The rollup. Summed by (kind, unit, basis) and never across them -
-- minutes per application and minutes per year are different claims,
-- and adding them produces a number that means nothing. Rolls at item
-- level and carries the workstream so a stream total is one group by.
--
-- weakest_confidence is min() over the confidence values, which sorts
-- estimated < measured < owner_stated alphabetically by luck rather
-- than design - but the useful property holds: a rollup containing any
-- estimate reports 'estimated', so a total is never presented as
-- firmer than its softest input.
-- ---------------------------------------------------------------

drop view if exists public.v_work_item_metric_rollup;
create view public.v_work_item_metric_rollup with (security_invoker = on) as
  select
    w.id as work_item_id, w.title as work_item_title,
    w.parent_id as workstream_id, p.title as workstream_title,
    m.metric_kind, m.unit, m.basis,
    sum(m.value) as total,
    min(m.confidence) as weakest_confidence,
    count(*) as metric_rows
  from public.work_item_metrics m
  join public.work_items w on w.id = m.work_item_id
  left join public.work_items p on p.id = w.parent_id
  group by w.id, w.title, w.parent_id, p.title, m.metric_kind, m.unit, m.basis;

revoke all on public.v_work_item_metric_rollup from public, anon;
grant select on public.v_work_item_metric_rollup to authenticated;

comment on view public.v_work_item_metric_rollup is
  'work_item_metrics summed by kind, unit and basis - never across them. See docs/VALUE-CAPTURE.md.';
