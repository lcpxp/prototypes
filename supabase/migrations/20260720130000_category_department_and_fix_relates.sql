-- ------------------------------------------------------------------
-- 20260720130000_category_department_and_fix_relates.sql
--
-- Two additive columns that finalise the work model (see
-- docs/ROADMAP-PLAYBOOK.md and docs/DESIGN.md):
--
-- 1. roadmap_categories.owning_department - the department a theme
--    belongs to for COLOUR and grouping. The palette is department-keyed
--    (each department a base hue, each workstream a shade, items a
--    modifier), so every lane needs an owning department to source its
--    hue. A soft tag: a lane may still hold items from other departments.
-- 2. work_items.relates_to_id - a soft, NON-nesting reference to the
--    workstream a piece of work relates to. It lets a small standalone
--    fix (the maintenance track) be attributed to, say, "Acquirer
--    management" for filtering/reporting WITHOUT nesting under it and
--    lighting that workstream up on the strategic gantt. Distinct from
--    parent_id, which nests and rolls up.
--
-- Additive on existing RLS-gated tables, so no policy change is needed
-- (new columns inherit roadmap_categories / work_items RLS). Idempotent.
-- ------------------------------------------------------------------

-- 1. Theme owning department (colour + grouping) ----------------------------
alter table public.roadmap_categories
  add column if not exists owning_department text;

alter table public.roadmap_categories
  drop constraint if exists roadmap_categories_owning_department_check;
alter table public.roadmap_categories
  add constraint roadmap_categories_owning_department_check
  check (owning_department is null or owning_department in
    ('sales_commercial', 'operations_onboarding', 'product_technology',
     'finance_revenue', 'legal_compliance', 'risk_underwriting'));

-- Seed each existing theme's owning department (data-driven by key), so
-- the palette resolves a hue for every current lane. Only fills nulls.
update public.roadmap_categories set owning_department = v.dept
from (values
  ('core',         'product_technology'),
  ('unity',        'product_technology'),
  ('overhaul',     'product_technology'),
  ('integrations', 'product_technology'),
  ('apis',         'product_technology'),
  ('pipeline',     'operations_onboarding'),
  ('automation',   'operations_onboarding'),
  ('admin',        'operations_onboarding'),
  ('partners',     'sales_commercial'),
  ('sales',        'sales_commercial'),
  ('acquiring',    'risk_underwriting'),
  ('insights',     'finance_revenue'),
  ('products',     'finance_revenue')
) as v(key, dept)
where public.roadmap_categories.key = v.key
  and public.roadmap_categories.owning_department is null;

-- 2. Soft "relates to" reference for the maintenance/fixes track ------------
alter table public.work_items
  add column if not exists relates_to_id uuid;

alter table public.work_items
  drop constraint if exists work_items_relates_to_fkey;
alter table public.work_items
  add constraint work_items_relates_to_fkey
  foreign key (relates_to_id) references public.work_items (id) on delete set null;

alter table public.work_items
  drop constraint if exists work_items_relates_not_self;
alter table public.work_items
  add constraint work_items_relates_not_self
  check (relates_to_id is null or relates_to_id <> id);

create index if not exists work_items_relates_to_idx
  on public.work_items (relates_to_id);
