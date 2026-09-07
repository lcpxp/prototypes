# Current state

Updated: 2026-09-07 (platform restructured and grounded; on branch
claude/platform-page-restructure-brexcz, not yet merged)

## In progress
Nothing blocking. The platform page is three views over a three-axis
model (domain / kind / maturity, plus attestation and as_of), 18 derived
capabilities cover seven previously empty areas, and the reference is
joined to the graph. Six grounding figures now ratchet in
tests/knowledge-budget.json.

## Next steps
1. **Confirm the derived capabilities.** All 18 are `derived` - traceable
   to delivered work, checked by nobody. Reading them and setting
   `attestation = 'owner'` where they are right is the only way that
   word enters the store; an assistant may never set it.
2. **Confirm the drafted benefit.** 68 of 80 are `drafted`.
   `items.benefit_unconfirmed` in `npm run audit` is the figure.
   Method: docs/VALUE-CAPTURE.md.
3. `grounding.delivered_without_affects` is 65 of 83. Lower it during
   review Wave 4 rather than in a sweep - the point is the loop, not the
   number.
4. Three workstreams still carry a `work_notes` question instead of a
   benefit; they need the owner.

## Verification the repo cannot do for itself
- The platform page signed in: three views, nothing expanded on load,
  filter and expand/collapse, and a `#capability-<id>` link from a
  roadmap drawer landing on an opened card.
- Whether the 18 derived capabilities are actually true. Tests prove
  they are traceable, not that they are right.
- The six-department filter walk on the roadmap.

## Open decisions
- SECURITY: leaked-password protection still disabled in Supabase Auth.
- Rename lcpxp/prototypes to lcpxp/lpio? Raised 2026-07, still open.
- items.closed_without_resolution is 40 of 308, at its ceiling.
- Pull versus push on the inbound onboarding API: unresolved with the COO.
