-- ------------------------------------------------------------------
-- Applied 2026-09-15. The sprint calendar, materialised so SQL can join
-- on a sprint. Anchor: 26-01 starts Monday 22 December 2025; a sprint
-- runs Monday to the second Friday on a 14-day cadence, 26 a year.
--
-- assets/js/core/sprints.js remains the ONE home for the conversion.
-- This table is a projection of it, and tests/unit/sprints-table.test.js
-- checks every seeded row against the engine so the two cannot drift.
--
-- Rationale in supabase/schema/35_sprints.sql; calendar in docs/SPRINTS.md.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

create table if not exists public.sprints (
  idx       integer primary key check (idx >= 0),
  code      text not null unique check (code ~ '^[0-9]{2}-[0-9]{2}$'),
  starts_on date not null,
  ends_on   date not null,
  quarter   text not null,
  check (ends_on > starts_on)
);

insert into public.sprints (idx, code, starts_on, ends_on, quarter)
select
  i,
  lpad((26 + i / 26)::text, 2, '0') || '-' || lpad((i % 26 + 1)::text, 2, '0'),
  (date '2025-12-22' + (i * 14)),
  (date '2025-12-22' + (i * 14) + 11),
  'Q' || (extract(quarter from (date '2025-12-22' + (i * 14))))::int
       || ' ' || (extract(year from (date '2025-12-22' + (i * 14))))::int
from generate_series(0, 77) as g(i)
on conflict (idx) do nothing;

alter table public.sprints enable row level security;
