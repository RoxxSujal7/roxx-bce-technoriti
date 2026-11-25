-- ============================================================================
-- ROXX BCE TECHNORITI — One-Time Super Admin Bootstrap Procedure
-- Usage: Run in Supabase Studio SQL Editor AFTER the owner creates & verifies
--        their account via normal Signup / Google OAuth on the portal.
-- Security: Replace <VERIFIED_AUTH_USER_UUID> with the exact UUID from
--           Supabase Dashboard -> Authentication -> Users. Never commit real IDs.
-- ============================================================================

DO $$
DECLARE
  v_owner_id UUID := '<VERIFIED_AUTH_USER_UUID>'::uuid;
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_owner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile found for UUID %. Sign up via the app first so auth.users trigger creates the profile.', v_owner_id;
  END IF;

  UPDATE public.profiles
  SET role = 'super_admin',
      is_active = true
  WHERE id = v_owner_id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, target_table, target_id, details)
  VALUES (
    v_owner_id,
    'system_bootstrap',
    'SUPER_ADMIN_BOOTSTRAP',
    'profiles',
    v_owner_id::text,
    jsonb_build_object('assigned_role', 'super_admin')
  );
END $$;
