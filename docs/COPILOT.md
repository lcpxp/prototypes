# Copilot capture protocol

How a knowledge round with an external document assistant runs: how the
gaps are chosen, how the request is written, how the answer is validated
before anything is stored, and where the stored records land.

This is the third intake protocol. docs/WORKFLOW.md captures what we are
doing; docs/PLATFORM.md captures what the platform is; this one covers
material that exists in documents nobody has pasted into a session. The
assistant has the documents. This system has the structure. A round joins
the two.

## Why it is a protocol and not a chat

The assistant answering is weaker than the session reading its answer, has
no view of what is already stored, and cannot tell a gap from a topic it
simply did not look hard enough at. Left unconstrained it returns fluent
prose assembled from general domain knowledge, which is the one output
worse than silence: a missing fact announces itself, an invented one does
not. Every rule below exists to make silence cheap and invention
expensive.

## The five stages

### 1. Measure the gap

Gaps are chosen from the data, never from intuition. Before writing a
request, count what is actually missing:

    -- field coverage across live work
    select count(*) total,
           count(*) filter (where summary is null) no_summary,
           count(*) filter (where details is null) no_details,
           count(*) filter (where department is null) no_department
      from work_items;

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

An area with many work items and no capability rows is the strongest
signal there is: work is being scheduled against something nobody has
written down. Read the previous round's work_documents row too - it
records what was already asked and what was deliberately held back.

### 2. Scope the round

Five to ten topics. Fewer wastes the round; more degrades the answer
before it reaches the end of the list. Order them by value, state that
order in the request, and tell the assistant to stop at a topic boundary
rather than truncate.

Each topic carries: why it is needed in one line, a bullet list of
concrete questions, and a cap on how much to return. A topic phrased as a
subject heading gets a subject-heading answer.

### 3. Write the request

Every request carries these five mandates. They are not optional and they
are not softened:

- **Provenance.** Every fact names one document, one date and one
  verbatim quote. A fact with no quote is discarded on arrival, so the
  request says so.
- **Verbatim.** Quotes are copied, capped at roughly 40 words, and never
  tidied. A paraphrase presented as a quote defeats the whole check.
- **Not-found.** Absence is a correct and valuable answer. The request
  states this in those words, more than once, because it is the
  instruction a weaker model discards first.
- **No merging.** One fact, one document. Blending two sources hides
  which one is current.
- **Conflict.** Contradictions are reported, newest first, both retained.
  The assistant never picks a winner; the owner does.

Plus a redaction rule (no credentials, endpoints, personal contact
details or individual merchant names) and a format-only rule (no
preamble, no closing offer).

The response format is flat and delimited, never nested JSON: fixed
capitalised field names, one per line, repeated blocks between `===`
markers. Weak models produce malformed JSON and well-formed flat text.
Include a worked correct example and a worked wrong example - the wrong
example, annotated with why each line fails, does more work than any
amount of instruction.

Ask for a document inventory as the first section, always. Knowing what
source material exists is worth as much as the answers, and it makes the
next round targeted instead of speculative.

### 4. The validation gate

**Nothing is written to Supabase before the owner has confirmed it.**
This is the point of the whole protocol: the risk being managed is not a
missing answer, it is a stale or wrong one landing silently in a store
that later sessions treat as true.

The session prepares the answer for review and does not apply it:

1. Discard every fact that arrives without a quote, and say how many.
2. Group what remains into confirm / query / reject. Query means the
   session has a specific doubt - the source predates something we
   already know changed, or it contradicts a stored row.
3. For each fact that contradicts something already stored, show both
   side by side with their dates and say which is newer.
4. Put the questions in **one** pass, batched, with a recommendation
   against each. Sequential questions are a failure even when every one
   is correct - the same rule as docs/ROADMAP-CONTEXT.md.
5. Apply only what the owner confirms. Record what was rejected and why,
   so the next round does not ask again.

Anything the owner does not reach stays unapplied. A partial round is a
normal outcome.

### 5. Store

Confirmed material lands by kind, following the existing protocols rather
than inventing a path:

| What arrived | Where it goes |
| --- | --- |
| The response, verbatim | `work_documents`, kind `platform` or `other`, with a distilled summary and the round's scope in it |
| A definition | `domain_terms`, with `source` naming the document and date |
| A statement about what the platform does today | `product_capabilities`, per docs/PLATFORM.md, linked via `source_document_id` |
| A standalone decision, fact, risk or question | `work_notes`, linked to its area or item |
| Substance for an existing roadmap row | `work_items.summary` / `details`, via the ENRICH path in docs/ROADMAP-CONTEXT.md |
| A new piece of work | `work_items`, contextualised first - never inserted straight |

Set `verified = true` only on rows the owner confirmed in the gate. A fact
that arrived at LOW confidence and was accepted anyway is stored at LOW
maturity or `verified = false`, with the doubt written into a work_note.

Roadmap rows are never created directly from a round. Every candidate goes
through contextualisation first, exactly as a pasted document would - the
round is a high-volume intake path, which is where duplicates come from.

## Boundaries

- The request itself names real partners, products and merchants, so it
  lives outside the repo: in the scratchpad while it is being written,
  and in `work_documents` once the round runs. Only this protocol is
  committed.
- The same applies to the response. Real material never enters git,
  including commit messages and docs/STATE.md.
- Redaction happens at ingestion, and the redaction is noted in the
  summary - the same rule as the other two protocols.
