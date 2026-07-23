# Value capture session

The working manual for backfilling business benefits onto the roadmap:
`attributes.merchant_value` and `attributes.pxp_value` (the two value
fields the drawer now shows), plus `effort` and `impact` where they are
obvious. Public repo: this file is process only - no item titles, no
merchant names, no values ever live here. The data lives only in Supabase
(project ref `zlmkofbkobmhnslfnqsf`); read docs/ROADMAP-PLAYBOOK.md first.

## Why

The drawer and the JSON/CSV exports surface merchant value and PXP value,
but those fields are empty across the roadmap. This session fills them,
working from the most important work down, so the highest-value story is
told first and the queue can stop any time with the top of the list done.

## The ranked queue (copy-paste)

Rows still missing BOTH value fields, workstreams first, then top-level
work items, then nested work items, each by band then priority. The queue
shrinks as rows are filled, so the session resumes cleanly on any day.

    select wi.id, wi.level, wi.title,
           rc.label as theme, wi.horizon, wi.priority
    from work_items wi
    left join roadmap_categories rc on rc.id = wi.category_id
    where wi.status not in ('done','dropped')
      and wi.level <> 'deliverable'
      and coalesce(wi.attributes->>'merchant_value','') = ''
      and coalesce(wi.attributes->>'pxp_value','') = ''
    order by
      case wi.level when 'workstream' then 0 else 1 end,
      case when wi.parent_id is null then 0 else 1 end,
      case wi.horizon when 'now' then 0 when 'next' then 1
                      when 'later' then 2 else 3 end,
      wi.priority;

## Progress check (read at start and end)

    select
      count(*) filter (
        where coalesce(attributes->>'merchant_value','') <> ''
           or coalesce(attributes->>'pxp_value','') <> '') as with_value,
      count(*) as total
    from work_items
    where status not in ('done','dropped') and level <> 'deliverable';

## The wave ritual

1. Run the queue query; take the top 3-5 rows.
2. One AskUserQuestion wave: for each row, ask for a line of merchant value
   and a line of PXP value (owner answers free-text, or skips). Where
   effort/impact is obvious from the answer, capture it too.
3. Apply the wave immediately, one update per row, merging into the JSONB
   bag so other attribute keys survive:

        update work_items
        set attributes = attributes
          || jsonb_build_object('merchant_value', $1, 'pxp_value', $2)
        where id = $3;

   (set `effort`/`impact` in the same update when known).
4. Repeat from step 1 until the owner stops or the queue is empty.
5. Record one `work_notes` decision row summarising the session's coverage
   (counts, not values).

## Resume a cold session

Read this file, run the queue query, run the progress check, continue from
the top of the queue. Nothing else is needed.
