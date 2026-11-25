-- ============================================================================
-- ROXX BCE TECHNORITI — Migration 002: Triggers, RLS Policies & Transactional RPCs
-- Security Model: Default-Deny RLS + Private Role Helpers + Atomic Service RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Auth -> Profile Triggers (Always creates role = 'participant'; sync email)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    ''
  );

  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (NEW.id, COALESCE(LOWER(NEW.email), ''), left(v_name, 120), 'participant', true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_email_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = COALESCE(LOWER(NEW.email), email)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_updated();

-- ----------------------------------------------------------------------------
-- 2. Prevent Client-Side Privilege Escalation on Profiles
--    Supports PostgREST JWT claim JSON, legacy claim GUC, and direct service_role DB role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_claims_raw TEXT := NULLIF(current_setting('request.jwt.claims', true), '');
  v_jwt_role TEXT := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    CASE WHEN v_claims_raw IS NOT NULL THEN v_claims_raw::jsonb ->> 'role' ELSE NULL END,
    ''
  );
BEGIN
  IF v_jwt_role <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.is_active IS DISTINCT FROM OLD.is_active
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Forbidden: privileged profile attributes cannot be modified by participant requests'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_privileged ON public.profiles;
CREATE TRIGGER trg_profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privileged_profile_mutation();

-- ----------------------------------------------------------------------------
-- 3. Immutable Audit Logs Guard (Pinned search_path)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are strictly append-only and cannot be modified or deleted'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_tampering();

-- ----------------------------------------------------------------------------
-- 4. Private RLS Role Helpers (Hidden from PostgREST /rest/v1/rpc/*)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_admin_or_super()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(private.current_user_role() IN ('admin', 'super_admin'), false);
$$;

-- ----------------------------------------------------------------------------
-- 5. Enable Row Level Security & Restrict Column Privileges
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

REVOKE ALL ON public.rate_limits FROM anon, authenticated;
REVOKE ALL ON public.email_notifications FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.registrations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.registration_arenas FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coordinator_assignments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.competitions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.accommodation_plans FROM anon, authenticated;

-- Column-level least privilege on profiles updates
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, roll_number, phone, college, branch) ON public.profiles TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. Explicit Default-Deny RLS Policies (InitPlan-Wrapped for Performance)
--    Coordinators read scoped rosters via get-coordinator-registrations Edge Fn,
--    so direct PostgREST SELECT on registrations excludes coordinator financial exposure.
-- ----------------------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT private.is_admin_or_super()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) AND is_active = true)
  WITH CHECK (id = (SELECT auth.uid()) AND is_active = true);

-- COMPETITIONS
DROP POLICY IF EXISTS competitions_select_public ON public.competitions;
CREATE POLICY competitions_select_public ON public.competitions
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR (SELECT private.is_admin_or_super()));

-- ACCOMMODATION PLANS
DROP POLICY IF EXISTS accom_select_public ON public.accommodation_plans;
CREATE POLICY accom_select_public ON public.accommodation_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR (SELECT private.is_admin_or_super()));

-- REGISTRATIONS (Owner or Admin/Super Admin)
DROP POLICY IF EXISTS registrations_select_scoped ON public.registrations;
CREATE POLICY registrations_select_scoped ON public.registrations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin_or_super()));

-- REGISTRATION ARENAS (Owner or Admin/Super Admin)
DROP POLICY IF EXISTS reg_arenas_select_scoped ON public.registration_arenas;
CREATE POLICY reg_arenas_select_scoped ON public.registration_arenas
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_admin_or_super())
    OR EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = registration_arenas.registration_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

-- PAYMENTS (Owner or Admin/Super Admin)
DROP POLICY IF EXISTS payments_select_scoped ON public.payments;
CREATE POLICY payments_select_scoped ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin_or_super()));

-- COORDINATOR ASSIGNMENTS
DROP POLICY IF EXISTS coord_assignments_select_scoped ON public.coordinator_assignments;
CREATE POLICY coord_assignments_select_scoped ON public.coordinator_assignments
  FOR SELECT TO authenticated
  USING (coordinator_id = (SELECT auth.uid()) OR (SELECT private.is_admin_or_super()));

-- AUDIT LOGS (Read-only for admins & super admins)
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin_or_super()));

-- ----------------------------------------------------------------------------
-- 7. Persistent Rate-Limiting Function (Service-Role Only, Clock & Overflow Safe)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_bucket_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_row public.rate_limits%ROWTYPE;
  v_elapsed INTEGER;
BEGIN
  IF p_limit < 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.rate_limits (bucket_key, request_count, window_started_at)
  VALUES (left(p_bucket_key, 160), 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
    SET request_count = CASE
          WHEN EXTRACT(EPOCH FROM (v_now - public.rate_limits.window_started_at)) >= p_window_seconds
          THEN 1
          ELSE LEAST(public.rate_limits.request_count + 1, p_limit + 1)
        END,
        window_started_at = CASE
          WHEN EXTRACT(EPOCH FROM (v_now - public.rate_limits.window_started_at)) >= p_window_seconds
          THEN v_now
          ELSE public.rate_limits.window_started_at
        END
  RETURNING * INTO v_row;

  -- Periodic bounded cleanup of stale windows (>24h old)
  IF v_row.request_count = 1 THEN
    DELETE FROM public.rate_limits
    WHERE bucket_key IN (
      SELECT rl.bucket_key
      FROM public.rate_limits rl
      WHERE rl.window_started_at < v_now - INTERVAL '24 hours'
      LIMIT 25
    );
  END IF;

  v_elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_row.window_started_at)))::INTEGER);
  RETURN QUERY SELECT
    (v_row.request_count <= p_limit),
    v_row.request_count,
    GREATEST(1, p_window_seconds - v_elapsed);
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- ----------------------------------------------------------------------------
-- 8. Transactional Registration Creation (Set-Based, Single Snapshot, Idempotent)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_registration_tx(
  p_user_id UUID,
  p_full_name TEXT,
  p_roll_number TEXT,
  p_phone TEXT,
  p_college TEXT,
  p_branch TEXT,
  p_primary_arena_id TEXT,
  p_team_size INTEGER,
  p_additional_arena_ids TEXT[],
  p_accommodation_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS public.registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_primary public.competitions%ROWTYPE;
  v_accom public.accommodation_plans%ROWTYPE;
  v_existing public.registrations%ROWTYPE;
  v_created public.registrations%ROWTYPE;
  v_primary_fee INTEGER := 0;
  v_additional_fee INTEGER := 0;
  v_accom_fee INTEGER := 0;
  v_total INTEGER := 0;
  v_clean_additional TEXT[] := ARRAY[]::TEXT[];
  v_add_found_count INTEGER := 0;
  v_clean_idemp TEXT := NULLIF(trim(COALESCE(p_idempotency_key, '')), '');
  v_pass_code TEXT;
  v_attempts INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_profile.is_active = false THEN
    RAISE EXCEPTION 'Account is inactive or missing profile' USING ERRCODE = '42501';
  END IF;

  IF v_clean_idemp IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.registrations
    WHERE user_id = p_user_id AND idempotency_key = v_clean_idemp
    LIMIT 1;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT * INTO v_primary
  FROM public.competitions
  WHERE id = p_primary_arena_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive primary competition: %', p_primary_arena_id USING ERRCODE = '22023';
  END IF;

  IF p_team_size < v_primary.min_team_size OR p_team_size > v_primary.max_team_size THEN
    RAISE EXCEPTION 'Team size % is outside allowed range (% to %) for %',
      p_team_size, v_primary.min_team_size, v_primary.max_team_size, v_primary.title
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_accom
  FROM public.accommodation_plans
  WHERE id = p_accommodation_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid accommodation plan: %', p_accommodation_id USING ERRCODE = '22023';
  END IF;

  v_primary_fee := CASE
    WHEN v_primary.fee_type = 'per_team' THEN v_primary.fee_inr
    ELSE v_primary.fee_inr * p_team_size
  END;

  IF p_additional_arena_ids IS NOT NULL THEN
    SELECT COALESCE(ARRAY_AGG(DISTINCT trim(x)), ARRAY[]::TEXT[])
    INTO v_clean_additional
    FROM UNNEST(p_additional_arena_ids) AS x
    WHERE x IS NOT NULL AND length(trim(x)) > 0 AND trim(x) <> p_primary_arena_id;
  END IF;

  IF cardinality(v_clean_additional) > 10 THEN
    RAISE EXCEPTION 'Too many additional competitions requested (max 10)' USING ERRCODE = '22023';
  END IF;

  -- Single atomic set-based query locks no rows unnecessarily and avoids N+1/price drift
  CREATE TEMP TABLE IF NOT EXISTS _tmp_add_arenas (
    comp_id TEXT PRIMARY KEY,
    fee_inr INTEGER NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE TABLE _tmp_add_arenas;

  IF cardinality(v_clean_additional) > 0 THEN
    INSERT INTO _tmp_add_arenas (comp_id, fee_inr)
    SELECT c.id, c.fee_inr
    FROM public.competitions c
    WHERE c.id = ANY(v_clean_additional)
      AND c.is_active = true;

    SELECT COUNT(*), COALESCE(SUM(fee_inr), 0)::INTEGER
    INTO v_add_found_count, v_additional_fee
    FROM _tmp_add_arenas;

    IF v_add_found_count <> cardinality(v_clean_additional) THEN
      RAISE EXCEPTION 'One or more selected additional competitions are invalid or inactive' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_accom_fee := v_accom.price_per_person_inr * p_team_size;
  v_total := v_primary_fee + v_additional_fee + v_accom_fee;

  -- Insert registration cleanly, handling concurrent idempotency & pass_code uniqueness safely
  LOOP
    v_attempts := v_attempts + 1;
    v_pass_code := 'TR26-' || upper(encode(extensions.gen_random_bytes(5), 'hex'));
    BEGIN
      INSERT INTO public.registrations (
        user_id, pass_code, full_name, roll_number, phone, college, branch,
        primary_arena_id, team_size, accommodation_id,
        primary_fee_snapshot_inr, additional_fee_snapshot_inr,
        accommodation_fee_snapshot_inr, computed_total_inr,
        status, idempotency_key
      ) VALUES (
        p_user_id, v_pass_code, trim(p_full_name), trim(p_roll_number), trim(p_phone),
        trim(p_college), trim(p_branch),
        v_primary.id, p_team_size, v_accom.id,
        v_primary_fee, v_additional_fee, v_accom_fee, v_total,
        'PENDING_PAYMENT', v_clean_idemp
      )
      RETURNING * INTO v_created;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF v_clean_idemp IS NOT NULL THEN
          SELECT * INTO v_existing
          FROM public.registrations
          WHERE user_id = p_user_id AND idempotency_key = v_clean_idemp
          LIMIT 1;
          IF FOUND THEN
            RETURN v_existing;
          END IF;
        END IF;
        IF v_attempts >= 5 THEN
          RAISE;
        END IF;
    END;
  END LOOP;

  -- Single set-based arena snapshot insert
  INSERT INTO public.registration_arenas (registration_id, competition_id, is_primary, fee_snapshot_inr)
  SELECT v_created.id, v_primary.id, true, v_primary_fee
  UNION ALL
  SELECT v_created.id, t.comp_id, false, t.fee_inr
  FROM _tmp_add_arenas t;

  UPDATE public.profiles
  SET full_name = trim(p_full_name),
      roll_number = trim(p_roll_number),
      phone = trim(p_phone),
      college = trim(p_college),
      branch = trim(p_branch)
  WHERE id = p_user_id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_user_id,
    v_profile.role,
    'REGISTRATION_CREATED',
    'registrations',
    v_created.id::text,
    jsonb_build_object(
      'pass_code', v_created.pass_code,
      'primary_arena_id', v_primary.id,
      'team_size', p_team_size,
      'accommodation_id', v_accom.id,
      'computed_total_inr', v_total
    )
  );

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.create_registration_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT[], TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_registration_tx(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT[], TEXT, TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- 9. Transactional UTR Submission (Atomic Lock + Unique UTR Check)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_utr_tx(
  p_user_id UUID,
  p_registration_id UUID,
  p_utr_number TEXT
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_reg public.registrations%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_clean_utr TEXT := trim(COALESCE(p_utr_number, ''));
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_profile.is_active = false THEN
    RAISE EXCEPTION 'Account is inactive or missing profile' USING ERRCODE = '42501';
  END IF;

  IF v_clean_utr !~ '^\d{12}$' THEN
    RAISE EXCEPTION 'Invalid UTR format: must be exactly 12 numeric digits' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_reg
  FROM public.registrations
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_reg.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden: you do not own this registration' USING ERRCODE = '42501';
  END IF;

  IF v_reg.status NOT IN ('PENDING_PAYMENT', 'REJECTED') THEN
    RAISE EXCEPTION 'Registration is already in status % and cannot accept another UTR submission', v_reg.status
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payments (
    registration_id, user_id, utr_number, amount_inr, status
  ) VALUES (
    v_reg.id, p_user_id, v_clean_utr, v_reg.computed_total_inr, 'PENDING_VERIFICATION'
  )
  RETURNING * INTO v_payment;

  UPDATE public.registrations
  SET status = 'PENDING_VERIFICATION'
  WHERE id = v_reg.id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_user_id,
    v_profile.role,
    'PAYMENT_UTR_SUBMITTED',
    'payments',
    v_payment.id::text,
    jsonb_build_object(
      'registration_id', v_reg.id,
      'amount_inr', v_reg.computed_total_inr,
      'utr_last4', right(v_clean_utr, 4)
    )
  );

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_utr_tx(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_utr_tx(UUID, UUID, TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- 10. Transactional Admin Payment Verification (Concurrency-Safe Row Lock)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_payment_tx(
  p_admin_id UUID,
  p_payment_id UUID,
  p_decision TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_confirmed_amount_inr INTEGER DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin public.profiles%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_reg public.registrations%ROWTYPE;
  v_reason TEXT := NULLIF(trim(COALESCE(p_rejection_reason, '')), '');
BEGIN
  IF p_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
  IF NOT FOUND OR v_admin.is_active = false OR v_admin.role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: active admin or super_admin required' USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('VERIFIED', 'REJECTED') THEN
    RAISE EXCEPTION 'Decision must be VERIFIED or REJECTED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status <> 'PENDING_VERIFICATION' THEN
    RAISE EXCEPTION 'Payment has already been processed with status %', v_payment.status
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_reg
  FROM public.registrations
  WHERE id = v_payment.registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent registration record missing' USING ERRCODE = 'P0002';
  END IF;

  IF v_reg.status <> 'PENDING_VERIFICATION' THEN
    RAISE EXCEPTION 'Registration is not awaiting verification (current status: %)', v_reg.status
      USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'VERIFIED' THEN
    IF p_confirmed_amount_inr IS NULL OR p_confirmed_amount_inr <> v_payment.amount_inr THEN
      RAISE EXCEPTION 'Confirmed bank amount (%) does not match expected amount (%)',
        COALESCE(p_confirmed_amount_inr::text, 'NULL'), v_payment.amount_inr
        USING ERRCODE = '22023';
    END IF;
    v_reason := NULL;
  ELSE
    IF v_reason IS NULL OR char_length(v_reason) < 5 THEN
      RAISE EXCEPTION 'A rejection reason (at least 5 characters) is required when rejecting payment'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.payments
  SET status = p_decision,
      rejection_reason = v_reason,
      verified_by = p_admin_id,
      verified_at = NOW()
  WHERE id = v_payment.id
  RETURNING * INTO v_payment;

  UPDATE public.registrations
  SET status = p_decision
  WHERE id = v_reg.id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_admin_id,
    v_admin.role,
    CASE WHEN p_decision = 'VERIFIED' THEN 'PAYMENT_VERIFIED' ELSE 'PAYMENT_REJECTED' END,
    'payments',
    v_payment.id::text,
    jsonb_build_object(
      'registration_id', v_reg.id,
      'pass_code', v_reg.pass_code,
      'amount_inr', v_payment.amount_inr,
      'decision', p_decision,
      'rejection_reason', v_reason
    )
  );

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_payment_tx(UUID, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_tx(UUID, UUID, TEXT, TEXT, INTEGER) TO service_role;

-- ----------------------------------------------------------------------------
-- 11. Aggregate Registration Summary RPC (Avoids PostgREST max_rows = 1000 cap)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_registration_summary()
RETURNS TABLE (
  total_registrations BIGINT,
  pending_payment BIGINT,
  pending_verification BIGINT,
  verified BIGINT,
  rejected BIGINT,
  verified_revenue_inr BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_registrations,
    COUNT(*) FILTER (WHERE status = 'PENDING_PAYMENT')::BIGINT AS pending_payment,
    COUNT(*) FILTER (WHERE status = 'PENDING_VERIFICATION')::BIGINT AS pending_verification,
    COUNT(*) FILTER (WHERE status = 'VERIFIED')::BIGINT AS verified,
    COUNT(*) FILTER (WHERE status = 'REJECTED')::BIGINT AS rejected,
    COALESCE(SUM(computed_total_inr) FILTER (WHERE status = 'VERIFIED'), 0)::BIGINT AS verified_revenue_inr
  FROM public.registrations;
$$;

REVOKE ALL ON FUNCTION public.get_registration_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_summary() TO service_role;
