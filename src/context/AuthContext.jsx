import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export const POST_AUTH_REDIRECT_KEY = 'technoriti_post_auth_redirect';
const ALLOWED_REDIRECT_PATHS = new Set(['/', '/dashboard', '/register', '/admin']);

export function sanitizeInternalRedirect(raw) {
  if (typeof raw !== 'string') return '/dashboard';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/dashboard';
  }
  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i);
    if (code <= 31 || code === 127) return '/dashboard';
  }
  const basePath = trimmed.split('?')[0].split('#')[0];
  return ALLOWED_REDIRECT_PATHS.has(basePath) ? trimmed : '/dashboard';
}

const AuthContext = createContext({
  configured: false,
  loading: true,
  session: null,
  user: null,
  profile: null,
  authError: null,
  isPasswordRecovery: false,
  clearAuthError: () => {},
  clearPasswordRecovery: () => {},
  refreshProfile: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const profileReqRef = useRef(0);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId) => {
    const reqId = ++profileReqRef.current;
    if (!supabase || !userId) {
      if (mountedRef.current && profileReqRef.current === reqId) {
        setProfile(null);
      }
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, roll_number, phone, college, branch, role, is_active, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (!mountedRef.current || profileReqRef.current !== reqId) {
      return null;
    }

    if (error || !data) {
      setProfile(null);
      return null;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    const urlSearch = new URLSearchParams(window.location.search);
    const hadOAuthCode = urlSearch.has('code');
    const urlError = urlSearch.get('error_description') || urlSearch.get('error');
    const isRecoveryLink = urlSearch.get('type') === 'recovery' || window.location.hash.includes('type=recovery');

    if (urlError) {
      setAuthError(urlError);
    }
    if (isRecoveryLink) {
      setIsPasswordRecovery(true);
    }

    let initialResolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mountedRef.current) return;

      setSession(nextSession ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        navigate('/signin', { replace: true });
      }

      if (event === 'SIGNED_OUT') {
        profileReqRef.current += 1;
        setProfile(null);
        setIsPasswordRecovery(false);
        setLoading(false);
        return;
      }

      if (nextSession?.user?.id) {
        await loadProfile(nextSession.user.id);
      } else {
        profileReqRef.current += 1;
        setProfile(null);
      }

      if (mountedRef.current && !initialResolved) {
        initialResolved = true;
        setLoading(false);
      }

      if (event === 'SIGNED_IN' && hadOAuthCode && !isRecoveryLink) {
        const storedTarget = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
        sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        if (storedTarget) {
          navigate(sanitizeInternalRedirect(storedTarget), { replace: true });
        }
      }
    });

    // Ensure session initialization resolves cleanly even if auth listener initializes synchronously
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mountedRef.current) return;
      if (error && !urlError) {
        setAuthError(error.message);
      }
      const activeSession = data?.session ?? null;
      if (!initialResolved) {
        setSession(activeSession);
        if (activeSession?.user?.id) {
          await loadProfile(activeSession.user.id);
        }
        if (mountedRef.current) {
          initialResolved = true;
          setLoading(false);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      sub?.subscription?.unsubscribe();
    };
  }, [loadProfile, navigate]);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return null;
    return await loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  const signOut = useCallback(async () => {
    profileReqRef.current += 1;
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
    setIsPasswordRecovery(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      authError,
      isPasswordRecovery,
      clearAuthError,
      clearPasswordRecovery,
      refreshProfile,
      signOut,
    }),
    [loading, session, profile, authError, isPasswordRecovery, clearAuthError, clearPasswordRecovery, refreshProfile, signOut],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
