import { authenticateRequest, requireRole, type AuthLookup } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { errorResponse, jsonResponse, logSecurityEvent } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";
import { isValidCompetitionId, parsePagination } from "../_shared/validation.ts";

export interface GetCoordRegsDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  getAssignedCompetitionIds(coordinatorId: string): Promise<string[]>;
  fetchCoordinatorRegistrations(params: {
    competitionIds: string[];
    assignedCompetitionIds: string[];
    page: number;
    limit: number;
    offset: number;
  }): Promise<{
    rows: Record<string, unknown>[];
    total: number;
    analytics?: Record<string, unknown> | null;
    error: string | null;
  }>;
}

export function makeGetCoordinatorRegistrationsHandler(deps: GetCoordRegsDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["GET"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const forbidden = requireRole(actor, ["coordinator", "admin", "super_admin"], corsHeaders);
    if (forbidden) return forbidden;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `coord_regs:${actor.id}`,
      60,
      60,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    const url = new URL(req.url);
    const { page, limit, offset } = parsePagination(url, 20, 50);
    const requestedComp = url.searchParams.get("competition_id")?.trim() || null;

    if (requestedComp && !isValidCompetitionId(requestedComp)) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid competition_id filter.", corsHeaders);
    }

    let allAssigned: string[] = [];
    let allowedComps: string[];
    if (actor.role === "coordinator") {
      allAssigned = await deps.getAssignedCompetitionIds(actor.id);
      if (requestedComp && !allAssigned.includes(requestedComp)) {
        logSecurityEvent("coordinator_unassigned_comp_denied", {
          userId: actor.id,
          requestedComp,
        });
        return errorResponse(403, "FORBIDDEN", "You are not assigned to this competition.", corsHeaders);
      }
      allowedComps = requestedComp ? [requestedComp] : allAssigned;
      if (allowedComps.length === 0) {
        return jsonResponse(
          {
            assigned_competitions: [],
            registrations: [],
            analytics: null,
            pagination: { page, limit, total: 0, total_pages: 1 },
          },
          200,
          corsHeaders,
        );
      }
    } else {
      allowedComps = requestedComp ? [requestedComp] : [];
      allAssigned = allowedComps;
    }

    const res = await deps.fetchCoordinatorRegistrations({
      competitionIds: allowedComps,
      assignedCompetitionIds: allAssigned,
      page,
      limit,
      offset,
    });
    if (res.error) {
      return errorResponse(500, "FETCH_FAILED", "Could not fetch assigned registrations.", corsHeaders);
    }

    return jsonResponse(
      {
        assigned_competitions: actor.role === "coordinator" ? allAssigned : allowedComps,
        registrations: res.rows,
        analytics: res.analytics ?? null,
        pagination: {
          page,
          limit,
          total: res.total,
          total_pages: Math.max(1, Math.ceil(res.total / limit)),
        },
      },
      200,
      corsHeaders,
    );
  }, allowedOrigins);
}
