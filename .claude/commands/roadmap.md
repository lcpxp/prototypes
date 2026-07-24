---
description: Run the roadmap review ritual - a quick, clickable pass over Now/Next, promotions, new work and decisions
argument-hint: [optional deeper wave, e.g. shareholder, later, parked]
---

Run the roadmap review ritual defined in `docs/ROADMAP-PLAYBOOK.md`
(section "The review ritual"). The roadmap is data in Supabase (project ref
`zlmkofbkobmhnslfnqsf`); read the playbook first if it is not already in
context, then drive the pass through the Supabase MCP.

Keep it to a tight 2-5 minute core. Each wave is ONE `AskUserQuestion` with
options you pre-compute from the data - never a wall of text. Every answer
maps to a specific `work_items` (or, in the sync wave, context) write from
the playbook's operations.

Contextual synchronisation is mandatory and runs BOTH ways every review
(playbook section "Contextual synchronisation"): source platform context
into the work, and feed this session's moves and deliveries back into the
platform knowledge base. Nothing is written to a work item OR the context
store without the owner validating it as a clickable choice first.

1. Wave 0 - Orient (no question): read `roadmap_current`, and open
   `work_notes` (status='active'). Show, briefly: the Now items, the Next
   items, what changed since the last review (max `updated_at`), and the
   counts. Also load the platform context for the areas in play -
   `product_capabilities`, `domain_terms`, `journey_stages`, `integrations`
   and facts - per docs/PLATFORM.md.
2. Wave 1 - Now integrity: for the Now items, ask on track / done / slipping
   / drop, and apply `status`, `progress`, `horizon`.
3. Wave 2 - Capacity: promote Next items to Now on evidence; demote where
   confidence dropped.
4. Wave 3 - New capture: ask if anything is new; apply the quick-capture
   recipe for each.
5. Wave 4 - Context sync (always, both ways): from the context loaded in
   Wave 0, put forward as clickable validation (a) context->item enrichments
   that sharpen items in play, and (b) item->context updates implied by this
   session's moves and deliveries. Apply only what the owner confirms, to
   work items AND to the context store, stamping provenance on context rows.
   Skip only when there is genuinely nothing to sync, and say so.
6. Wave 5 - Confirm: summarise every edit you made (roadmap and context),
   write ONE `work_notes` decision capturing the session's reasoning, stop.

Only after the core, offer the deeper waves from the playbook as further
clickable options (reprioritise within a theme, review Later bets, revive
parked, scope a workstream into items, rebalance departments, delivered
cleanup, shareholder-ready export prep).

If `$ARGUMENTS` names a deeper wave (for example `shareholder`, `later`,
`parked`, `workstream`), do Wave 0 to orient and then jump straight to that
wave instead of the full core.

Apply edits directly (writes need the admin role, which the MCP/service
context has). After each write, the board and any snapshot reflect it on the
next page load. Keep real merchant, partner and staff detail out of the repo.
