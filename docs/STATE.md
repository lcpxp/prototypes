# Current state

Updated: 2026-07-30 (session)
Branch: claude/app-review-portal-feature-u7vks1 (App Review), off main.

## In progress
App Review is built on its branch: six tables
(supabase/schema/50_review.sql), select-only RLS, the wave list with a
standing watch list, the triage board, the detail drawer, a shared
core/drawer.js, and docs/APP-REVIEW.md plus /app-review as the session
protocol. 185 benchmarks green. No merchant data in the repo; the review
tables hold only the seeded status and category vocabulary. Not merged to
main, and no wave has been run through it yet - the first real wave is
the test of whether the board reads the way the owner works.

Roadmap intake contextualisation remains live and untouched.

## Next steps
1. Run a real wave through /app-review and see what the board gets
   wrong. Expect the do-now ordering and the staleness threshold
   (14 days, App.appReview.STALE_DAYS) to need tuning against real data.
2. Merge the App Review branch to main once that wave confirms it.
3. Owner reviews the 13 unlinked high-band roadmap pairs the sweep
   found; the top one (0.982) looks like a genuine duplicate.
4. Fill hollow rows (roadmap_searchable.is_hollow) in Now.
5. Migrate the roadmap drawer onto core/drawer.js and delete
   roadmap-drawer.js; left alone rather than refactored mid-feature.
6. Wire core_launchpad as a live owner: schema CHECK, tokens.css colour,
   department filter.

## Open decisions
- evidence_confidence uses corroborated/inferred/truncated, not the
  handover's confirmed/inferred/truncated_evidence: a value called
  "confirmed" beside confirmed_by re-collapses the distinction rule 1
  protects. Flagged to the owner, not yet confirmed.
- App Review stays out of global search so merchant names never appear
  in a nav dropdown. Revisit if finding records fast matters.
- Pre-existing: roadmap_move_workstream has a mutable search_path
  (get_advisors warns). One-line fix, out of scope here.
