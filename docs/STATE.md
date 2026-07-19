# Current state

Updated: 2026-07-19 (session)
Branch: claude/stress-free-compliance-overview-vbyv38

## In progress
- PCI compliance prototype (IXOPAY integration) built: gallery rows, a
  native overview page with the confirmed-model diagram, and a three-screen
  simulation (agent flow + full-payload enrolment, invitation-sent fee
  product, pre-filled SAQ, webhook + 15-30 day polling, reporting). Mock
  client is App.pciIxopay; state is in memory only. Files under
  modules/prototypes/pci/, assets/js/pages/pci-*.js, assets/css/pci.css.

## Next steps
1. Insert the three new prototypes rows into the LIVE Supabase project
   (seed.sql only seeds fresh setups) so the cards show on the deployed
   Pages site. Owner: review and merge.
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
