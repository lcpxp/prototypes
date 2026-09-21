-- Two readings the Sprint Roadmap could not carry before: what SHAPE a
-- piece of work is, and which ceiling it lifts.
--
-- scope answers a question the board was asked in the room and could not
-- answer: does this stream END? Payment Service and EIT are finite
-- activities with a clear objective; the inbound API is finite but
-- staged, and a stage is a legitimate stopping point; Risk Automation is
-- a standing objective that is maintained and improved rather than
-- finished. A reader cannot tell those apart from a bar's length.
alter table public.work_items
  add column if not exists scope text
    check (scope in ('finite', 'staged', 'continuous'));

comment on column public.work_items.scope is
  'finite = a bounded activity with a clear objective; staged = finite but delivered in stages, any of which is a valid stopping point; continuous = a standing objective maintained and improved rather than completed. Null means unclassified.';

-- scale_notes holds the CAPS this work removes, one short sentence each.
-- Deliberately not a work_item_metrics row: a metric counts what changes
-- per unit and is summed across a sprint, whereas "8-10 merchants a day,
-- because a human has to do the middle of it" is a ceiling that stops
-- existing. Summing it would be meaningless; leaving it out left the
-- board showing minutes saved and never the limit that actually caps
-- growth.
alter table public.work_items
  add column if not exists scale_notes text[] not null default '{}';

comment on column public.work_items.scale_notes is
  'Short statements of the daily cap or throughput ceiling this work removes, one per entry. Prose, not countable - work_item_metrics holds the countable half.';

-- The stakeholder view carries both, so the cards can render them
-- without a second fetch. Recreated in full rather than altered: a view
-- freezes its column list at creation, which is the whole reason
-- schema-drift.test.js watches it.
drop view if exists public.v_sprint_plan_streams;
create view public.v_sprint_plan_streams with (security_invoker = on) as
  select
    ws.id as workstream_id, ws.title as workstream_title,
    ws.priority, ws.department,
    ws.summary,
    ws.business_benefit, ws.benefit_type, ws.benefit_status,
    ws.pxp_staff_value, ws.partner_staff_value, ws.merchant_value,
    ws.scope, ws.scale_notes,
    min(v.effective_slot) as first_slot,
    max(v.effective_end_slot) as last_slot,
    max(v.effective_end_slot) - min(v.effective_slot) + 1 as slots_spanned,
    count(*) as item_count,
    count(*) filter (where v.is_external) as external_item_count,
    bool_or(v.is_external) as externally_gated,
    public.sprint_code_for_slot(min(v.effective_slot)) as start_code,
    public.sprint_code_for_slot(max(v.effective_end_slot)) as end_code
  from public.v_sprint_plan_items v
  join public.work_items ws on ws.id = v.workstream_id
  group by ws.id, ws.title, ws.priority, ws.department, ws.summary,
           ws.business_benefit, ws.benefit_type, ws.benefit_status,
           ws.pxp_staff_value, ws.partner_staff_value, ws.merchant_value,
           ws.scope, ws.scale_notes;

revoke all on public.v_sprint_plan_streams from public, anon;
grant select on public.v_sprint_plan_streams to authenticated;

comment on view public.v_sprint_plan_streams is
  'The Sprint Roadmap stakeholder view: one row per workstream with its span, contents, what it is (summary), its scope and the ceilings it lifts (scale_notes), who stops doing what (the audience-value fields) and the benefit prose behind them. A read entry point, not a board dependency.';
