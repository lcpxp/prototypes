# Current state

Updated: 2026-07-24 (session)
Branch: main is trunk; this change on
claude/database-context-enrichment-1qdcyq (platform context only).

## In progress
Platform context enrichment (2026-07-24): owner-validated document
extraction stored as platform context only - no roadmap items or
workstreams created or changed. New tables domain_terms and
journey_stages (schema/45_context.sql, policies wired); integrations
enriched (DaoPay EU acquirer, EIT live/outbound, HubSpot primary CRM;
added WebShield live, NetSuite planned); work_notes facts (Unity M2M
auth -> Azure AD B2C, 17-step orchestration, contract edit/regenerate
+ Active/Pending Further Information statuses, acquirer routing,
KPI-portal pricing). Provenance in work_documents (kind platform).

Roadmap context enrichment (protocol in work_notes, 2026-07-22): fixed
context blocks in work_items.details, wave 1 done; wave 2 remains.

## Next steps
1. Confirm VFS meaning (stored low-confidence in domain_terms) and
   supply a current roles document (2025 list held, not stored).
2. Roadmap context enrichment wave 2: Next/Later + backlog items.
3. VALUE-CAPTURE session (docs/VALUE-CAPTURE.md): merchant_value/
   pxp_value still empty across the roadmap.
4. Owner eyeballs the live board: colour blocks, mismatch dots.

## Open decisions
- VFS: partner type/flow, exact meaning unconfirmed by owner.
- Onboarding API: pull (COO) vs existing push/static-submission. Held.
- State launches: US state-by-state vs broader region. Placeholder.
