-- Reference detail columns so comprehensive API material lives
-- entirely in the database, never in the public repo:
--
--   api_specs.servers    jsonb array of environments:
--                        [{"name","base_url","note"}]
--   api_specs.auth       flat jsonb object of label/value pairs
--                        describing the auth scheme (type, header,
--                        format, how to obtain credentials); rendered
--                        verbatim so new facts need no code change
--   api_specs.contact    owning team or channel for questions
--
--   api_endpoints.auth_required    false marks a public endpoint
--   api_endpoints.deprecated       renders a warning badge
--   api_endpoints.request_headers  jsonb array:
--                                  [{"name","required","description","example"}]
--   api_endpoints.responses        jsonb array of the response
--                                  catalogue: [{"status","description","example"}]
--   api_endpoints.notes            integration gotchas, plain text
--
-- Existing rows keep working: every column has a safe default and
-- the viewer treats them all as optional.

alter table public.api_specs
  add column if not exists servers jsonb not null default '[]'::jsonb,
  add column if not exists auth jsonb not null default '{}'::jsonb,
  add column if not exists contact text;

alter table public.api_endpoints
  add column if not exists auth_required boolean not null default true,
  add column if not exists deprecated boolean not null default false,
  add column if not exists request_headers jsonb not null default '[]'::jsonb,
  add column if not exists responses jsonb not null default '[]'::jsonb,
  add column if not exists notes text;
