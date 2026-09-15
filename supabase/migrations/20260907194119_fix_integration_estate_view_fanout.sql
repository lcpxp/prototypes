-- ------------------------------------------------------------------
-- Applied 2026-09-07. Fixes v_integration_estate, which counted
-- capabilities and notes across a single join and so multiplied every
-- count by the number of rows on the other side. The two children are
-- now aggregated separately and joined as subqueries.
--
-- RECOVERED 2026-09-15 from the live database; see the note in
-- 20260907193920_integration_estate_capabilities_and_notes.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

drop view if exists public.v_integration_estate;
create view public.v_integration_estate as
  select
    i.id, i.name, i.category, i.estate, i.status, i.direction, i.purpose, i.sort_order,
    coalesce(c.capabilities_live, 0) as capabilities_live,
    coalesce(c.capabilities_available, 0) as capabilities_available,
    coalesce(c.swap_targets, 0) as swap_targets,
    coalesce(n.open_questions, 0) as open_questions,
    coalesce(n.notes_total, 0) as notes_total
  from public.integrations i
  left join (
    select integration_id,
           count(*) filter (where availability = 'live') as capabilities_live,
           count(*) filter (where availability = 'available') as capabilities_available,
           count(*) filter (where replaces_integration_id is not null) as swap_targets
      from public.integration_capabilities group by integration_id) c on c.integration_id = i.id
  left join (
    select integration_id,
           count(*) filter (where status = 'open') as open_questions,
           count(*) as notes_total
      from public.integration_notes group by integration_id) n on n.integration_id = i.id;

drop view if exists public.v_integration_swap_map;
create view public.v_integration_swap_map as
  select
    src.id as offered_by_id, src.name as offered_by,
    c.group_label, c.name as capability, c.availability,
    tgt.id as replaces_id, tgt.name as replaces, tgt.category as replaces_category,
    c.replaces_note, c.as_of
  from public.integration_capabilities c
  join public.integrations src on src.id = c.integration_id
  join public.integrations tgt on tgt.id = c.replaces_integration_id;
