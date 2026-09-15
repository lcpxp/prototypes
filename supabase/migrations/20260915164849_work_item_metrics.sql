-- ------------------------------------------------------------------
-- Applied 2026-09-15. work_item_metrics: the countable half of business
-- value. work_items.business_benefit says who stops doing what; this
-- says how much, per what, and how sure - because free text cannot be
-- added up across a sprint or a workstream.
--
-- Rationale beside each column in supabase/schema/36_value.sql; capture
-- method in docs/VALUE-CAPTURE.md.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

create table if not exists public.work_item_metrics (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  metric_kind text not null check (metric_kind in (
    'time_saved', 'touches_removed', 'steps_removed', 'tools_removed',
    'providers_removed', 'lag_removed', 'volume_enabled', 'spend_removed')),
  unit text not null check (unit in
    ('minutes', 'hours', 'days', 'count', 'percent', 'currency_gbp')),
  value numeric(12,2) not null check (value >= 0),
  basis text not null check (basis in
    ('per_application', 'per_merchant', 'per_order', 'per_partner',
     'per_week', 'per_month', 'per_year', 'one_off')),
  confidence text not null default 'estimated'
    check (confidence in ('estimated', 'measured', 'owner_stated')),
  note text,
  source_document_id uuid references public.work_documents (id) on delete set null,
  as_of date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_item_metrics_item_idx on public.work_item_metrics (work_item_id);
create index if not exists work_item_metrics_kind_idx on public.work_item_metrics (metric_kind, basis);

drop trigger if exists work_item_metrics_updated_at on public.work_item_metrics;
create trigger work_item_metrics_updated_at
  before update on public.work_item_metrics
  for each row execute function public.set_updated_at();

alter table public.work_item_metrics enable row level security;
