# Current state

Updated: 2026-07-26 (session)
Branch: claude/daopay-onboarding-demo-qgmm5n (Daopay work). main is trunk
otherwise; partner-type roadmap edits landed there earlier.

## In progress
Daopay user-role demo, complete and awaiting owner review. Guidance page,
sequence diagram and the two-role portal replica are under
modules/prototypes/daopay/; the reserved prototypes registry row points
at it. Platform knowledge loaded: source work_document, three
product_capabilities rows (acquirer-scoped roles planned/unverified, the
flow and the contract model partial - the role itself is not built yet),
journey_stages stage 8 actor widened to the acquirer, four domain_terms,
and work_notes baa152d2 and 4744743b superseded.

Partner Type Enablement and roadmap context enrichment wave 2 remain as
before, untouched this session.

## Next steps
1. Owner reviews the Daopay collateral, then it goes to Daopay.
2. Roadmap context enrichment wave 2: Next/Later + backlog items.
3. Owner eyeballs the live board: colour blocks, mismatch dots.
4. Wire core_launchpad as a live owner: schema CHECK, tokens.css colour,
   department filter.

## Open decisions
- Inter via Google Fonts: AGREED by the owner this session. It is the one
  external stylesheet; the structure gate pins that exact URL.
- Does Reject also notify the PXP accounts team? Owner stated it only for
  Pending Further Information. Shown on Pend only until confirmed.
- Contracts table: screenshot shows Type = Signed/Unsigned and Status =
  Active/Inactive; owner described it as one status. Built the
  screenshot's way; confirm at review.
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
- Value capture: merchant_value/pxp_value empty across roadmap; deferred.
