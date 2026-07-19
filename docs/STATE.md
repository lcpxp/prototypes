# Current state

Updated: 2026-07-19 (session)
Branch: main (via claude/stress-free-compliance-overview-vbyv38)

## In progress
- none. PCI prototype complete: a standalone PXP Partner Portal replica
  (modules/prototypes/pci/ demo.html + reports.html + a blank dashboard.html).
  Nav is Dashboard / Application / Compliance Reports. On Continue from Product
  Selection the PCI interstitial engages the agent; after enrolment the modal
  closes, stays on Product & Pricing, and shows a highlighted non-editable PCI
  Compliance Fee row (£4.99/mo) - also in the Quote drawer. reports.html is the
  Compliance Reports view. The gallery card opens the overview (index.html),
  which outlines the flow end to end and offers "Explore prototype". Styles:
  pxp.css, pxp-pci.css, tokens.css --pxp-* (light-locked); pci.css overview-only.
  Logic: pci-portal.js, pci-interstitial.js, pci-reports.js, pci-ixopay.js (mock).

## Next steps
1. Replace the LP-PCI-* backlog placeholders with real refs.
2. When IXOPAY returns the enrolment payload schema and a sandbox credential,
   wire the real shapes in where INTEGRATION POINT is marked in pci-ixopay.js.
3. Future portal prototypes can reuse the pxp.css / pxp-pci.css replica shell.

## Open decisions
- Document upload (PRD .docx / .xlsx via mammoth.js + SheetJS + IndexedDB)
  is deferred: it would add the first non-Supabase CDN dependencies and an
  IndexedDB store. Revisit with owner sign-off.

## Recent history
Run: git log --oneline -15
User-facing changes: docs/CHANGELOG.md
