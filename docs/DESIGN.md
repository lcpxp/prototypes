# Design standards

The visual and writing rules for every page in this portal. These are
binding on all future work; CLAUDE.md requires them.

## Character

An internal engineering document, not a marketing site. The register
is a well-set technical reference: quiet surfaces, disciplined type,
and one signature device that marks the system as its own: uppercase,
letter-spaced monospace eyebrows labelling every section, echoing the
method badges and paths of the API reference at the heart of the tool.

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
- Dark scheme is a token concern only: prefers-color-scheme swaps
  values inside tokens.css and no other file may mention theme.
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

Palette: near-monochrome cool greys on an off-white paper, one petrol
accent (--accent) for actions and active states. HTTP method badges use
conventional muted tints (get teal, post blue, put amber, patch violet,
delete red) because convention is information in an API reference.
Status badges: live green, draft amber, deprecated red.

Type: the system UI stack for prose, the system monospace stack for
paths, code, table headers, eyebrows and the wordmark. Scale and
weights are fixed in tokens.css; do not invent sizes.

Space: the 4px scale in tokens.css. Prefer more whitespace over more
borders. Radius 6px, shadows barely-there.

## Rules

- No emojis anywhere. No decorative icons, gradients, illustrations or
  stock imagery. If an element does not carry information, remove it.
- Density with legibility: tables for records, cards for routes,
  definition-style blocks for endpoints. Never center-align prose.
- Structural devices must encode something true: eyebrows name real
  sections, badges state real methods and statuses. No numbering or
  labelling for decoration.
- Motion: none beyond native browser behaviour. The portal is a
  reference; it should feel instant and still.
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
