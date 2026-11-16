# Current state

Updated: 2026-11-16 (developer-readiness run: phases 1 to 3 done, phase 4 under way)

## In progress
The developer-readiness run. The developer started on 16 Nov 2026.
Phases 1 to 3 are DONE and live in the database: the roadmap is
reconciled, and the Sprint Roadmap is mapped from the board the owner
approved on 16 Nov 2026. The plan's first column is now the setup week
(anchor 26-24); sprints 26-25, 26-26 and 27-01 follow.
Phase 4: stories are written, sized and DRAFTED for every developer
item in those columns, on the owner's light standard, awaiting his
confirmation. Nothing is pushed to Azure DevOps. His decisions and rules
are `work_notes` tagged `developer-readiness`: read them first.

## Next steps
1. Owner confirms the drafted stories (setup week first), then set
   `stories_status` to confirmed.
2. **Phase 5**: fill `ado_profile.team_sprints` once the sprints exist in
   Azure DevOps, build the payload and the push package, reconcile stale items.
3. Story review stage: check every story against the light standard.
4. **Phase 6**: the owner's run-sheet, the induction document and the
   developer pack; refresh the deck's plan slides.
5. **Phase 7**: write the learned working rules into SPRINT-DELIVERY,
   ESTIMATION, DEVOPS and the commands; add `/sprint-ready`,
   `/sprint-close`, `/sprint-status`, `/ado-push`.
6. Housekeeping: `npm run knowledge` (the red gate) and `npm run snapshot`.
7. Last: the Inbound API deep review, then Sprint Roadmap snapshots.

## Blocked on the owner
- Azure DevOps: sprints 26-24 to 27-04 must exist and be selected for the team.
- Legal's choice of wording for the DaoPay approval clause.
- This branch is not merged: the site deploys from main.
- Enable leaked-password protection in Supabase Auth.
- Create the tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"` then
  `git push origin v0.1.0`.

## Open decisions
- PFAC controls: is the third switch (workflow and risk questions) in v1?
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
