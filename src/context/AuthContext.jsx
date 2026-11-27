import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export const POST_AUTH_REDIRECT_KEY = 'technoriti_post_auth_redirect';
export const POST_AUTH_ORIGIN_KEY = 'technoriti_post_auth_origin';
export const PASSWORD_RECOVERY_ORIGIN_KEY = 'technoriti_recovery_origin';
const ALLOWED_REDIRECT_PATHS = new Set(['/', '/dashboard', '/register', '/admin', '/admin-login']);

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
  profileLoadError: false,
  mfaLoadError: false,
  authError: null,
  isPasswordRecovery: false,
  aal: { currentLevel: null, nextLevel: null },
  mfaFactors: [],
  needsMfaChallenge: false,
  clearAuthError: () => {},
  clearPasswordRecovery: () => {},
  refreshProfile: async () => null,
  refreshMfaStatus: async () => ({ currentLevel: null, nextLevel: null, factors: [], mfaError: false }),
  signOut: async () => ({ error: null }),
});

function sanitizeAuthCallbackUrl() {
  if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') return;
  const search = new URLSearchParams(window.location.search);
  let changed = false;
  for (const key of ['code', 'error', 'error_code', 'error_description', 'type', 'token_hash']) {
    if (search.has(key)) {
      search.delete(key);
      changed = true;
    }
  }
  if (changed) {
    const qs = search.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const [mfaLoadError, setMfaLoadError] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [aal, setAal] = useState({ currentLevel: null, nextLevel: null });
  const [mfaFactors, setMfaFactors] = useState([]);

  const profileReqRef = useRef(0);
  const mfaReqRef = useRef(0);
  const authEventSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const urlCallbackRef = useRef(null);

  const fetchMfaState = useCallback(async () => {
    if (!supabase?.auth?.mfa) {
      return { currentLevel: null, nextLevel: null, factors: [], mfaError: false };
    }
    try {
      const [aalRes, factorsRes] = await Promise.all([
        typeof supabase.auth.mfa.getAuthenticatorAssuranceLevel === 'function'
          ? supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          : Promise.resolve({ data: null, error: null }),
        typeof supabase.auth.mfa.listFactors === 'function'
          ? supabase.auth.mfa.listFactors()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (aalRes?.error || factorsRes?.error) {
        return { currentLevel: null, nextLevel: null, factors: [], mfaError: true };
      }
      const nextAal = {
        currentLevel: aalRes?.data?.currentLevel ?? null,
        nextLevel: aalRes?.data?.nextLevel ?? null,
      };
      const verifiedTotp = (factorsRes?.data?.totp || []).filter((f) => f.status === 'verified');
      return { ...nextAal, factors: verifiedTotp, mfaError: false };
    } catch {
      return { currentLevel: null, nextLevel: null, factors: [], mfaError: true };
    }
  }, []);

  const loadMfaStatus = useCallback(async () => {
    const reqId = ++mfaReqRef.current;
    const resolved = await fetchMfaState();
    if (!mountedRef.current || mfaReqRef.current !== reqId) {
      return resolved;
    }
    setAal({ currentLevel: resolved.currentLevel, nextLevel: resolved.nextLevel });
    setMfaFactors(resolved.factors);
    setMfaLoadError(Boolean(resolved.mfaError));
    return resolved;
  }, [fetchMfaState]);

  const fetchProfileRecord = useCallback(async (userId, reqId) => {
    if (!supabase || !userId) {
      return { stale: false, profile: null, profileLoadError: false };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, roll_number, phone, college, branch, role, is_active, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (!mountedRef.current || profileReqRef.current !== reqId) {
        return { stale: true, profile: null, profileLoadError: false };
      }

      if (error || !data) {
        return { stale: false, profile: null, profileLoadError: true };
      }
      return { stale: false, profile: data, profileLoadError: false };
    } catch {
      if (!mountedRef.current || profileReqRef.current !== reqId) {
        return { stale: true, profile: null, profileLoadError: false };
      }
      return { stale: false, profile: null, profileLoadError: true };
    }
  }, []);

  const loadProfile = useCallback(async (userId) => {
    const reqId = ++profileReqRef.current;
    const res = await fetchProfileRecord(userId, reqId);
    if (res.stale || !mountedRef.current) return null;
    setProfile(res.profile);
    setProfileLoadError(res.profileLoadError);
    return res.profile;
  }, [fetchProfileRecord]);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return () => {
        active = false;
        mountedRef.current = false;
      };
    }

    if (!urlCallbackRef.current) {
      const urlSearch = new URLSearchParams(window.location.search);
      urlCallbackRef.current = {
        hadOAuthCode: urlSearch.has('code'),
        urlError: urlSearch.get('error_description') || urlSearch.get('error'),
        isRecoveryLink: urlSearch.get('type') === 'recovery' || window.location.hash.includes('type=recovery'),
      };
      sanitizeAuthCallbackUrl();
    }

    const { hadOAuthCode, urlError, isRecoveryLink } = urlCallbackRef.current;

    if (urlError) {
      setAuthError('Authentication could not be completed. Please try signing in again.');
      try {
        const errOrigin = sessionStorage.getItem(POST_AUTH_ORIGIN_KEY);
        sessionStorage.removeItem(POST_AUTH_ORIGIN_KEY);
        sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        if (errOrigin === '/admin-login') {
          navigateRef.current('/admin-login', { replace: true });
        }
      } catch (_) {}
    }
    if (isRecoveryLink) {
      setIsPasswordRecovery(true);
    }

    let initialResolved = false;
    let listenerStarted = false;

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active || !mountedRef.current) return;
      listenerStarted = true;
      const eventSeq = ++authEventSeqRef.current;

      if (event === 'SIGNED_OUT') {
        profileReqRef.current += 1;
        mfaReqRef.current += 1;
        setSession(null);
        setProfile(null);
        setProfileLoadError(false);
        setMfaLoadError(false);
        setAal({ currentLevel: null, nextLevel: null });
        setMfaFactors([]);
        setIsPasswordRecovery(false);
        initialResolved = true;
        setLoading(false);
        return;
      }

      const isRecoveryEvent = event === 'PASSWORD_RECOVERY';
      let mfaState = { currentLevel: null, nextLevel: null, factors: [], mfaError: false };
      let shouldResolveLoading = false;

      try {
        if (nextSession?.user?.id) {
          const reqId = ++profileReqRef.current;
          const mfaId = ++mfaReqRef.current;
          const [profRes, resolvedMfa] = await Promise.all([
            fetchProfileRecord(nextSession.user.id, reqId),
            fetchMfaState(),
          ]);
          if (!active || !mountedRef.current || profRes.stale || mfaReqRef.current !== mfaId || authEventSeqRef.current !== eventSeq) {
            return;
          }
          mfaState = resolvedMfa;
          setSession(nextSession);
          setProfile(profRes.profile);
          setProfileLoadError(profRes.profileLoadError);
          setMfaLoadError(Boolean(resolvedMfa.mfaError));
          setAal({ currentLevel: resolvedMfa.currentLevel, nextLevel: resolvedMfa.nextLevel });
          setMfaFactors(resolvedMfa.factors);
          shouldResolveLoading = true;
        } else {
          profileReqRef.current += 1;
          mfaReqRef.current += 1;
          setSession(null);
          setProfile(null);
          setProfileLoadError(false);
          setMfaLoadError(false);
          setAal({ currentLevel: null, nextLevel: null });
          setMfaFactors([]);
          shouldResolveLoading = true;
        }
      } catch {
        if (!active || !mountedRef.current || authEventSeqRef.current !== eventSeq) return;
        setProfile(null);
        setProfileLoadError(true);
        setMfaLoadError(true);
        shouldResolveLoading = true;
      } finally {
        if (shouldResolveLoading && active && mountedRef.current && !initialResolved) {
          initialResolved = true;
          setLoading(false);
        }
      }

      if (isRecoveryEvent) {
        setIsPasswordRecovery(true);
        let recoveryTarget = '/signin';
        try {
          const storedRecoveryOrigin = sessionStorage.getItem(PASSWORD_RECOVERY_ORIGIN_KEY);
          sessionStorage.removeItem(PASSWORD_RECOVERY_ORIGIN_KEY);
          if (storedRecoveryOrigin === '/admin-login' || window.location.hash.includes('/admin-login')) {
            recoveryTarget = '/admin-login';
          }
        } catch (_) {}
        navigateRef.current(recoveryTarget, { replace: true });
      }

      if (event === 'SIGNED_IN' && hadOAuthCode && !isRecoveryLink) {
        urlCallbackRef.current.hadOAuthCode = false;
        let storedTarget = null;
        let storedOrigin = null;
        try {
          storedTarget = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
          storedOrigin = sessionStorage.getItem(POST_AUTH_ORIGIN_KEY);
        } catch (_) {}

        if (mfaState.mfaError || (mfaState.nextLevel === 'aal2' && mfaState.currentLevel !== 'aal2')) {
          const isAdminOrigin = storedOrigin === '/admin-login' || storedTarget === '/admin' || storedTarget === '/admin-login';
          navigateRef.current(isAdminOrigin ? '/admin-login' : '/signin', { replace: true });
          return;
        }
        try {
          sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
          sessionStorage.removeItem(POST_AUTH_ORIGIN_KEY);
        } catch (_) {}
        if (storedTarget) {
          navigateRef.current(sanitizeInternalRedirect(storedTarget), { replace: true });
        }
      }
    });

    // Fallback initialization if listener doesn't fire synchronously; never overrides an active listener event
    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!active || !mountedRef.current || listenerStarted || initialResolved) return;
        if (error && !urlError) {
          setAuthError(error.message);
        }
        const activeSession = data?.session ?? null;
        if (activeSession?.user?.id) {
          const reqId = ++profileReqRef.current;
          const mfaId = ++mfaReqRef.current;
          const [profRes, resolvedMfa] = await Promise.all([
            fetchProfileRecord(activeSession.user.id, reqId),
            fetchMfaState(),
          ]);
          if (!active || !mountedRef.current || listenerStarted || initialResolved || profRes.stale || mfaReqRef.current !== mfaId) {
            return;
          }
          setSession(activeSession);
          setProfile(profRes.profile);
          setProfileLoadError(profRes.profileLoadError);
          setMfaLoadError(Boolean(resolvedMfa.mfaError));
          setAal({ currentLevel: resolvedMfa.currentLevel, nextLevel: resolvedMfa.nextLevel });
          setMfaFactors(resolvedMfa.factors);
        } else {
          setSession(null);
          setMfaLoadError(false);
        }
        if (active && mountedRef.current && !initialResolved) {
          initialResolved = true;
          setLoading(false);
        }
      })
      .catch(() => {
        if (active && mountedRef.current && !initialResolved) {
          initialResolved = true;
          setLoading(false);
        }
      });

    return () => {
      active = false;
      mountedRef.current = false;
      sub?.subscription?.unsubscribe();
    };
  }, [fetchProfileRecord, fetchMfaState]);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return null;
    return await loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  const signOut = useCallback(async () => {
    profileReqRef.current += 1;
    mfaReqRef.current += 1;
    let signOutErr = null;
    try {
      if (supabase) {
        const res = await supabase.auth.signOut();
        if (res?.error) {
          signOutErr = res.error;
        }
      }
    } catch (err) {
      signOutErr = err;
    } finally {
      if (mountedRef.current) {
        setSession(null);
        setProfile(null);
        setProfileLoadError(false);
        setMfaLoadError(false);
        setAuthError(null);
        setAal({ currentLevel: null, nextLevel: null });
        setMfaFactors([]);
        setIsPasswordRecovery(false);
      }
    }
    return { error: signOutErr };
  }, []);

  const needsMfaChallenge = Boolean(
    session &&
    aal.nextLevel === 'aal2' &&
    aal.currentLevel !== 'aal2',
  );

  const contextValue = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      profileLoadError,
      mfaLoadError,
      authError,
      isPasswordRecovery,
      aal,
      mfaFactors,
      needsMfaChallenge,
      clearAuthError,
      clearPasswordRecovery,
      refreshProfile,
      refreshMfaStatus: loadMfaStatus,
      signOut,
    }),
    [loading, session, profile, profileLoadError, mfaLoadError, authError, isPasswordRecovery, aal, mfaFactors, needsMfaChallenge, clearAuthError, clearPasswordRecovery, refreshProfile, loadMfaStatus, signOut],
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
