-- ------------------------------------------------------------------
-- Applied 2026-08-09. Carries every work_items.relates_to_id into
-- knowledge_links: 35 source rows, 35 links, none unmigrated.
--
-- Written as relates_to / proposed, deliberately. The column said only
-- "these two are connected"; it did not say how. Around 15 of the 35
-- have a recoverable kind in their resolution text (8 read "Duplicate:
-- merged into...", 6 are automation-sweep components, 1 supersedes),
-- but asserting a kind here would be the assistant deciding on its own
-- authority. The upgrades happen in owner-confirmed waves (the script
-- is in docs/ROADMAP-INTAKE.md); until then `proposed` is honest about
-- what is actually known.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

insert into public.knowledge_links
  (from_type, from_id, to_type, to_id, kind, note, confidence, valid_from)
select 'work_item', wi.id, 'work_item', wi.relates_to_id, 'relates_to',
       'Migrated from work_items.relates_to_id on 2026-08-09; kind not yet adjudicated.',
       'proposed', now()
  from public.work_items wi
 where wi.relates_to_id is not null
   and exists (select 1 from public.work_items t where t.id = wi.relates_to_id)
on conflict do nothing;
