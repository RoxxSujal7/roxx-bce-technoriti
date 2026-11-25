import { authenticateRequest, type AuthLookup } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";

export interface GetMyRegistrationsDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  fetchUserDashboard(userId: string): Promise<{
    profile: Record<string, unknown> | null;
    registrations: Record<string, unknown>[];
    coordinatorAssignments: Record<string, unknown>[];
    error: string | null;
  }>;
  upiConfig?: { vpa: string; payeeName: string };
}

export function makeGetMyRegistrationsHandler(deps: GetMyRegistrationsDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["GET"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `my_regs:${actor.id}`,
      60,
      60,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    const result = await deps.fetchUserDashboard(actor.id);
    if (result.error) {
      return errorResponse(500, "FETCH_FAILED", "Could not load your registrations.", corsHeaders);
    }

    const upiVpa = deps.upiConfig?.vpa ?? Deno.env.get("UPI_VPA") ?? "";
    const upiPayeeName = deps.upiConfig?.payeeName ?? Deno.env.get("UPI_PAYEE_NAME") ?? "Technoriti 2026 BCE";

    return jsonResponse(
      {
        profile: result.profile,
        registrations: result.registrations,
        coordinator_assignments: result.coordinatorAssignments,
        upi_config: {
          configured: Boolean(upiVpa),
          vpa: upiVpa || null,
          payee_name: upiPayeeName,
        },
      },
      200,
      corsHeaders,
    );
  }, allowedOrigins);
}
