# Session log

Rolling record of work on this repository. Every Claude Code session
reads the latest entry at the start and writes a checkpoint at the
end, or earlier if credits or context are running low. The rules for
when to checkpoint are in CLAUDE.md.

## Checkpoint template

Copy this block to the top of the Log section and fill it in. Newest
entries first.

    ## YYYY-MM-DD - <short title>
    Branch: <branch name>
    Completed:
    - <finished unit of work, with file paths>
    In progress:
    - <half-done item, exact file and state, e.g. "reference.js:
      params table renders, examples not yet wired">
    Next steps:
    1. <the single next action, precisely>
    2. <then this>
    Open decisions:
    - <anything awaiting the repo owner's call>

## Resume prompt template

Paste this as the first message of a new Claude Code session:

    Read CLAUDE.md in full, then read docs/SESSIONS.md and find the
    most recent checkpoint. Confirm which branch it names and check it
    out. Summarise the checkpoint back to me in three lines, then
    carry out its "Next steps" in order. Follow all rules in CLAUDE.md,
    especially the security rules and the checkpoint-before-credits
    rule. Do not start any work beyond the listed next steps without
    asking.

## Log

## 2026-07-09 - Test harness and security remediation
Branch: feat/test-harness
Completed:
- SECURITY: assets/js/config.js was tracked in this public repo
  (.gitignore had the comment but not the rule). Untracked it,
  fixed .gitignore. Keys must be rotated; old values remain in
  git history, rotation is the remediation.
- Zero-dependency test harness (node --test): security, structure,
  style and size gates in tests/checks/; behaviour benchmarks in
  tests/unit/ (ui.js App.escape and badges pinned).
- Size budgets in tests/size-budget.json; main.css 585 lines
  listed as explicit debt with an exit plan.
- Generated navigation: docs/CODEMAP.md + llms.txt via
  scripts/gen-codemap.js, refreshed by the pre-commit hook.
- Git hygiene: .githooks/pre-commit, .gitmessage template,
  npm run setup for fresh clones. docs/HARNESS.md process doc.
- Fixed hard-coded #ffffff in main.css to var(--surface).
In progress:
- None.
Next steps:
1. Rotate the Supabase anon key (Dashboard, Settings, API) and
   recreate assets/js/config.js locally from config.example.js.
2. Commit this work on feat/test-harness and merge to main.
3. Schedule the main.css split (base/components/pages) per
   tests/size-budget.json exception note.
Open decisions:
- Owner approval recorded here: tooling limited to Node built-ins
  and git only; no npm packages added (CLAUDE.md dependency rule).

## 2026-07-09 - LPio hub and silo structure
Branch: main
Completed:
- Reframed the experience around LPio / LaunchPad IO as a top-level
  project hub rather than a single onboarding portal.
- Updated navigation, dashboard copy and login copy to reflect a
  broader workspace for guidance, reference material and prototypes.
- Added a dedicated project-silo entry point at silos/ with a starter
  standalone tooling silo example.
In progress:
- None.
Next steps:
1. Add any future standalone project folders under silos/ and link them
   from silos/index.html.
2. Create the Supabase project, run schema.sql then policies.sql then
   seed.sql, create the first user, promote it to admin, and create
   assets/js/config.js locally.
3. Verify login, dashboard counts, reference viewer rendering the
   sample spec, user register, and gallery.
Open decisions:
- Hosting target (GitHub Pages assumed).
- Whether additional silo-specific pages should be created for each
  workstream as they emerge.
