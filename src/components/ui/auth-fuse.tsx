"use client";

import * as React from "react";
import { useState, useId, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ButtonWithIcon from "./ButtonWithIcon";
import { useAuth } from "../../context/AuthContext";
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

  useEffect(() => {
    if (!currentText) return;

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
  ]);

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
        link: "bg-transparent border-0 text-[#BE00D7] hover:text-[#e070ff] underline-offset-4 hover:underline p-0 h-auto font-medium shadow-none focus-visible:ring-0",
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
          "flex h-11 w-full rounded-lg border border-white/20 bg-[#0d0d10] px-3.5 py-2.5 text-sm text-white shadow-sm transition-colors placeholder:text-white/40 focus-visible:border-[#BE00D7] focus-visible:ring-1 focus-visible:ring-[#BE00D7] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
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
            className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center bg-transparent border-0 text-white/60 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-none"
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

function getRedirectUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/`;
}

function SignInForm({
  onForgotPassword,
  onSuccess,
}: {
  onForgotPassword: () => void;
  onSuccess?: () => void;
}) {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    if (!configured || !supabase) {
      setErrorMsg("Authentication backend is not configured (.env missing Supabase settings).");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErrorMsg(error.message || "Invalid login credentials.");
        return;
      }
      onSuccess?.();
    } catch {
      setErrorMsg("Unable to sign in right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Sign in to your account</h1>
        <p className="text-balance text-sm text-white/60">Enter your email below to sign in</p>
      </div>
      {errorMsg && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {errorMsg}
        </div>
      )}
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-white">Email</Label>
          <Input
            id="email"
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
          autoComplete="current-password"
          placeholder="Password"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="bg-transparent border-0 p-0 text-xs text-[#BE00D7] hover:text-[#e070ff] cursor-pointer"
          >
            Forgot password?
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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
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
      if (error) {
        setErrorMsg(error.message || "Registration failed.");
        return;
      }
      if (data?.user && !data.session) {
        setInfoMsg("Check your inbox and click the verification link before signing in.");
      } else {
        setInfoMsg("Account created and signed in.");
      }
    } catch {
      setErrorMsg("Unable to create account right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} autoComplete="on" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Create an account</h1>
        <p className="text-balance text-sm text-white/60">Enter your details below to sign up</p>
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
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Label htmlFor="name" className="text-white">Full Name</Label>
          <Input
            id="name"
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
          <Label htmlFor="email" className="text-white">Email</Label>
          <Input
            id="email"
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
          minLength={8}
          autoComplete="new-password"
          placeholder="Password (min 8 chars)"
        />
        <div className="mt-2 flex justify-center">
          <ButtonWithIcon type="submit" disabled={submitting} className="w-full justify-between">
            {submitting ? "Creating Account..." : "Sign Up"}
          </ButtonWithIcon>
        </div>
      </div>
    </form>
  );
}

function RecoveryRequestForm({ onBack }: { onBack: () => void }) {
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getRedirectUrl(),
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
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

function UpdatePasswordForm({ onDone }: { onDone: () => void }) {
  const { clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
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
        setErrorMsg(error.message);
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
        <p className="text-balance text-sm text-white/60">Choose a strong new password</p>
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
        minLength={8}
        autoComplete="new-password"
        placeholder="Minimum 8 characters"
      />
      <ButtonWithIcon type="submit" disabled={submitting} className="w-full justify-between">
        {submitting ? "Updating..." : "Update Password"}
      </ButtonWithIcon>
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
  const { configured, isPasswordRecovery } = useAuth();
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

  if (isPasswordRecovery) {
    return (
      <div className="mx-auto grid w-[350px] gap-3">
        <UpdatePasswordForm onDone={() => onAuthSuccess?.()} />
      </div>
    );
  }

  if (showRecovery) {
    return (
      <div className="mx-auto grid w-[350px] gap-3">
        <RecoveryRequestForm onBack={() => setShowRecovery(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-[350px] gap-3">
      {isSignIn ? (
        <SignInForm onForgotPassword={() => setShowRecovery(true)} onSuccess={onAuthSuccess} />
      ) : (
        <SignUpForm />
      )}
      <div className="text-center text-sm text-white/70">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <Button variant="link" className="pl-1 text-[#BE00D7] hover:text-[#e070ff] font-semibold bg-transparent border-0 inline" onClick={onToggle}>
          {isSignIn ? "Sign up" : "Sign in"}
        </Button>
      </div>
      <div className="relative text-center text-sm my-1 after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-white/15">
        <span className="relative z-10 bg-black px-3 text-xs uppercase tracking-wider text-white/50">Or continue with</span>
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
        className="w-full bg-[#111114] border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-medium py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <img src="https://cdn.21st.dev/assets/mirror/38/38146bfd9eff6dbf0d74771f2e625c70d87d3770e0d080dbb6e50db1d5403f46.svg" alt="" aria-hidden="true" className="mr-2 h-4 w-4" />
        <span className="text-white">{oauthLoading ? "Redirecting to Google..." : "Continue with Google"}</span>
      </Button>
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
            <cite className="block text-sm font-semibold tracking-wider text-[#BE00D7] not-italic">
              — {currentContent.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
