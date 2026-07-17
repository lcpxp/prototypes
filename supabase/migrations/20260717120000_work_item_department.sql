-- ------------------------------------------------------------------
-- 20260717120000_work_item_department.sql
--
-- Add an optional owning-department tag to work_items: the business
-- function accountable for the item (Sales & Commercial, Operations and
-- Onboarding, Product and Technology, Finance and Revenue, Legal &
-- Compliance, Risk & Underwriting). A coarse org-owner axis, orthogonal
-- to area/theme, so any view can group or filter work by who owns it.
--
-- Same table, so the existing work_items RLS policies cover the new
-- column; no policy change is needed. Idempotent. Display labels live
-- in assets/js/core/registry.js (App.registry.departments).
-- ------------------------------------------------------------------

alter table public.work_items
  add column if not exists department text;

alter table public.work_items
  drop constraint if exists work_items_department_check;
alter table public.work_items
  add constraint work_items_department_check
  check (department in ('sales_commercial', 'operations_onboarding',
    'product_technology', 'finance_revenue', 'legal_compliance',
    'risk_underwriting'));
