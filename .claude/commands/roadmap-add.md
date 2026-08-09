---
description: Quick-capture or update roadmap work from a one-line request, applied straight to Supabase
argument-hint: e.g. "add self-service returns endpoint under Self Service API, next" or "update Inbound API: promote to now"
---

Apply the contextualisation and quick-capture protocol to this request:
`$ARGUMENTS`

The roadmap is data in Supabase (project ref `zlmkofbkobmhnslfnqsf`). Read
`docs/ROADMAP-INTAKE.md` in full if it is not already in context - it holds
the five stages, the confidence band thresholds and the per-outcome SQL, and
it is the only place those thresholds are stated. Read
`docs/ROADMAP-PLAYBOOK.md` for the field reference and the quick-capture
recipe. Then:

1. Look up what already exists. ALWAYS, whether the request is phrased as an
   add or an update. Search with `roadmap_find`, not `roadmap_current`: the
   board view has no summary, details or relates_to_id, so it can only match
   titles, and duplicate work is usually titled differently. Run it on the
   headline and on the full request, take the better score per candidate, and
   include `done` and `dropped` rows.
2. Band the best candidate before deciding whether to ask, using the table in
   `docs/ROADMAP-INTAKE.md`, "Stage 3 - Band". Do not work from remembered
   thresholds - read them. A low-band match must never generate a question. A
   hollow candidate in the medium band is a strong `ENRICH` signal.
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
