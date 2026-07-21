# Current state

Updated: 2026-07-21 (session)
Branch: claude/roadmap-ui-refinements-rq5f2g

## In progress
None. Roadmap toolbar refinements shipped end to end, ready to merge to
main:
- Export consolidated: the three Export JSON / Export CSV / Download PDF
  buttons are now one "Export" trigger opening a menu (JSON/CSV/PDF),
  wired like the nav account dropdown (outside-click and Escape dismiss).
- Hide fixes is now an icon-only bug toggle (.rm-bug-toggle): selected
  (danger tint) means fixes are shown; press it to hide them. State reads
  through aria-pressed/aria-label/title, not a text swap.
- Removed the Shareholder view / Full roadmap toggle entirely (button,
  JS wiring, filterShareholder/shareholderVisible builders and their
  opts.shareholder threading in timeline()/cascade()) - the owner found it
  redundant next to the bug toggle. The shareholder_visible column and the
  documented `roadmap_current` SQL query (docs/ROADMAP.md) are untouched;
  only the front-end feature is gone.
- Docs and tests updated to match (CHANGELOG, ROADMAP.md, ROADMAP-PLAYBOOK.md,
  .claude/commands/roadmap.md wording, roadmap-views.test.js); size-budget.json
  gained an exception entry for roadmap.css (now 345 lines, over soft).

## Next steps
1. Push this branch and merge to main once CI/deploy is green.

## Open decisions
None outstanding.
