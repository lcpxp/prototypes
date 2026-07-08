# CLAUDE.md

Operating rules for any Claude Code session working in this repository.
Read this file in full at the start of every session, then read
docs/SESSIONS.md for the current state of work.

## What this repository is

A public repository containing the shell of an internal portal for the
merchant onboarding programme: a login-gated dashboard, an API reference
viewer ("swagger") and a prototype gallery. All substantive content
(API specs, endpoint details, user records, prototype registry) lives
in Supabase, never in this repo. The repo holds only structure, styling
and rendering logic.

Full architecture: docs/ARCHITECTURE.md. Security model: docs/SECURITY.md.

## Repo map

    index.html            Login page (entry point, unguarded)
    dashboard.html        Post-login hub
    reference.html        API reference viewer
    users.html            User register
    prototypes/           Prototype pages plus gallery index
    assets/css/           tokens.css (design tokens) and main.css
    assets/js/            Auth, guard, UI and page modules
    supabase/             schema.sql, policies.sql, seed.sql
    docs/                 Architecture, security, sessions, design

## Non-negotiable security rules

1. This repo is public. Never commit keys, tokens, passwords, real
   merchant names, live internal endpoint URLs, or any credential of
   any kind. When in doubt, it goes in Supabase, not in git.
2. assets/js/config.js is gitignored. Never create, commit or print
   its contents. Never inline Supabase URLs or keys into any file.
3. The service_role key must never appear anywhere: not in files, not
   in commit messages, not in session logs, not in terminal output.
4. Before every commit, run git status and confirm no ignored or
   sensitive file has been force-added.
5. Any new Supabase table must get RLS enabled and policies written in
   supabase/policies.sql in the same change. A table without policies
   is publicly readable via the anon key.
6. Sample data in seed.sql must stay generic. No real payloads.

## Git and GitHub practice

- Clone shallow when starting fresh: git clone --depth 1 <url>. Deepen
  only if history is actually needed (git fetch --unshallow).
- Work on a branch per feature: feat/<short-name>, fix/<short-name>,
  docs/<short-name>. Never commit directly to main except for docs and
  session-log updates.
- Commit small and atomic, message in the imperative: "Add endpoint
  params table", not "Added" or "misc changes".
- Never force-push main. Never rewrite published history.
- Never use git add -f. If git refuses to add a file, that is the
  .gitignore doing its job.

## Working with large files

- Read targeted ranges, not whole files. Locate the region with grep
  or a search first, then read only the lines needed.
- Edit with precise string replacements rather than rewriting a file
  end to end. Rewrites churn diffs and risk losing content.
- Keep files under roughly 500 lines. If a module approaches that,
  split it before extending it.
- Never paste large file contents into commit messages, logs, or
  docs/SESSIONS.md. Reference paths and line ranges instead.

## Session management, resume prompts and credits

Sessions are tracked in docs/SESSIONS.md. The workflow:

1. Session start: read CLAUDE.md, then the latest entry in
   docs/SESSIONS.md. Confirm the branch and pick up from "Next steps".
2. During work: keep a running sense of what is done versus in
   progress. Commit completed units as you go so an interrupted
   session loses nothing.
3. Session end, or when credits or context are running low: STOP
   feature work early and spend the remaining budget writing a
   checkpoint entry in docs/SESSIONS.md using the template there:
   date, branch, what was completed, what is half-done and exactly
   where, next steps in order, and open decisions. Commit it.
4. The checkpoint doubles as the resume prompt. A new session begins
   by pasting the resume template from docs/SESSIONS.md, which points
   back to the latest checkpoint.

A checkpoint that lets a cold session resume in one message is more
valuable than one more half-finished feature. When credit exhaustion
is likely, checkpoint first.

## Front-end rules

- Follow docs/DESIGN.md exactly. All colour, type and spacing values
  come from assets/css/tokens.css; never hard-code values in pages or
  main.css.
- No emojis anywhere: not in UI, docs, commit messages or code
  comments. No decorative icons, gradients or filler copy.
- Plain HTML, CSS and JavaScript. No frameworks, no build step, no
  new dependencies beyond the Supabase CDN client without explicit
  agreement from the repo owner recorded in docs/SESSIONS.md.
- Every new protected page includes, in order: the Supabase CDN
  script, config.js, supabase.js, guard.js, ui.js, then its own page
  module. Pages below the repo root set data-root on body.
- Interface copy is plain, specific and in sentence case. Buttons say
  what they do. Errors say what went wrong and how to fix it.
- All dynamic content rendered into the DOM goes through App.escape.

## Adding common things

- New prototype: create the page under prototypes/, follow the script
  include order above, then insert a registry row into the prototypes
  table. Do not hand-edit navigation.
- New API spec content: rows in api_specs and api_endpoints via the
  Supabase dashboard or SQL editor. The repo does not change.
- New table: schema in supabase/schema.sql, policies in
  supabase/policies.sql, both in the same commit.

## Definition of done for any change

- Works when served locally and from a static host.
- No console errors; unauthenticated access redirects to login.
- No hard-coded design values; no sensitive data introduced.
- Relevant docs updated; session log updated if the change is part of
  a tracked piece of work.
