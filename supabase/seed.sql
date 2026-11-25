-- ============================================================================
-- ROXX BCE TECHNORITI — Supabase Seed File (Go pgx / Supabase CLI Safe)
-- Catalog seeding is already executed idempotently in migration
-- `20261125000003_seed_catalog.sql`. This file intentionally uses plain SQL
-- (no psql `\ir` meta-commands) and avoids overwriting admin runtime edits.
-- ============================================================================

INSERT INTO public.accommodation_plans (id, name, description, price_per_person_inr, is_active)
VALUES
  ('none', 'No Stay Needed', 'Day scholar / local commute', 0, true),
  ('lodging', 'Campus Lodging Only', 'Secure campus hostel bedding & 24/7 security', 50, true),
  ('mess', 'Mess & Dining Only', 'Breakfast, Lunch & Dinner in central college mess', 125, true),
  ('both', 'Complete Stay (Lodging + Mess)', 'Combined hostel stay + all 3 daily meals', 175, true)
ON CONFLICT (id) DO NOTHING;
