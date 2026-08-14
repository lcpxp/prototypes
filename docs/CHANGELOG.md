# Changelog

All notable user-facing changes to LPio, newest first. The format
follows Keep a Changelog (https://keepachangelog.com/). The project is
pre-1.0 and unversioned until the owner cuts a release: at that point the
Unreleased section rolls into a dated version heading and is tagged.

Scope: this file records what changed for users. What changed in the code
is the git history; what is unfinished is docs/STATE.md.

## [Unreleased]

### Changed
- The **API reference** documents the v1 merchant surface once rather
  than three times. Twenty operations are served under an unscoped, an
  admin and a partner prefix with identical shapes; each now has one
  row naming all three, so the addresses are still findable by search
  but the list is no longer three copies of itself. Coverage against
  the code rose from 60.5% to 72.5% as a result, without a single row
  being written.
- The **API reference** now says when a documented route has no
  front-end consumer, rather than presenting every route as equally
  current. Four routes carry the badge today, each with a note saying
  what was checked. The split is measured from the LaunchPad portal's
  own call sites on every run, so a route the portal starts calling
  loses the badge instead of keeping a label nobody revisited.
- The **dashboard** is rebuilt around what is happening rather than
  what exists. It now opens with the workstreams at now and next -
  each with its theme, progress, open-item count and a click straight
  through to its detail - then the API specs with how much of each is
  actually verified against the code, any open review wave and the
  single next thing it needs, the platform knowledge figures with the
  gaps in them, and a card per external tool saying what it is for.
  Module cards and recent activity are still there, below the
  substance. Recent activity now says what changed, not only that
  something did, and links to the row rather than the module.

### Added
- The platform page's **How it is built** section now has ten rows
  describing the LaunchPad architecture, read from the code: the API's
  four layers and where a shape gets converted, its Result type, its
  URL versioning, its 210 migrations and its three test projects; and
  the front end's Angular 20 with no state library, its eight route
  guards, its single error interceptor and its absent unit suite.
  Enough to answer "how is this built" without opening either
  repository.
- **Global search now reaches the narrative content**, which it never
  did: notes and decisions, source documents, glossary terms, journey
  stages, API topics and specs, prototype ideas and review findings
  all join the six things it already found. A result shows the part of
  the text that matched rather than a first line, so searching 180
  notes tells you why each one came back, and every result lands on
  the row itself rather than on a module index - a note opens whatever
  it is about, a finding opens inside its wave.
- The prototypes module now has an **ideas and plans board**. The
  fourteen-name "Future prototypes" table becomes a list you can
  actually work: each idea can carry what it would prove, a priority
  band, an effort, the area it belongs to, and a plan written against
  it. An idea is never deleted - it closes with a reason, or becomes a
  prototype and links to it. The gallery keeps a short strip of the
  top few, linking through. Capture one in a Claude session with
  `/prototype-idea`; it takes a single line.
- A plan records what a prototype would be **built from** - the
  capability rows, styling rows and endpoints it draws on. So a reader
  can see whether to trust a prototype, and when one of those sources
  changes, the links name every prototype now out of date.
- **Portal review** is now a feature rather than a one-off HTML file.
  A wave can be opened, walked area by area, answered, verified,
  triaged and closed - the whole method from the wave 4 review board,
  with its 39-area map loaded as data. Findings carry what the
  developers said, what you verified, and what the review decided,
  which are three different statements and stay three. Anything the
  review produced that is not future work is archived with a reason
  rather than thrown away. Three pages: the wave list with the
  standing asks and the area map, the board itself with its coverage
  rail and walker, and the triage view. Like application review, the
  pages read and a Claude session writes (`/portal-review`).
- The dashboard's **Reviews** section now covers both reviews, each
  measured in its own units: an application wave counts applications
  to classify, a portal wave counts areas still to walk.
- The platform page now has a **Look and feel** section: fifteen rows
  describing how the LaunchPad front end is actually styled - the
  layer model, the eight layout compositions, spacing, buttons,
  dialogs, tables, typography, colour, icons, UI tone and the test
  locator contract. Every one is read from the code rather than from
  a description of it, and three of them record where the written
  rules and the code disagree. Enough to build something that looks
  like the real thing without guessing.
- Three roadmap items about lists and tables now carry notes from that
  code review, including the one that changes the estimate: the
  styling for sortable table headers already exists, written and
  commented out, and cannot simply be uncommented.
- Opening a **roadmap item or workstream** now shows everything stored
  against it, including values no part of the page was written for.
  Anything the drawer does not have a designed row for appears under
  "Also recorded against this item", so new information added to an
  item in future is visible the day it is added rather than the day
  someone edits the page for it.
- The same guarantee now covers the **platform capability cards**, both
  **backlog** detail views, the **user register** and the **review
  board** drawer. Four things that were recorded but shown nowhere are
  now visible: a capability's tags, which earlier document a document
  replaced, and on an application, whether it was carried forward from
  an earlier wave and when it was resolved, recorded and last updated.
- A roadmap item now shows the **milestone** it is targeted at, with its
  date. The column was stored and fetched but rendered nowhere, so the
  first milestone anybody set would have been invisible.
- The **integrations detail** now shows everything recorded against an
  integration, not just the six fields the view was written around.
  Anything else on the record appears under "Also recorded against
  this", so a new fact is a database edit rather than a code change -
  and nothing can be stored against an integration and stay invisible.
- A link between two things now shows when it is **proposed** rather
  than confirmed. Links an assistant records stay proposed until you
  confirm them, and until now that distinction was stored but never
  shown, so a suggestion read exactly like a decision. Proposed links
  carry a badge on the roadmap drawer and the platform card; confirmed
  ones show nothing, because confirmed is the ordinary case.

### Fixed
- The **users page** showed "member" against any role that was not
  admin. With only two roles in use nothing looked wrong, but the label
  was asserted rather than read, so a third role would have been
  mislabelled on every row. It now shows whatever role the row carries.
- An application blocked at **record scope** carried no blocker flag on
  the review board, reading as though nothing were blocking it. Partner
  and merchant scope were flagged; record was never given a branch. Any
  scope now shows.

### Added
- A **DaoPay admin** icon in the top-right nav opens a modal with two
  copyable browser-console snippets: one that creates a portal user
  holding the DaoPay reviewer role, and one that lists who currently
  holds it. A stopgap until the portal grows a UI for that role; the
  snippets read the portal's host and scope from its own config at run
  time and carry placeholder arguments the operator replaces.

### Changed
- The **API reference** has been reconciled against the LaunchPad
  source: twelve rows that documented paths the API does not serve are
  corrected, three that documented commented-out endpoints are retired
  into the gap register, and the four templated `service-fees` rows are
  replaced by the sixteen real endpoints they were hiding. It now
  documents 256 endpoints and accounts for 60.5% of the 552 routes in
  the code, up from 56.3%, with the remainder tracked rather than
  guessed at.
- **Knowledge links** now render between any two kinds of thing. A work
  item's link to a capability, a glossary term or a journey stage used
  to show nothing at all; only work-item-to-work-item and
  capability-to-capability were visible. Targets with their own page
  are links, the rest name what they are.
- The LaunchPad API reference has been rebuilt from the Partner Portal
  source code (v2.0). It now documents 212 endpoints across 16 areas,
  the merchant-first onboarding model (create a merchant, then start an
  application against it), the three-tenant scoping scheme, and the
  management, order, provisioning and fulfilment surfaces - with the
  outdated draft-era endpoints removed so nothing stale lingers. Paths,
  payload shapes, enums and business rules are now confirmed against
  code rather than observed traffic, and every gap or assumption is
  flagged inline (endpoint badges plus an "Open questions & context
  gaps" section) for the next context-accumulation pass. The old
  placeholder "Merchant Onboarding API" sample is now a clearly
  design-stage "LaunchPad Inbound Onboarding API".

### Added
- A **send icon** in the top navigation opens a panel with two copyable
  blocks: a browser-console snippet that fires an open application's
  document push and onboarding record from the partner portal, and a
  collapsed handover prompt for reading back what happened. The snippet
  holds no host or scope - it reads both from the portal's own config at
  run time - so nothing internal enters the site. The nav's right-hand
  icons now read as one toolbar.
- A **bug icon** in the top navigation opens the Splunk error sweep in a new
  tab, with the saved search already applied and its results laid out on the
  statistics tab. The search is held as a row rather than in the site, so
  retuning it takes effect everywhere without a deploy.
- The roadmap Timeline gains an **Expand board** control: it widens every
  column and scrolls the board sideways instead of compressing it to fit, so
  long titles and dense spans read in full. Delivered bars and cards now keep
  their theme colour as a solid dot (their fill is dropped for the
  settled-history look), so the completed columns stay colour-coded.
- Any roadmap column can now be **collapsed** by clicking its header: it
  drops that band's work and shrinks the column to a thin labelled seam so
  the other columns reclaim the width (the Cascade collapses it to a struck
  heading). Every column collapses this way now - Previously and Recently
  completed and Parked, not just Now/Next/Later - and a fully collapsed board
  keeps its headers so a column can always be brought back.
- The Platform page now shows the whole knowledge base, not just the
  capability catalogue. It previously rendered 18 capability rows while
  63 more sat in the database unseen: the 13-stage lead-to-live journey,
  the 16-term glossary, 29 recorded facts and the 5 source documents
  everything was distilled from. Each capability now also shows where it
  came from and what the roadmap is doing to it.
- A Coverage panel near the top of the Platform page names what is
  missing - areas with no capability recorded, capabilities with no
  substance or no source, unverified glossary terms - so a gap is
  something to fill rather than something to discover. On today's data
  it finds 10 product areas with nothing written against them.
- The roadmap drawer now shows typed relationships instead of a single
  "Related to" line: an item reads "Part of", "Related to" or "Distinct
  from" against each of its neighbours, each clickable through to that
  item, and hovering a link shows why the two were judged apart where a
  reason was recorded. An item can now carry as many relationships as it
  actually has, rather than one. JSON export carries the kind and reason
  per link; CSV keeps its single column, now reading "kind: title".
- App Review: a new area holding waves of merchant application triage. A
  wave reconciles the LaunchPad list against the mail trail, because
  LaunchPad status alone does not say what needs doing - a record showing
  "Awaiting Contract Send" may already be mid-underwriting, and one
  showing "Cancelled" may have been approved days earlier. The board reads
  in LaunchPad order, colours rows by what they need, and marks each with a
  state glyph so the fastest read is scanning one edge. An assumed
  "nothing to do here" is kept visibly apart from a confirmed one and stays
  on the work list until a person confirms it. The wave list carries a
  standing watch list across every open wave, each item showing what it is
  waiting on - a date or a named dependency - which is what a wave exists
  to produce.
- Roadmap intake now places new work against what is already on the board
  before writing it, and leads with a recommendation - improve the existing
  row, merge, promote, revive, associate or split - instead of always
  creating something new. Adjacent-but-different work is applied silently as
  before, so the extra step only speaks when it has something to say.
- The roadmap item drawer now shows the assignee (with any support owner as
  "Tim (Red supporting)") and the owner's rank in their queue ("Xavier -
  1st of 5"), high in the field list. The board bars carry the owner too,
  so ownership scans at a glance. New fields also surface when set: the
  item's level, presentation, source document, created date, a clickable
  link to the related work item, and the long-form details parsed into
  titled sections (What / Relates to / Business benefits ...). Notes are
  now badged by kind (decision, fact, question, risk ...) and marked when
  resolved or superseded. The JSON and CSV exports carry the new columns.

### Fixed
- The roadmap item drawer no longer prints raw internal values: priority
  shows as a band (P1) rather than a sort integer, progress shows a bar and
  a percentage (so a value of 1 reads "1% complete", not "Not started"),
  and the internal attribute keys that used to leak as "Assignee rank" and
  "Priority band" rows are folded into the assignee and priority lines.

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
  completed (shipped within a rolling 90-day window) and Previously
  completed (the older, historic record), so recent wins stand apart from
  the long tail. A closeout can be pinned straight to Previously completed
  regardless of age (the previously_completed_at latch, its undo a single
  clear), and the item drawer shows when a delivery was moved there.
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
