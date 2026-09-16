-- The stakeholder cards below the sprint board are a DISCUSSION surface,
-- not a paragraph to read: a short statement of what the thing is, then
-- who stops doing what, then the prose for whoever wants it. All three
-- already exist on work_items - summary, the three audience-value fields
-- and business_benefit - so the view simply carries them rather than the
-- page inventing structure out of one block of text.

drop view if exists public.v_sprint_plan_streams;
create view public.v_sprint_plan_streams with (security_invoker = on) as
  select
    ws.id as workstream_id, ws.title as workstream_title,
    ws.priority, ws.department,
    ws.summary,
    ws.business_benefit, ws.benefit_type, ws.benefit_status,
    ws.pxp_staff_value, ws.partner_staff_value, ws.merchant_value,
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
           ws.pxp_staff_value, ws.partner_staff_value, ws.merchant_value;

revoke all on public.v_sprint_plan_streams from public, anon;
grant select on public.v_sprint_plan_streams to authenticated;

comment on view public.v_sprint_plan_streams is
  'The Sprint Roadmap stakeholder view: one row per workstream with its span, contents, what it is (summary), who stops doing what (the audience-value fields) and the benefit prose behind them. A read entry point, not a board dependency.';
