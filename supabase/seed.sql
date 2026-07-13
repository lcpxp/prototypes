-- ------------------------------------------------------------------
-- seed.sql - OPTIONAL sample data. Run AFTER schema.sql and
-- policies.sql, from the Supabase SQL editor (which runs with full
-- privileges, so RLS does not block the inserts).
--
-- Everything below is deliberately generic sample content used to
-- prove the viewer works end to end. Replace it with real material
-- directly in the database. Never copy real merchant data, live
-- endpoints or credentials into this file: the repo is public.
-- ------------------------------------------------------------------

-- Sample spec ------------------------------------------------------

insert into public.api_specs (id, title, version, status, description)
values (
  '11111111-1111-1111-1111-111111111111',
  'Merchant Onboarding API (sample)',
  '0.1.0',
  'draft',
  'Worked sample demonstrating the reference viewer. Replace with real specs in the database.'
);

-- Sample endpoints -------------------------------------------------

insert into public.api_endpoints
  (spec_id, method, path, tag, summary, description, params, request_example, response_example, sort_order)
values
(
  '11111111-1111-1111-1111-111111111111',
  'post',
  '/v1/merchants',
  'Merchants',
  'Create a merchant application',
  'Starts an onboarding application for a new merchant. Returns the application in a pending state.',
  '[
    {"name": "legal_name", "in": "body", "type": "string", "required": true, "description": "Registered legal name of the business."},
    {"name": "country", "in": "body", "type": "string", "required": true, "description": "ISO 3166-1 alpha-2 country code."},
    {"name": "contact_email", "in": "body", "type": "string", "required": true, "description": "Primary contact for the application."}
  ]'::jsonb,
  '{"legal_name": "Example Trading Ltd", "country": "GB", "contact_email": "ops@example.com"}'::jsonb,
  '{"id": "mch_123", "status": "pending", "created_at": "2026-01-01T00:00:00Z"}'::jsonb,
  10
),
(
  '11111111-1111-1111-1111-111111111111',
  'get',
  '/v1/merchants/{merchant_id}',
  'Merchants',
  'Retrieve a merchant application',
  'Returns the current state of a merchant application, including outstanding requirements.',
  '[
    {"name": "merchant_id", "in": "path", "type": "string", "required": true, "description": "Identifier returned when the application was created."}
  ]'::jsonb,
  null,
  '{"id": "mch_123", "status": "in_review", "requirements": ["proof_of_address"]}'::jsonb,
  20
),
(
  '11111111-1111-1111-1111-111111111111',
  'patch',
  '/v1/merchants/{merchant_id}',
  'Merchants',
  'Update a merchant application',
  'Updates fields on an application while it is still pending or in review.',
  '[
    {"name": "merchant_id", "in": "path", "type": "string", "required": true, "description": "Application identifier."},
    {"name": "contact_email", "in": "body", "type": "string", "required": false, "description": "Replacement contact address."}
  ]'::jsonb,
  '{"contact_email": "finance@example.com"}'::jsonb,
  '{"id": "mch_123", "status": "in_review"}'::jsonb,
  30
),
(
  '11111111-1111-1111-1111-111111111111',
  'post',
  '/v1/merchants/{merchant_id}/documents',
  'Documents',
  'Attach a verification document',
  'Uploads a document reference against an outstanding requirement.',
  '[
    {"name": "merchant_id", "in": "path", "type": "string", "required": true, "description": "Application identifier."},
    {"name": "type", "in": "body", "type": "string", "required": true, "description": "Requirement the document satisfies, for example proof_of_address."},
    {"name": "file_token", "in": "body", "type": "string", "required": true, "description": "Token from the file upload service."}
  ]'::jsonb,
  '{"type": "proof_of_address", "file_token": "tok_abc"}'::jsonb,
  '{"id": "doc_456", "status": "received"}'::jsonb,
  10
),
(
  '11111111-1111-1111-1111-111111111111',
  'get',
  '/v1/merchants/{merchant_id}/status',
  'Status',
  'Poll onboarding status',
  'Lightweight endpoint for returning merchants and integrators to poll application progress.',
  '[
    {"name": "merchant_id", "in": "path", "type": "string", "required": true, "description": "Application identifier."}
  ]'::jsonb,
  null,
  '{"status": "approved", "approved_at": "2026-01-02T00:00:00Z"}'::jsonb,
  10
);

-- Sample prototype registry entries --------------------------------

insert into public.prototypes (title, description, path, status, tags)
values
(
  'API reference viewer',
  'The reference viewer itself, registered here as the first working prototype.',
  'modules/reference/index.html',
  'live',
  array['reference', 'core']
),
(
  'Merchant onboarding flow (placeholder)',
  'Reserved slot for the first onboarding UI mock. Create the page under modules/prototypes/ and update this row.',
  'modules/prototypes/index.html',
  'draft',
  array['onboarding', 'mock']
);
