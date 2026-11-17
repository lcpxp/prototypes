-- ---------------------------------------------------------------
-- Snapshots of the Sprint Roadmap (17 Nov 2026): one dated document
-- per snapshot, so how the plan moved can be read back later.
-- ---------------------------------------------------------------

create or replace function public.sprint_plan_snapshot(p_label text)
returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.work_documents (title, kind, content, summary, status, captured_on, tags)
  select 'Sprint Roadmap snapshot: ' || p_label || ' (' || to_char(now(), 'DD Mon YYYY') || ')',
         'sprint',
         jsonb_pretty(jsonb_build_object(
           'taken_at', now(),
           'label', p_label,
           'anchor_sprint', (select sp.anchor_sprint from public.sprint_plan sp where sp.key = 'default'),
           'load', (select jsonb_agg(to_jsonb(l) order by l.slot) from public.v_sprint_plan_load l),
           'items', (select jsonb_agg(jsonb_build_object(
                        'work_item_id', v.work_item_id, 'item', v.title, 'workstream', v.workstream_title,
                        'slot', v.effective_slot, 'end_slot', v.effective_end_slot,
                        'overlap', v.overlap, 'placement', v.placement, 'status', w.status,
                        'stories_status', w.stories_status,
                        'points', (select sum((st->>'points')::numeric)
                                     from jsonb_array_elements(coalesce(w.user_stories, '[]'::jsonb)) st))
                      order by v.effective_slot, v.workstream_title, v.title)
                       from public.v_sprint_plan_items v
                       join public.work_items w on w.id = v.work_item_id))),
         'The Sprint Roadmap as it stood: every allocation with its sprint, span, points and status, and the load per sprint.',
         'active', current_date, array['sprint-plan', 'snapshot']
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.sprint_plan_snapshot(text) from public, anon;
grant execute on function public.sprint_plan_snapshot(text) to authenticated;

comment on function public.sprint_plan_snapshot(text) is
  'Stores the Sprint Roadmap as it stands as one work_documents row of kind sprint, tagged snapshot, and returns its id. Taken by /sprint-ready and /sprint-close (docs/SPRINT-DELIVERY.md Part B), and whenever the plan is re-mapped.';
