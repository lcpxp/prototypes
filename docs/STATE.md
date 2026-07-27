# Current state

Updated: 2026-07-27 (session)
Branch: main is trunk; the Daopay work is merged and pushed there.

## In progress
Daopay user-role demo, on main and ready for another wave. Guidance page,
sequence diagram (11 steps, decision branch at 10) and the two-role portal
replica live under modules/prototypes/daopay/. The replica simulates a run:
PXP generates the (initially empty) contracts, then Daopay sends - state
kept in sessionStorage across the role-switch reload, cleared by opening
the Applications list. Email prompt, Adobe Sign panel signing in order,
automated CRM/SFTP/notification handoff, stacked top-right toasts.
Platform knowledge loaded: work_document, three product_capabilities
(acquirer-scoped roles planned; flow and contract model partial),
journey_stages stage 8 widened, four domain_terms, two work_notes
superseded. The Daopay Word doc is generated outside the repo: it names
the two real signatories.

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
- Post-signature stage: owner set it to "Application Signed".
- Demo flow: PXP generates both contracts, Daopay sends them (Send
  contract is now Daopay-only). Canonical flow docs still have PXP sending
  the merchant contract at step 3 - real process, separate from the demo's
  button placement. Revisit if production moves the send to the acquirer.
- Contracts table Type/Status split: built the screenshot's way; confirm.
- Daopay-facing document escalation inbox is still a placeholder.
