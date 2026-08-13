---
description: Capture a prototype idea in one line, or run the review pass that prioritises and plans them
argument-hint: e.g. "Pricing quote tool - quote a price before an application exists" or "review the ideas inbox"
---

Apply the protocol in `docs/PROTOTYPE-IDEAS.md` to this request: `$ARGUMENTS`

Ideas are rows in `future_prototypes` in Supabase (project ref
`zlmkofbkobmhnslfnqsf`). The board at `modules/prototypes/ideas.html` only
DISPLAYS them - every write happens here, through the Supabase MCP.

**Capture is one line and nothing more.** If the request is an idea, write the
row and stop. A capture that demands a summary, an area and an effort is a
capture that does not happen, and the point of this is that an idea can be
recorded mid-conversation without derailing it.

1. **Look for a duplicate first**, the way `docs/ROADMAP-INTAKE.md` requires -
   against existing ideas AND against existing prototypes. "We already built
   that" is the most useful thing a capture can report back. Say what you
   found, then write the row anyway unless it is plainly the same idea.
2. **Report back in one line.** What you wrote, and anything near it. Then get
   out of the way.

If the request is a **review pass** rather than a capture, work the inbox: for
each `idea` row, shortlist it with a priority and an effort or drop it with a
reason; for each `shortlisted` row, write the plan blocks or leave it. Insist
on `value_note` at shortlist time - what building it would prove or unblock is
the field that stops a list of fourteen becoming a list of forty nobody
triages. End the pass with one line saying what changed.

**Every plan carries a built-from block** naming the capability keys, styling
row keys and endpoint ids it draws on. That is what lets a reader know whether
to trust a prototype, and what names every prototype now out of date when a
capability changes. Run the block check in `docs/PLATFORM.md` after writing
blocks - a typed block with the wrong key name renders an empty shell and
raises no error anywhere.

**Never delete an idea.** Dropping sets a resolution; the database refuses a
dropped row without one. Promotion sets `promoted_prototype_id` and a
resolution, and writes the links from the prototype to the capabilities it
demonstrates and the endpoints it mocks. `resolved_at` is stamped by a trigger;
do not set it by hand.
