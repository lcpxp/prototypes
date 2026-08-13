-- The dashboard's Reviews section now covers both reviews. A wave
-- carries its kind and the figures that make sense for it: an
-- application wave has applications to classify, a portal wave has
-- areas to walk. Sending both sets for every wave would put zeroes on
-- a card where the figure does not apply, which reads as a problem
-- rather than as an absence.
create or replace function public.dashboard_summary()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'counts', jsonb_build_object(
      'api_specs',            (select count(*) from (select 1 from public.api_specs            limit 1001) c),
      'integrations',         (select count(*) from (select 1 from public.integrations         limit 1001) c),
      'prototypes',           (select count(*) from (select 1 from public.prototypes           limit 1001) c),
      'work_items',           (select count(*) from (select 1 from public.work_items           limit 1001) c),
      'product_capabilities', (select count(*) from (select 1 from public.product_capabilities limit 1001) c),
      'profiles',             (select count(*) from (select 1 from public.profiles             limit 1001) c)
    ),
    -- The delivery split the roadmap views derive: delivered = done;
    -- parked = not done and (someday or dropped); active = the rest.
    'delivery', (
      select jsonb_build_object(
        'total',     count(*),
        'delivered', count(*) filter (where status = 'done'),
        'parked',    count(*) filter (where status <> 'done' and (horizon = 'someday' or status = 'dropped')),
        'active',    count(*) filter (where status <> 'done' and not (horizon = 'someday' or status = 'dropped')),
        'blocked',   count(*) filter (where status = 'blocked')
      )
      from (select status, horizon from public.work_items limit 1001) w
    ),
    -- Now and next, workstreams only. The child count uses the
    -- existing work_items (parent_id, sort_order) index.
    'workstreams', (
      select coalesce(jsonb_agg(w order by band, prio, ord), '[]'::jsonb)
      from (
        select
          jsonb_build_object(
            'id', wi.id, 'title', wi.title, 'horizon', wi.horizon,
            'status', wi.status, 'progress', wi.progress,
            'assignee', wi.assignee, 'theme', rc.key, 'theme_label', rc.label,
            'open_children', (
              select count(*) from public.work_items c
              where c.parent_id = wi.id and c.status not in ('done', 'dropped'))
          ) as w,
          case wi.horizon when 'now' then 0 else 1 end as band,
          wi.priority as prio,
          wi.sort_order as ord
        from public.work_items wi
        left join public.roadmap_categories rc on rc.id = wi.category_id
        where wi.level = 'workstream'
          and wi.horizon in ('now', 'next')
          and wi.status <> 'dropped'
        order by band, prio, ord
        limit 60
      ) s
    ),
    'specs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'version', s.version,
        'status', s.status, 'family', s.family,
        'endpoints', (select count(*) from public.api_endpoints e where e.spec_id = s.id),
        'tags',      (select count(*) from public.api_tags     t where t.spec_id = s.id),
        'topics',    (select count(*) from public.api_topics   p where p.spec_id = s.id)
      ) order by s.family, s.title), '[]'::jsonb)
      from public.api_specs s
    ),
    -- Figures and the gaps beside them, so a hole is something to
    -- fill rather than something to discover.
    'knowledge', jsonb_build_object(
      'by_maturity', (
        select coalesce(jsonb_object_agg(maturity, n), '{}'::jsonb)
        from (select maturity, count(*) as n from public.product_capabilities
              where kind = 'capability' group by 1) m
      ),
      'terms',     (select count(*) from (select 1 from public.domain_terms   limit 1001) c),
      'stages',    (select count(*) from (select 1 from public.journey_stages limit 1001) c),
      'documents', (select count(*) from (select 1 from public.work_documents limit 1001) c),
      'areas_without_capability', (
        select count(*) from public.work_areas a
        where a.scope = 'product'
          and not exists (select 1 from public.product_capabilities c
                          where c.area_id = a.id and c.kind = 'capability')
      ),
      'capabilities_without_source', (
        select count(*) from public.product_capabilities
        where kind = 'capability' and source_document_id is null
      )
    ),
    -- Open waves only. A closed wave is a record, not a call to act.
    -- A wave carries its kind and the figures that make sense for it:
    -- an application wave has applications to classify, a portal wave
    -- has areas to walk. Sending both sets for every wave would put
    -- zeroes on a card where the figure does not apply, which reads as
    -- a problem rather than as an absence.
    'reviews', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', w.id, 'name', w.name, 'kind', w.kind, 'state', w.state,
        'opened_at', w.opened_at,
        'applications', case when w.kind = 'application' then
          (select count(*) from public.review_applications a
           where a.wave_id = w.id and a.deleted_at is null) end,
        'needs_action', case when w.kind = 'application' then
          (select count(*) from public.review_applications a
           join public.triage_categories t on t.key = a.triage_category
           where a.wave_id = w.id and a.deleted_at is null
             and a.confirmed_at is null and t.group_key = 'needs_action') end,
        'unconfirmed', case when w.kind = 'application' then
          (select count(*) from public.review_applications a
           where a.wave_id = w.id and a.deleted_at is null
             and a.confirmed_at is null) end,
        'areas', case when w.kind <> 'application' then
          (select count(*) from public.review_areas where retired_at is null) end,
        'walked', case when w.kind <> 'application' then
          (select count(*) from public.review_area_passes p where p.wave_id = w.id) end,
        'findings_open', case when w.kind <> 'application' then
          (select count(*) from public.review_findings f
           where f.wave_id = w.id and f.deleted_at is null
             and f.state = 'open' and f.kind <> 'works') end,
        'awaiting_verification', case when w.kind <> 'application' then
          (select count(*) from public.review_findings f
           where f.wave_id = w.id and f.deleted_at is null
             and f.state = 'answered') end
      ) order by w.opened_at desc), '[]'::jsonb)
      from public.review_waves w
      where w.state = 'active' and w.deleted_at is null
    )
  );
$$;
