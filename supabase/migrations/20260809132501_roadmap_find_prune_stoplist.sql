-- ------------------------------------------------------------------
-- Applied 2026-08-09. Prunes roadmap_find's stoplist to genuine
-- function words. Rationale and the measurements are beside the list
-- in supabase/schema/31_roadmap_search.sql.
--
-- Effect, measured before and after on the same corpus:
--   "add site endpoint"  0.371 -> 0.540  (Low -> Medium; it now
--     surfaces three genuinely adjacent "Add ... site" rows that
--     were previously applied past in silence)
--   "set the default currency for a new application"  0.572 -> 0.420
--     (still Medium; the query now carries more informative tokens,
--     so a row matching only some of them takes a smaller share)
--   every other probe unchanged, including both reworded cases.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

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
  links            jsonb,
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
       -- Closed-class function words only. This list used to also hold
       -- content words that carry real domain force here, and IDF had
       -- already measured them as MORE discriminating than words the
       -- list kept: new 2.563, add 2.203, set 2.063, against merchant
       -- 1.130 and application 1.708. So "Add site endpoint" lost `add`
       -- while `merchant` sailed through carrying almost no signal.
       -- Removed 2026-08-09: add, adding, new, need, needs, make, made,
       -- use, used, ensure, sure, set, get, see, one, two, way.
       --
       -- Not replaced by a minimum-IDF floor, which was the obvious
       -- move and does not survive measurement: in this corpus function
       -- words and real handles interleave - `when` (2.618) and
       -- `should` (2.563) score exactly as high as `page` (2.618) and
       -- `new` (2.563). At 239 documents, document frequency is too
       -- noisy a proxy for "function word". A curated closed-class list
       -- is the right tool; it was holding the wrong words.
       and t <> all (array[
         'the','and','for','with','that','this','from','into','all','any','are',
         'was','not','but','its','has','have','will','can','should','would','when',
         'then','also','please','you','our','they','their','out','via','per','each',
         'only','been','being','does','same','other','both','than','more','most',
         'some','such','just','which','who','what','how','why','there','here',
         'where','while','after','before','over','under','between','without',
         'within','across','about','like','many','much','very','well','still',
         'currently'])
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
    department, assignee, links, resolution,
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
