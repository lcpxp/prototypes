# Current state

Updated: 2026-07-26 (session)
Branch: claude/daopay-onboarding-demo-qgmm5n (Daopay work). main is trunk
otherwise; partner-type roadmap edits landed there earlier.

## In progress
Daopay user-role demo. Owner settled the flow, control matrix, signing
model and fictional identity set this session. Built: guidance page,
sequence diagram, and the two-role portal replica under
modules/prototypes/daopay/. The reserved prototypes registry row now
points at it. Remaining: load the underlying facts into platform
knowledge (work_documents kind 'platform', product_capabilities rows for
acquirer-enablement / onboarding-contract-automation / contracting,
journey_stages stage 8 actor, domain_terms), and supersede work_note
baa152d2.

Partner Type Enablement and roadmap context enrichment wave 2 remain as
before, untouched this session.

## Next steps
1. Platform-knowledge load for the Daopay flow (see above).
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
