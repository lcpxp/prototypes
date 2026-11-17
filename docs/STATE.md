# Current state

Updated: 2026-11-17 (developer-readiness run: phases 1 to 3 done, phase 4 under way)

## In progress
The developer-readiness run. The developer started on 16 Nov 2026.
The Sprint Roadmap is live (anchor 26-24, the setup week). On 16 Nov the
owner restructured it: streams in the agreed order, "LaunchPad
refinements", pricing lines split away, PFAC controls all in 26-25 with
the third switch in. Stories are DRAFTED for every developer item in
26-24 to 27-01, awaiting confirmation. Nothing is pushed to Azure DevOps.
New accounts now start restricted (docs/SECURITY.md); the developer's
account is ready to create. The owner's decisions are `work_notes`
tagged `developer-readiness`, anchored to the decision-log document.

## Next steps
1. Owner confirms the drafted stories (setup week first).
2. Once the developer's account exists: set its display name and verify
   it reads only Platform, Integrations and API reference.
3. **Phase 5**: fill `ado_profile.team_sprints` once the sprints exist in
   Azure DevOps, build the payload and push package, reconcile stale items.
4. Story review stage against the light standard.
5. **Phase 6**: the induction document and the developer pack.
6. **Phase 7**: write the learned working rules into the delivery docs
   and add `/sprint-ready`, `/sprint-close`, `/sprint-status`, `/ado-push`.
7. Last: the Inbound API deep review, then Sprint Roadmap snapshots.

## Blocked on the owner
- Azure DevOps: sprints 26-24 to 27-04 must exist and be selected for the team.
- Legal's choice of wording for the DaoPay approval clause.
- This branch is not merged: the site deploys from main.
- Enable leaked-password protection in Supabase Auth.
- Tag: `git tag -a v0.1.0 ab0e78b -m "0.1.0"`, then `git push origin v0.1.0`.

## Open decisions
- Four glossary terms name people or the roadmap (VFS, Xolvis, Unity
  merchant, AI agent); the developer can read them. Tidy or leave?
- Rename lcpxp/prototypes to lcpxp/lpio? Raised in 2026-07, still open.
- work_item_phases stays dormant: the table is empty, but the drawer reads it.
