import { errorResponse, logSecurityEvent } from "./http.ts";

export type UserRole = "super_admin" | "admin" | "coordinator" | "participant";

export interface AuthenticatedActor {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthLookup {
  getUserByToken(token: string): Promise<{ id: string; email?: string } | null>;
  getProfileById(id: string): Promise<AuthenticatedActor | null>;
}

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1].trim() : null;
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

  const user = await lookup.getUserByToken(token);
  if (!user || !user.id) {
    logSecurityEvent("auth_invalid_token");
    return {
      ok: false,
      response: errorResponse(401, "INVALID_TOKEN", "Invalid or expired session.", corsHeaders),
    };
  }

  const profile = await lookup.getProfileById(user.id);
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

  return { ok: true, actor: profile };
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

// deno-lint-ignore no-explicit-any
export function createSupabaseAuthLookup(adminClient: any): AuthLookup {
  return {
    async getUserByToken(token: string) {
      const { data, error } = await adminClient.auth.getUser(token);
      if (error || !data?.user) return null;
      return { id: data.user.id, email: data.user.email ?? undefined };
    },
    async getProfileById(id: string) {
      const { data, error } = await adminClient
        .from("profiles")
        .select("id, email, full_name, role, is_active")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return null;
      return data as AuthenticatedActor;
    },
  };
}
