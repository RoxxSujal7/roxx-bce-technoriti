-- ============================================================================
-- ROXX BCE TECHNORITI — Migration 006: Synchronized Strict MFA Policy & Cutover
-- Fixes Phase 3 audit gaps:
--   1. Synchronizes PostgreSQL PostgREST RLS with strict MFA policy via
--      private.security_settings (closed unenrolled & factor-deletion bypass)
--   2. Requires active verified interactive factor even on AAL2 JWTs so
--      mid-session GoTrue DELETE /auth/v1/factors/{id} drops privileges cleanly
--   3. Fails closed when security_settings row is absent
--   4. Adds service_role-only public.get_privileged_mfa_policy() RPC for Edge parity
--   5. Adds lockout-safe private.enable_strict_mfa_policy() owner cutover helper
-- ============================================================================

-- 1. Authoritative DB-level security settings singleton (private schema)
CREATE TABLE IF NOT EXISTS private.security_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enforce_privileged_mfa BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE private.security_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO private.security_settings (id, enforce_privileged_mfa)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON TABLE private.security_settings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON TABLE private.security_settings TO service_role;

DROP TRIGGER IF EXISTS trg_security_settings_touch_updated_at ON private.security_settings;
CREATE TRIGGER trg_security_settings_touch_updated_at
  BEFORE UPDATE ON private.security_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION private.prevent_security_settings_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = private, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'private.security_settings singleton cannot be deleted or truncated'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_security_settings_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_security_settings_no_delete ON private.security_settings;
CREATE TRIGGER trg_security_settings_no_delete
  BEFORE DELETE ON private.security_settings
  FOR EACH STATEMENT EXECUTE FUNCTION private.prevent_security_settings_delete();

DROP TRIGGER IF EXISTS trg_security_settings_no_truncate ON private.security_settings;
CREATE TRIGGER trg_security_settings_no_truncate
  BEFORE TRUNCATE ON private.security_settings
  FOR EACH STATEMENT EXECUTE FUNCTION private.prevent_security_settings_delete();

-- 2. Upgrade private.is_admin_or_super() to enforce strict AAL2 + active verified factor
--    across PostgREST, closing unenrolled and mid-session deleted-factor bypasses.
CREATE OR REPLACE FUNCTION private.is_admin_or_super()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
  SELECT COALESCE(private.current_user_role() IN ('admin', 'super_admin'), false)
    AND (
      (
        COALESCE(((SELECT auth.jwt()) ->> 'aal'), '') = 'aal2'
        AND EXISTS (
          SELECT 1
          FROM auth.mfa_factors f
          WHERE f.user_id = (SELECT auth.uid())
            AND f.status = 'verified'
            AND f.factor_type::text IN ('totp', 'webauthn', 'phone')
        )
      )
      OR (
        NOT COALESCE((SELECT s.enforce_privileged_mfa FROM private.security_settings s WHERE s.id = 1), true)
        AND NOT EXISTS (
          SELECT 1
          FROM auth.mfa_factors f
          WHERE f.user_id = (SELECT auth.uid())
            AND f.status = 'verified'
            AND f.factor_type::text IN ('totp', 'webauthn', 'phone')
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION private.is_admin_or_super() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin_or_super() TO authenticated, service_role;

-- 3. Service-role-only RPC so Edge Functions stay synchronized with DB MFA policy
CREATE OR REPLACE FUNCTION public.get_privileged_mfa_policy()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, pg_temp
AS $$
  SELECT COALESCE((SELECT s.enforce_privileged_mfa FROM private.security_settings s WHERE s.id = 1), true);
$$;

REVOKE ALL ON FUNCTION public.get_privileged_mfa_policy() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_privileged_mfa_policy() TO service_role;

-- 4. Lockout-safe owner cutover helper: refuses to enable strict mode until at least
--    one active super_admin has a verified interactive MFA factor enrolled.
CREATE OR REPLACE FUNCTION private.enable_strict_mfa_policy(p_actor_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
DECLARE
  v_has_super_admin_mfa BOOLEAN;
  v_actor_role TEXT := 'system_cutover';
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN auth.mfa_factors f ON f.user_id = p.id
    WHERE p.role = 'super_admin'
      AND p.is_active = true
      AND f.status = 'verified'
      AND f.factor_type::text IN ('totp', 'webauthn', 'phone')
  )
  INTO v_has_super_admin_mfa;

  IF NOT COALESCE(v_has_super_admin_mfa, false) THEN
    RAISE EXCEPTION 'Cannot enable strict privileged MFA: enroll and verify a TOTP/WebAuthn factor for at least one active super_admin first.'
      USING ERRCODE = '22023';
  END IF;

  IF p_actor_id IS NOT NULL THEN
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = p_actor_id AND is_active = true AND role = 'super_admin';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid p_actor_id: strict MFA cutover actor must be an active super_admin or NULL.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO private.security_settings (id, enforce_privileged_mfa, updated_at, updated_by)
  VALUES (1, true, NOW(), p_actor_id)
  ON CONFLICT (id) DO UPDATE
    SET enforce_privileged_mfa = true,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    p_actor_id,
    v_actor_role,
    'STRICT_MFA_POLICY_ENABLED',
    'private.security_settings',
    '1',
    jsonb_build_object('enforce_privileged_mfa', true)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION private.enable_strict_mfa_policy(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.enable_strict_mfa_policy(UUID) TO service_role;
