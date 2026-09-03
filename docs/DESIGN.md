# Design standards

The visual and writing rules for every page in this portal. These are
binding on all future work; CLAUDE.md requires them.

## Character

A precision developer tool, not a marketing site or a generic admin
panel. The register is a well-set technical reference with a pulse:
confident type hierarchy, surfaces that layer, and interaction states
that feel engineered rather than defaulted. Two signature devices mark
the system as its own:

- Uppercase, letter-spaced monospace eyebrows labelling every section,
  echoing the method badges and paths of the API reference at the
  heart of the tool. Protected: never remove or genericise this.
- A near-black top navigation bar (Acquirer Black, `--chrome-bg`) with a
  single lime underline marking the active page - chrome that reads
  as unmistakably its own without a logo. Lime otherwise appears in
  exactly two more places (the nav wordmark separator and the login
  brand panel's wordmark separator) and nowhere else; it signals "live
  or active", never decoration.

## Stylesheet architecture

Five core files, loaded in this order on every page, each with one job:

    tokens.css      values only: colour (light and dark), type, space
    base.css        reset, typography, global element styles
    layout.css      navigation, page scaffold, grids
    components.css  cards, forms, buttons, tables, badges, toggles
    pages.css       reference-viewer specifics

A page may load one page-specific sheet after these five (for example
login.css on the sign-in page). Keep each file under 300 lines; when a
page's styles grow, give the page its own sheet rather than swelling
pages.css.

Rules that keep it coherent:

- Mobile-first, always. Base styles serve the smallest screen;
  enhancements arrive only via min-width queries at the breakpoint
  scale documented in tokens.css (36 / 48 / 64rem). max-width
  queries are not used.
- Logical properties (margin-block, padding-inline, inset-inline)
  rather than physical ones, throughout.
- Dark scheme is a token concern only: the dark palette lives in the
  single :root[data-theme="dark"] block in tokens.css and no other
  stylesheet may mention theme. The active theme is chosen by the user
  via the nav switch and resolved in assets/js/core/theme.js, which
  sets data-theme on <html> before first paint - defaulting to, and
  tracking, the OS preference until an explicit choice is made. Every
  token that changes between schemes still gets both values here.
- Anything horizontal that can overflow (tables, code, the nav row)
  scrolls inside its own container; the page never scrolls sideways.
- Reusable styling goes in components.css. A page file may only
  contain what genuinely cannot be reused.

## Tokens are law

Every colour, size, weight and space comes from assets/css/tokens.css.
No hex values, pixel sizes or font stacks anywhere else. If a design
need is not expressible in current tokens, add a token first, then use
it. Display type sizes are fluid (clamp) in tokens.css; never add
per-page font-size overrides to fake responsiveness.

Palette: crisp cool greys (`--ink` through `--faint`) on an off-white
paper, with Acquirer Blue (`--accent`, `#292cf5`) as the one commanding
accent for actions, active states and key emphasis. Acquirer Black
(`--chrome-bg`) is a genuine design material, not just a dark-mode
background: it is the fixed colour of the top navigation in both
colour schemes. Lime (`--lime`) is a scalpel, deployed only where
something is live or active (see Character above) - never as body
text, a button fill, or a large-area wash, and never paired with white
text. Cyan and violet (`--cyan`, `--violet`) are system colours with a
job (badge taxonomy, data categories); their raw brand swatches are
decorative-only, so components always use the darker text-safe
derivations in tokens.css. HTTP method badges use conventional muted
tints (get teal, post blue, put amber, patch violet, delete red, query
cyan) plus a small currentColor marker dot, because convention is
information in an API reference. Status badges: live green, draft
amber, deprecated red. The login brand panel is the one place a
gradient is allowed: `--gradient-brand`, Acquirer's Black -> Blue -> Plum
recipe, white text only, never as a text fill.

Type: the system UI stack for prose, the system monospace stack for
paths, code, table headers, eyebrows and the wordmark. Scale and
weights are fixed in tokens.css; do not invent sizes. No web fonts:
Inter is not bundled (no dependency of any kind), so headings lean on
weight, tracking and scale within the system stack for hierarchy.

Space: the 4px scale in tokens.css. Prefer more whitespace over more
borders. Radius: 6px for small controls, 8px for buttons and table
frames, 14px for cards and other elevated panels.

Elevation: a deliberate three-step scale, not a flat wash. `--shadow-
rest` gives cards and endpoint groups quiet standing at rest;
`--shadow-raised` marks hover and open states; `--shadow-overlay`
(the heaviest) is reserved for the nav bar and the modal, so floating
chrome reads as genuinely above the page. Never invent a shadow value
outside these three.

## Rules

- No emojis anywhere. No decorative icons, illustrations or stock
  imagery. Gradients are permitted in exactly one place, the login
  brand panel (`--gradient-brand`); nowhere else, and never as a text
  fill. If an element does not carry information, remove it.
- Density with legibility: tables for records, cards for routes,
  definition-style blocks for endpoints. Never center-align prose.
- Structural devices must encode something true: eyebrows name real
  sections, badges state real methods and statuses. No numbering or
  labelling for decoration.
- Motion: restrained and engineered, never decorative. Interactive
  elements transition colour, border, background and shadow over
  `--dur-fast` (150ms) or `--dur-base` (200ms) with `--ease`; layout
  properties never animate, and there is no scroll-triggered or
  page-load choreography. `prefers-reduced-motion: reduce` disables
  all of it (enforced globally in base.css) - the interface
  acknowledges the pointer instantly, it does not perform.
- Accessibility floor: visible keyboard focus (tokens define it),
  labels on every input, aria-current on active nav, reduced-motion
  respected, contrast at WCAG AA or better.
- Responsive floor: usable at 360px wide; the reference sidebar stacks
  above content on narrow screens. Both colour schemes (light and
  dark) must stay at WCAG AA; new colours get both values in
  tokens.css in the same change.

## Writing in the interface

- Sentence case everywhere, including buttons and table headers
  (the mono eyebrow style is a visual treatment, not a licence for
  shouting in copy).
- Buttons say what they do: "Sign in", "Copy", never "Submit" or "OK".
- Errors state what went wrong and what to do next. No apologies, no
  vagueness.
- Empty states direct the next action, naming the exact table or file
  involved.
- No filler, no exclamation marks, no marketing adjectives.
