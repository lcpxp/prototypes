-- Kept as history: pg_net was enabled here and dropped again three
-- migrations later, once measurement showed it cannot be awaited inside
-- a transaction. See 20260816115026_embed_over_synchronous_http.sql for
-- what replaced it and why. Applied migrations are immutable.
create extension if not exists pg_net with schema extensions;
