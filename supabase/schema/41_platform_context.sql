-- ------------------------------------------------------------------
-- 41_platform_context.sql - The retrieval surface for platform
-- knowledge: everything the system knows about one area, in one call.
--
-- Why this exists. docs/PLATFORM.md has always described a three-step
-- retrieval protocol - capabilities for the area, then work_items for
-- the same area_id, then the source document only if needed. Six
-- tables, six queries, written out by hand in every session that
-- bothered. Measured on 2026-09-07, most did not bother: eight product
-- areas carried 186 open work items and zero capabilities, the
-- `affects` link kind had no rows at all, and docs/ROADMAP-INTAKE.md -
-- the protocol that runs on every quick capture, the highest-volume
-- write path there is - never read product_capabilities once.
--
-- A protocol nobody runs is a protocol that is too expensive to run.
-- This makes grounding one call, so intake can afford it.
--
-- NOT security definer, deliberately. Every table underneath keeps its
-- own RLS: capabilities and terms behind the platform grant, work
-- items behind roadmap-or-backlog, notes and documents behind backlog,
-- endpoints behind reference. A caller without one of those gets an
-- empty array for that section rather than an error - the same
-- degrade-gracefully contract modules/platform/ renders under.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- platform_context(area_key): what is known, and what is planned,
-- about one area of the platform.
--
-- Pass null to orient: the platform-level statements (the rows that
-- belong to no area) plus the index of areas and their coverage.
--
-- Blocks are included for capabilities, because the detail is the
-- point of the call; the deep archive (work_documents.content) is not,
-- and stays a deliberate second query.
-- ---------------------------------------------------------------

create or replace function public.platform_context(p_area_key text default null)
returns jsonb
language sql
stable
set search_path = public
as $$
with area as (
  select a.* from public.work_areas a
   where p_area_key is not null and a.key = p_area_key
),
caps as (
  select c.* from public.product_capabilities c
   where (p_area_key is null and c.area_id is null)
      or c.area_id = (select id from area)
),
cap_ids as (select id from caps),
-- Everything the capabilities in scope are linked to, read from both
-- ends: a link is stored once and means something from either side.
edges as (
  select g.dst_type as other_type, g.dst_id as other_id, g.kind, g.reads,
         g.src_id as cap_id, g.confidence
    from public.knowledge_graph g
   where g.src_type = 'capability' and g.src_id in (select id from cap_ids)
)
select jsonb_build_object(
  'area', (select to_jsonb(a) - 'created_at' - 'updated_at' from area a),
  'capabilities', coalesce((
    select jsonb_agg(jsonb_build_object(
             'key', c.key, 'title', c.title, 'summary', c.summary,
             'domain', c.domain, 'kind', c.kind, 'maturity', c.maturity,
             'attestation', c.attestation, 'as_of', c.as_of,
             'tags', c.tags, 'blocks', c.blocks)
           order by c.sort_order, c.title)
      from caps c), '[]'::jsonb),
  -- The lifecycle stages these capabilities sit in. Area-scoped rather
  -- than the whole 13, so the answer is about this area.
  'stages', coalesce((
    select jsonb_agg(jsonb_build_object(
             'stage_no', s.stage_no, 'key', s.key, 'title', s.title,
             'actor', s.actor, 'description', s.description)
           order by s.stage_no)
      from public.journey_stages s
     where s.id in (select other_id from edges where other_type = 'stage')), '[]'::jsonb),
  -- Terms filed against the area, plus any a capability is linked to.
  'terms', coalesce((
    select jsonb_agg(distinct jsonb_build_object(
             'term', t.term, 'expansion', t.expansion,
             'definition', t.definition, 'verified', t.verified))
      from public.domain_terms t
     where t.area_id = (select id from area)
        or t.id in (select other_id from edges where other_type = 'term')), '[]'::jsonb),
  -- Facts and decisions captured in passing. These are platform truths
  -- the capability catalogue never absorbed; 51 of them existed as
  -- anonymous bullets before this call had a reason to return them.
  'notes', coalesce((
    select jsonb_agg(jsonb_build_object(
             'kind', n.kind, 'body', n.body, 'status', n.status,
             'recorded', n.created_at::date)
           order by n.created_at desc)
      from public.work_notes n
     where n.area_id = (select id from area)
       and n.kind in ('fact', 'decision', 'risk')
       and n.status = 'active'), '[]'::jsonb),
  -- The API surface these capabilities are served by. Empty until the
  -- capability -> endpoint links are written; that is the point of
  -- having the endpoint entity type at all.
  'endpoints', coalesce((
    select jsonb_agg(jsonb_build_object(
             'method', e.method, 'path', e.path, 'tag', e.tag,
             'summary', e.summary, 'deprecated', e.deprecated)
           order by e.path)
      from public.api_endpoints e
     where e.id in (select other_id from edges where other_type = 'endpoint')), '[]'::jsonb),
  -- What has been delivered here, and what is queued. This is the
  -- today-versus-planned axis in one place: capabilities above are what
  -- exists, these are what changed it and what is coming.
  'delivered', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id, 'title', i.title, 'summary', i.summary,
             'resolution', i.resolution, 'resolved', i.resolved_at::date)
           order by i.resolved_at desc nulls last)
      from public.work_items i
     where i.area_id = (select id from area) and i.status = 'done'), '[]'::jsonb),
  'planned', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id, 'title', i.title, 'summary', i.summary,
             'status', i.status, 'horizon', i.horizon, 'level', i.level,
             'business_benefit', i.business_benefit)
           order by i.priority, i.sort_order)
      from public.work_items i
     where i.area_id = (select id from area)
       and i.status not in ('done', 'dropped')), '[]'::jsonb),
  -- Where each capability came from, so a session can weigh it without
  -- a second query. A derived row names its sources; an unattested one
  -- names none, and that is the answer.
  'provenance', coalesce((
    select jsonb_agg(jsonb_build_object(
             'capability', c.key, 'attestation', c.attestation,
             'as_of', c.as_of,
             'source_document', (select d.title from public.work_documents d
                                  where d.id = c.source_document_id),
             'evidence', (select count(*) from edges e
                           where e.cap_id = c.id and e.kind = 'about')))
      from caps c), '[]'::jsonb),
  -- The index, so a null call orients rather than returning nothing.
  'areas', case when p_area_key is null then coalesce((
    select jsonb_agg(jsonb_build_object(
             'key', a.key, 'title', a.title, 'scope', a.scope,
             'description', a.description,
             'capabilities', (select count(*) from public.product_capabilities c
                               where c.area_id = a.id),
             'open_items', (select count(*) from public.work_items i
                             where i.area_id = a.id
                               and i.status not in ('done', 'dropped')))
           order by a.scope, a.sort_order)
      from public.work_areas a), '[]'::jsonb) end
);
$$;

revoke execute on function public.platform_context(text) from public, anon;
grant  execute on function public.platform_context(text) to authenticated;

comment on function public.platform_context(text) is
  'Everything known about one area of the platform in one call: capabilities with '
  'their blocks, the lifecycle stages and terms they touch, recorded facts, the API '
  'endpoints that serve them, delivered and planned work, and the provenance of each '
  'claim. Pass null to orient - platform-level statements plus the area index. '
  'Not security definer: each section is filtered by the caller''s own module grants. '
  'docs/PLATFORM.md is the protocol; docs/ROADMAP-INTAKE.md Stage 0 is what calls it.';

-- ---------------------------------------------------------------
-- platform_context_gaps(): the Coverage panel, callable.
--
-- The page has shown these gaps to a human since August. Nothing
-- offered them to a session, so docs/COPILOT.md wrote the first of
-- them out by hand and the rest went unmeasured. Every figure here is
-- also a ratchet rule in scripts/gen-knowledge.js - one home for the
-- rule, two readers.
-- ---------------------------------------------------------------

create or replace function public.platform_context_gaps()
returns jsonb
language sql
stable
set search_path = public
as $$
select jsonb_build_object(
  -- Areas where work has SHIPPED and nothing describes what it did.
  -- The strongest signal there is (docs/COPILOT.md, "Measure the gap").
  --
  -- Delivered work, not open work. An area with twenty open items and
  -- nothing delivered has no capability to describe, and counting it as
  -- a gap would push the next session to write capability rows out of
  -- intent - recording what is planned as though it exists, which is
  -- the one failure this whole store must not have. The roadmap already
  -- holds what is planned. Narrowed 2026-09-07, when the grounding pass
  -- reached two such areas and correctly wrote nothing for either.
  'areas_without_capability', coalesce((
    select jsonb_agg(jsonb_build_object(
             'key', a.key, 'title', a.title,
             'open_items', o.open_items, 'delivered_items', o.done_items)
           order by o.done_items desc)
      from public.work_areas a
      join lateral (
        select count(*) filter (where i.status not in ('done', 'dropped')) as open_items,
               count(*) filter (where i.status = 'done') as done_items
          from public.work_items i where i.area_id = a.id) o on true
     where a.scope = 'product'
       and not exists (select 1 from public.product_capabilities c where c.area_id = a.id)
       and o.done_items > 0), '[]'::jsonb),
  -- A row nobody has stood behind: not the owner, and not a derivation
  -- from rows the owner owns.
  'unattested', coalesce((
    select jsonb_agg(jsonb_build_object('key', c.key, 'title', c.title)
           order by c.key)
      from public.product_capabilities c
     where c.attestation = 'unattested'), '[]'::jsonb),
  -- A derived row that names no source is exactly the thing derivation
  -- was supposed to prevent.
  'derived_without_evidence', coalesce((
    select jsonb_agg(jsonb_build_object('key', c.key, 'title', c.title)
           order by c.key)
      from public.product_capabilities c
     where c.attestation = 'derived'
       and not exists (
         select 1 from public.knowledge_links l
          where l.valid_to is null and l.kind = 'about'
            and ((l.to_type = 'capability' and l.to_id = c.id)
              or (l.from_type = 'capability' and l.from_id = c.id)))), '[]'::jsonb),
  -- Work landed in this area after the claim was last checked. This is
  -- the figure that makes the platform notice its own decay: ship
  -- something and the rows it touches go stale on their own.
  'stale', coalesce((
    select jsonb_agg(jsonb_build_object(
             'key', c.key, 'title', c.title, 'as_of', c.as_of,
             'delivered_since', s.newest)
           order by c.key)
      from public.product_capabilities c
      join lateral (
        select max(i.resolved_at)::date as newest
          from public.work_items i
         where i.area_id = c.area_id and i.status = 'done') s on true
     where c.as_of is null or (s.newest is not null and s.newest > c.as_of)), '[]'::jsonb),
  -- A delivered item in an area that HAS capabilities, and no affects
  -- link saying which one it changed. "How does this work now" is
  -- answerable by traversal only if the traversal exists.
  'delivered_without_affects', coalesce((
    select count(*)
      from public.work_items i
     where i.status = 'done'
       and exists (select 1 from public.product_capabilities c where c.area_id = i.area_id)
       and not exists (
         select 1 from public.knowledge_links l
          where l.valid_to is null and l.kind = 'affects'
            and l.from_type = 'work_item' and l.from_id = i.id)), 0),
  -- Endpoints no capability claims. The reference is knowledge too.
  'endpoints_ungrounded', coalesce((
    select count(*)
      from public.api_endpoints e
     where not exists (
       select 1 from public.knowledge_links l
        where l.valid_to is null
          and ((l.to_type = 'endpoint' and l.to_id = e.id)
            or (l.from_type = 'endpoint' and l.from_id = e.id)))), 0)
);
$$;

revoke execute on function public.platform_context_gaps() from public, anon;
grant  execute on function public.platform_context_gaps() to authenticated;

comment on function public.platform_context_gaps() is
  'The platform Coverage panel as data: areas carrying work with no capability, '
  'unattested rows, derived rows naming no source, rows gone stale behind delivered '
  'work, delivered items with no affects link, and ungrounded endpoints. Every figure '
  'is also a ratchet rule in scripts/gen-knowledge.js.';
