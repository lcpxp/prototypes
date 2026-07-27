# Current state

Updated: 2026-07-26 (session)
Branch: main is trunk; the Daopay work is merged and pushed there.

## In progress
Daopay user-role demo, on main and ready for another wave. Guidance page,
sequence diagram (11 steps, decision branch at 10) and the two-role portal
replica live under modules/prototypes/daopay/. The replica now simulates a
run: email prompt, Adobe Sign signing panel with the three signatures in
order, automated CRM/SFTP/notification handoff, stacked top-right toasts.
Platform knowledge loaded: source work_document, three
product_capabilities rows (acquirer-scoped roles planned/unverified, flow
and contract model partial), journey_stages stage 8 actor widened, four
domain_terms, work_notes baa152d2 and 4744743b superseded.

The Word document for Daopay is generated outside the repo on purpose: it
names the two real signatories, which must not enter a public repo.

## Next steps
1. Next wave of prototype adjustments from the owner.
2. Roadmap context enrichment wave 2: Next/Later + backlog items.
3. Owner eyeballs the live board: colour blocks, mismatch dots.
4. Wire core_launchpad as a live owner: schema CHECK, tokens.css colour,
   department filter.

## Open decisions
- Inter via Google Fonts: AGREED. The one external stylesheet; the
  structure gate pins that exact URL.
- Reject notifications: CLOSED - none needed currently, revisit later.
- "Awaiting Acquirer Decision" is a stage chip the replica invents for the
  gap between handoff and decision; not seen in the real portal. Confirm
  or replace with the live value.
- Contracts table: screenshot shows Type = Signed/Unsigned and Status =
  Active/Inactive; owner described it as one status. Built the
  screenshot's way; confirm at review.
- Escalation inbox for the Daopay-facing document is still a placeholder.
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
