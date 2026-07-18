# Changelog

All notable user-facing changes to LPio, newest first. The format
follows Keep a Changelog (https://keepachangelog.com/). The project is
pre-1.0 and unversioned until the owner cuts a release: at that point the
Unreleased section rolls into a dated version heading and is tagged.

Scope: this file records what changed for users. What changed in the code
is the git history; what is unfinished is docs/STATE.md.

## [Unreleased]

### Added
- Global header search deep-links each result to the item itself, grouped
  by area with method/status badges, per-group counts and a "view all"
  link, and match highlighting.
- Search is a full keyboard combobox: arrow keys, Home/End, Enter to open,
  Escape to close.
- Shareable deep links open the target item across modules - the roadmap
  and backlog detail views, a specific reference endpoint, and a
  highlighted platform, user or integration row.
- Search now also covers users and integrations.

### Changed
- Pages load their scripts deferred from the head, so the first paint is
  no longer blocked on JavaScript.
- Search failure and empty states now say what happened and what to try.

### Fixed
- The copy-to-clipboard button reports "Copy failed" when the browser
  denies clipboard access, instead of doing nothing.
