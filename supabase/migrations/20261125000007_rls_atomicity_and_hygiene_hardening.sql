-- ============================================================================
-- ROXX BCE TECHNORITI — Migration 007: RLS, Atomicity & Hygiene Hardening
-- Remediates remaining audit findings without breaking Migrations 001–006:
--   1. [MEDIUM-01] RESTRICTIVE is_active_user() RLS policies on participant tables
--      so deactivated users cannot read rows via an unexpired JWT via PostgREST
--   2. [MEDIUM-05] Enforce SET search_path = ..., pg_temp on pre-005 functions
--      and eliminate _tmp_add_arenas temp table in create_registration_tx
--   3. [LOW-01/03] Revoke unnecessary UPDATE on private.security_settings from
--      service_role, revoke PUBLIC EXECUTE on trigger functions, and convert
--      trg_audit_logs_immutable to FOR EACH STATEMENT
--   4. [MEDIUM-02] Atomic SQL RPCs for manage-admins & manage-competitions so
--      primary mutation and audit_logs insert share one DB transaction
--   5. [MEDIUM-04] SQL-paginated get_coordinator_roster_page RPC eliminating
--      1000-row PostgREST cap and long .in() query URL limits
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Active-account RESTRICTIVE RLS across authenticated participant tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT p.is_active
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated, service_role;

DROP POLICY IF EXISTS registrations_require_active_user ON public.registrations;
CREATE POLICY registrations_require_active_user ON public.registrations
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING ((SELECT private.is_active_user()));

DROP POLICY IF EXISTS reg_arenas_require_active_user ON public.registration_arenas;
CREATE POLICY reg_arenas_require_active_user ON public.registration_arenas
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING ((SELECT private.is_active_user()));

DROP POLICY IF EXISTS payments_require_active_user ON public.payments;
CREATE POLICY payments_require_active_user ON public.payments
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING ((SELECT private.is_active_user()));

DROP POLICY IF EXISTS coord_assignments_require_active_user ON public.coordinator_assignments;
CREATE POLICY coord_assignments_require_active_user ON public.coordinator_assignments
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING ((SELECT private.is_active_user()));

-- ----------------------------------------------------------------------------
-- 2. Search-path hardening (pg_temp last) & trigger privilege hygiene
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_user_email_updated() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_audit_log_tampering() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_utr_tx(UUID, UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.verify_payment_tx(UUID, UUID, TEXT, TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_registration_summary() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_admin_dashboard_analytics() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_coordinator_dashboard_analytics(TEXT[]) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_user_email_updated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_privileged_profile_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_audit_log_tampering() FROM PUBLIC, anon, authenticated;

-- Upgrade audit immutability guard to FOR EACH STATEMENT (fires even on 0-row DML)
DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_tampering();

-- Remove unnecessary direct UPDATE privilege on private.security_settings
REVOKE UPDATE ON TABLE private.security_settings FROM service_role;

-- ----------------------------------------------------------------------------
-- 3. Refactor create_registration_tx without temp tables + safe search_path
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
SET search_path = public, extensions, pg_temp
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

  IF cardinality(v_clean_additional) > 0 THEN
    SELECT COUNT(*)::INTEGER, COALESCE(SUM(c.fee_inr), 0)::INTEGER
    INTO v_add_found_count, v_additional_fee
    FROM public.competitions c
    WHERE c.id = ANY(v_clean_additional)
      AND c.is_active = true;

    IF v_add_found_count <> cardinality(v_clean_additional) THEN
      RAISE EXCEPTION 'One or more selected additional competitions are invalid or inactive' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_accom_fee := v_accom.price_per_person_inr * p_team_size;
  v_total := v_primary_fee + v_additional_fee + v_accom_fee;

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

  INSERT INTO public.registration_arenas (registration_id, competition_id, is_primary, fee_snapshot_inr)
  SELECT v_created.id, v_primary.id, true, v_primary_fee
  UNION ALL
  SELECT v_created.id, c.id, false, c.fee_inr
  FROM public.competitions c
  WHERE c.id = ANY(v_clean_additional)
    AND c.is_active = true;

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
-- 4. Atomic Staff / Coordinator / Catalog Mutation RPCs + Audit Logging
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manage_admins_set_role_tx(
  p_actor_id UUID,
  p_target_id UUID,
  p_next_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_target_id IS NULL THEN
    RAISE EXCEPTION 'Actor and target IDs are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND OR v_actor.is_active = false OR v_actor.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: active super_admin required' USING ERRCODE = '42501';
  END IF;

  IF p_target_id = p_actor_id THEN
    RAISE EXCEPTION 'Super admins cannot modify their own role' USING ERRCODE = '22023';
  END IF;

  IF p_next_role NOT IN ('admin', 'coordinator', 'participant') THEN
    RAISE EXCEPTION 'Invalid target role: %', COALESCE(p_next_role, 'NULL') USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target account not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_target.role = 'super_admin' THEN
    RAISE EXCEPTION 'Other super_admin accounts cannot be modified through API' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = p_next_role
  WHERE id = v_target.id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_actor_id,
    v_actor.role,
    'ROLE_UPDATED',
    'profiles',
    v_target.id::text,
    jsonb_build_object('previous_role', v_target.role, 'new_role', p_next_role)
  );

  RETURN jsonb_build_object(
    'updated', true,
    'target_user_id', v_target.id,
    'previous_role', v_target.role,
    'role', p_next_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_admins_set_role_tx(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_admins_set_role_tx(UUID, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_admins_set_active_tx(
  p_actor_id UUID,
  p_target_id UUID,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_target_id IS NULL OR p_is_active IS NULL THEN
    RAISE EXCEPTION 'Actor, target ID, and is_active boolean are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND OR v_actor.is_active = false OR v_actor.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: active super_admin required' USING ERRCODE = '42501';
  END IF;

  IF p_target_id = p_actor_id THEN
    RAISE EXCEPTION 'Super admins cannot deactivate themselves' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target account not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_target.role = 'super_admin' THEN
    RAISE EXCEPTION 'Other super_admin accounts cannot be modified through API' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET is_active = p_is_active
  WHERE id = v_target.id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_actor_id,
    v_actor.role,
    CASE WHEN p_is_active THEN 'STAFF_REACTIVATED' ELSE 'STAFF_DEACTIVATED' END,
    'profiles',
    v_target.id::text,
    jsonb_build_object('role', v_target.role, 'is_active', p_is_active)
  );

  RETURN jsonb_build_object(
    'updated', true,
    'target_user_id', v_target.id,
    'previous_is_active', v_target.is_active,
    'is_active', p_is_active
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_admins_set_active_tx(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_admins_set_active_tx(UUID, UUID, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_admins_assign_coordinator_tx(
  p_actor_id UUID,
  p_coordinator_id UUID,
  p_competition_id TEXT
)
RETURNS public.coordinator_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_coord public.profiles%ROWTYPE;
  v_comp_exists BOOLEAN;
  v_row public.coordinator_assignments%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_coordinator_id IS NULL OR NULLIF(trim(COALESCE(p_competition_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Valid actor, coordinator, and competition IDs are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND OR v_actor.is_active = false OR v_actor.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: active super_admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_coord FROM public.profiles WHERE id = p_coordinator_id;
  IF NOT FOUND OR v_coord.role <> 'coordinator' OR v_coord.is_active = false THEN
    RAISE EXCEPTION 'Target user must be an active coordinator account' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.competitions WHERE id = trim(p_competition_id)) INTO v_comp_exists;
  IF NOT v_comp_exists THEN
    RAISE EXCEPTION 'Competition not found: %', trim(p_competition_id) USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.coordinator_assignments (coordinator_id, competition_id, assigned_by)
  VALUES (p_coordinator_id, trim(p_competition_id), p_actor_id)
  ON CONFLICT (coordinator_id, competition_id) DO UPDATE
    SET assigned_by = EXCLUDED.assigned_by
  RETURNING * INTO v_row;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_actor_id,
    v_actor.role,
    'COORDINATOR_ASSIGNED',
    'coordinator_assignments',
    v_row.id::text,
    jsonb_build_object('coordinator_id', p_coordinator_id, 'competition_id', v_row.competition_id)
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_admins_assign_coordinator_tx(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_admins_assign_coordinator_tx(UUID, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_admins_remove_coordinator_tx(
  p_actor_id UUID,
  p_assignment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_deleted public.coordinator_assignments%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_assignment_id IS NULL THEN
    RAISE EXCEPTION 'Valid actor and assignment IDs are required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND OR v_actor.is_active = false OR v_actor.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: active super_admin required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.coordinator_assignments
  WHERE id = p_assignment_id
  RETURNING * INTO v_deleted;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coordinator assignment not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_actor_id,
    v_actor.role,
    'COORDINATOR_UNASSIGNED',
    'coordinator_assignments',
    p_assignment_id::text,
    jsonb_build_object('coordinator_id', v_deleted.coordinator_id, 'competition_id', v_deleted.competition_id)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_admins_remove_coordinator_tx(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_admins_remove_coordinator_tx(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_competition_update_tx(
  p_actor_id UUID,
  p_competition_id TEXT,
  p_updates JSONB
)
RETURNS public.competitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_comp public.competitions%ROWTYPE;
  v_has_fee BOOLEAN := COALESCE(p_updates ? 'fee_inr', false) OR COALESCE(p_updates ? 'fee_type', false);
  v_fee INTEGER;
  v_fee_type TEXT;
BEGIN
  IF p_actor_id IS NULL OR NULLIF(trim(COALESCE(p_competition_id, '')), '') IS NULL OR p_updates IS NULL THEN
    RAISE EXCEPTION 'Invalid competition update arguments' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND OR v_actor.is_active = false OR v_actor.role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: active admin or super_admin required' USING ERRCODE = '42501';
  END IF;

  IF v_has_fee AND v_actor.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: only super_admin can modify competition fees' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_comp FROM public.competitions WHERE id = trim(p_competition_id) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Competition not found: %', trim(p_competition_id) USING ERRCODE = 'P0002';
  END IF;

  IF p_updates ? 'fee_inr' THEN
    v_fee := (p_updates ->> 'fee_inr')::INTEGER;
    IF v_fee < 0 OR v_fee > 25000 THEN
      RAISE EXCEPTION 'fee_inr out of allowed bounds' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_updates ? 'fee_type' THEN
    v_fee_type := p_updates ->> 'fee_type';
    IF v_fee_type NOT IN ('per_member', 'per_team') THEN
      RAISE EXCEPTION 'Invalid fee_type' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.competitions
  SET is_active = CASE WHEN p_updates ? 'is_active' THEN (p_updates ->> 'is_active')::BOOLEAN ELSE is_active END,
      venue = CASE WHEN p_updates ? 'venue' THEN p_updates ->> 'venue' ELSE venue END,
      event_date = CASE WHEN p_updates ? 'event_date' THEN p_updates ->> 'event_date' ELSE event_date END,
      event_time = CASE WHEN p_updates ? 'event_time' THEN p_updates ->> 'event_time' ELSE event_time END,
      fee_inr = CASE WHEN p_updates ? 'fee_inr' THEN v_fee ELSE fee_inr END,
      fee_type = CASE WHEN p_updates ? 'fee_type' THEN v_fee_type ELSE fee_type END
  WHERE id = v_comp.id
  RETURNING * INTO v_comp;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_actor_id,
    v_actor.role,
    'COMPETITION_UPDATED',
    'competitions',
    v_comp.id,
    p_updates
  );

  RETURN v_comp;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_competition_update_tx(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_competition_update_tx(UUID, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_accommodation_update_tx(
  p_actor_id UUID,
  p_plan_id TEXT,
  p_updates JSONB
)
RETURNS public.accommodation_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_plan public.accommodation_plans%ROWTYPE;
  v_price INTEGER;
BEGIN
  IF p_actor_id IS NULL OR NULLIF(trim(COALESCE(p_plan_id, '')), '') IS NULL OR p_updates IS NULL THEN
    RAISE EXCEPTION 'Invalid accommodation update arguments' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  IF NOT FOUND OR v_actor.is_active = false OR v_actor.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: active super_admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_plan FROM public.accommodation_plans WHERE id = trim(p_plan_id) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accommodation plan not found: %', trim(p_plan_id) USING ERRCODE = 'P0002';
  END IF;

  IF p_updates ? 'price_per_person_inr' THEN
    v_price := (p_updates ->> 'price_per_person_inr')::INTEGER;
    IF v_price < 0 OR v_price > 10000 THEN
      RAISE EXCEPTION 'price_per_person_inr out of allowed bounds' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.accommodation_plans
  SET price_per_person_inr = CASE WHEN p_updates ? 'price_per_person_inr' THEN v_price ELSE price_per_person_inr END,
      is_active = CASE WHEN p_updates ? 'is_active' THEN (p_updates ->> 'is_active')::BOOLEAN ELSE is_active END
  WHERE id = v_plan.id
  RETURNING * INTO v_plan;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_actor_id,
    v_actor.role,
    'TARIFF_UPDATED',
    'accommodation_plans',
    v_plan.id,
    p_updates
  );

  RETURN v_plan;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_accommodation_update_tx(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_accommodation_update_tx(UUID, TEXT, JSONB) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. SQL-Paginated Coordinator Roster RPC (Non-Financial Fields Only)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_coordinator_roster_page(
  p_competition_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_filter TEXT[] := COALESCE(p_competition_ids, ARRAY[]::TEXT[]);
  v_offset INTEGER := GREATEST(0, COALESCE(p_offset, 0));
  v_limit INTEGER := GREATEST(1, LEAST(100, COALESCE(p_limit, 20)));
  v_total BIGINT := 0;
  v_rows JSONB := '[]'::jsonb;
BEGIN
  WITH matched AS (
    SELECT r.id, r.created_at
    FROM public.registrations r
    WHERE cardinality(v_filter) = 0
       OR EXISTS (
         SELECT 1
         FROM public.registration_arenas ra
         WHERE ra.registration_id = r.id
           AND ra.competition_id = ANY(v_filter)
       )
  )
  SELECT COUNT(*)::BIGINT INTO v_total FROM matched;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'pass_code', r.pass_code,
        'full_name', r.full_name,
        'roll_number', r.roll_number,
        'phone', r.phone,
        'college', r.college,
        'branch', r.branch,
        'primary_arena_id', r.primary_arena_id,
        'team_size', r.team_size,
        'accommodation_id', r.accommodation_id,
        'status', r.status,
        'created_at', r.created_at,
        'primary_competition', CASE
          WHEN pc.id IS NULL THEN NULL
          ELSE jsonb_build_object('id', pc.id, 'title', pc.title)
        END,
        'arenas', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'competition_id', ra.competition_id,
                'is_primary', ra.is_primary,
                'competition', CASE
                  WHEN ac.id IS NULL THEN NULL
                  ELSE jsonb_build_object('id', ac.id, 'title', ac.title)
                END
              )
              ORDER BY ra.is_primary DESC, ra.competition_id ASC
            )
            FROM public.registration_arenas ra
            LEFT JOIN public.competitions ac ON ac.id = ra.competition_id
            WHERE ra.registration_id = r.id
          ),
          '[]'::jsonb
        )
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT r.*
    FROM public.registrations r
    WHERE cardinality(v_filter) = 0
       OR EXISTS (
         SELECT 1
         FROM public.registration_arenas ra
         WHERE ra.registration_id = r.id
           AND ra.competition_id = ANY(v_filter)
       )
    ORDER BY r.created_at DESC
    OFFSET v_offset
    LIMIT v_limit
  ) r
  LEFT JOIN public.competitions pc ON pc.id = r.primary_arena_id;

  RETURN jsonb_build_object(
    'total', v_total,
    'rows', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coordinator_roster_page(TEXT[], INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordinator_roster_page(TEXT[], INTEGER, INTEGER) TO service_role;
