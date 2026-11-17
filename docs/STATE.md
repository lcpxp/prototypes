# Current state

Updated: 2026-11-17 (developer-readiness run: story context review under way)

## In progress
Developer-readiness run (developer started 16 Nov 2026); Sprint Roadmap
live from 26-24. Story context review (owner brief, 17 Nov): each story
must let the developer's AI build and test it unaided. Setup week signed
off and written, the day-early date fault first. Stories DRAFTED, no
Azure DevOps ids, nothing pushed. Glossary page and access-aware
dashboard on this branch. Decisions: `work_notes` tagged
`developer-readiness`, each with undo values.

## Next steps
1. Sweep 26-25, 26-26, 27-01, then the rest of Now for the eight gaps:
   table per item, at most four questions, write after sign-off.
2. Step 5: a context completeness check in docs/SPRINT-DELIVERY.md and a
   `story-standard` note; propose v_sprint_plan_checks, build none yet.
3. Owner confirms the drafted stories.
4. **Phase 5**: `ado_profile.team_sprints`, payload and push package.
5. **Phase 6**: the induction document and the developer pack.
6. **Phase 7**: write the learned working rules into the delivery docs.
7. Inbound API deep review, then Sprint Roadmap snapshots.
8. Last: a visual review of the Sprint Roadmap as two images - this week
   with sprint 1, and sprint 2 with sprint 3.

## Blocked on the owner
- Screenshots for the contract stories: today's PXP price sheet, DaoPay
  rate table, PXP cover sheet and footer.
- Azure DevOps: sprints 26-24 to 27-04 must exist and be selected.
- Legal's choice of wording for the DaoPay approval clause.
- This branch is not merged: the site deploys from main.
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
