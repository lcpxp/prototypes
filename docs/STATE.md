# Current state

Updated: 2026-07-30 (session)
Branch: claude/launchpad-copilot-handover-bewgof (docs only; main untouched)

## In progress
Copilot round 1 run and through the gate. Response stored (work_documents
96f2a332, URLs redacted). Applied: 8 facts, 4 decisions, 1 round-2
question; domain_terms Merchant Contributor, EIT, T+1 settlement, and
Partner type rewritten to four-intended-two-built; product_capabilities
fee-model-domains (first row in the pricing area); Unity Provisioning
runbook corrected to PRD V3's 17-step numbering with failure semantics;
T+1 work item enriched. Owner rejected the User Roles v1 list (second
time) and all fee amounts - pricing numbers are permanently out of
capture scope. Format compliance was poor (only topic 1 used FACT blocks,
~5 of 50 assertions quoted, every document undated), so everything
unquoted is stored verified=false.

## Next steps
1. Round 2 written, waiting to run: seven named files, three-field format
   (round 1's eight-field block did not hold), spreadsheet asked for as a
   delimited table. Targets delivery dates, sprint 04-07 dates, analytics
   definitions, External Reference Guide v2 delta.
2. Roles and IVR thresholds are config, not documentation: close both by
   capture against the live admin screens, not another document round.
3. Owner reviews the 13 unlinked high-band pairs the sweep found; the
   top one (0.982) looks like a genuine duplicate. Not yet acted on.
4. Fill remaining hollow rows in Now; round 1 answered only T+1.
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
