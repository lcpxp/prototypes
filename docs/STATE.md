# Current state

Updated: 2026-07-30 (session)
Branch: claude/launchpad-copilot-handover-bewgof (docs only; main untouched)

## In progress
Copilot capture round 1 written, awaiting the owner's run. Protocol in
docs/COPILOT.md, referenced from CLAUDE.md. The request names real
partners: scratchpad now, work_documents once the round runs.

Scope rewritten after reading api_topics: the specs already hold the
status machine, both runbooks, the RBAC matrix and ~60 enum sets, so the
first draft asked for known material. Now targets policy and commercial
knowledge only - IVR band thresholds and the auto-approval rule, the
Commercial Matrix, commission, the fee catalogue, named roles and
approval authority, PRD V3's 17 steps and MerchantProvisioner,
AnyPay/Oracle commercials, the ISO+PAYFAC vs four-partner-type
contradiction, 12 hollow rows, delivery governance, 12-term annex, and a
do-not-send list of everything already held.

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
