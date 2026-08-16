-- Roadmap search: the contextualisation read surface.
--
-- Split out of 30_work.sql, which is at its size budget.
--
-- roadmap_current cannot express a semantic match: it carries no summary,
-- details, links or resolution, so any comparison against it is a
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
    -- Every open link on this item, from either end, already resolved to
    -- the other end's title and the reading that applies from here. A
    -- session banding a candidate needs to see that two rows were
    -- already adjudicated `distinct_from` without a second query - that
    -- is the whole point of recording the judgement.
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', g.kind, 'reads', g.reads, 'family', g.family,
               'other_type', g.dst_type, 'other_id', g.dst_id,
               'other_title', other.title,
               'note', g.note, 'confidence', g.confidence)
             order by g.family, g.kind, other.title)
        from public.knowledge_graph g
        left join public.work_items other
          on g.dst_type = 'work_item' and other.id = g.dst_id
       where g.src_type = 'work_item' and g.src_id = wi.id
    ), '[]'::jsonb)          as links,
    wi.resolution,
    wi.tags,
    (coalesce(wi.summary, '') = '' and coalesce(wi.details, '') = '') as is_hollow,
    wi.created_at,
    wi.updated_at
  from public.work_items wi
  left join public.work_items parent      on parent.id = wi.parent_id
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

-- ---------------------------------------------------------------
-- roadmap_find: the two channels, fused.
--
-- docs/KNOWLEDGE-MODEL.md sets two rules this obeys. The result must be
-- an ABSOLUTE score, because intake bands it to decide whether to speak
-- at all - reciprocal rank fusion is specifically wrong here, since it
-- discards magnitude and the None band could not exist under it. And
-- the channels are FUSED, never swapped: the lexical IDF weighting wins
-- on rare handles and has to survive intact.
--
-- The fusion is greatest(lexical, semantic): a weighted blend with the
-- weight put where the evidence is, so neither channel can pull the
-- other down and a row is scored on the best evidence either found.
--
-- THE RESCALE, and the numbers are fitted rather than chosen. gte-small
-- produces normalised vectors whose best-match cosines on this corpus
-- all sit between 0.83 and 0.94, so raw cosine would flood every band.
-- The 14 labelled items in docs/ROADMAP-INTAKE.md were replayed against
-- the embedded corpus, each scored against every row but itself:
--
--   0.9420 duplicate   0.8785 distinct    0.8560 new
--   0.9198 duplicate   0.8697 duplicate   0.8541 new
--   0.9127 umbrella    0.8696 distinct    0.8277 new (must never fire)
--   0.9044 duplicate   0.8629 distinct
--   0.8954 duplicate   0.8627 new
--   0.8896 new         (its top hit is a genuine neighbour)
--
-- 0.860 is the top of the ambient band - the level a genuinely new item
-- reaches just by being about the same product. 0.054 is the span that
-- puts 0.8954, the weakest clear duplicate, at exactly 0.65, the bottom
-- of High. Both live here and nowhere else.
--
-- What this does NOT do, measured rather than hoped: it does not fix the
-- rewording cases. "customer birthday displaying a day earlier than
-- entered" retrieves its target at rank 1 - which lexical scoring at
-- 0.265 could not - but at cosine 0.8708, below several genuinely new
-- items. Semantic RETRIEVAL works on this corpus; semantic BANDING does
-- not separate a reworded duplicate from new work in the same area. The
-- honest gain is narrower: one labelled duplicate promoted from Medium
-- to High, one genuine neighbour from None to Medium, the top
-- duplicates made unambiguous, and no labelled case made worse.
--
-- p_embedding is optional. Passed null, this scores exactly as it did
-- before the channel existed, which is what makes the change safe to
-- land: every existing caller keeps its behaviour until it opts in with
-- public.roadmap_embed_query(query).
-- ---------------------------------------------------------------

drop function if exists public.roadmap_find(text, int, numeric, uuid);

create or replace function public.roadmap_find(
  query        text,
  p_limit      int     default 8,
  p_min_score  numeric default 0.20,
  p_exclude_id uuid    default null,
  p_embedding  extensions.vector(384) default null)
returns table (
  id               uuid,
  title            text,
  score            numeric,
  lexical          numeric,
  semantic         numeric,
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
        like '%' || lower(btrim(query)) || '%') as verbatim,
      -- The affine rescale, fitted above. A row with no vector scores 0
      -- on this channel rather than being dropped: an unembedded row is
      -- not a dissimilar row, and it must still be findable lexically.
      case when p_embedding is null then 0::numeric else coalesce((
        select greatest(0, least(1,
                 ((1 - (e.embedding <=> p_embedding))::numeric - 0.860) / 0.054))
          from public.work_item_embeddings e where e.work_item_id = s.id), 0)
      end as sem
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
      ), 3) as lex
    from scored
  )
  select
    id, title,
    greatest(lex, round(sem, 3)) as score,
    lex as lexical,
    round(sem, 3) as semantic,
    level, status, horizon, workstream_title, theme_label,
    department, assignee, links, resolution,
    is_hollow, summary, details, created_at, updated_at
  from ranked
  where greatest(lex, sem) >= p_min_score
  order by greatest(lex, sem) desc, updated_at desc
  limit greatest(1, p_limit);
$$;

revoke execute on function public.roadmap_find(text, int, numeric, uuid, extensions.vector)
  from public, anon;
grant  execute on function public.roadmap_find(text, int, numeric, uuid, extensions.vector)
  to authenticated;

comment on function public.roadmap_find(text, int, numeric, uuid, extensions.vector) is
  'Ranked roadmap candidates for a free-text request. score is greatest(lexical, semantic); '
  'the two channels are returned separately so a reader can see which one spoke. '
  'Pass p_embedding from public.roadmap_embed_query(query) to enable the semantic channel; '
  'omitted, this scores exactly as it did before the channel existed. '
  'Band the score per docs/ROADMAP-INTAKE.md: >=0.65 high, >=0.40 medium, >=0.22 low.';
