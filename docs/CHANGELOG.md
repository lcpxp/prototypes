# Changelog

All notable user-facing changes to LPio, newest first. The format
follows Keep a Changelog (https://keepachangelog.com/). The project is
pre-1.0 and unversioned until the owner cuts a release: at that point the
Unreleased section rolls into a dated version heading and is tagged.

Scope: this file records what changed for users. What changed in the code
is the git history; what is unfinished is docs/STATE.md.

## [Unreleased]

### Changed
- The roadmap's Backlog level now mirrors the full backlog list: it shows
  every work item regardless of scope, so nothing captured is invisible in
  the roadmap tool. The Workstreams/Exec and Team views stay product-scoped.
- On the timeline, workstreams now sort above standalone items within a
  band: a standalone item always sits below the workstreams in its band,
  even when it spans the same duration.

- The roadmap view switch is now Workstreams / Categories / Work Items /
  Backlog (was Executive / Team / Backlog), with the Department dropdown as
  a filter across all of them.
- Roadmap lane colours are now keyed to the owning department: Product
  themes read as blues, Operations as greens, Finance as violets, Sales as
  magentas, Risk as orange, so a lane's hue signals who owns it. Workstream
  bars render as a stronger shade of their lane than standalone items.

### Added
- A Workstreams level on the roadmap (now the default view): a strategic
  gantt of workstreams only, with standalone items hidden, so the top-level
  narrative reads cleanly for stakeholders.
- A Hide fixes toggle on the roadmap: drops standalone maintenance items
  (bugs, tasks, small improvements) from the Work Items and Backlog levels
  so you can focus on strategic work, without touching the data.
- Roadmap workstreams: a high-level item ("Self Service API", "Unity
  integration") reads as a presentable container that collapses its
  sub-items to a checklist when Detailed is off, so a workstream can be
  shown without its granular detail.
- A Shareholder view toggle on the roadmap that narrows the board to
  shareholder-ready work, dropping internal themes (Core LaunchPad, fixes)
  and bugs.
- A Custom view toggle on the roadmap: a checkbox on each row lets you
  hand-pick exactly which items a one-off PDF or CSV/JSON export carries,
  pruned in real time with no change to the underlying data.
- A PCI compliance prototype in the prototype gallery: a standalone, faithful
  replica of the PXP Partner Portal onboarding wizard (application, operating
  sites, products and pricing) with a PCI compliance interstitial on proceed -
  confirm compliant, or enrol the merchant with the data already collected -
  after which a highlighted PCI Compliance Fee row appears on the Products &
  Pricing screen and in the Quote Tool. A Compliance Reports view (its own nav
  item) shows engagement, status, webhooks outstanding and chases performed by
  IXOPAY. Placeholder gallery entries for website screening and GDPR were
  added alongside it.
- The Executive roadmap view now leads with departments: each owning
  department, the categories it owns and their item counts, drilling to
  the items in Detailed view.
- Work items can break into ordered sub-steps as first-class child items,
  shown as a checklist on the parent in Detailed view and the drawer.
- Export CSV on the roadmap and the backlog, beside Export JSON and
  Download PDF; the columns cover every field, new attributes included.
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
- Detailed view now also expands the Team and Backlog roadmap levels into
  a Category to Area to item breakdown, not just Executive.
- Completeness percentages are no longer shown at board level; progress
  reads as a subtle bar and a sub-step count instead.
- Pages load their scripts deferred from the head, so the first paint is
  no longer blocked on JavaScript.
- Search failure and empty states now say what happened and what to try.

### Fixed
- The Compact/Detailed toggle now changes the Team and Backlog views; it
  was a no-op on those levels before.
- The copy-to-clipboard button reports "Copy failed" when the browser
  denies clipboard access, instead of doing nothing.
