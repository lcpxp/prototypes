# Current state

Updated: 2026-07-22 (session)
Branch: claude/future-prototypes-table-gwi04m

## In progress
None. Future prototypes shortlist added end to end:
- Supabase: new future_prototypes table (name, note, sort_order) with
  RLS behind the prototypes module grant, admin-only writes; migration
  20260722000000 applied to the live project and 14 rows seeded.
- Repo: schema in 20_portal.sql, policy in the content-table loop,
  registry.tables.futurePrototypes, seed rows, and a Future prototypes
  table on the gallery below Live/Drafts (App.futurePrototypesTable,
  rendered from the table). Test suite green (115).

## Next steps
1. Owner reviews the shortlist on the gallery; promote any item to a
   draft prototype (add a prototypes row + page, delete it here) when
   work begins.
2. Merge this branch to main once reviewed; deploy is automatic.

## Open decisions
None outstanding.
