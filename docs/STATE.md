# Current state

Updated: 2026-08-09 (association/typed-links plan agreed)

## In progress
Association, typed links and repo/DB truth: C0-C16 on branch
claude/roadmap-association-typed-links-qbnpns. Plan agreed 2026-08-09.
Four verified problems: intake misses reworded duplicates (0.956 ->
0.265 on one rewording); relates_to_id carries four meanings in one
column; five applied migrations and two columns exist only in the live
database; and the doc caps produced the band duplication they then
needed a test to police. Part 0 of the plan rewrites six rules that
fail on evidence - see the plan file for the measurements.

App Review is live on main and still unproven; no wave has run through
it yet.

## Next steps
1. C0 rule rewrites, then C1 doc restructure (the size gate blocks
   everything else until the playbook has room).
2. C2 schema reconciliation, C3 drift gate, C4 policies authoritative.
3. C5-C9 typed links, backfill, front end, then drop relates_to_id.
4. C10-C14 embeddings, Edge Function, IDF floor, calibration.
5. Run a real wave through /app-review; expect do-now ordering and
   STALE_DAYS (14) to need tuning.
6. Sprint calendar derived (26-16 current) but not owner-confirmed.
7. Migrate the roadmap drawer onto core/drawer.js.

## Open decisions
- Supabase Edge Function + gte-small embeddings: AGREED 2026-08-09.
  Server-side, no key, 384 dims. Second agreed exception after Inter.
- Two live rows block the duplicate_of constraint until the owner
  resolves them: "Currency Swap on summary page" (idea/next, but its
  resolution says duplicate) and "Terminal financing admin toggles"
  (dropped, survivor named only in prose).
- evidence_confidence uses corroborated/inferred/truncated: a value
  called "confirmed" beside confirmed_by re-collapses rule 1.
- Inter via Google Fonts: AGREED. The one external stylesheet.
