-- ------------------------------------------------------------------
-- Applied 2026-09-07. Adds the integration ESTATE: integration_capabilities
-- (what each provider can do, what it could replace) and integration_notes
-- (what is still unanswered about it), plus the two views that read them.
--
-- RECOVERED 2026-09-15 from the live database. The migration was applied
-- on 2026-09-07 and no file was written at the time, so this records what
-- the ledger entry actually did rather than being the original text -
-- supabase/schema/20_portal.sql is the declarative home and was written
-- back in the same pass. Recorded here so the ledger and the repo agree.
--
-- Rationale beside each column in supabase/schema/20_portal.sql.
-- Applied migrations are immutable: do not re-apply or edit this file.
-- ------------------------------------------------------------------

create table if not exists public.integration_capabilities (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations (id) on delete cascade,
  group_label text,
  name text not null,
  description text,
  availability text not null default 'available'
    check (availability in ('live', 'available', 'planned', 'not_offered', 'unknown')),
  replaces_integration_id uuid references public.integrations (id) on delete set null,
  replaces_note text,
  verified boolean not null default false,
  as_of date,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_capabilities_integration_idx
  on public.integration_capabilities (integration_id, availability);

create table if not exists public.integration_notes (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations (id) on delete cascade,
  kind text not null default 'comment'
    check (kind in ('meeting', 'decision', 'question', 'commercial', 'comment', 'risk')),
  body text not null,
  status text not null default 'active'
    check (status in ('active', 'open', 'answered', 'superseded')),
  captured_on date not null default current_date,
  source_document_id uuid references public.work_documents (id) on delete set null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_notes_integration_idx
  on public.integration_notes (integration_id, status);

drop trigger if exists integration_capabilities_updated_at on public.integration_capabilities;
create trigger integration_capabilities_updated_at
  before update on public.integration_capabilities
  for each row execute function public.set_updated_at();

drop trigger if exists integration_notes_updated_at on public.integration_notes;
create trigger integration_notes_updated_at
  before update on public.integration_notes
  for each row execute function public.set_updated_at();

alter table public.integration_capabilities enable row level security;
alter table public.integration_notes enable row level security;
