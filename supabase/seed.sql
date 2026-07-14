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

insert into public.api_specs
  (id, title, version, status, family, description, servers, auth, contact)
values (
  '11111111-1111-1111-1111-111111111111',
  'Merchant Onboarding API (sample)',
  '0.1.0',
  'draft',
  'launchpad',
  'Worked sample demonstrating the reference viewer. Replace with real specs in the database.',
  '[
    {"name": "Sandbox", "base_url": "https://sandbox.api.example.com/v1", "note": "Test credentials and synthetic data only."},
    {"name": "Production", "base_url": "https://api.example.com/v1", "note": "Live traffic. Keys issued per integrator."}
  ]'::jsonb,
  '{
    "Type": "API key (bearer)",
    "Header": "Authorization: Bearer <api_key>",
    "Scope": "One key per environment; sandbox and production keys are not interchangeable.",
    "How to obtain": "Request keys from the platform team. Keys are rotated quarterly."
  }'::jsonb,
  'Platform team (sample contact, replace with the owning team)'
);

-- Sample endpoints -------------------------------------------------

insert into public.api_endpoints
  (spec_id, method, path, tag, summary, description, params,
   request_example, response_example, request_headers, responses,
   auth_required, deprecated, notes, sort_order)
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
  '[{"name": "Idempotency-Key", "required": false, "description": "Repeat a create safely; the same key returns the original result.", "example": "idem_9f2c1"}]'::jsonb,
  '[
    {"status": 201, "description": "Application created and pending review.", "example": {"id": "mch_123", "status": "pending", "created_at": "2026-01-01T00:00:00Z"}},
    {"status": 400, "description": "A required field is missing or malformed.", "example": {"error": "invalid_request", "field": "country"}},
    {"status": 401, "description": "Missing or invalid API key."},
    {"status": 422, "description": "The business cannot be onboarded, for example an unsupported country.", "example": {"error": "unsupported_country"}}
  ]'::jsonb,
  true, false,
  'Creates are idempotent when an Idempotency-Key header is sent. Retry safely on timeouts.',
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
  '[]'::jsonb,
  '[
    {"status": 200, "description": "The current application state.", "example": {"id": "mch_123", "status": "in_review", "requirements": ["proof_of_address"]}},
    {"status": 401, "description": "Missing or invalid API key."},
    {"status": 404, "description": "No application with that identifier."}
  ]'::jsonb,
  true, false, null,
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
  '[]'::jsonb,
  '[
    {"status": 200, "description": "Updated application.", "example": {"id": "mch_123", "status": "in_review"}},
    {"status": 404, "description": "No application with that identifier."},
    {"status": 409, "description": "The application is already approved and can no longer be edited."}
  ]'::jsonb,
  true, false,
  'Only pending and in_review applications accept updates.',
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
  '[{"name": "Idempotency-Key", "required": false, "description": "Repeat an upload safely.", "example": "idem_77ab0"}]'::jsonb,
  '[
    {"status": 201, "description": "Document received and queued for review.", "example": {"id": "doc_456", "status": "received"}},
    {"status": 404, "description": "No application with that identifier."},
    {"status": 413, "description": "Referenced file exceeds the size limit."}
  ]'::jsonb,
  true, false, null,
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
  '[]'::jsonb,
  '[
    {"status": 200, "description": "Current progress.", "example": {"status": "approved", "approved_at": "2026-01-02T00:00:00Z"}},
    {"status": 404, "description": "No application with that identifier."}
  ]'::jsonb,
  true, false,
  'Poll at most once per minute; state changes also arrive on the status webhook.',
  10
),
(
  '11111111-1111-1111-1111-111111111111',
  'get',
  '/v1/merchants/{merchant_id}/state',
  'Status',
  'Poll onboarding state (deprecated)',
  'Superseded by /v1/merchants/{merchant_id}/status, which adds timestamps. Existing integrations keep working until removal.',
  '[{"name": "merchant_id", "in": "path", "type": "string", "required": true, "description": "Application identifier."}]'::jsonb,
  null,
  null,
  '[]'::jsonb,
  '[{"status": 200, "description": "Bare state string.", "example": {"state": "approved"}}]'::jsonb,
  true, true,
  'Do not build new integrations against this endpoint.',
  20
);

-- Sample integrations ----------------------------------------------
-- Generic placeholders only. Record real integrations directly in
-- the database; the repo is public.

insert into public.integrations
  (name, category, purpose, direction, status, docs_url, detail, sort_order)
values
(
  'Company registry (sample)',
  'Verification',
  'Company existence and officer checks during onboarding.',
  'outbound',
  'live',
  'https://docs.example.com/registry',
  '{"Auth": "API key", "Data exchanged": "Company number, officers"}'::jsonb,
  10
),
(
  'Screening provider (sample)',
  'Compliance',
  'Sanctions and adverse media screening.',
  'outbound',
  'planned',
  null,
  '{}'::jsonb,
  20
);

-- Sample roadmap ----------------------------------------------------
-- Generic placeholders proving the roadmap view end to end. Real
-- areas and items belong in the database, not in this file.

insert into public.work_areas (id, key, title, description, scope, sort_order)
values (
  '22222222-2222-2222-2222-222222222222',
  'sample-area',
  'Sample area',
  'Worked example of a development area. Replace with real areas in the database.',
  'product',
  10
);

insert into public.roadmap_items
  (area_id, title, summary, status, horizon, priority, effort, impact, tags, sort_order)
values
(
  '22222222-2222-2222-2222-222222222222',
  'Sample committed item',
  'An item scheduled for the current cycle.',
  'in_progress',
  'now',
  10,
  'medium',
  'high',
  array['sample'],
  10
),
(
  '22222222-2222-2222-2222-222222222222',
  'Sample future item',
  'An undated idea waiting to be prioritised.',
  'idea',
  'later',
  100,
  null,
  null,
  array['sample'],
  20
);

-- Sample work intake ------------------------------------------------
-- One document, one backlog item and one note proving the intake
-- chain end to end (see docs/WORKFLOW.md).

insert into public.work_documents (id, title, kind, area_id, content, summary, tags)
values (
  '33333333-3333-3333-3333-333333333333',
  'Sprint summary (sample)',
  'sprint',
  '22222222-2222-2222-2222-222222222222',
  'Raw pasted material would be stored here verbatim.',
  'Worked example of an ingested document: raw content plus this distilled summary.',
  array['sample']
);

insert into public.backlog_items
  (area_id, source_document_id, type, title, summary, status, priority, tags)
values (
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'feature',
  'Sample backlog item',
  'A feature captured from the sample sprint summary.',
  'open',
  10,
  array['sample']
);

insert into public.work_notes (kind, body, area_id, document_id, tags)
values (
  'decision',
  'Worked example of a distilled note linked to its source document.',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  array['sample']
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
