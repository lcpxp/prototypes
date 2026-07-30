# Current state

Updated: 2026-07-30 (session)
Branch: claude/launchpad-copilot-handover-bewgof (docs only; main untouched)

## In progress
Copilot capture rounds 1 and 2 both run, gated and applied; the process is
closed. Protocol in docs/COPILOT.md, referenced from CLAUDE.md. Responses
stored verbatim with URLs redacted (work_documents 96f2a332, 59fde8b1).

Landed: 19 facts/decisions/risks, 4 domain_terms (Merchant Contributor,
EIT, T+1 settlement, Decisioned) plus Partner type rewritten to
four-intended-two-built, 2 product_capabilities (fee-model-domains,
acquirer-selection-product-organisation - first rows behind the pricing
and acquirer areas), the Unity runbook corrected to PRD V3's 17-step
numbering with failure semantics, 3 hollow rows filled, and the first
start_sprint value in the system (26-04). Owner rejected the User Roles
v1 list (twice) and all fee amounts (permanently out of scope); roles and
IVR thresholds are config, so both close by capture not by round.

## Next steps
1. Round 3 when wanted: brief is a decision note in work_notes. Targets
   Development Roadmap Working Version (2026-06-30, newest, never
   opened), Insights 2026 Release, Pricing Engine Overview.
2. Two roadmap-drift risks logged against their rows, unapplied pending
   owner: Terminal financing (idea/later, but Done per sheet and sprint
   26-06) and Merchant Contributor (20%, but built in 26-04).
3. Five unmatched sheet rows held as candidates, not created: Snowflake,
   CardStream plugins, Partner Oversight, Zendesk, "London & Zurich".
4. Sprint calendar derived (26-16 current, 21 Jul - 3 Aug) but not
   owner-confirmed; stamping items awaits that.
5. Owner reviews the 13 unlinked high-band pairs; top (0.982) looks like
   a genuine duplicate. Then wire core_launchpad as a live owner.

## Open decisions
- ROADMAP-PLAYBOOK.md budget 360, COPILOT.md 260; both have exit plans in
  tests/size-budget.json.
- UMBRELLA is detected from the request's shape, not from a score.
- Inter via Google Fonts: AGREED. The one external stylesheet.
