import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  GoogleMarkIcon,
  getRedirectUrl,
  getSafeAuthErrorMessage,
  validateStrongPassword,
} from './auth-fuse';
import {
  PASSWORD_RECOVERY_ORIGIN_KEY,
  POST_AUTH_ORIGIN_KEY,
  POST_AUTH_REDIRECT_KEY,
  useAuth,
} from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '../../lib/utils';
import './neural-access-login.scss';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MERCURY_BLOBS = [
  { size: 310, left: 12, top: 14, animationDelay: -3, animationDuration: 18 },
  { size: 220, left: 68, top: 18, animationDelay: -11, animationDuration: 23 },
  { size: 280, left: 32, top: 58, animationDelay: -7, animationDuration: 21 },
  { size: 195, left: 76, top: 64, animationDelay: -15, animationDuration: 19 },
  { size: 250, left: 18, top: 76, animationDelay: -5, animationDuration: 25 },
  { size: 330, left: 54, top: 42, animationDelay: -17, animationDuration: 27 },
] as const;

export interface NeuralAccessLoginProps {
  isActiveStaff: boolean;
  onMfaVerified?: (mfaState?: { currentLevel?: string | null; nextLevel?: string | null }) => void;
  onPasswordUpdated?: () => void;
  className?: string;
}

function MercuryNotice({
  id,
  variant = 'info',
  title,
  children,
}: {
  id?: string;
  variant?: 'error' | 'status' | 'info';
  title?: string;
  children: React.ReactNode;
}) {
  const roleAttr = variant === 'error' ? 'alert' : 'status';
  const Icon = variant === 'error' ? ShieldAlert : variant === 'status' ? ShieldCheck : Lock;

  return (
    <div
      id={id}
      role={roleAttr}
      className={cn(
        'mercury-notice',
        variant === 'error' && 'mercury-notice-error',
        variant === 'status' && 'mercury-notice-status',
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#e0e0e0]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <div className="mercury-notice-title">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

function MercurySubmitButton({
  label,
  loadingLabel,
  disabled,
  gooeyId,
}: {
  label: string;
  loadingLabel?: string;
  disabled?: boolean;
  gooeyId: string;
}) {
  return (
    <div className="mercury-submit-wrap">
      <span className="mercury-goo-layer" style={{ filter: `url(#${gooeyId})` }} aria-hidden="true">
        <span className="mercury-drop" />
      </span>
      <button type="submit" disabled={disabled} className="mercury-btn-base">
        {disabled && loadingLabel ? loadingLabel : label}
      </button>
    </div>
  );
}

export const NeuralAccessLogin: React.FC<NeuralAccessLoginProps> = ({
  isActiveStaff,
  onMfaVerified,
  onPasswordUpdated,
  className,
}) => {
  const {
    configured,
    loading,
    session,
    profile,
    profileLoadError,
    mfaLoadError,
    authError,
    isPasswordRecovery,
    needsMfaChallenge,
    mfaFactors,
    clearAuthError,
    clearPasswordRecovery,
    refreshMfaStatus,
    signOut,
  } = useAuth();

  const rawId = useId();
  const gooeyId = useMemo(() => `mercury-gooey-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const identityInputId = `${gooeyId}-identity`;
  const keyInputId = `${gooeyId}-key`;
  const loginErrorId = `${gooeyId}-login-error`;
  const mfaInputId = `${gooeyId}-mfa`;
  const mfaFactorSelectId = `${gooeyId}-mfa-factor`;
  const mfaErrorId = `${gooeyId}-mfa-error`;
  const recoveryEmailId = `${gooeyId}-recovery-email`;
  const recoveryMsgId = `${gooeyId}-recovery-msg`;
  const newPasswordId = `${gooeyId}-new-password`;
  const confirmPasswordId = `${gooeyId}-confirm-password`;
  const passwordPolicyHintId = `${gooeyId}-pw-hint`;
  const updateErrorId = `${gooeyId}-update-error`;

  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mountedRef = useRef(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Google OAuth state
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Recovery request state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Recovery password update state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // MFA challenge state
  const [mfaCode, setMfaCode] = useState('');
  const [selectedFactorId, setSelectedFactorId] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const rmQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const coarseQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)')
        : null;

    let rafId: number | null = null;
    let latestX = 0;
    let latestY = 0;
    let listening = false;

    const resetParallax = () => {
      blobRefs.current.forEach((blob) => {
        if (blob) {
          blob.style.marginLeft = '';
          blob.style.marginTop = '';
        }
      });
    };

    const applyParallax = () => {
      rafId = null;
      blobRefs.current.forEach((blob, index) => {
        if (blob) {
          const speed = (index + 1) * 20;
          blob.style.marginLeft = `${latestX * speed}px`;
          blob.style.marginTop = `${latestY * speed}px`;
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      latestX = e.clientX / vw;
      latestY = e.clientY / vh;

      if (rafId === null) {
        rafId = window.requestAnimationFrame(applyParallax);
      }
    };

    const syncListener = () => {
      const disabled = Boolean(rmQuery?.matches || coarseQuery?.matches);
      if (disabled && listening) {
        document.removeEventListener('mousemove', handleMouseMove);
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
        resetParallax();
        listening = false;
      } else if (!disabled && !listening) {
        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        listening = true;
      }
    };

    syncListener();
    rmQuery?.addEventListener?.('change', syncListener);
    coarseQuery?.addEventListener?.('change', syncListener);

    return () => {
      if (listening) {
        document.removeEventListener('mousemove', handleMouseMove);
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rmQuery?.removeEventListener?.('change', syncListener);
      coarseQuery?.removeEventListener?.('change', syncListener);
    };
  }, []);

  const clearSensitiveFields = () => {
    setPassword('');
    setShowPassword(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setMfaCode('');
    setSelectedFactorId('');
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setLoginError(null);
    setOauthError(null);
    clearAuthError?.();

    if (!configured || !supabase) {
      setLoginError('Authentication backend is not configured (.env missing Supabase settings).');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
      setLoginError('Enter a valid administrator email address.');
      return;
    }
    if (!password) {
      setLoginError('Enter your password sequence key.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (!mountedRef.current) return;
      if (error) {
        setLoginError(getSafeAuthErrorMessage(error, 'Invalid email or password.'));
      } else {
        setPassword('');
        setShowPassword(false);
      }
    } catch {
      if (mountedRef.current) {
        setLoginError('Unable to sign in right now. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (oauthLoading) return;
    setOauthError(null);
    setLoginError(null);
    clearAuthError?.();

    if (!configured || !supabase) {
      setOauthError('Authentication backend is not configured (.env missing Supabase settings).');
      return;
    }

    const clearOAuthKeys = () => {
      try {
        sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        sessionStorage.removeItem(POST_AUTH_ORIGIN_KEY);
      } catch (_) {}
    };

    try {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, '/admin');
      sessionStorage.setItem(POST_AUTH_ORIGIN_KEY, '/admin-login');
    } catch (_) {}

    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
        },
      });
      if (error && mountedRef.current) {
        clearOAuthKeys();
        setOauthError('Google authentication could not be started. Please try again.');
        setOauthLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        clearOAuthKeys();
        setOauthError('Unable to start Google OAuth flow.');
        setOauthLoading(false);
      }
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (recoverySubmitting) return;
    setRecoveryError(null);
    setRecoveryStatus(null);

    if (!configured || !supabase) {
      setRecoveryError('Authentication backend is not configured (.env missing Supabase settings).');
      return;
    }

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
      setRecoveryError('Enter a valid administrator email address.');
      return;
    }

    setRecoverySubmitting(true);
    try {
      try {
        sessionStorage.setItem(PASSWORD_RECOVERY_ORIGIN_KEY, '/admin-login');
      } catch (_) {}
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: getRedirectUrl(),
      });
      if (!mountedRef.current) return;
      if (error && (error.status === 429 || String(error.message || '').toLowerCase().includes('rate limit'))) {
        setRecoveryError('Too many reset requests. Please wait a minute and try again.');
        return;
      }
      setRecoveryStatus('If an account exists for that email, a recovery link has been sent.');
    } catch {
      if (mountedRef.current) {
        setRecoveryError('Could not initiate password recovery.');
      }
    } finally {
      if (mountedRef.current) {
        setRecoverySubmitting(false);
      }
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (updateSubmitting) return;
    setUpdateError(null);
    setUpdateStatus(null);

    const pwErr = validateStrongPassword(newPassword);
    if (pwErr) {
      setUpdateError(pwErr);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setUpdateError('Passwords do not match.');
      return;
    }
    if (!supabase) {
      setUpdateError('Authentication backend is not configured (.env missing Supabase settings).');
      return;
    }

    setUpdateSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (!mountedRef.current) return;
      if (error) {
        setUpdateError(getSafeAuthErrorMessage(error, 'Unable to update password.'));
        return;
      }
      setUpdateStatus('Password updated successfully.');
      clearSensitiveFields();
      clearPasswordRecovery();
      onPasswordUpdated?.();
    } catch {
      if (mountedRef.current) {
        setUpdateError('Unable to update password. Please request a new recovery link.');
      }
    } finally {
      if (mountedRef.current) {
        setUpdateSubmitting(false);
      }
    }
  };

  const handleMfaVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mfaVerifying) return;
    setMfaError(null);

    const cleaned = mfaCode.replace(/\D/g, '');
    if (!/^\d{6}$/.test(cleaned)) {
      setMfaError('Enter the 6-digit verification code from your authenticator app.');
      return;
    }
    const factor = mfaFactors?.find((f) => f.id === selectedFactorId) ?? mfaFactors?.[0];
    if (!supabase?.auth?.mfa || !factor?.id) {
      setMfaError('MFA factor unavailable. Please sign in again.');
      return;
    }

    setMfaVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: cleaned,
      });
      if (!mountedRef.current) return;
      if (error) {
        setMfaError('Invalid or expired authenticator code. Please try again.');
        return;
      }
      setMfaCode('');
      const mfaState = await refreshMfaStatus();
      if (!mountedRef.current) return;
      onMfaVerified?.(mfaState);
    } catch {
      if (mountedRef.current) {
        setMfaError('Unable to verify authenticator code right now.');
      }
    } finally {
      if (mountedRef.current) {
        setMfaVerifying(false);
      }
    }
  };

  const handleSignOut = async () => {
    clearSensitiveFields();
    setLoginError(null);
    setOauthError(null);
    setMfaError(null);
    await signOut();
  };

  const renderBody = () => {
    if (!configured) {
      return (
        <MercuryNotice variant="info" title="Backend Not Configured">
          Configure <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code>{' '}
          to authenticate administrative accounts.
        </MercuryNotice>
      );
    }

    if (loading || (session && !profile && !profileLoadError)) {
      return (
        <div role="status" className="py-6 text-center">
          <div className="mercury-spinner" aria-hidden="true" />
          <p className="m-0 text-sm font-semibold tracking-wide text-white">
            Verifying administrative privileges...
          </p>
          <p className="mt-2 text-xs text-white/75">
            Checking authenticated session, server profile, and AAL2 status.
          </p>
        </div>
      );
    }

    // MFA Challenge takes strict precedence before recovery or dashboard entry
    if (session && needsMfaChallenge) {
      const currentFactorId =
        mfaFactors?.find((f) => f.id === selectedFactorId)?.id ?? mfaFactors?.[0]?.id ?? '';
      return (
        <form onSubmit={handleMfaVerify} noValidate>
          <div className="mb-6">
            <h2 className="m-0 text-lg font-bold tracking-tight text-white">
              Two-factor verification
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/75">
              Enter the 6-digit TOTP code from your authenticator app to elevate this session to AAL2.
            </p>
          </div>

          {mfaError && <MercuryNotice id={mfaErrorId} variant="error">{mfaError}</MercuryNotice>}

          {Array.isArray(mfaFactors) && mfaFactors.length > 1 && (
            <div className="mercury-form-group">
              <label htmlFor={mfaFactorSelectId}>Authenticator Device</label>
              <select
                id={mfaFactorSelectId}
                className="mercury-select"
                value={currentFactorId}
                onChange={(e) => setSelectedFactorId(e.target.value)}
              >
                {mfaFactors.map((f, idx) => (
                  <option key={f.id} value={f.id}>
                    {f.friendly_name || `Authenticator ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mercury-form-group">
            <label htmlFor={mfaInputId}>Authenticator Code</label>
            <div className="mercury-input-wrap">
              <input
                id={mfaInputId}
                name="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                className="mercury-input tracking-[0.35em]"
                placeholder="123456"
                aria-invalid={Boolean(mfaError)}
                aria-describedby={mfaError ? mfaErrorId : undefined}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            <div className="mercury-input-glow" aria-hidden="true" />
          </div>

          <MercurySubmitButton
            label="Verify & Continue"
            loadingLabel="Verifying..."
            disabled={mfaVerifying}
            gooeyId={gooeyId}
          />

          <div className="mercury-footer-nav">
            <button
              type="button"
              onClick={handleSignOut}
              className="mercury-footer-action"
            >
              Sign out and use another account
            </button>
          </div>
        </form>
      );
    }

    if (session && isPasswordRecovery) {
      return (
        <form onSubmit={handleUpdatePassword} noValidate>
          <div className="mb-6">
            <h2 className="m-0 text-lg font-bold tracking-tight text-white">Set new password</h2>
            <p className="mt-1 text-xs text-white/75">
              Choose a strong password to complete account recovery.
            </p>
          </div>

          {updateError && <MercuryNotice id={updateErrorId} variant="error">{updateError}</MercuryNotice>}
          {updateStatus && <MercuryNotice variant="status">{updateStatus}</MercuryNotice>}

          <div className="mercury-form-group">
            <label htmlFor={newPasswordId}>New Password</label>
            <div className="mercury-input-wrap">
              <input
                id={newPasswordId}
                name="new-password"
                type={showNewPassword ? 'text' : 'password'}
                className="mercury-input mercury-input-has-toggle"
                placeholder="Minimum 12 characters"
                minLength={12}
                autoComplete="new-password"
                aria-invalid={Boolean(updateError)}
                aria-describedby={updateError ? `${passwordPolicyHintId} ${updateErrorId}` : passwordPolicyHintId}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="mercury-toggle-visibility"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <div className="mercury-input-glow" aria-hidden="true" />
            <p id={passwordPolicyHintId} className="mercury-hint">
              Minimum 12 characters including at least 3 of: uppercase, lowercase, number, symbol.
            </p>
          </div>

          <div className="mercury-form-group">
            <label htmlFor={confirmPasswordId}>Confirm New Password</label>
            <div className="mercury-input-wrap">
              <input
                id={confirmPasswordId}
                name="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                className="mercury-input mercury-input-has-toggle"
                placeholder="Re-enter new password"
                minLength={12}
                autoComplete="new-password"
                aria-invalid={Boolean(updateError)}
                aria-describedby={updateError ? updateErrorId : undefined}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="mercury-toggle-visibility"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <div className="mercury-input-glow" aria-hidden="true" />
          </div>

          <MercurySubmitButton
            label="Update Password"
            loadingLabel="Updating..."
            disabled={updateSubmitting}
            gooeyId={gooeyId}
          />
        </form>
      );
    }

    if (session && (mfaLoadError || (profileLoadError && !profile))) {
      return (
        <div className="space-y-4">
          <MercuryNotice variant="error" title="Unable to Verify Account">
            You do not have permission to access the Admin Portal. Account authorization or MFA state could not be verified.
          </MercuryNotice>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleSignOut} className="mercury-secondary-btn">
              Sign Out
            </button>
            <Link to="/" className="mercury-secondary-btn">
              Return Home
            </Link>
          </div>
        </div>
      );
    }

    if (session && !isActiveStaff) {
      const deactivated = profile?.is_active === false;
      return (
        <div className="space-y-4">
          <MercuryNotice variant="error" title="Access Denied">
            You do not have permission to access the Admin Portal.
            {deactivated && ' This staff account is currently deactivated.'}
          </MercuryNotice>
          <div className="flex flex-col gap-3">
            {!deactivated && (
              <Link to="/dashboard" className="mercury-secondary-btn">
                Go to Participant Dashboard
              </Link>
            )}
            <button type="button" onClick={handleSignOut} className="mercury-secondary-btn">
              Sign Out &amp; Use Another Account
            </button>
          </div>
        </div>
      );
    }

    if (showRecovery) {
      return (
        <form onSubmit={handleRecoverySubmit} noValidate>
          <div className="mb-6">
            <h2 className="m-0 text-lg font-bold tracking-tight text-white">
              Encrypted Recovery
            </h2>
            <p className="mt-1 text-xs text-white/75">
              Enter your administrator email address to receive a recovery link.
            </p>
          </div>

          {recoveryError && <MercuryNotice id={recoveryMsgId} variant="error">{recoveryError}</MercuryNotice>}
          {recoveryStatus && <MercuryNotice id={recoveryMsgId} variant="status">{recoveryStatus}</MercuryNotice>}

          <div className="mercury-form-group">
            <label htmlFor={recoveryEmailId}>Administrator Email</label>
            <div className="mercury-input-wrap">
              <input
                id={recoveryEmailId}
                name="recovery-email"
                type="email"
                className="mercury-input"
                placeholder="staff@bcebhagalpur.ac.in"
                autoComplete="email"
                aria-invalid={Boolean(recoveryError)}
                aria-describedby={recoveryError || recoveryStatus ? recoveryMsgId : undefined}
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                required
              />
            </div>
            <div className="mercury-input-glow" aria-hidden="true" />
          </div>

          <MercurySubmitButton
            label="Send Recovery Link"
            loadingLabel="Transmitting..."
            disabled={recoverySubmitting}
            gooeyId={gooeyId}
          />

          <div className="mercury-footer-nav">
            <button
              type="button"
              onClick={() => {
                setRecoveryError(null);
                setRecoveryStatus(null);
                setShowRecovery(false);
              }}
              className="mercury-footer-action"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      );
    }

    const activeError = loginError || authError;

    return (
      <>
        <form onSubmit={handleSignIn} autoComplete="on" noValidate>
          {activeError && <MercuryNotice id={loginErrorId} variant="error">{activeError}</MercuryNotice>}
          {oauthError && <MercuryNotice variant="error">{oauthError}</MercuryNotice>}

          <div className="mercury-form-group">
            <label htmlFor={identityInputId}>User Identity</label>
            <div className="mercury-input-wrap">
              <input
                id={identityInputId}
                name="email"
                type="email"
                className="mercury-input"
                placeholder="staff@bcebhagalpur.ac.in"
                autoComplete="email"
                aria-invalid={Boolean(activeError)}
                aria-describedby={activeError ? loginErrorId : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mercury-input-glow" aria-hidden="true" />
          </div>

          <div className="mercury-form-group">
            <label htmlFor={keyInputId}>Sequence Key</label>
            <div className="mercury-input-wrap">
              <input
                id={keyInputId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="mercury-input mercury-input-has-toggle"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={Boolean(activeError)}
                aria-describedby={activeError ? loginErrorId : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="mercury-toggle-visibility"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="mercury-input-glow" aria-hidden="true" />
          </div>

          <MercurySubmitButton
            label="Initialize Stream"
            loadingLabel="Authenticating..."
            disabled={submitting}
            gooeyId={gooeyId}
          />
        </form>

        <div className="mercury-divider" aria-hidden="true">
          OR
        </div>

        <button
          type="button"
          disabled={oauthLoading || submitting}
          onClick={handleGoogleSignIn}
          className="mercury-oauth-btn"
        >
          <GoogleMarkIcon className="h-4 w-4 shrink-0" />
          <span>{oauthLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
        </button>

        <nav className="mercury-footer-nav" aria-label="Admin login actions">
          <button
            type="button"
            onClick={() => {
              setLoginError(null);
              setOauthError(null);
              setShowRecovery(true);
            }}
            className="mercury-footer-action"
          >
            ENCRYPTED RECOVERY
          </button>
          <Link to="/signin" className="mercury-footer-action">
            PARTICIPANT SIGN IN
          </Link>
        </nav>
      </>
    );
  };

  return (
    <div className={cn('mercury-neural-wrapper', className)}>
      <svg className="mercury-svg-filter-hidden" aria-hidden="true" focusable="false">
        <defs>
          <filter id={gooeyId} data-testid="mercury-gooey-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        className="mercury-stage"
        data-testid="mercury-stage"
        style={{ filter: `url(#${gooeyId})` }}
        aria-hidden="true"
      >
        {MERCURY_BLOBS.map((data, index) => (
          <div
            key={index}
            ref={(el) => {
              blobRefs.current[index] = el;
            }}
            data-testid="mercury-blob"
            className="mercury-blob"
            style={{
              width: `${data.size}px`,
              height: `${data.size}px`,
              left: `${data.left}%`,
              top: `${data.top}%`,
              animationDelay: `${data.animationDelay}s`,
              animationDuration: `${data.animationDuration}s`,
            }}
          />
        ))}
      </div>

      <div className="mercury-topbar">
        <Link to="/" className="mercury-topbar-link">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Website</span>
        </Link>
        <span className="mercury-brand-id m-0">TECHNORITI &apos;26 // ADMIN PORTAL</span>
      </div>

      <div className="mercury-center-stage">
        <main className="mercury-auth-container" aria-labelledby={`${gooeyId}-heading`}>
          <header className="mercury-header">
            <span className="mercury-brand-id">System Node: 0x992</span>
            <h1 id={`${gooeyId}-heading`}>
              NEURAL
              <br />
              ACCESS
            </h1>
            <p className="mercury-subtitle">
              Admin Portal · Server-enforced Supabase Auth &amp; TOTP AAL2
            </p>
          </header>

          {renderBody()}
        </main>
      </div>

      <footer className="mercury-bottom-bar">
        BCE Bhagalpur · Authorized Staff &amp; Coordinators Only · PostgreSQL RLS Protected
      </footer>
    </div>
  );
};

export default NeuralAccessLogin;
