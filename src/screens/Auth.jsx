import React, { useEffect } from 'react';
import { AuthUI } from "../components/ui/auth-fuse";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { POST_AUTH_REDIRECT_KEY, sanitizeInternalRedirect, useAuth } from "../context/AuthContext";

const DemoOne = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, isPasswordRecovery, loading } = useAuth();
  const isSignInRoute = location.pathname !== "/signup";

  const params = new URLSearchParams(location.search);
  const safeRedirect = sanitizeInternalRedirect(params.get("redirect") || "/dashboard");

  useEffect(() => {
    if (!loading && session && !isPasswordRecovery) {
      navigate(safeRedirect, { replace: true });
    }
  }, [loading, session, isPasswordRecovery, navigate, safeRedirect]);

  const handleToggleMode = () => {
    const targetPath = isSignInRoute ? "/signup" : "/signin";
    const qs = params.get("redirect") ? `?redirect=${encodeURIComponent(safeRedirect)}` : "";
    navigate(`${targetPath}${qs}`);
  };

  const handleBeforeOAuth = () => {
    try {
      sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, safeRedirect);
    } catch (_) {}
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      {/* Return to Home Brand Link */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        style={{ textDecoration: "none", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}
      >
        <span style={{ fontSize: "1.1rem" }} aria-hidden="true">←</span>
        <span>TECHNORITI '26</span>
      </Link>
      <AuthUI
        initialIsSignIn={isSignInRoute}
        onToggleMode={handleToggleMode}
        onBeforeOAuth={handleBeforeOAuth}
        onAuthSuccess={() => navigate(safeRedirect, { replace: true })}
      />
    </div>
  );
};

export default DemoOne;
export { DemoOne, DemoOne as Auth };
