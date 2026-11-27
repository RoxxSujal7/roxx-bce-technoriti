-- ============================================================================
-- ROXX BCE TECHNORITI — Migration 005: MFA/AAL2 RLS & Privilege Hardening
-- Fixes independent audit findings:
--   HIGH-01: Enforce AAL2 in private.is_admin_or_super() when MFA is enrolled
--   MED-01:  Remove direct PostgREST SELECT on public.audit_logs
--   LOW-01:  Rely strictly on current_user in prevent_privileged_profile_mutation
--   LOW-02:  REVOKE ALL on tables + BEFORE TRUNCATE guard on audit_logs
--   LOW-03:  Restrict private schema usage & current_user_role() execution
--   LOW-04:  Include pg_temp last in SECURITY DEFINER search_path
-- ============================================================================

-- 1. Enforce AAL2 for cross-user / privileged admin RLS when user has a verified MFA factor
--    Note: profiles_select_own (id = auth.uid()) remains usable at AAL1 so AuthContext can
--    inspect profile.role and trigger the TOTP MFA challenge flow cleanly.
CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION private.is_admin_or_super()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT COALESCE(private.current_user_role() IN ('admin', 'super_admin'), false)
    AND (
      COALESCE(((SELECT auth.jwt()) ->> 'aal'), '') = 'aal2'
      OR NOT EXISTS (
        SELECT 1
        FROM auth.mfa_factors f
        WHERE f.user_id = (SELECT auth.uid())
          AND f.status = 'verified'
          AND f.factor_type::text IN ('totp', 'webauthn', 'phone')
      )
    );
$$;

-- Restrict helper execution & anon schema surface
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO service_role;
REVOKE ALL ON FUNCTION private.is_admin_or_super() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin_or_super() TO authenticated, service_role;
REVOKE USAGE ON SCHEMA private FROM anon;

-- 2. Simplify profile mutation guard to kernel current_user role (prevent GUC spoofing)
CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
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

-- 3. Remove direct PostgREST audit_logs exposure (admin UI fetches sanitized audit_logs via Edge Function)
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.audit_logs_id_seq FROM anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_no_truncate
  BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_tampering();

-- 4. Minimize table grants (remove implicit anon SELECT / TRUNCATE / REFERENCES / TRIGGER)
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, roll_number, phone, college, branch) ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.competitions FROM anon, authenticated;
GRANT SELECT ON TABLE public.competitions TO anon, authenticated;

REVOKE ALL ON TABLE public.accommodation_plans FROM anon, authenticated;
GRANT SELECT ON TABLE public.accommodation_plans TO anon, authenticated;

REVOKE ALL ON TABLE public.registrations FROM anon, authenticated;
GRANT SELECT ON TABLE public.registrations TO authenticated;

REVOKE ALL ON TABLE public.registration_arenas FROM anon, authenticated;
GRANT SELECT ON TABLE public.registration_arenas TO authenticated;

REVOKE ALL ON TABLE public.payments FROM anon, authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;

REVOKE ALL ON TABLE public.coordinator_assignments FROM anon, authenticated;
GRANT SELECT ON TABLE public.coordinator_assignments TO authenticated;

-- 5. Split public catalog policies so anon never evaluates private.is_admin_or_super()
DROP POLICY IF EXISTS competitions_select_public ON public.competitions;
DROP POLICY IF EXISTS competitions_select_anon ON public.competitions;
CREATE POLICY competitions_select_anon
  ON public.competitions FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS competitions_select_authenticated ON public.competitions;
CREATE POLICY competitions_select_authenticated
  ON public.competitions FOR SELECT
  TO authenticated
  USING (is_active = true OR (SELECT private.is_admin_or_super()));

DROP POLICY IF EXISTS accom_select_public ON public.accommodation_plans;
DROP POLICY IF EXISTS accom_select_anon ON public.accommodation_plans;
CREATE POLICY accom_select_anon
  ON public.accommodation_plans FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS accom_select_authenticated ON public.accommodation_plans;
CREATE POLICY accom_select_authenticated
  ON public.accommodation_plans FOR SELECT
  TO authenticated
  USING (is_active = true OR (SELECT private.is_admin_or_super()));
