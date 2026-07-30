# CLAUDE.md

Operating rules for any Claude Code session working in this repository.
Read this file in full at the start of every session, then read
docs/STATE.md for the current state of work.

## What this repository is

A public repository containing the shell of LPio, a LaunchPad IO project
hub for developer material, guidance, prototypes and independent
workstreams. The site provides a login-gated dashboard, an API reference
viewer ("swagger") and a prototype gallery. All substantive content
(API specs, endpoint details, user
records, prototype registry) lives in Supabase, never in this repo. The
repo holds only structure, styling and rendering logic.

Full architecture: docs/ARCHITECTURE.md. Security model: docs/SECURITY.md.

## Repo map

    index.html            Login page (entry point, unguarded)
    dashboard.html        Post-login hub
    modules/              One folder per module: reference/, prototypes/, users/
    assets/css/           tokens.css (design tokens) plus layered stylesheets
    assets/js/core/       Shared runtime: config, supabase, registry, guard, ui, auth
    assets/js/pages/      One module per page (dashboard, reference, gallery, users)
    supabase/             schema/ (per-domain), policies.sql, seed.sql, migrations/
    docs/                 Architecture, security, sessions, design, setup, roadmap

    assets/js/core/registry.js is the single source of truth for
    modules, table names and roles. Navigation, dashboard cards and
    access keys derive from it; never hard-code those elsewhere.
    Per-file detail lives in the generated docs/CODEMAP.md.

## Non-negotiable security rules

1. This repo is public. Never commit keys, tokens, passwords, real
   merchant names, live internal endpoint URLs, or any credential of
   any kind. When in doubt, it goes in Supabase, not in git.
2. The public Supabase URL and anon key live in
   assets/js/core/supabase.js on purpose: the anon key only grants
   what RLS allows, so it is safe to ship and to deploy publicly.
   That is the ONLY credential that may be committed.
   assets/js/core/config.js stays gitignored - it is just an optional
   local override to point at a different project - and must never be
   committed.
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
- Work trunk-based. Commit straight to main in small, atomic commits
  with clear imperative messages ("Add endpoint params table", not
  "Added" or "misc changes"). Every push to main auto-deploys to
  GitHub Pages (.github/workflows/deploy.yml), so keep each commit
  green and reviewable on its own.
- Keep branches to a minimum: use a short-lived branch only when a
  change is genuinely risky or spans several commits that would leave
  main broken midway, then merge it back promptly and delete it.
  Avoid long-lived and per-session branches.
- Never force-push main. Never rewrite published history.
- Never use git add -f. If git refuses to add a file, that is the
  .gitignore doing its job.

## Session autonomy

Once the owner issues a request, work it end to end without pausing for
confirmation on routine steps: reading, editing, running tests, committing
and pushing to the working branch. .claude/settings.json (committed)
pre-approves those commands and denies the dangerous ones;
.claude/settings.local.json holds a developer's personal extras and stays
gitignored. Pause and ask only for actions that are destructive or hard to
reverse, that add a dependency, that change live-data schema, or that a
deny rule blocks (force-push, git add -f, committing config.js).

## Working with large files

- Read targeted ranges, not whole files. Locate the region with grep
  or a search first, then read only the lines needed.
- Edit with precise string replacements rather than rewriting a file
  end to end. Rewrites churn diffs and risk losing content.
- Keep files under roughly 500 lines. If a module approaches that,
  split it before extending it.
- Never paste large file contents into commit messages, logs, or
  docs/STATE.md. Reference paths and line ranges instead.

## Session state and resume

Current state lives in one fixed file, docs/STATE.md - never a growing
log. Git history is the record of what changed in the code;
docs/CHANGELOG.md is what changed for users; docs/STATE.md is only what
is not yet finished. No overlap between the three.

1. Session start: read CLAUDE.md, then docs/STATE.md, and continue from
   its "Next steps".
2. During work: commit completed units as you go, in atomic commits with
   imperative messages, so an interrupted session loses nothing and git
   carries the history.
3. Session end, before likely credit or context exhaustion, or before a
   risky operation: OVERWRITE docs/STATE.md in place - it never grows
   (40-line cap, enforced). Update In progress, Next steps and Open
   decisions, and prune decisions once resolved. There is no Completed
   section: finished work is expressed as commits.

Overwriting STATE.md costs under a minute, so checkpoint first when
exhaustion is likely; a clean one-message resume beats one more
half-finished change.

## Front-end rules

- Follow docs/DESIGN.md exactly. All colour, type and spacing values
  come from assets/css/tokens.css; never hard-code values in the layered
  stylesheets or inline on an element. Static inline style attributes are
  banned (tests/checks/style.test.js); only runtime-computed values
  (a grid position, a percentage width) may be set inline.
- No emojis anywhere: not in UI, docs, commit messages or code
  comments. No decorative icons, gradients or filler copy.
- Plain HTML, CSS and JavaScript. No frameworks, no build step, no
  new dependencies beyond the Supabase CDN client without explicit
  agreement from the repo owner recorded in docs/STATE.md open decisions.
- Every new protected page loads its scripts from <head>, each with
  defer, in this order: the Supabase CDN script, then core/supabase.js,
  core/registry.js, core/guard.js, core/ui.js, core/search.js, then its
  own page module(s) from assets/js/pages/. defer keeps them off the
  first-paint path and preserves execution order. core/theme.js is the
  one exception: it stays render-blocking in <head> to apply the theme
  before paint. Pages below the repo root set data-root on body.
  (supabase.js carries the public config; there is no separate config.js
  include.)
- Interface copy is plain, specific and in sentence case. Buttons say
  what they do. Errors say what went wrong and how to fix it.
- All dynamic content rendered into the DOM goes through App.escape.

## Adding common things

- Roadmap work (add or update an item/workstream, review the roadmap):
  follow docs/ROADMAP-PLAYBOOK.md - the single operating manual (model,
  every field, copy-paste SQL, quick-capture recipe and the review
  ritual). When the owner says any of "add this to the roadmap", "update
  this item", or "let's go through the roadmap", route through the
  playbook (the /roadmap and /roadmap-add commands wrap it). Database
  writes only; the repo does not change.
- New prototype: create the page under modules/prototypes/, follow
  the script include order above, then insert a registry row into the
  prototypes table. Do not hand-edit navigation.
- New module: folder under modules/ with an index.html, a page module
  in assets/js/pages/, and an entry in assets/js/core/registry.js.
  Navigation and dashboard cards follow from the registry entry.
- New API spec content: rows in api_specs and api_endpoints via the
  Supabase dashboard or SQL editor. The repo does not change.
- Work material supplied in chat (PRDs, backlog lists, DevOps
  pastes, sprint summaries) or decisions from working discussion:
  follow docs/WORKFLOW.md. Raw material and a digest go to
  work_documents, distilled records to work_notes, actionable
  entries to work_items. Database inserts only; the repo does
  not change.
- Platform knowledge supplied in chat (product overviews, capability
  descriptions, "what it does today" material): follow
  docs/PLATFORM.md. Verbatim source to work_documents (kind
  'platform'), distilled rows to product_capabilities linked to
  work_areas. Database inserts only; the repo does not change.
- Knowledge held in documents nobody has pasted in (a capture round
  with an external document assistant): follow docs/COPILOT.md.
  Measure the gap from the data, scope five to ten topics, and put
  the answer through the validation gate before storing anything.
  The request and the response both hold real material, so they live
  outside the repo.
- New table: schema in the right supabase/schema/ domain file,
  policies in supabase/policies.sql, both in the same commit, and
  the change applied to the live project as a migration.

## Definition of done for any change

- Works when served locally and from a static host.
- No console errors; unauthenticated access redirects to login.
- No hard-coded design values; no sensitive data introduced.
- Relevant docs updated; a user-visible change adds one line under
  Unreleased in docs/CHANGELOG.md in the same commit; docs/STATE.md
  updated if any work is left in flight.
- Committed to main; the GitHub Pages deploy workflow is green and the
  change is reviewable at the Pages URL.

<!-- harness:start -->
## Verification harness

- Commands: `npm run setup` (once per clone), `npm test` (full
  suite), `npm run map` (regenerate codemap), `npm run audit`
  (one-screen health report). Zero dependencies; Node built-in
  test runner.
- Definition of done now includes: a benchmark in tests/ covers the
  change and the whole suite is green. Gates in tests/checks/
  enforce the security, structure, style and size rules above
  mechanically; the pre-commit hook runs them.
- File size budgets: tests/size-budget.json (js/css soft 300 hard
  500; html 250/400; md 200/300). Over soft = schedule a split;
  over hard = split before extending. Exceptions are listed in the
  JSON with an exit plan.
- Navigation: read docs/CODEMAP.md (generated file + symbol index)
  and jump to file:line rather than reading whole files. llms.txt
  is the entry point for external crawlers. Never hand-edit either.
- Full process and rationale: docs/HARNESS.md.
<!-- harness:end -->
