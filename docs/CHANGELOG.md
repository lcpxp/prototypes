# Changelog

All notable user-facing changes to LPIO, newest first. The format
follows Keep a Changelog (https://keepachangelog.com/). The owner cuts a
release: Unreleased rolls into a dated version heading, each entry is
condensed to the change itself, and the release is tagged. 0.1.0 was the
first.

Scope: this file records what changed for users. What changed in the code
is the git history; what is unfinished is docs/STATE.md.

## [Unreleased]

### Added
- Sprint roadmap: an item moving into Now joins the plan by itself, at the
  end of its workstream, marked "Not yet placed" on both tabs and in its
  drawer until a planning pass confirms it; an item leaving Now drops off.
- Work item drawer: sprint work shows its user stories and acceptance
  criteria, with "Copy for DevOps" and "Copy for company roadmap"; the
  brief and the sprint page say how far the stories have got, and the JSON
  export carries them.
- /sprint-stories: prepares a sprint in one run - the order and readiness
  checks, stories drafted and confirmed one workstream at a time, and the
  packs for Azure DevOps and the company roadmap printed to copy.

### Changed
- Roadmap: the Now column lists work in the order the Sprint Roadmap runs
  it - priority now leads span length in the Now band, and is kept equal
  to the sprint order.
- Sprint roadmap: seven or more workstream cards lay out in rows of four
  at projector width, so seven read as four and three.

## [0.1.0] - 2026-10-01

### Added
- Work item drawer: opens on "Where it stands" - status, sprint, step in
  the stream, who builds it, stakeholders and everything still open; the
  fact grid folds under "All recorded fields".
- Sprint roadmap: each card says whether its stream ends - finite, staged
  or ongoing - and the ongoing case is dashed as well as worded.
- Sprint roadmap: cards carry the ceilings a stream lifts ("8-10 merchants
  a day") as sentences under the figures, because a cap is not summed.
- Sprint roadmap: a "Priority scale" toggle relabels the columns from
  highest to lowest priority; the columns, order and bars are unchanged.
- Sprint roadmap: a new page drawing the Now column across sprints, by
  workstream and by work item, with work state, externally built work
  outlined and named, and each bar opening its detail in place. Real
  sprint codes appear once the plan is anchored; nothing invents a date.
- Sprint roadmap: rows can be hidden for the conversation at hand; a
  workstream takes its items with it and the board says how many are hidden.
- Roadmap: work items carry impact metrics - time saved, touches and
  providers removed - with a basis and a confidence, rolled up per stream.
- Roadmap drawer: an allocated item shows the sprints it spans, its overlap
  and who builds it when that is not PXP.
- Platform: 18 capabilities derived from delivered work in seven areas that
  had none, each naming its sources and marked "derived".
- Platform: capabilities name the API endpoints that serve them (439 links)
  and the delivered work that changed them (18 "affects" links).
- Platform: a card shows when its claim was last checked, and flags work
  delivered in its area since.
- Roadmap: marketplace actions with merchant self-service, and perpetual
  merchant monitoring, added from the objective review; T+1 settlement
  configuration parked.
- Roadmap: every workstream and Now/Next item carries a business benefit,
  its type and who feels it, marked as a draft until confirmed.
- Semantic search beside the keyword search when placing new work, so a
  differently worded duplicate is still found; both scores are shown.
- The repository measures what it was told - unanchored notes, unsourced
  terms, unconfirmed links and more - as ratchets a gate holds.
- Glossary: the application event log - its seventeen typed events, and
  how they differ from the thirteen journey stages.
- Platform "How it is built": ten rows on the LP architecture, read from
  the code.
- Global search reaches notes, documents, glossary terms, journey stages,
  API topics and specs, ideas and findings, and lands on the row itself.
- Prototypes: an ideas and plans board - what each idea would prove, its
  priority, effort, area and plan - captured with `/prototype-idea`.
- A prototype plan records what it is built from, so a changed source
  names every prototype it has put out of date.
- Portal review as a feature: open, walk, answer, verify, triage and close
  a wave over a 39-area map, written by `/portal-review`.
- Dashboard "Reviews" covers both review kinds, each in its own units.
- Platform "Look and feel": fifteen rows on how the LP front end is styled,
  read from the code, including three places rules and code disagree.
- Three list and table roadmap items carry notes from the code review.
- The roadmap drawer shows everything stored against an item; anything
  without a designed row appears under "Also recorded against this item".
- The same guarantee covers capability cards, backlog detail, the user
  register and the review drawer, surfacing four previously hidden values.
- A roadmap item shows the milestone it targets, with its date.
- Integrations detail shows everything recorded against an integration.
- A link shows a "proposed" badge until confirmed, on the roadmap drawer and
  the platform card.
- An EU Acquirer admin icon opens two copyable console snippets: create a
  reviewer-role user, and list who holds the role.
- A send icon opens a copyable console snippet that fires an application's
  document push and onboarding record, with a handover prompt.
- A bug icon opens the Splunk error sweep with its saved search applied.
- Timeline "Expand board" widens every column and scrolls sideways;
  delivered bars keep their theme as a dot.
- Any roadmap column collapses from its header to a labelled seam, and a
  fully collapsed board keeps its headers.
- Platform shows the whole knowledge base - journey, glossary, facts and
  source documents - and where each capability came from.
- Platform Coverage panel names areas with no capability, capabilities
  with no source and unverified terms.
- Roadmap drawer shows typed relationships - "Part of", "Related to",
  "Distinct from" - with the recorded reason on hover; exports carry them.
- App Review: waves of merchant application triage reconciling the LP list
  against the mail trail, with a standing watch list across open waves.
- Roadmap intake places new work against the board first and recommends
  improving, merging, promoting, reviving, associating or splitting.
- Roadmap drawer shows the assignee, any supporting owner and the owner's
  queue rank; bars carry the owner and notes are badged by kind.
- EU Acquirer replica simulates a run: the signature envelope, then the
  automated CRM, SFTP and notification handoff.
- EU Acquirer guidance says review happens in the acquirer's own systems;
  the portal only records the decision.
- EU Acquirer user-role prototype: guidance, a sequence diagram and a
  replica showing both roles side by side, all data invented.
- Nested work items stack in stage order under their workstream, inherit
  its theme and carry a dot when their own theme differs.
- Now, Next and Later headers are clickable and take that stage off the
  board on every layout and level, as a view preference only.
- Work items and deliverables are distinct: deliverables are drawer-only
  detail and never appear on the board.
- Business area associations: departments with visibility but not
  ownership; the department filter matches owner or association.
- Prototypes gallery: a Future prototypes table of ideas held for later.
- Workstreams level, the default: a strategic gantt of workstreams only.
- Hide fixes toggle drops standalone maintenance items from Work Items and
  Backlog.
- Workstreams read as containers that collapse their sub-items to a
  checklist when Detailed is off.
- Custom view: pick exactly which rows a PDF, CSV or JSON export carries.
- PCI compliance prototype: a replica onboarding wizard with a PCI
  interstitial, a PCI fee row and a Compliance Reports view.
- Executive view leads with departments, their categories and item counts.
- Work items break into ordered sub-steps, shown as a checklist.
- Export CSV on the roadmap and the backlog, covering every field.
- Global search deep-links each result, grouped with badges, counts and
  match highlighting.
- Search is a full keyboard combobox.
- Shareable deep links open the target item across modules.
- Search covers users and integrations.

### Changed
- Sprint roadmap: the caps a stream removes are bold and underlined under
  "What it unlocks", on the card and in the drawer.
- Sprint roadmap: one value line per card, "Business benefit (Acquirer/us)";
  the drawer labels all three audiences.
- Sprint roadmap: rebuilt to read from a projector - full titles, "Sprint 1"
  onward, numbered streams, plain figures, a labelled key, full width.
- Roadmap and sprint roadmap: the drawer leads with summary, value, facts
  and contents, with the long case folded below.
- Sprint roadmap: the cards under the board are built to be talked
  through - one bold line, a bullet per audience, the long case folded.
- Roadmap: the Now column carries five priority workstreams again, and
  Payment Service is its own workstream.
- Platform: three navigable views - what it does, how it is built and
  reference - with closed cards, a sidebar index and filters.
- Roadmap: quick capture checks what the platform already does before
  searching for duplicate work.
- Sign-in: a single minimal LPIO card; page titles and the wordmark read
  "LPIO".
- Naming: brand names removed from public copy, labels, identifiers and
  file names.
- Roadmap: department attribution reworked; every workstream carries at
  least one associated department.
- Roadmap: pricing lines, service fees and PFAC enablement sit under Sales
  and Commercial; KPI data under Product and Technology.
- The roadmap and backlog load 33% less data: prose arrives when a drawer
  opens.
- Roadmap notes arrive when a drawer opens, taking 63KB and a request off
  the first paint, with no flash.
- API reference covers all 552 LP routes; the 121 nothing in the portal
  calls are marked as such.
- API reference documents every route the portal calls; undocumented live
  routes went from 69 to zero.
- API reference documents the v1 merchant surface once, naming all three
  prefixes on each row.
- API reference marks a route with no front-end consumer, measured from the
  portal's own call sites.
- Dashboard rebuilt around what is happening: Now and Next workstreams, API
  coverage, open review waves, knowledge gaps and tool cards.
- API reference reconciled against the LP source: wrong paths corrected,
  dead rows retired, real service-fee endpoints in place of templates.
- Knowledge links render between any two kinds of thing.
- LP API reference rebuilt from the Partner Portal source: 212 endpoints in
  16 areas, confirmed against code, gaps flagged inline.
- EU Acquirer intro page matches the guidance on where review happens.
- EU Acquirer replica contract tables start empty and fill as contracts are
  generated; sending is blocked until one is.
- EU Acquirer replica: role switch in the header, two statuses for the
  reviewer, one row per contract, both send controls together.
- Roadmap page intro trimmed so the board sits higher.
- Top-level roadmap rows sort by span length before priority.
- Roadmap drawer shows everything stored against an item, and the exports
  carry the same.
- Roadmap board is bars only; loose items interleave by priority, with
  workstreams winning ties.
- Timeline: nested work items sit inset on the bar.
- Department filter keeps a workstream visible when a nested item matches.
- Custom view: deselecting a workstream drops its children from exports.
- Export as PDF prints whichever view is on screen.
- Delivered work splits into Recently completed (90 days) and Previously
  completed, with a latch to pin a closeout.
- Bugs sink below other work in their band; parked rows group and tint by
  theme.
- A single Export menu replaces three buttons.
- Hide fixes is an icon-only toggle.
- Prototypes gallery groups entries under Live and Drafts.
- Timeline reads better on screen and in the PDF: shaded lanes, stronger
  bars, exact print colours.
- Backlog level mirrors the full backlog list, every scope.
- Timeline: workstreams sort above standalone items within a band.
- View switch reads Workstreams / Categories / Work Items / Backlog, with a
  Department filter.
- Lane colours are keyed to the owning department.
- Detailed view expands the Team and Backlog levels into a Category to Area
  breakdown.
- Board-level completeness percentages give way to a bar and a sub-step
  count.
- Scripts load deferred from the head.
- Search failure and empty states say what happened and what to try.

### Fixed
- The Splunk toolbar button opens Splunk's home first, then the search in
  its own tab, so a cold browser no longer lands on an error page.
- The board-wide exports fetch the full text before writing, and cancel
  rather than write a file missing notes.
- An allocated item no longer reads "Sprint +0", and its allocation is not
  dumped raw under the facts.
- The users page shows the role a row carries, not "member" for anything
  but admin.
- An application blocked at record scope shows its blocker flag.
- The roadmap drawer no longer prints raw internal values: priority reads as
  a band, progress as a percentage.
- Roadmap views show work with no filing area instead of dropping it.
- The Compact/Detailed toggle changes the Team and Backlog views.
- Copy-to-clipboard reports "Copy failed" when access is denied.
