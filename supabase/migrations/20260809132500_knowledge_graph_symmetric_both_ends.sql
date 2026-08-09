-- ------------------------------------------------------------------
-- Applied 2026-08-09. Fix: a symmetric link was only visible from one
-- end.
--
-- knowledge_links stores a symmetric pair once, in canonical endpoint
-- order, so the item that sorted second could never see its own
-- relationship - "Related to" appeared on A and not on B. The reverse
-- branch of knowledge_graph excluded symmetric kinds, confusing "do not
-- store twice" with "do not read from both ends". Found by counting
-- readings: 35 stored links produced 35 readings across 26 rows, when
-- they should produce 70 across 51.
--
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

create or replace view public.knowledge_graph
  with (security_invoker = on) as
  select l.id, l.from_type as src_type, l.from_id as src_id,
         l.to_type as dst_type, l.to_id as dst_id,
         l.kind, k.label as reads, k.family, k.is_symmetric,
         l.note, l.confidence, l.valid_from
    from public.knowledge_links l
    join public.link_kinds k on k.key = l.kind
   where l.valid_to is null
  union all
  select l.id, l.to_type, l.to_id, l.from_type, l.from_id,
         l.kind,
         case when k.is_symmetric then k.label else k.inverse_label end,
         k.family, k.is_symmetric,
         l.note, l.confidence, l.valid_from
    from public.knowledge_links l
    join public.link_kinds k on k.key = l.kind
   where l.valid_to is null;
