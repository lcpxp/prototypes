---
description: Quick-capture or update roadmap work from a one-line request, applied straight to Supabase
argument-hint: e.g. "add self-service returns endpoint under Self Service API, next" or "update Inbound API: promote to now"
---

Apply the contextualisation and quick-capture protocol from
`docs/ROADMAP-PLAYBOOK.md` to this request: `$ARGUMENTS`

The roadmap is data in Supabase (project ref `zlmkofbkobmhnslfnqsf`). Read the
playbook's "Field reference", "Contextualising new work" and "Quick capture /
quick edit" sections if they are not already in context - and
`docs/ROADMAP-CONTEXT.md` for the per-outcome SQL - then:

1. Look up what already exists. ALWAYS, whether the request is phrased as an
   add or an update. Search with `roadmap_find`, not `roadmap_current`: the
   board view has no summary, details or relates_to_id, so it can only match
   titles, and duplicate work is usually titled differently. Run it on the
   headline and on the full request, take the better score per candidate, and
   include `done` and `dropped` rows.
2. Band the best candidate before deciding whether to ask: High (>= 0.65)
   recommend and apply on one click; Medium (0.40 - 0.65) offer options with
   the distinction spelled out; Low (0.22 - 0.40) apply as new and mention the
   neighbour in one line; None (< 0.22) apply silently. A low-band match must
   never generate a question. A hollow candidate in the medium band is a
   strong `ENRICH` signal.
3. Lead with ONE recommended outcome and its reasoning, then the alternatives
   (`NEW`, `ENRICH`, `MERGE`, `PROMOTE`, `REVIVE`, `ASSOCIATE`, `SPLIT`,
   `UMBRELLA`, `UNRELATED`) - never a bare list. Where the request is better
   described than the row it matches, the description moves onto that row.
4. Infer `category_id`, `parent_id`, `department`, `level` and `horizon` from
   the wording; default `horizon='someday'` unless a scheduling word is
   present. Ask at most ONE clickable `AskUserQuestion` beyond what the band
   already calls for.
5. Apply via the Supabase MCP, then report ONE line: what changed, where it
   now sits (theme / workstream / band), and how to reverse it. For any
   outcome other than `NEW`, also write a `work_notes` row of `kind='decision'`
   recording why - so the next session inherits the judgement.

Resolve theme and workstream ids by key/title in the SQL (see the playbook's
operations), so no UUIDs are needed. Keep real merchant, partner and staff
detail out of the repo - it lives only in Supabase.
