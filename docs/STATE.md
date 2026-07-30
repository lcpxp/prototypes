# Current state

Updated: 2026-07-30 (session)
Branch: claude/launchpad-copilot-handover-bewgof (docs only; main untouched)

## In progress
Copilot capture round 1 written, awaiting the owner's run. Protocol
committed as docs/COPILOT.md (gap measurement, five mandates,
validation gate, storage routing), referenced from CLAUDE.md. The
request names real partners and products, so it stays out of git: it is
in the session scratchpad and goes to work_documents once the round runs.

Ten topics, priority order: glossary, roles and permissions, application
statuses, pricing and fees, product catalogue, Unity integration,
screening and approval, partner model, definitions for 13 named hollow
rows, delivery process and dates. Topics 1-6 are the core. Scope came
from measurement: 90 items no summary, 154 no details, 213 no
dates/sprints/PRD-status, 0 external_ref; pricing (22 items), core
service (42), insights (19), partners (18) carry zero capability rows.

## Next steps
1. Owner runs the round; validate through the gate in docs/COPILOT.md
   before any write. Nothing lands unconfirmed.
2. Owner reviews the 13 unlinked high-band pairs the sweep found; the
   top one (0.982) looks like a genuine duplicate. Not yet acted on.
3. Fill hollow rows (roadmap_searchable.is_hollow) in Now - round 1
   topic 9 covers 13 of them.
4. Roadmap context enrichment wave 2: Next/Later + backlog items.
5. Wire core_launchpad as a live owner: schema CHECK, tokens.css colour,
   department filter.
6. Drawer follow-ups: drawer LINKS relates_to but cannot SET it (needs a
   write path/RLS); same for inherited area notes and Tier 3 schema.

## Open decisions
- ROADMAP-PLAYBOOK.md size budget raised to 360 (was 300). Exit plan in
  tests/size-budget.json: split the review ritual out.
- UMBRELLA is detected from the request's shape, not from a score.
- Inter via Google Fonts: AGREED. The one external stylesheet.
- Contracts table Type/Status split: built the screenshot's way; confirm.
