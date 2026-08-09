---
description: Run the roadmap review ritual - a quick, clickable pass over Now/Next, promotions, new work and decisions
argument-hint: [optional deeper wave, e.g. shareholder, later, parked]
---

Run the roadmap review ritual. The ritual itself - Waves 0 to 5, the deeper
waves and the rules that keep it trustworthy - is defined in
`docs/ROADMAP-REVIEW.md`. Read that file and follow it; it is the definition,
not a summary of one. Wave 3 contextualises new work per
`docs/ROADMAP-INTAKE.md`, which is also where the confidence band thresholds
live - read them there rather than working from memory.

The roadmap is data in Supabase (project ref `zlmkofbkobmhnslfnqsf`); drive
the pass through the Supabase MCP. Writes need the admin role, which the
MCP/service context has. After each write the board and any snapshot reflect
it on the next page load.

Operating notes for this command specifically:

- Keep it to a tight 2-5 minute core: Waves 0 to 5, then stop. Offer the
  deeper waves only after the core is done.
- Each wave is ONE `AskUserQuestion` with options pre-computed from the data -
  never a wall of text, never a bare list without a recommendation.
- Contextual synchronisation (Wave 4) is mandatory and runs BOTH ways every
  review, sourcing platform context into the work and feeding this session's
  moves and deliveries back into the knowledge base. Nothing is written to a
  work item OR the context store without the owner validating it as a
  clickable choice first.
- Wave 3 treats a batch as ONE conversation: compare the new lines against
  history AND against each other - an umbrella and its own components
  arriving together is the commonest miss - then come back once. Never
  fourteen sequential questions. If the batch would land with `department`,
  `category_id` and `relates_to_id` uniformly null, the classification step
  has been skipped: offer it in that same pass.
- If `$ARGUMENTS` names a deeper wave (for example `shareholder`, `later`,
  `parked`, `workstream`), do Wave 0 to orient and then jump straight to that
  wave instead of running the full core.
- Keep real merchant, partner and staff detail out of the repo.
