-- ------------------------------------------------------------------
-- Applied 2026-09-07. Corrects the as_of seed from the migration
-- immediately before it.
--
-- That migration set as_of from updated_at, but its own earlier
-- statement (backfilling attestation) had already fired the
-- set_updated_at trigger on every row - so all 46 landed on today's
-- date, asserting that every claim had just been checked. The exact
-- opposite of the point of the column: 18 rows had not been touched
-- since 2026-08-14 and the figure existed to say so.
--
-- created_at is untouched by that trigger and is the honest reading:
-- the date the row was written from its source material. For a row
-- never edited since, it is exactly right; for an edited one it is
-- earlier than the true last check, which errs toward flagging a row
-- stale rather than fresh. That is the safe direction for a figure
-- whose job is to prompt a re-check.
--
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

update public.product_capabilities
   set as_of = created_at::date;
