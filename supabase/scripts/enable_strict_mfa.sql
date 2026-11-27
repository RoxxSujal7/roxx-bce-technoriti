-- ============================================================================
-- ROXX BCE TECHNORITI — Safe Owner Strict Privileged MFA Cutover Script
-- Prerequisite:
--   1. Apply migrations 001..006.
--   2. Sign in as active super_admin (and all active admins), open
--      #/admin -> Security & MFA, and enroll + verify TOTP authenticator(s).
-- Behavior:
--   Refuses to activate strict mode if no active super_admin has a verified MFA
--   factor, preventing owner self-lockout. Once enabled, BOTH PostgreSQL
--   PostgREST RLS and Edge Functions require active verified MFA + AAL2.
-- ============================================================================

SELECT private.enable_strict_mfa_policy(
  (
    SELECT p.id
    FROM public.profiles p
    JOIN auth.mfa_factors f ON f.user_id = p.id
    WHERE p.role = 'super_admin'
      AND p.is_active = true
      AND f.status = 'verified'
      AND f.factor_type::text IN ('totp', 'webauthn', 'phone')
    ORDER BY p.created_at ASC
    LIMIT 1
  )
);
