-- ============================================================================
-- ROXX BCE TECHNORITI — Migration 001: Initial Relational Schema
-- Database: PostgreSQL 15+ (Supabase)
-- Security: Least-privilege schema, database-enforced invariants & audit trail
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Private schema for internal RLS helpers (excluded from PostgREST API)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 1. Profiles & Role Hierarchy
--    Hierarchy: super_admin > admin > coordinator > participant
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 120),
  roll_number TEXT NOT NULL DEFAULT '' CHECK (char_length(roll_number) <= 40),
  phone TEXT NOT NULL DEFAULT '' CHECK (phone = '' OR phone ~ '^\d{10}$'),
  college TEXT NOT NULL DEFAULT '' CHECK (char_length(college) <= 160),
  branch TEXT NOT NULL DEFAULT '' CHECK (char_length(branch) <= 120),
  role TEXT NOT NULL DEFAULT 'participant'
    CHECK (role IN ('super_admin', 'admin', 'coordinator', 'participant')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role_active
  ON public.profiles (role, is_active);

-- ----------------------------------------------------------------------------
-- 2. Competitions Catalog (29 Official TECHNORITI '26 Arenas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitions (
  id TEXT PRIMARY KEY,
  num_id INTEGER NOT NULL UNIQUE CHECK (num_id >= 1),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  category_id TEXT NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('per_member', 'per_team')),
  fee_inr INTEGER NOT NULL CHECK (fee_inr >= 0),
  additional_fee_scope TEXT NOT NULL DEFAULT 'single_delegate'
    CHECK (additional_fee_scope IN ('single_delegate', 'team')),
  min_team_size INTEGER NOT NULL DEFAULT 1 CHECK (min_team_size >= 1),
  max_team_size INTEGER NOT NULL DEFAULT 1 CHECK (max_team_size >= min_team_size),
  prize_pool TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL DEFAULT '',
  event_time TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitions_active_num
  ON public.competitions (is_active, num_id);

-- ----------------------------------------------------------------------------
-- 3. Accommodation Plans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accommodation_plans (
  id TEXT PRIMARY KEY CHECK (id IN ('none', 'lodging', 'mess', 'both')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_per_person_inr INTEGER NOT NULL CHECK (price_per_person_inr >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Registrations (Authoritative Server-Computed Totals & Snapshots)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  pass_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2 AND char_length(full_name) <= 120),
  roll_number TEXT NOT NULL CHECK (char_length(trim(roll_number)) >= 2 AND char_length(roll_number) <= 40),
  phone TEXT NOT NULL CHECK (phone ~ '^\d{10}$'),
  college TEXT NOT NULL CHECK (char_length(trim(college)) >= 2 AND char_length(college) <= 160),
  branch TEXT NOT NULL CHECK (char_length(trim(branch)) >= 2 AND char_length(branch) <= 120),
  primary_arena_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE RESTRICT,
  team_size INTEGER NOT NULL CHECK (team_size >= 1 AND team_size <= 20),
  accommodation_id TEXT NOT NULL REFERENCES public.accommodation_plans(id) ON DELETE RESTRICT,
  primary_fee_snapshot_inr INTEGER NOT NULL CHECK (primary_fee_snapshot_inr >= 0),
  additional_fee_snapshot_inr INTEGER NOT NULL DEFAULT 0 CHECK (additional_fee_snapshot_inr >= 0),
  accommodation_fee_snapshot_inr INTEGER NOT NULL DEFAULT 0 CHECK (accommodation_fee_snapshot_inr >= 0),
  computed_total_inr INTEGER NOT NULL CHECK (computed_total_inr >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN ('PENDING_PAYMENT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_user_created
  ON public.registrations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_status_created
  ON public.registrations (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_primary_arena
  ON public.registrations (primary_arena_id);

CREATE INDEX IF NOT EXISTS idx_registrations_accommodation_id
  ON public.registrations (accommodation_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_user_idempotency
  ON public.registrations (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Registration Arenas Join Table (Primary + Additional Arenas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registration_arenas (
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  fee_snapshot_inr INTEGER NOT NULL CHECK (fee_snapshot_inr >= 0),
  PRIMARY KEY (registration_id, competition_id)
);

-- Covering index for coordinator roster lookups and FK checks
CREATE INDEX IF NOT EXISTS idx_registration_arenas_comp_reg
  ON public.registration_arenas (competition_id, registration_id);

-- ----------------------------------------------------------------------------
-- 6. Payments (Manual UPI & UTR Verification Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  utr_number TEXT NOT NULL CHECK (utr_number ~ '^\d{12}$'),
  amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
    CHECK (status IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED')),
  rejection_reason TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payments_utr_number UNIQUE (utr_number)
);

-- Unconditional FK indexes + active payment partial unique guard
CREATE INDEX IF NOT EXISTS idx_payments_registration_id
  ON public.payments (registration_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON public.payments (user_id);

CREATE INDEX IF NOT EXISTS idx_payments_verified_by
  ON public.payments (verified_by)
  WHERE verified_by IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_active_per_reg
  ON public.payments (registration_id)
  WHERE status IN ('PENDING_VERIFICATION', 'VERIFIED');

CREATE INDEX IF NOT EXISTS idx_payments_status_submitted
  ON public.payments (status, submitted_at DESC);

-- ----------------------------------------------------------------------------
-- 7. Coordinator Event Assignments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coordinator_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_coordinator_comp UNIQUE (coordinator_id, competition_id)
);

CREATE INDEX IF NOT EXISTS idx_coord_assignments_comp
  ON public.coordinator_assignments (competition_id, coordinator_id);

CREATE INDEX IF NOT EXISTS idx_coord_assignments_assigned_by
  ON public.coordinator_assignments (assigned_by)
  WHERE assigned_by IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 8. Immutable Administrative Audit Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs (actor_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. Persistent Distributed Rate Limiting Store
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key TEXT PRIMARY KEY CHECK (char_length(bucket_key) <= 160),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_started
  ON public.rate_limits (window_started_at);

-- ----------------------------------------------------------------------------
-- 10. Email Notification Outbox / Idempotency Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL CHECK (status IN ('SENT', 'SKIPPED_UNCONFIGURED', 'FAILED')),
  provider_message_id TEXT,
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_reg
  ON public.email_notifications (registration_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_notifications_payment
  ON public.email_notifications (payment_id)
  WHERE payment_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Shared Updated-At Timestamp Trigger (Pinned search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_competitions_updated_at ON public.competitions;
CREATE TRIGGER trg_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_accom_updated_at ON public.accommodation_plans;
CREATE TRIGGER trg_accom_updated_at
  BEFORE UPDATE ON public.accommodation_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_registrations_updated_at ON public.registrations;
CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_email_notifications_updated_at ON public.email_notifications;
CREATE TRIGGER trg_email_notifications_updated_at
  BEFORE UPDATE ON public.email_notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
