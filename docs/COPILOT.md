# Copilot capture protocol

How a knowledge round with an external document assistant runs: choosing
the gaps, writing the request, validating the answer, storing what
survives. The third intake protocol - docs/WORKFLOW.md captures what we
are doing, docs/PLATFORM.md what the platform is, this one material held
in documents nobody has pasted into a session. The assistant has the
documents, this system has the structure, and a round joins the two.

## Why it is a protocol and not a chat

The assistant is weaker than the session reading its answer, cannot see
what is already stored, and cannot tell a gap from a topic it did not
look hard enough at. Unconstrained it returns fluent prose from general
domain knowledge - worse than silence, because a missing fact announces
itself and an invented one does not. Every rule below makes silence cheap
and invention expensive.

## The five stages

### 1. Measure the gap

Gaps are chosen from the data, never from intuition. Start with areas
carrying work that nothing explains - the strongest signal there is,
because work is being scheduled against something nobody wrote down:

    -- areas carrying work but no platform knowledge behind them
    select a.key, count(distinct w.id) items, count(distinct p.id) caps
      from work_areas a
      left join work_items w on w.area_id = a.id
      left join product_capabilities p on p.area_id = a.id
     where a.scope = 'product'
     group by a.key having count(distinct p.id) = 0
     order by items desc;
    -- named rows with a title and nothing else
    select title, horizon, level from roadmap_searchable
     where is_hollow and status not in ('done', 'dropped');

Read the previous round's work_documents row too - it records what was
asked, rejected and held back.

**Counting rows is not measuring the gap.** A null column means a field
is empty, not that the knowledge is missing. The reference specs are the
trap: `api_topics` carries runbooks, data models, gap registers and whole
enum catalogues that no count over `work_items` will surface. Read them
before scoping anything:

    -- what the specs document, and what they say is missing
    select s.title, t.title, jsonb_array_length(t.blocks) blocks
      from api_topics t join api_specs s on s.id = t.spec_id
     order by s.title, t.sort_order;
    -- every enumerated value set already catalogued
    select b->>'name' name, b->>'field' field
      from api_topics t, lateral jsonb_array_elements(t.blocks) b
     where b->>'kind' = 'values';

A spec's own **gap register** is the most valuable input to a round: the
system stating what it does not know. Sort those gaps by who can close
them - most are capture gaps only another HAR run closes; the few saying
"the PRD describes this and we never observed it" are what a round is
for.

### 2. Scope the round

Five to ten topics. Fewer wastes the round; more degrades the answer
before it reaches the end. Order them by value, say so in the request,
and tell the assistant to stop at a topic boundary rather than truncate.
Each topic carries three parts: **what we already hold**, **the gap** in
one sentence, then concrete questions. A topic phrased as a subject
heading gets a subject-heading answer; "Merchant Portal integration" returns the
sequence we already have, while "the 17 steps PRD V3 defines, which
supersede the 14 we captured" returns the thing we lack.

Prefer topics whose answer contains a number, a threshold, a named list
or a named approver. Policy and commercial knowledge - commission
mechanics, fee catalogues, who signs off - never appears in a captured
API. Enum literals, status machines and call sequences almost always
exist already. And a round that resolves a contradiction earns its place
twice over: where two stored records disagree, name both and ask which
is current.

### 3. Write the request

Every request carries these five mandates. They are not optional and they
are not softened:

- **Provenance.** Every fact names one document, one date and one
  verbatim quote. A fact with no quote is discarded on arrival; say so.
- **Verbatim.** Quotes are copied, capped at roughly 40 words, never
  tidied, and must contain the **fact** rather than its subject: "Done
  Ongoing" does not evidence a status vocabulary, "2025" does not
  evidence a date. Show a topic-quote failing in the wrong example, or
  the mandate is met mechanically and proves nothing.
- **Not-found.** Absence is a correct and valuable answer, stated in
  those words more than once - it is the instruction a weaker model
  discards first.
- **No merging.** One fact, one document. Blending two sources hides
  which one is current.
- **Conflict.** Contradictions are reported, newest first, both retained.
  The assistant never picks a winner; the owner does.

Plus a sixth that only exists because the store is already rich: a
**do-not-send list** of what is already held - status machines, call
sequences, enum catalogues, verified integrations - which the assistant
must skip. Without it a weaker model answers the easy, well-documented
part of every topic and never reaches the gap. Plus redaction (no
credentials, endpoints, contact details, merchant names) and a
format-only rule (no preamble, no closing offer).

The response format is flat and delimited, never nested JSON: fixed
capitalised field names, one per line, repeated blocks between `===`
markers. Weak models produce malformed JSON and well-formed flat text.
Include a worked correct example and a worked wrong example - the wrong
one, annotated with why each line fails, does more work than any amount
of instruction.

Ask for a document inventory as the first section, always, and check it
against the citations in the body: round 1 listed seven documents then
cited thirteen, and the six omitted included the one most likely to hold
the delivery dates that round failed to find.

**Weigh the format against the compliance you get.** An eight-field block
is worth asking for once; if a round returns five quotes across fifty
assertions, drop to the three that matter - fact, quote, source. A format
that is ignored yields nothing; a lighter one that holds yields
provenance on every line. Then police what the lighter format lets
through: round 2 quoted every fact and a third of the quotes proved only
the topic.

Rounds come in two shapes. An **exploratory** round asks about subjects;
a **targeted** round names specific files with a short question list
under each - what an exploratory round's inventory earns, and far richer
per token, so only the first round of a new area should be broad. Where
a named file is a spreadsheet, ask for it as a delimited table in its own
column names: rows are more faithful than a summary.

### 4. The validation gate

**Nothing is written to Supabase before the owner has confirmed it.** The
risk being managed is not a missing answer; it is a stale or wrong one
landing silently in a store later sessions treat as true.

The session prepares the answer for review and does not apply it:

1. Discard every fact whose quote is missing or proves only the topic,
   and say how many.
2. Check each file was actually opened and that its quotes name the file
   requested - a partial open quoting a different title means the answer
   is about some other document.
3. Group what remains into confirm / query / reject. Query means a
   specific doubt - the source predates something we know changed, or it
   contradicts a stored row.
4. For each contradiction, show both sides with their dates and say
   which is newer.
5. Put the questions in **one** batched pass with a recommendation
   against each. Sequential questions are a failure even when every one
   is correct - the same rule as docs/ROADMAP-INTAKE.md.
6. Apply only what the owner confirms. Record what was rejected and why.

Anything the owner does not reach stays unapplied. A partial round is a
normal outcome. Where the owner closes the round without answering,
apply what is additive and evidenced - facts, definitions, capabilities,
hollow-row enrichment - and record anything that would change a roadmap
row's status or create one as a `risk` or `question` note against that
row. The drift stays visible without being silently applied.

Two gate outcomes become standing decisions, because they change every
future round. A **rejected source** stays rejected, recorded with its
reason; rejected twice, it is not a source, and the gap needs closing
another way. A **subject the owner does not want captured** - figures
that go stale, detail another system will own - becomes a scope boundary
in the request, cheaper than rejecting it every round.

A gap no document answers is often the wrong question rather than a
missing answer: thresholds held in an admin screen, roles in a
permissions table. When a round comes back empty on something the product
plainly does, suspect configuration and redirect to a capture session.

### 5. Store

Confirmed material lands by kind, following the existing protocols:

| What arrived | Where it goes |
| --- | --- |
| The response, verbatim | `work_documents`, kind `platform` or `other`, with a distilled summary and the round's scope in it |
| A definition | `domain_terms`, with `source` naming the document and date |
| A statement about what the platform does today | `product_capabilities`, per docs/PLATFORM.md, linked via `source_document_id` |
| A standalone decision, fact, risk or question | `work_notes`, linked to its area or item |
| Substance for an existing roadmap row | `work_items.summary` / `details`, via the ENRICH path in docs/ROADMAP-INTAKE.md |
| A new piece of work | `work_items`, contextualised first - never inserted straight |

Set `verified = true` only on rows the owner confirmed in the gate; a
fact accepted despite a weak quote is stored `verified = false` with the
doubt in a work_note. Roadmap rows are never created directly from a
round - every candidate goes through contextualisation first, exactly as
a pasted document would, since a round is a high-volume intake path and
that is where duplicates come from.

## Boundaries

Both the request and the response name real partners, products and
merchants, so both live outside the repo: the scratchpad while the
request is written, `work_documents` once the round runs. Only this
protocol is committed. Real material never enters git, including commit
messages and docs/STATE.md. Redaction happens at ingestion and is noted
in the summary - the same rule as the other two protocols.
