# Changelog

All notable user-facing changes to LPio, newest first. The format
follows Keep a Changelog (https://keepachangelog.com/). The project is
pre-1.0 and unversioned until the owner cuts a release: at that point the
Unreleased section rolls into a dated version heading and is tagged.

Scope: this file records what changed for users. What changed in the code
is the git history; what is unfinished is docs/STATE.md.

## [Unreleased]

### Fixed
- The roadmap's Workstreams, Timeline, Work Items and Executive views now
  show work that has no filing area, instead of silently dropping it. The
  product board previously kept only items whose area was explicitly
  product-scoped, so a workstream or item scheduled without an area never
  appeared. It now hides only work explicitly filed as the portal's own
  internal development; everything else on the roadmap is visible.

### Changed
- The Daopay prototype intro page now matches the guidance document: its
  overview no longer implies the review happens in the portal (it happens
  in Daopay's own CRM and file storage; the portal is only for recording
  the decision), the screening step no longer over-lists checks, and the
  embedded diagram is the current involvement flow with the three-outcome
  branch at step 10.
- The Daopay replica's contract tables now start empty. A PXP user
  generates each contract, which adds its row; the generated state is
  kept for the tab, so switching to the Daopay view finds the contracts
  there to send. Sending is blocked, with a prompt, if nothing has been
  generated. Opening the Applications list starts a fresh run.
- The Daopay replica's role switch moved into the black header bar and the
  blue prototype banner over the content is gone, so the page below the
  chrome is the portal and nothing else. A Daopay user is now offered only
  the two statuses they can set, Rejected and Pending Further Information;
  the pending note sits in an amber panel that closes to show what was
  sent. Contracts show one row each and screening is limited to Mastercard
  MATCH and Webshield. Both send controls - the merchant contract and the
  KYC approval - sit with the Daopay view so the whole run demonstrates
  without a role switch, and the status between full signature and a
  decision reads Application Signed.
- The roadmap page intro is trimmed to a few lines so the board sits higher
  on the page: it no longer enumerates each view tab, keeping only the
  altitude note, the click-for-detail hint and where the data lives.
- Top-level roadmap rows now sort by span length before priority: work
  that finishes in its starting stage sits above work that runs on into
  the next stage.

### Added
- The Daopay replica now simulates a run rather than describing one.
  Sending a contract asks for the merchant's email, then an Adobe Sign
  panel shows the envelope going out and the three signatures landing in
  order - merchant, then Oliver, then Michael - each with a spinner and a
  tick. Full signature kicks off the automated handoff, which reports the
  CRM upload, the SFTP file transfer and the Daopay notification as they
  happen. Success messages now stack down the top right and stay long
  enough to read, replacing the single black pill at the foot of the page.
- The Daopay guidance now says where the review actually happens: on full
  signature the merchant and application data transfers into Daopay's CRM
  and the contract files and screening PDFs go across by SFTP, so the
  notification is a cue to check their own systems. They open the portal
  only to record the decision.
- New Daopay user-role prototype under Prototypes: a guidance overview of
  how the Daopay compliance team will approve EU merchant applications, a
  sequence diagram of the flow, and a replica of the partner portal that
  renders the same application as a PXP user and as a Daopay user so the
  reduced control set is visible side by side. All data in it is invented.
- Nested work items now stack in stage order under their workstream (Now
  above Next above Later; within a stage, spans finishing sooner sit
  higher), inherit the workstream's theme colour, and carry a small faint
  dot in their own theme when it differs - an at-a-glance flag for
  misaligned tagging.
- The Now, Next and Later stage headers on the roadmap are now clickable.
  Clicking one strikes the label through and takes that stage off the
  board - the work that begins in it disappears - so you can, say, hide
  everything happening now and read only what is Next and Later. Clicking
  the struck header again brings the stage back. It works on the Timeline
  column headers and the Cascade band headings, across every level
  (Workstreams, Work Items, Backlog). The choice is a view-only preference
  held in the browser; it changes nothing in the data and touches nothing
  else.
- The roadmap now distinguishes work items from deliverables. A
  deliverable is drawer-only detail beneath a workstream or a work item -
  the things that piece of work produces - and never appears on the board.
  A workstream's drawer lists its nested work items and its deliverables in
  separate sections; a work item's drawer lists its deliverables.
- Roadmap items can now carry business area associations: departments
  that want visibility of an item without owning it. Filtering the
  roadmap by a department now surfaces both the work it owns and the work
  it is associated with, so (for example) an Operations view covers
  everything Operations cares about whatever the item's primary theme.
  The associations show in the item drawer and in CSV/JSON exports.
- The prototypes gallery now shows a Future prototypes table below the
  Live and Drafts grids: a pre-draft shortlist of ideas held for future
  reference, backed by a new future_prototypes table.

### Changed
- The roadmap item drawer now shows everything stored against an item:
  long-form details, type, effort, impact, priority, its workstream and
  related items by name, requested-by, external reference, tags, the
  closing resolution with its date, recorded decisions and notes, and
  any extra attribute fields - and the JSON/CSV exports carry the same
  context, so nothing captured in the database stays invisible.
- The roadmap board is now bars only. Work Items and Backlog show
  workstreams (bold) with their nested work items indented beneath them,
  plus standalone items - deliverables no longer clutter the board, they
  live in the drawer. Loose items interleave with workstreams by priority -
  workstreams win ties, so they lead their band unless an item is
  deliberately promoted.
- On the Timeline board, a workstream's nested work items now sit slightly
  inset on the bar itself, so the nesting reads on the bars rather than only
  in the left theme-label gutter. The theme label stays flush.
- The department filter now keeps a workstream visible when a nested item
  under it matches the chosen department, showing just the matching
  children so the association reads at a glance.
- In Custom view, deselecting a workstream now also drops its nested work
  items and deliverables from the PDF, JSON and CSV exports, so an export
  never carries a child whose parent was removed.
- Export as PDF now prints whichever view is on screen (Categories remains
  the recommended C-suite one-pager); the printed board is bars only.
- The roadmap's Delivered work now splits into two columns: Recently
  completed (shipped in the last four weeks, a rolling list) and Previously
  completed (the older, historic record), so recent wins stand apart from
  the long tail.
- The roadmap stack now sinks bugs below other work in their band, groups
  equal-priority parked rows by theme lane, and tints parked bars with
  their lane hue so backlog items no longer read as detached.
- The roadmap toolbar now has a single Export button that opens a menu of
  JSON, CSV and PDF, replacing three separate export/download buttons.
- The roadmap's Hide fixes control is now an icon-only bug toggle (selected
  means fixes are shown; press it to hide them), replacing the text button.
- The prototypes gallery now groups entries under two headings: the PCI
  compliance prototype sits on its own row under "Live", and every other
  prototype groups under "Drafts", slightly greyed but still clickable.
- The roadmap timeline reads better on screen and in the PDF export: each
  row now sits on a light shaded lane, bars carry a slightly stronger fill,
  and the bar and lane colours print exact instead of dropping to white -
  so the export no longer looks washed out with barely visible bars.
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
