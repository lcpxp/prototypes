-- Contextualisation read surface: roadmap_searchable + roadmap_find.
--
-- roadmap_current cannot express a semantic match: it carries no summary,
-- details, relates_to_id or resolution, so any comparison against it is a
-- title match - and duplicate work is usually titled differently. These two
-- objects are the read surface intake needs to place new work against what
-- already exists (docs/ROADMAP-PLAYBOOK.md, "Contextualising new work").
--
-- roadmap_current is deliberately untouched; the board depends on its shape.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------
-- roadmap_searchable: every work_items row, no status filter, with the
-- text and the relationship fields a match has to be judged on, plus a
-- computed is_hollow flag (no summary AND no details) - a hollow row is
-- the strongest ENRICH signal there is. security_invoker, so it exposes
-- exactly what the caller's RLS already allows on the base tables.
-- ---------------------------------------------------------------

drop view if exists public.roadmap_searchable;
create view public.roadmap_searchable
  with (security_invoker = on) as
  select
    wi.id,
    wi.title,
    wi.summary,
    wi.details,
    wi.level,
    wi.status,
    wi.horizon,
    wi.end_horizon,
    wi.type,
    wi.priority,
    wi.parent_id,
    parent.title              as workstream_title,
    rc.label                  as theme_label,
    wa.title                  as filing_area,
    wi.department,
    wi.assignee,
    wi.relates_to_id,
    rel.title                 as relates_to_title,
    wi.resolution,
    wi.tags,
    (coalesce(wi.summary, '') = '' and coalesce(wi.details, '') = '') as is_hollow,
    wi.created_at,
    wi.updated_at
  from public.work_items wi
  left join public.work_items parent      on parent.id = wi.parent_id
  left join public.work_items rel         on rel.id = wi.relates_to_id
  left join public.roadmap_categories rc  on rc.id = wi.category_id
  left join public.work_areas wa          on wa.id = wi.area_id;

grant select on public.roadmap_searchable to authenticated;

comment on view public.roadmap_searchable is
  'Every work_items row (including done and dropped) with the text and '
  'relationship fields needed to judge a semantic match, plus is_hollow. '
  'The read surface for contextualising intake; see docs/ROADMAP-PLAYBOOK.md.';

-- ---------------------------------------------------------------
-- roadmap_find(query): ranked candidates across title, summary, details
-- and resolution, over ALL rows - parked and dropped work is first-class,
-- because a need that was retired can return.
--
-- The score is a blend the caller can band on:
--   0.50 * IDF-weighted share of query tokens found in the row's text
--   0.30 * IDF-weighted share of query tokens found in the title
--   0.20 * trigram similarity of the whole query against the title
--   +0.25 if the row's text contains the query verbatim (ILIKE fallback)
-- all damped for queries under three informative tokens. Token share
-- carries the weight because duplicate work is reworded, not retitled:
-- trigram similarity alone misses it. Bands: see the playbook.
-- ---------------------------------------------------------------

create or replace function public.roadmap_find(
  query        text,
  p_limit      int     default 8,
  p_min_score  numeric default 0.20,
  p_exclude_id uuid    default null)
returns table (
  id               uuid,
  title            text,
  score            numeric,
  level            text,
  status           text,
  horizon          text,
  workstream_title text,
  theme_label      text,
  department       text,
  assignee         text,
  relates_to_id    uuid,
  relates_to_title text,
  resolution       text,
  is_hollow        boolean,
  summary          text,
  details          text,
  created_at       timestamptz,
  updated_at       timestamptz)
language sql
stable
set search_path = public, extensions
as $$
  with corpus as (
    select s.id,
           lower(concat_ws(' ', s.title, s.summary, s.details, s.resolution)) as body
      from public.roadmap_searchable s
  ),
  n as (select count(*)::numeric as total from corpus),
  toks as (
    select distinct t
      from unnest(regexp_split_to_array(
             lower(regexp_replace(query, '[^a-zA-Z0-9]+', ' ', 'g')), '\s+')) as t
     where length(t) >= 3
       and t <> all (array[
         'the','and','for','with','that','this','from','into','all','any','are',
         'was','not','but','its','has','have','will','can','should','would','when',
         'then','add','adding','also','new','need','needs','make','made','please',
         'you','our','they','their','out','use','used','via','per','each','only',
         'one','two','sure','ensure','currently','still','been','being','does',
         'same','other','both','than','more','most','some','such','just','set',
         'get','see','way','which','who','what','how','why','there','here','where',
         'while','after','before','over','under','between','without','within',
         'across','about','like','many','much','very','well'])
  ),
  -- Inverse document frequency: a rare handle ("IVR", "currency") must
  -- outweigh a ubiquitous one ("page", "application"), or every request
  -- naming a common surface matches every other row on that surface.
  weighted as (
    select t.t, ln(((select total from n) - df.n + 0.5) / (df.n + 0.5) + 1) as w
      from toks t
      cross join lateral (
        select count(*)::numeric as n from corpus c where c.body ~ ('\m' || t.t)
      ) df
  ),
  stats as (
    select coalesce(sum(w), 0) as total_w, count(*)::numeric as n_toks from weighted
  ),
  scored as (
    select
      s.*,
      coalesce((select sum(w.w) from weighted w
                 where lower(concat_ws(' ', s.title, s.summary, s.details, s.resolution))
                       ~ ('\m' || w.t)), 0) as body_w,
      coalesce((select sum(w.w) from weighted w
                 where lower(coalesce(s.title, '')) ~ ('\m' || w.t)), 0) as title_w,
      greatest(
        extensions.similarity(lower(s.title), lower(btrim(query))),
        extensions.word_similarity(lower(btrim(query)), lower(s.title))
      )::numeric as trgm,
      (lower(concat_ws(' ', s.title, s.summary, s.details))
        like '%' || lower(btrim(query)) || '%') as verbatim
    from public.roadmap_searchable s
    where p_exclude_id is null or s.id <> p_exclude_id
  ),
  ranked as (
    select
      scored.*,
      round(least(1.0,
        -- Length damping: a one-word query ("CRM") otherwise scores 1.0
        -- against every row containing that word.
        least(1.0, (select n_toks from stats) / 3.0) * (
            0.50 * (case when (select total_w from stats) = 0 then 0
                         else body_w / (select total_w from stats) end)
          + 0.30 * (case when (select total_w from stats) = 0 then 0
                         else title_w / (select total_w from stats) end)
          + 0.20 * trgm
          + (case when verbatim and (select n_toks from stats) >= 3 then 0.25 else 0 end)
        )
      ), 3) as score
    from scored
  )
  select
    id, title, score, level, status, horizon, workstream_title, theme_label,
    department, assignee, relates_to_id, relates_to_title, resolution,
    is_hollow, summary, details, created_at, updated_at
  from ranked
  where score >= p_min_score
  order by score desc, updated_at desc
  limit greatest(1, p_limit);
$$;

revoke execute on function public.roadmap_find(text, int, numeric, uuid) from public, anon;
grant  execute on function public.roadmap_find(text, int, numeric, uuid) to authenticated;

comment on function public.roadmap_find(text, int, numeric, uuid) is
  'Ranked roadmap candidates for a free-text request, across title, summary, '
  'details and resolution of every work_items row. Band the score per '
  'docs/ROADMAP-PLAYBOOK.md: >=0.65 high, >=0.40 medium, >=0.22 low.';
