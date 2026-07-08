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

## 2026-07-08 - Initial skeleton
Branch: main
Completed:
- Full skeleton: login (index.html), dashboard, reference viewer,
  user register, prototype gallery; token-driven CSS; Supabase
  schema, RLS policies and sample seed; CLAUDE.md and docs set.
In progress:
- None.
Next steps:
1. Repo owner applies the skeleton patch and pushes to main.
2. Repo owner creates the Supabase project, runs schema.sql then
   policies.sql then seed.sql, creates the first user, promotes it
   to admin, and creates assets/js/config.js locally.
3. Verify login, dashboard counts, reference viewer rendering the
   sample spec, user register, and gallery.
Open decisions:
- Hosting target (GitHub Pages assumed).
- Whether an in-portal admin editor for specs is wanted, or whether
  editing stays in the Supabase dashboard for now.
