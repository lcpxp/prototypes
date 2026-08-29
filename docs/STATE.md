# Current state

Updated: 2026-08-29 (refactor workstream closed)

## In progress
Nothing. docs/plan/90-REFACTOR.md is the record: fourteen commits, each
verified in a browser against a worktree of the pre-refactor tree before
it was pushed. 573 tests green, audit clean, schema snapshot untouched
and in step. No user-visible change, which is why docs/CHANGELOG.md has
no entry from it.

## Next steps
Owner-supplied content is still the only queued work, and it is not
blocking. docs/HANDOVER-CONTEXT.md is the claude.ai prompt for gathering
it: 80 items with no summary, 39 closed with no resolution, 20 orphaned
notes, 110 links still proposed, 14 ideas with no summary or value note.
Those figures are the ones npm run audit shows and the knowledge gate
holds, so filling them lowers a ceiling that cannot climb back.

## Verification the repo cannot do for itself
- A signed-in pass over the app-review board with coloured triage rows.
  tests/checks/db-style-contract.test.js now proves every colour_token
  has its token pair, but only a browser proves the rows are coloured.
- The 25% load-speed target on COMPRESSED bytes (80-LOAD-SPEED.md).
  tests/page-weight-budget.json now ratchets uncompressed per-page
  weight; a DevTools run still settles the compressed figure.
- Re-embedding after a wave of roadmap edits: `select * from
  roadmap_embed_refresh();`. embeddings.stale is held at zero.

## Open decisions
- Should daopay-admin-tool.js (7,935 B) and send-tool.js (8,257 B) load
  on all 23 protected pages, or only inside the DaoPay prototype? Both
  render a nav icon, so dropping them is a visible change and the
  owner's call. ~16KB uncompressed on every page load.
