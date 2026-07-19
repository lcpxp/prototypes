# Current state

Updated: 2026-07-19 (session)
Branch: main (via claude/stress-free-compliance-overview-vbyv38)

## In progress
- PCI prototype overhauled into a standalone PXP Partner Portal replica
  (modules/prototypes/pci/demo.html + reports.html). Faithful chrome, 224px
  nav and 7-step stepper from the real portal; spine is steps 1/2/5 with
  3/4/6/7 as pass-through. On Continue from Product Selection a PCI compliance
  interstitial engages the agent (confirm compliant or enrol), enrolment adds
  a highlighted PCI Compliance Fee to the Quote drawer, and reports.html shows
  engagement/status/webhooks/chases. New: assets/css/pxp.css, pxp-pci.css,
  tokens.css --pxp-* group (light-locked); assets/js/pages/pci-portal.js,
  pci-interstitial.js, pci-reports.js; pci-ixopay.js evolved (complianceCheck,
  enrolment, getReport). Old pci-app.js removed. Mock only; in-memory state.

## Next steps
1. Approve the interstitial copy and the PCI fee amount (placeholder £4.50/mo),
   and replace the LP-PCI-* backlog placeholders with real refs.
2. Trim the now-unused three-screen demo classes from pci.css (overview page
   still uses its overview/diagram classes).
3. When IXOPAY returns the enrolment payload schema and a sandbox credential,
   drop the real shapes in where INTEGRATION POINT is marked.

## Open decisions
- Document upload (PRD .docx / .xlsx via mammoth.js + SheetJS + IndexedDB)
  is deferred: it would add the first non-Supabase CDN dependencies and an
  IndexedDB store. Revisit with owner sign-off.

## Recent history
Run: git log --oneline -15
User-facing changes: docs/CHANGELOG.md
