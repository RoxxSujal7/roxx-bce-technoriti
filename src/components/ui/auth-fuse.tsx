"use client";

import * as React from "react";
import { useState, useId, useEffect, useRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ButtonWithIcon from "./ButtonWithIcon";
import { PASSWORD_RECOVERY_ORIGIN_KEY, useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);

  const textArray = Array.isArray(text) ? text : [text];
  const currentText = textArray[textArrayIndex] || "";
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!currentText || prefersReducedMotion) return;

    let delayTimeout: ReturnType<typeof setTimeout> | undefined;
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentText.length) {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            delayTimeout = setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % textArray.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed,
    );

    return () => {
      clearTimeout(timeout);
      if (delayTimeout) clearTimeout(delayTimeout);
    };
  }, [
    currentIndex,
    isDeleting,
    currentText,
    loop,
    speed,
    deleteSpeed,
    delay,
    displayText,
    text,
    textArray.length,
    prefersReducedMotion,
  ]);

  if (prefersReducedMotion) {
    return <span className={className}>{currentText}</span>;
  }

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    className={cn(labelVariants(), className)}
    {...props}
    ref={ref}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#BE00D7] text-white hover:bg-[#a000b5] shadow-md shadow-[#BE00D7]/20 border border-transparent font-medium",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-white/20 bg-[#121215] text-white hover:bg-[#BE00D7]/15 hover:border-[#BE00D7] hover:text-white shadow-sm font-medium",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "bg-transparent text-white/80 hover:bg-white/10 hover:text-white",
        link: "bg-transparent border-0 text-[#e879f9] hover:text-[#f5d0fe] underline-offset-4 hover:underline p-0 h-auto font-medium shadow-none focus-visible:ring-2 focus-visible:ring-[#e879f9]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-white/25 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white shadow-sm transition-colors placeholder:text-white/55 focus-visible:border-[#e879f9] focus-visible:ring-2 focus-visible:ring-[#e879f9] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId();
    const [showPassword, setShowPassword] = useState(false);
    const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
    return (
      <div className="grid w-full items-center gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <Input id={id} type={showPassword ? "text" : "password"} className={cn("pe-10", className)} ref={ref} {...props} />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center bg-transparent border-0 text-white/70 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e879f9] rounded-md disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (<EyeOff className="size-4" aria-hidden="true" />) : (<Eye className="size-4" aria-hidden="true" />)}
          </button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export function validateStrongPassword(pw: string): string | null {
  if (pw.length < 12) {
    return "Password must be at least 12 characters long.";
  }
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  if (classes < 3) {
    return "Password must include at least 3 of: uppercase, lowercase, number, and symbol.";
  }
  return null;
}

export function getSafeAuthErrorMessage(err: { message?: string; status?: number } | null | undefined, fallback: string): string {
  const raw = String(err?.message || "").toLowerCase();
  if (raw.includes("rate limit") || err?.status === 429) {
    return "Too many authentication attempts. Please wait a minute and try again.";
  }
  if (raw.includes("invalid login credentials")) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }
  if (raw.includes("email not confirmed")) {
    return "Please verify your email address from your inbox before signing in.";
  }
  if (raw.includes("weak password") || raw.includes("password should be")) {
    return "Please choose a stronger password (minimum 12 characters with mixed characters).";
  }
  if (raw.includes("user already registered") || raw.includes("already been registered")) {
    return "Unable to complete sign up with those credentials. If you already registered, try signing in or resetting your password.";
  }
  return fallback;
}

export function getRedirectUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/`;
}

export function GoogleMarkIcon({ className = "mr-2 h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
    </svg>
  );
}

export function SignInForm({
  onForgotPassword,
  onSuccess,
  heading = "Sign in to your account",
  subtitle = "Enter your email below to sign in",
  emailLabel = "Email",
  emailPlaceholder = "m@example.com",
  forgotLabel = "Forgot password?",
  hideHeader = false,
}: {
  onForgotPassword: () => void;
  onSuccess?: () => void;
  heading?: string;
  subtitle?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  forgotLabel?: string;
  hideHeader?: boolean;
}) {
  const { configured, authError, clearAuthError } = useAuth();
  const emailId = useId();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayError = errorMsg || authError;

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    clearAuthError?.();
    if (!configured || !supabase) {
      setErrorMsg("Authentication backend is not configured (.env missing Supabase settings).");
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg("Enter both email and password.");
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
        setErrorMsg(getSafeAuthErrorMessage(error, "Invalid email or password."));
        return;
      }
      onSuccess?.();
    } catch {
      if (mountedRef.current) {
        setErrorMsg("Unable to sign in right now. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSignIn} autoComplete="on" className="flex flex-col gap-5">
      {!hideHeader && (
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold text-white">{heading}</h1>
          <p className="text-balance text-sm text-white/75">{subtitle}</p>
        </div>
      )}
      {displayError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {displayError}
        </div>
      )}
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor={emailId} className="text-white">{emailLabel}</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPlaceholder}
            required
            autoComplete="email"
          />
        </div>
        <PasswordInput
          name="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Password"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="bg-transparent border-0 p-0 text-xs text-[#e879f9] hover:text-[#f5d0fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e879f9] rounded cursor-pointer"
          >
            {forgotLabel}
          </button>
        </div>
        <div className="mt-1 flex justify-center">
          <ButtonWithIcon type="submit" disabled={submitting} className="w-full justify-between">
            {submitting ? "Signing In..." : "Sign In"}
          </ButtonWithIcon>
        </div>
      </div>
    </form>
  );
}

function SignUpForm() {
  const { configured } = useAuth();
  const fullNameId = useId();
  const emailId = useId();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setInfoMsg(null);
    const pwErr = validateStrongPassword(password);
    if (pwErr) {
      setErrorMsg(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!configured || !supabase) {
      setErrorMsg("Authentication backend is not configured (.env missing Supabase settings).");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: getRedirectUrl(),
        },
      });
      if (!mountedRef.current) return;
      if (error) {
        setErrorMsg(getSafeAuthErrorMessage(error, "Registration could not be completed."));
        return;
      }
      if (data?.user && !data.session) {
        setInfoMsg("Check your inbox and click the verification link before signing in.");
      } else {
        setInfoMsg("Account created and signed in.");
      }
    } catch {
      if (mountedRef.current) {
        setErrorMsg("Unable to create account right now. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSignUp} autoComplete="on" className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Create an account</h1>
        <p className="text-balance text-sm text-white/75">Enter your details below to sign up</p>
      </div>
      {errorMsg && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-xs text-emerald-200">
          {infoMsg}
        </div>
      )}
      <div className="grid gap-3.5">
        <div className="grid gap-1">
          <Label htmlFor={fullNameId} className="text-white">Full Name</Label>
          <Input
            id={fullNameId}
            name="name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
            autoComplete="name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={emailId} className="text-white">Email</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="m@example.com"
            required
            autoComplete="email"
          />
        </div>
        <PasswordInput
          name="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
          autoComplete="new-password"
          placeholder="Minimum 12 characters"
        />
        <PasswordInput
          name="confirm-password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={12}
          autoComplete="new-password"
          placeholder="Re-enter your password"
        />
        <p className="m-0 text-[11px] text-white/75">
          Use at least 12 characters including 3 of: uppercase, lowercase, number, or symbol.
        </p>
        <div className="mt-1 flex justify-center">
          <ButtonWithIcon type="submit" disabled={submitting} className="w-full justify-between">
            {submitting ? "Creating Account..." : "Sign Up"}
          </ButtonWithIcon>
        </div>
      </div>
    </form>
  );
}

export function RecoveryRequestForm({
  onBack,
  originPath,
}: {
  onBack: () => void;
  originPath?: string;
}) {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    if (!configured || !supabase) {
      setErrorMsg("Authentication backend is not configured (.env missing Supabase settings).");
      return;
    }
    setSubmitting(true);
    try {
      if (originPath) {
        try {
          sessionStorage.setItem(PASSWORD_RECOVERY_ORIGIN_KEY, originPath);
        } catch (_) { }
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getRedirectUrl(),
      });
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (error.status === 429 || msg.includes("rate limit")) {
          setErrorMsg("Too many reset requests. Please wait a minute and try again.");
          return;
        }
        if (Number(error.status ?? 0) >= 500 || msg.includes("fetch") || msg.includes("network") || msg.includes("timeout")) {
          setErrorMsg("Recovery service temporarily unavailable. Please try again.");
          return;
        }
        if (error.status === 400 && msg.includes("redirect")) {
          setErrorMsg("Could not initiate password recovery. Check site configuration or try again.");
          return;
        }
      }
      // Non-enumerating confirmation when request succeeded or email was unrecognized
      setStatusMsg("If an account exists for that email, a recovery link has been sent.");
    } catch {
      setErrorMsg("Could not initiate password recovery.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleReset} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Reset password</h1>
        <p className="text-balance text-sm text-white/60">Enter your email for a recovery link</p>
      </div>
      {errorMsg && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-xs text-emerald-200">
          {statusMsg}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="recovery-email" className="text-white">Email</Label>
        <Input
          id="recovery-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="m@example.com"
        />
      </div>
      <ButtonWithIcon type="submit" disabled={submitting} className="w-full justify-between">
        {submitting ? "Sending..." : "Send Recovery Link"}
      </ButtonWithIcon>
      <Button type="button" variant="link" onClick={onBack} className="mx-auto">
        Back to Sign In
      </Button>
    </form>
  );
}

export function UpdatePasswordForm({ onDone }: { onDone: () => void }) {
  const { clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const pwErr = validateStrongPassword(password);
    if (pwErr) {
      setErrorMsg(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!supabase) {
      setErrorMsg("Authentication backend is not configured (.env missing Supabase settings).");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(getSafeAuthErrorMessage(error, "Unable to update password."));
        return;
      }
      setStatusMsg("Password updated successfully.");
      clearPasswordRecovery();
      onDone();
    } catch {
      setErrorMsg("Unable to update password. Please request a new recovery link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Set new password</h1>
        <p className="text-balance text-sm text-white/60">Choose a strong new password (12+ characters)</p>
      </div>
      {errorMsg && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-xs text-emerald-200">
          {statusMsg}
        </div>
      )}
      <PasswordInput
        name="new-password"
        label="New Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={12}
        autoComplete="new-password"
        placeholder="Minimum 12 characters"
      />
      <PasswordInput
        name="confirm-new-password"
        label="Confirm New Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={12}
        autoComplete="new-password"
        placeholder="Re-enter new password"
      />
      <ButtonWithIcon type="submit" disabled={submitting} className="w-full justify-between">
        {submitting ? "Updating..." : "Update Password"}
      </ButtonWithIcon>
    </form>
  );
}

export function MfaChallengeForm({
  onSuccess,
}: {
  onSuccess?: (mfaState?: { currentLevel?: string | null; nextLevel?: string | null }) => void;
}) {
  const { mfaFactors, refreshMfaStatus, signOut } = useAuth();
  const factorSelectId = useId();
  const codeInputId = useId();
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (verifying) return;
    setErrorMsg(null);
    const cleaned = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(cleaned)) {
      setErrorMsg("Enter the 6-digit verification code from your authenticator app.");
      return;
    }
    const factor = mfaFactors?.find((f) => f.id === selectedFactorId) ?? mfaFactors?.[0];
    if (!supabase?.auth?.mfa || !factor?.id) {
      setErrorMsg("MFA factor unavailable. Please sign in again.");
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: cleaned,
      });
      if (error) {
        setErrorMsg("Invalid or expired authenticator code. Please try again.");
        return;
      }
      const mfaState = await refreshMfaStatus();
      onSuccess?.(mfaState);
    } catch {
      setErrorMsg("Unable to verify authenticator code right now.");
    } finally {
      setVerifying(false);
    }
  };

  const currentFactorId =
    mfaFactors?.find((f) => f.id === selectedFactorId)?.id ?? mfaFactors?.[0]?.id ?? "";

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Two-factor verification</h1>
        <p className="text-balance text-sm text-white/75">
          Enter the 6-digit TOTP code from your authenticator app to continue
        </p>
      </div>
      {errorMsg && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {errorMsg}
        </div>
      )}
      {Array.isArray(mfaFactors) && mfaFactors.length > 1 && (
        <div className="grid gap-2">
          <Label htmlFor={factorSelectId} className="text-white">Authenticator Device</Label>
          <select
            id={factorSelectId}
            value={currentFactorId}
            onChange={(e) => setSelectedFactorId(e.target.value)}
            className="h-11 w-full rounded-lg border border-white/25 bg-[#0d0d10] px-3 text-sm text-white focus-visible:border-[#e879f9] focus-visible:ring-2 focus-visible:ring-[#e879f9] focus-visible:outline-none"
          >
            {mfaFactors.map((f: { id: string; friendly_name?: string }, idx: number) => (
              <option key={f.id} value={f.id}>
                {f.friendly_name || `Authenticator ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor={codeInputId} className="text-white">Authenticator Code</Label>
        <Input
          id={codeInputId}
          name="mfa-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
        />
      </div>
      <ButtonWithIcon type="submit" disabled={verifying} className="w-full justify-between">
        {verifying ? "Verifying..." : "Verify & Continue"}
      </ButtonWithIcon>
      <Button type="button" variant="link" onClick={() => signOut()} className="mx-auto">
        Sign out and use another account
      </Button>
    </form>
  );
}

function AuthFormContainer({
  isSignIn,
  onToggle,
  onBeforeOAuth,
  onAuthSuccess,
}: {
  isSignIn: boolean;
  onToggle: () => void;
  onBeforeOAuth?: () => void;
  onAuthSuccess?: () => void;
}) {
  const { configured, isPasswordRecovery, needsMfaChallenge } = useAuth();
  const [showRecovery, setShowRecovery] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    setShowRecovery(false);
    setOauthError(null);
  }, [isSignIn]);

  const handleGoogleSignIn = async () => {
    setOauthError(null);
    if (!configured || !supabase) {
      setOauthError("Authentication backend is not configured (.env missing Supabase settings).");
      return;
    }
    onBeforeOAuth?.();
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl(),
        },
      });
      if (error) {
        setOauthError(error.message || "Google sign-in unavailable.");
        setOauthLoading(false);
      }
    } catch {
      setOauthError("Unable to start Google OAuth flow.");
      setOauthLoading(false);
    }
  };

  if (needsMfaChallenge) {
    return (
      <div className="mx-auto grid w-full max-w-[350px] gap-3">
        <MfaChallengeForm onSuccess={() => onAuthSuccess?.()} />
      </div>
    );
  }

  if (isPasswordRecovery) {
    return (
      <div className="mx-auto grid w-full max-w-[350px] gap-3">
        <UpdatePasswordForm onDone={() => onAuthSuccess?.()} />
      </div>
    );
  }

  if (showRecovery) {
    return (
      <div className="mx-auto grid w-full max-w-[350px] gap-3">
        <RecoveryRequestForm onBack={() => setShowRecovery(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[350px] gap-3">
      {isSignIn ? (
        <SignInForm onForgotPassword={() => setShowRecovery(true)} onSuccess={onAuthSuccess} />
      ) : (
        <SignUpForm />
      )}
      <div className="text-center text-sm text-white/75">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <Button variant="link" className="pl-1 text-[#e879f9] hover:text-[#f5d0fe] font-semibold bg-transparent border-0 inline" onClick={onToggle}>
          {isSignIn ? "Sign up" : "Sign in"}
        </Button>
      </div>
      <div className="relative text-center text-sm my-1 after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-white/20">
        <span className="relative z-10 bg-black px-3 text-xs uppercase tracking-wider text-white/75">Or continue with</span>
      </div>
      {oauthError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {oauthError}
        </div>
      )}
      <Button
        variant="outline"
        type="button"
        disabled={oauthLoading}
        onClick={handleGoogleSignIn}
        className="w-full bg-[#111114] border-white/25 hover:border-white/45 hover:bg-white/5 text-white font-medium py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <GoogleMarkIcon />
        <span className="text-white">{oauthLoading ? "Redirecting to Google..." : "Continue with Google"}</span>
      </Button>
      {isSignIn && (
        <div className="pt-1 text-center text-xs text-white/75">
          Staff or coordinator?{" "}
          <a
            href="#/admin-login"
            className="font-medium text-[#e879f9] hover:text-[#f5d0fe] underline-offset-4 hover:underline"
          >
            Admin Login
          </a>
        </div>
      )}
      <p className="pt-1 text-center text-[11px] text-white/70 m-0">
        By continuing, you acknowledge the{" "}
        <a href="#/policies" className="text-[#e879f9] hover:text-[#f5d0fe] underline underline-offset-2">
          Event Policies &amp; Privacy Notice
        </a>
        .
      </p>
    </div>
  );
}

interface AuthContentProps {
  image?: {
    src: string;
    alt: string;
  };
  quote?: {
    text: string;
    author: string;
  }
}

interface AuthUIProps {
  signInContent?: AuthContentProps;
  signUpContent?: AuthContentProps;
  initialIsSignIn?: boolean;
  onToggleMode?: () => void;
  onBeforeOAuth?: () => void;
  onAuthSuccess?: () => void;
}

const defaultSignInContent = {
  image: {
    src: "/technoriti-signin-background.webp",
    alt: "Technoriti '26 Sign In Showcase"
  },
  quote: {
    text: "Welcome back. Your next challenge awaits.",
    author: "TECHNORITI '26"
  }
};

const defaultSignUpContent = {
  image: {
    src: "/technoriti-signup-background.webp",
    alt: "Technoriti '26 Sign Up Showcase"
  },
  quote: {
    text: "Create your account. Build something extraordinary.",
    author: "TECHNORITI '26"
  }
};

export function AuthUI({
  signInContent = {},
  signUpContent = {},
  initialIsSignIn = true,
  onToggleMode,
  onBeforeOAuth,
  onAuthSuccess,
}: AuthUIProps) {
  const [isSignIn, setIsSignIn] = useState(initialIsSignIn);

  useEffect(() => {
    setIsSignIn(initialIsSignIn);
  }, [initialIsSignIn]);

  const toggleForm = () => {
    if (onToggleMode) {
      onToggleMode();
    } else {
      setIsSignIn((prev) => !prev);
    }
  };

  const finalSignInContent = {
    image: { ...defaultSignInContent.image, ...signInContent.image },
    quote: { ...defaultSignInContent.quote, ...signInContent.quote },
  };
  const finalSignUpContent = {
    image: { ...defaultSignUpContent.image, ...signUpContent.image },
    quote: { ...defaultSignUpContent.quote, ...signUpContent.quote },
  };

  const currentContent = isSignIn ? finalSignInContent : finalSignUpContent;
  const safeBgSrc = currentContent.image.src.replace(/"/g, "%22");

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
      <div className="flex min-h-screen items-center justify-center p-6 md:h-auto md:p-0 md:py-12">
        <AuthFormContainer
          isSignIn={isSignIn}
          onToggle={toggleForm}
          onBeforeOAuth={onBeforeOAuth}
          onAuthSuccess={onAuthSuccess}
        />
      </div>

      <div
        className="hidden md:block relative bg-cover bg-center transition-all duration-500 ease-in-out"
        style={{
          backgroundImage: `url("${safeBgSrc}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
        key={currentContent.image.src}
      >
        <div className="absolute inset-x-0 bottom-0 h-[140px] bg-gradient-to-t from-black via-black/60 to-transparent" />

        <div className="relative z-10 flex h-full flex-col items-center justify-end p-6 pb-10">
          <blockquote className="space-y-3 text-center text-white max-w-lg">
            <p className="text-xl font-medium tracking-wide">
              “<Typewriter
                key={currentContent.quote.text}
                text={currentContent.quote.text}
                speed={50}
              />”
            </p>
            <cite className="block text-sm font-semibold tracking-wider text-[#e879f9] not-italic">
              — {currentContent.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
