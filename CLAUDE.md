# CLAUDE.md

Operating rules for any Claude Code session working in this repository.
Read this file in full at the start of every session, then read
docs/STATE.md for the current state of work.

## What this repository is

A public repository containing the shell of LPIO, a project
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
    modules/              One folder per module, named for its registry key
    assets/css/           tokens.css (design tokens) plus layered stylesheets,
                          loaded as a fixed stack: tokens, base, layout,
                          components, pages, then page sheets
    assets/js/core/       Shared runtime, loaded in a fixed order that lives
                          in assets/js/core/includes.json - read it there
    assets/js/pages/      One folder per module, mirroring modules/; files
                          under it attach App.<camelCase(folder)>...
                          shared/ holds what several modules use
    supabase/             schema/ (per-domain), policies.sql, seed.sql,
                          migrations/, functions/ (Edge Functions),
                          schema-snapshot.json (generated; the drift gate reads it)
    docs/                 Architecture, security, design, setup, roadmap,
                          KNOWLEDGE-MODEL.md (why the model is shaped as it is)

    Counts go stale, so this map describes shape. For the current file
    list read the generated docs/CODEMAP.md.

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

## What "nothing is ever deleted" governs

It governs ROWS: work items, notes and applications close with a
status, a resolution and a back-link, so a decision is never lost and
every outcome has an undo. State that undo in the confirmation line.

It does NOT govern columns, tables, views, functions or files.
Superseded schema is removed once nothing reads it, and git is its
history. Keeping a dead column alive out of misplaced deference leaves
two mechanisms for one job and forces every later session to work out
which is live - the exact ambiguity the rule exists to remove. Applied
migrations are the one exception: they are immutable once run.

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
- Split a file before extending it once it passes its soft budget.
  The numbers live in tests/size-budget.json and nowhere else - a
  limit restated here would be a second home for one rule, which is
  the thing these rules exist to prevent.
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
- Every new protected page loads its scripts from <head> in the order
  set out in assets/js/core/includes.json, which is the ONE home for
  that order - read it there, never from memory. It carries the reason
  for each entry and which are universal. tests/checks/structure.test.js
  enforces it. Pages below the repo root set data-root on body.
- Interface copy is plain, specific and in sentence case. Buttons say
  what they do. Errors say what went wrong and how to fix it.
- All dynamic content rendered into the DOM goes through App.escape.

## Adding common things

- Roadmap work (add or update an item/workstream, review the roadmap):
  three files, one job each. docs/ROADMAP-PLAYBOOK.md is the model,
  every field and the copy-paste operations. docs/ROADMAP-INTAKE.md is
  the contextualisation protocol, and the ONE home for the confidence
  band thresholds - read them there, never from memory.
  docs/ROADMAP-REVIEW.md is the review ritual. When the owner says "add
  this to the roadmap" or "update this item", route through INTAKE then
  PLAYBOOK (/roadmap-add wraps it); when they say "let's go through the
  roadmap", run REVIEW (/roadmap wraps it). Database writes only; the
  repo does not change.
- Application review (a wave of merchant application triage, or
  screenshots of the LP list and mailbox threads): follow
  docs/APP-REVIEW.md - the wave lifecycle, the thirteen domain rules,
  how to classify and the copy-paste SQL. The /app-review command
  wraps it. Database writes only; the repo does not change, and the
  portal at modules/app-review/ only displays what the session wrote.
  Never set confirmed_at yourself: confirmation is a human act.
- New prototype: create the page under modules/prototypes/, follow
  the script include order above, then insert a registry row into the
  prototypes table. Do not hand-edit navigation.
- New nav tool link (a saved Splunk search, another external tool):
  one portal_links row - key, label, icon, base_url, query, params.
  The target never enters this repo (docs/SECURITY.md); tools.js turns
  the row into a URL. Add an icon to assets/js/core/tools.js only when
  a row names one the nav cannot yet draw.
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
- Relationships between anything the system knows: one row in
  knowledge_links, typed from the eight kinds - duplicate_of,
  supersedes, part_of, blocks, relates_to, distinct_from, about,
  affects. Never a new column. Links are closed (valid_to), never
  deleted, and a link an assistant writes is `proposed` until the owner
  confirms it. Vocabulary and SQL: docs/ROADMAP-INTAKE.md; reasoning:
  docs/KNOWLEDGE-MODEL.md.
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
- If schema, policies or migrations changed: supabase/schema-snapshot.json
  regenerated (`npm run snapshot`, needs Supabase MCP access) and the
  drift check green. The repo describing a database it cannot rebuild is
  how two columns and five migrations went missing.
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
- File size budgets: tests/size-budget.json is the one home for the
  numbers - read them there. Over soft means record the seam it splits
  on (an `acknowledged` entry); over hard means split before extending.
  An acknowledgement cannot raise a cap.
- Line count is only a proxy. The rule it stands in for - one concept
  documented in exactly one place, cited everywhere else - is
  enforced directly by the one-home gate in
  tests/checks/roadmap-intake.test.js. When the two disagree, the
  one-home gate wins: a longer single file beats the same threshold
  stated in three shorter ones.
- Navigation: read docs/CODEMAP.md (generated file + symbol index)
  and jump to file:line rather than reading whole files. llms.txt
  is the entry point for external crawlers. Never hand-edit either.
- Full process and rationale: docs/HARNESS.md.
<!-- harness:end -->
