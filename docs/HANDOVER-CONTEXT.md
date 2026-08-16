# Context-gathering handover

A prompt for a claude.ai session with the Supabase connector. It exists
because two kinds of work need separating: this repository is code, and
a code session can derive almost everything from source. What it cannot
derive is what you know and have not written down. That is this.

Two things the connector has to be, or the session stalls half way:
**not read-only** - the whole point is writing rows back - and connected
with the project's own credentials rather than the anon key.
`roadmap_embed_refresh()` and `roadmap_embed_query()` are revoked from
`anon` and `authenticated` on purpose (they make outbound HTTP calls and
block a backend), so they run for the connector and refuse from the
portal. That is by design; if one of them is refused here, the
connection is wrong, not the function.

Everything below the line is the prompt. Paste it whole.

The counts in it were measured on 2026-08-15. They will have moved by
the time it runs, which is why the prompt makes the session re-measure
rather than trust them.

---

You are helping me fill the gaps in LPio, a project hub whose substance
lives in Supabase (project `zlmkofbkobmhnslfnqsf`). You have the
Supabase connector. Use it to read first and write only when I have
confirmed something.

**Your job is to ask me questions, not to write prose.** I am the only
source for what is missing. A session that infers an answer to save me
a question has produced something worse than a blank: a plausible
statement nobody can tell from a checked one.

## How this system works, before you touch it

- **Nothing is invented.** Every row records where it came from. If you
  do not know something, the row says so or the row is not written.
- **Nothing is deleted.** Work items, notes and applications close with
  a status, a resolution and a back-link. State the undo when you close
  something.
- **A link you write is `proposed`.** `knowledge_links` carries a
  `confidence` column. Anything an assistant records stays `proposed`
  until I confirm it. Only set `confirmed` when I have said so in this
  conversation, in as many words.
- **Ask before writing, in batches.** Show me the exact rows you intend
  to write, wait, then write. Do not write as you go.
- **No emojis anywhere.** Plain, specific, sentence case.

## Start by measuring, not by assuming

Run this first and show me the result. The numbers below are from
2026-08-15 and will have moved.

These are the same figures the repository measures and holds. There is
a gate (`tests/checks/knowledge-drift.test.js`) that fails the build if
any of them decays, and five that are already at zero and must stay
there: every glossary term has a definition and a source, every
journey stage has a source, every source document has a digest, and no
review finding claims a promotion with nothing behind it. So the work
you and I do here is not lost when we close the tab - it is measured,
committed and defended.

    select 'prototype ideas total' as gap, count(*) as n from future_prototypes
    union all select 'ideas with no summary', count(*) from future_prototypes where coalesce(btrim(summary),'') = ''
    union all select 'ideas with no area', count(*) from future_prototypes where area_id is null
    union all select 'ideas with no value note', count(*) from future_prototypes where coalesce(btrim(value_note),'') = ''
    union all select 'work items with no summary', count(*) from work_items where coalesce(btrim(summary),'') = '' and level <> 'workstream'
    union all select 'work notes anchored to nothing', count(*) from work_notes where work_item_id is null and document_id is null
    union all select 'knowledge links still proposed', count(*) from knowledge_links where confidence = 'proposed' and valid_to is null
    union all select 'review areas never walked', count(*) from review_areas a where retired_at is null and not exists (select 1 from review_area_passes p where p.area_id = a.id)
    order by 1;

Then tell me which gap you propose to work first and why. My default
order is the one below, but say if the data suggests otherwise.

## The gaps, in the order I would take them

### 1. The fourteen prototype ideas (all fourteen are blank)

`future_prototypes` holds fourteen rows that are a name and nothing
else. Read them and ask me about them **one at a time**, not as a list.
For each, I need to give you:

- `summary` - one line, what it is
- `value_note` - **what it would prove.** This is the field that
  matters and the one I will be laziest about. Push me on it. "A
  pricing tool" is not an answer; "proves the pricing engine can quote
  before an application exists" is.
- `area_id` - which `work_areas` row it belongs under
- `priority` - a number; the board bands them P1 to P10
- `effort` - small, medium or large
- `requested_by` - who asked for it, if anyone

If I cannot say what an idea would prove, that is a finding: ask
whether it should be dropped, and if I say yes, close it with a
resolution rather than deleting the row.

Read `docs/PROTOTYPE-IDEAS.md` in the repo first if you can reach it.

### 2. The work items with no summary (about eighty)

A title alone is unreadable six months later. Work through them
**grouped by workstream**, showing me five or six at a time, and ask me
for one line each. Where I clearly do not remember, say so on the row
rather than writing something that sounds right - a note with
`kind = 'question'` anchored to the item is the honest move.

### 3. The notes anchored to nothing (about twenty)

`work_notes` rows with neither `work_item_id` nor `document_id` are
orphans: real content nothing links to. For each, show me the body and
ask what it belongs to. Options are an existing work item, a document,
or "this is stale, close it".

### 4. The proposed links (about a hundred and ten)

Every one was written by an assistant and none has been confirmed. Do
not bulk-confirm them. Group them by `from_type`/`to_type` and by link
kind, show me a representative handful per group, and ask whether the
group as a whole is right. Confirm only the groups I approve, and leave
the rest proposed rather than closing them - proposed is a true
statement about their status.

### 5. Who consumes the surfaces the portal does not

The API reference now covers all 552 LaunchPad routes, and 141 of them
have no front-end caller. Three families are the interesting ones and
the reference deliberately records the question rather than an answer:

- **Metrics** - 24 routes, an entire analytics surface. Does anything
  read it? A BI tool, a scheduled job, a dashboard I have forgotten?
- **ShoppingCart** - 11 routes under `/api/v1/applications/drafts/`.
  Superseded by the v2 application cart, or still serving something?
- **MerchantApplicationsProducts** - 7 routes, products and rate sheets
  in an application's context.

Ask me each separately. If the answer is "I do not know", say so on the
rows - that is a better state than the current silence, and it tells
the next reader who to ask.

### 6. Unity (151 endpoints, ungraded)

The Unity Acquiring API spec has 151 endpoints and no source was ever
supplied, so nothing in it can be graded above `stated`. Ask me:

- Is there a source - a Swagger, a repository, a Postman collection?
- If not, should the whole spec be badged `unverified` so a reader can
  see it is described rather than checked?
- Two endpoints are documented twice, once with `{id}` and once with
  `{numId}`. Does Unity accept both forms, or is one a stray?

### 7. The review areas (38 of 39 never walked)

`review_areas` holds the 39-area map from the wave 4 review board, and
only one has ever been walked. Do not try to walk them in this session -
that is what `/portal-review` is for. Instead ask me which areas are
worth a wave next, and record that as a note rather than as passes.

## How to finish

When we have worked through what I have patience for:

1. Re-run the measuring query and show me the before and after side by
   side. Those figures go into the repository as ceilings, so telling
   me "notes.orphaned went from 20 to 6" is the single most useful
   sentence you can end on - a code session lowers the ceiling to 6
   and it can never silently climb back.
2. Tell me what is still open, and what you asked that I did not answer -
   that list is as valuable as the answers.
3. Run `select * from roadmap_embed_refresh();` as the last thing you
   do, and tell me what it returned. Every work item carries a meaning
   vector computed from its title, summary, details and resolution -
   so every summary you write leaves that item's vector describing text
   that no longer exists. It keeps answering searches with the old
   meaning and nothing looks wrong. The function is idempotent and
   knows which rows changed, so running it costs one query if nothing
   is stale. `embeddings.stale` is held at zero by a gate in the
   repository, so skipping this is caught - but caught later, by
   someone else, which is worse than doing it here.
4. Do not update `docs/STATE.md` or anything else in the repository.
   You do not have it; a code session does. Give me the summary and I
   will carry it across.

Work in waves. Ask me between five and eight questions at a time, wait
for the answers, write that batch, then move on. If I go quiet on a
gap, leave it and say so at the end rather than filling it in.
