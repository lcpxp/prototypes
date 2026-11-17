# Current state

Updated: 2026-11-17 (developer-readiness run: story context review under way)

## In progress
The developer-readiness run; the developer started on 16 Nov 2026. The
Sprint Roadmap is live (anchor 26-24, the setup week). Story context
review (owner brief of 17 Nov): every story must let the developer's AI
build and test it from the story, its notes and linked resources alone.
Setup week done and signed off: countries (list attached), dates (the
day-early fault, reopened and first in the week), Companies House
(retargeted), contract fixes, hidden characters. Stories are DRAFTED;
none has an Azure DevOps id; nothing is pushed. The Glossary page and the
access-aware dashboard are on this branch. Decisions are `work_notes`
tagged `developer-readiness`, each with its undo values.

## Next steps
1. Sweep sprint 1 (26-25), then 26-26, 27-01 and the rest of Now for the
   eight gaps: a short table per item, at most four questions, write
   after sign-off, confirmed stories that change go back to drafted.
2. Step 5: a short context completeness check in docs/SPRINT-DELIVERY.md
   and a `story-standard` note; propose v_sprint_plan_checks additions,
   build none until agreed.
3. Owner confirms the drafted stories.
4. **Phase 5**: fill `ado_profile.team_sprints` once the sprints exist,
   build the payload and push package, reconcile stale items.
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
