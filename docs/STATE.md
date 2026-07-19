# Current state

Updated: 2026-07-19 (session)
Branch: main (PCI prototype merged from claude/stress-free-compliance-overview-vbyv38)

## In progress
- none. PCI compliance prototype (IXOPAY integration) is merged to main and
  registered in the live Supabase project (5 prototypes rows total). It has
  a native overview page with the confirmed-model diagram and a three-screen
  simulation (agent flow + full-payload enrolment, invitation-sent fee
  product, pre-filled SAQ, webhook + 15-30 day polling, reporting). Mock
  client is App.pciIxopay; state is in memory only.

## Next steps
1. Verify the live Pages deploy shows the three new gallery cards (PCI,
   website screening, GDPR) and that the PCI overview and demo render.
2. Approve the draft copy marked in pci-app.js (agent modal, invitation
   email, fee product name/amount, SAQ items) and replace the LP-PCI-*
   backlog placeholders with real refs.
3. When IXOPAY returns the enrolment payload schema and a sandbox
   credential, drop the real shapes in where INTEGRATION POINT is marked.

## Open decisions
- Document upload (PRD .docx / .xlsx via mammoth.js + SheetJS + IndexedDB)
  is deferred: it would add the first non-Supabase CDN dependencies and an
  IndexedDB store. Revisit with owner sign-off.

## Recent history
Run: git log --oneline -15
User-facing changes: docs/CHANGELOG.md
