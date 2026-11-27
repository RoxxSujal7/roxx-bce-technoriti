import { errorResponse, logSecurityEvent } from "./http.ts";

export type UserRole = "super_admin" | "admin" | "coordinator" | "participant";

export interface AuthenticatedActor {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  aal?: "aal1" | "aal2";
  hasVerifiedMfaFactor?: boolean;
  enforcePrivilegedMfa?: boolean;
}

export interface AuthLookup {
  getUserByToken(token: string): Promise<{
    id: string;
    email?: string;
    aal?: "aal1" | "aal2";
    hasVerifiedMfaFactor?: boolean;
    enforcePrivilegedMfa?: boolean;
  } | null>;
  getProfileById(id: string): Promise<AuthenticatedActor | null>;
}

function decodeValidatedJwtAal(token: string): "aal1" | "aal2" | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return undefined;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { aal?: unknown };
    if (payload.aal === "aal1" || payload.aal === "aal2") {
      return payload.aal;
    }
  } catch {
    // Ignore malformed payload after token check
  }
  return undefined;
}

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1].trim() : null;
}

export class AuthBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthBackendError";
  }
}

export async function authenticateRequest(
  req: Request,
  lookup: AuthLookup,
  corsHeaders: Record<string, string>,
): Promise<{ ok: true; actor: AuthenticatedActor } | { ok: false; response: Response }> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: errorResponse(401, "UNAUTHORIZED", "Authentication required.", corsHeaders),
    };
  }

  let user: Awaited<ReturnType<AuthLookup["getUserByToken"]>>;
  try {
    user = await lookup.getUserByToken(token);
  } catch (err) {
    logSecurityEvent("auth_backend_lookup_failed", {
      stage: "getUserByToken",
      reason: err instanceof Error ? err.message : "unknown",
    });
    return {
      ok: false,
      response: errorResponse(503, "AUTH_UNAVAILABLE", "Authentication service temporarily unavailable.", corsHeaders),
    };
  }

  if (!user || !user.id) {
    logSecurityEvent("auth_invalid_token");
    return {
      ok: false,
      response: errorResponse(401, "INVALID_TOKEN", "Invalid or expired session.", corsHeaders),
    };
  }

  let profile: AuthenticatedActor | null;
  try {
    profile = await lookup.getProfileById(user.id);
  } catch (err) {
    logSecurityEvent("auth_backend_lookup_failed", {
      stage: "getProfileById",
      userId: user.id,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return {
      ok: false,
      response: errorResponse(503, "AUTH_UNAVAILABLE", "Profile store temporarily unavailable.", corsHeaders),
    };
  }

  if (!profile) {
    logSecurityEvent("auth_missing_profile", { userId: user.id });
    return {
      ok: false,
      response: errorResponse(403, "PROFILE_NOT_FOUND", "Account profile unavailable.", corsHeaders),
    };
  }

  if (!profile.is_active) {
    logSecurityEvent("auth_deactivated_account_blocked", { userId: profile.id, role: profile.role });
    return {
      ok: false,
      response: errorResponse(403, "ACCOUNT_DISABLED", "Account access has been deactivated.", corsHeaders),
    };
  }

  return {
    ok: true,
    actor: {
      ...profile,
      aal: user.aal ?? profile.aal,
      hasVerifiedMfaFactor: user.hasVerifiedMfaFactor ?? profile.hasVerifiedMfaFactor,
      enforcePrivilegedMfa: user.enforcePrivilegedMfa ?? profile.enforcePrivilegedMfa,
    },
  };
}

export function requireRole(
  actor: AuthenticatedActor,
  allowedRoles: UserRole[],
  corsHeaders: Record<string, string>,
): Response | null {
  if (!allowedRoles.includes(actor.role)) {
    logSecurityEvent("rbac_denied", { userId: actor.id, actorRole: actor.role, required: allowedRoles });
    return errorResponse(403, "FORBIDDEN", "You do not have permission to perform this action.", corsHeaders);
  }
  return null;
}

export function requirePrivilegedMfa(
  actor: AuthenticatedActor,
  corsHeaders: Record<string, string>,
): Response | null {
  if (!["super_admin", "admin", "coordinator"].includes(actor.role)) {
    return null;
  }
  const strictMode = Deno.env.get("ENFORCE_PRIVILEGED_MFA") === "true" || actor.enforcePrivilegedMfa === true;
  if (actor.hasVerifiedMfaFactor && actor.aal !== "aal2") {
    logSecurityEvent("mfa_aal2_required", { userId: actor.id, role: actor.role, reason: "enrolled_factor_unverified" });
    return errorResponse(403, "MFA_REQUIRED", "Multi-factor authentication verification (AAL2) is required.", corsHeaders);
  }
  if (strictMode && (actor.role === "super_admin" || actor.role === "admin") && (!actor.hasVerifiedMfaFactor || actor.aal !== "aal2")) {
    logSecurityEvent("mfa_aal2_required", { userId: actor.id, role: actor.role, reason: "strict_policy" });
    return errorResponse(403, "MFA_REQUIRED", "Privileged accounts must enable and verify TOTP MFA.", corsHeaders);
  }
  return null;
}

const INTERACTIVE_MFA_FACTOR_TYPES = new Set(["totp", "webauthn", "phone"]);

// deno-lint-ignore no-explicit-any
export function createSupabaseAuthLookup(adminClient: any): AuthLookup {
  return {
    async getUserByToken(token: string) {
      const { data, error } = await adminClient.auth.getUser(token);
      if (error) {
        const status = Number((error as { status?: unknown }).status ?? 0);
        const name = String((error as { name?: unknown }).name ?? "");
        if (status >= 500 || name === "AuthRetryableFetchError") {
          throw new AuthBackendError(`GoTrue getUser error (${status || name})`);
        }
        return null;
      }
      if (!data?.user) return null;
      let hasVerifiedMfaFactor = false;
      if (Array.isArray(data.user.factors)) {
        hasVerifiedMfaFactor = data.user.factors.some(
          // deno-lint-ignore no-explicit-any
          (f: any) => f && f.status === "verified" && INTERACTIVE_MFA_FACTOR_TYPES.has(String(f.factor_type ?? "")),
        );
      } else if (typeof adminClient.auth.admin?.mfa?.listFactors === "function") {
        // Explicit server-side factor lookup so omitted factors field never fails open
        try {
          const { data: fData, error: fErr } = await adminClient.auth.admin.mfa.listFactors({
            userId: data.user.id,
          });
          if (fErr) {
            logSecurityEvent("mfa_factor_lookup_failed", { userId: data.user.id });
            hasVerifiedMfaFactor = true;
          } else {
            const allFactors = Array.isArray(fData?.factors) ? fData.factors : [];
            hasVerifiedMfaFactor = allFactors.some(
              // deno-lint-ignore no-explicit-any
              (f: any) => f && f.status === "verified" && INTERACTIVE_MFA_FACTOR_TYPES.has(String(f.factor_type ?? "")),
            );
          }
        } catch {
          logSecurityEvent("mfa_factor_lookup_failed", { userId: data.user.id });
          hasVerifiedMfaFactor = true;
        }
      }
      let enforcePrivilegedMfa = false;
      if (typeof adminClient.rpc === "function") {
        try {
          const { data: strictFlag, error: rpcErr } = await adminClient.rpc("get_privileged_mfa_policy");
          if (rpcErr) {
            const code = String(rpcErr.code ?? "");
            // Tolerate pre-Migration-006 missing RPC cleanly; fail closed on unexpected DB errors
            if (code !== "PGRST202" && code !== "42883") {
              enforcePrivilegedMfa = true;
            }
          } else if (strictFlag === true) {
            enforcePrivilegedMfa = true;
          }
        } catch {
          enforcePrivilegedMfa = true;
        }
      }
      return {
        id: data.user.id,
        email: data.user.email ?? undefined,
        aal: decodeValidatedJwtAal(token),
        hasVerifiedMfaFactor,
        enforcePrivilegedMfa,
      };
    },
    async getProfileById(id: string) {
      const { data, error } = await adminClient
        .from("profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new AuthBackendError(`Profile lookup error: ${error.code ?? "DB_ERR"}`);
      }
      if (!data) return null;
      return data as AuthenticatedActor;
    },
  };
}
