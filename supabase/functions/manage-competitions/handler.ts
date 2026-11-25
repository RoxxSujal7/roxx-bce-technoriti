import { authenticateRequest, requireRole, type AuthLookup } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { errorResponse, jsonResponse, parseJsonBody } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";
import { cleanText, isValidCompetitionId, parseStrictInt } from "../_shared/validation.ts";

export interface ManageCompetitionsDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  listCatalog(): Promise<{ competitions: Record<string, unknown>[]; accommodationPlans: Record<string, unknown>[]; error: string | null }>;
  updateCompetition(id: string, updates: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }>;
  updateAccommodationPlan(id: string, updates: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }>;
  writeAuditLog(entry: { actor_id: string; actor_role: string; action: string; target_table: string; target_id: string; details: Record<string, unknown> }): Promise<void>;
}

const VALID_ACCOM = new Set(["none", "lodging", "mess", "both"]);

export function makeManageCompetitionsHandler(deps: ManageCompetitionsDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["GET", "PATCH"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const forbidden = requireRole(actor, ["admin", "super_admin"], corsHeaders);
    if (forbidden) return forbidden;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `manage_comps:${actor.id}`,
      40,
      60,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    if (req.method === "GET") {
      const cat = await deps.listCatalog();
      if (cat.error) return errorResponse(500, "FETCH_FAILED", "Could not fetch catalog.", corsHeaders);
      return jsonResponse({ competitions: cat.competitions, accommodation_plans: cat.accommodationPlans }, 200, corsHeaders);
    }

    const parsed = await parseJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) return errorResponse(parsed.status, "INVALID_JSON", parsed.message, corsHeaders);
    const body = parsed.data;

    if (body.target === "accommodation") {
      if (actor.role !== "super_admin") {
        return errorResponse(403, "FORBIDDEN", "Only super_admin can modify accommodation tariffs.", corsHeaders);
      }
      const id = typeof body.id === "string" && VALID_ACCOM.has(body.id) ? body.id : null;
      if (!id) return errorResponse(400, "VALIDATION_ERROR", "Invalid accommodation plan ID.", corsHeaders);

      const updates: Record<string, unknown> = {};
      if (body.price_per_person_inr !== undefined) {
        const price = parseStrictInt(body.price_per_person_inr, 0, 10000);
        if (price === null) {
          return errorResponse(400, "VALIDATION_ERROR", "price_per_person_inr must be an integer 0..10000.", corsHeaders);
        }
        updates.price_per_person_inr = price;
      }
      if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
      if (Object.keys(updates).length === 0) {
        return errorResponse(400, "VALIDATION_ERROR", "No valid fields provided.", corsHeaders);
      }

      const res = await deps.updateAccommodationPlan(id, updates);
      if (res.error) return errorResponse(400, "UPDATE_FAILED", "Could not update accommodation plan.", corsHeaders);
      await deps.writeAuditLog({
        actor_id: actor.id,
        actor_role: actor.role,
        action: "TARIFF_UPDATED",
        target_table: "accommodation_plans",
        target_id: id,
        details: updates,
      });
      return jsonResponse({ accommodation_plan: res.data }, 200, corsHeaders);
    }

    // Competition update
    const compId = isValidCompetitionId(body.id) ? body.id.trim() : null;
    if (!compId) return errorResponse(400, "VALIDATION_ERROR", "Valid competition id is required.", corsHeaders);

    const updates: Record<string, unknown> = {};
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (body.venue !== undefined) {
      const v = cleanText(body.venue, 2, 160);
      if (!v) return errorResponse(400, "VALIDATION_ERROR", "Invalid venue.", corsHeaders);
      updates.venue = v;
    }
    if (body.event_date !== undefined) {
      const d = cleanText(body.event_date, 2, 80);
      if (!d) return errorResponse(400, "VALIDATION_ERROR", "Invalid event_date.", corsHeaders);
      updates.event_date = d;
    }
    if (body.event_time !== undefined) {
      const t = cleanText(body.event_time, 2, 40);
      if (!t) return errorResponse(400, "VALIDATION_ERROR", "Invalid event_time.", corsHeaders);
      updates.event_time = t;
    }

    // Fee modifications strictly restricted to super_admin
    if (body.fee_inr !== undefined || body.fee_type !== undefined) {
      if (actor.role !== "super_admin") {
        return errorResponse(403, "FORBIDDEN", "Only super_admin can modify competition fees.", corsHeaders);
      }
      if (body.fee_inr !== undefined) {
        const fee = parseStrictInt(body.fee_inr, 0, 25000);
        if (fee === null) {
          return errorResponse(400, "VALIDATION_ERROR", "fee_inr must be an integer 0..25000.", corsHeaders);
        }
        updates.fee_inr = fee;
      }
      if (body.fee_type !== undefined) {
        if (body.fee_type !== "per_member" && body.fee_type !== "per_team") {
          return errorResponse(400, "VALIDATION_ERROR", "fee_type must be per_member or per_team.", corsHeaders);
        }
        updates.fee_type = body.fee_type;
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(400, "VALIDATION_ERROR", "No valid competition fields provided.", corsHeaders);
    }

    const res = await deps.updateCompetition(compId, updates);
    if (res.error) return errorResponse(400, "UPDATE_FAILED", "Could not update competition record.", corsHeaders);

    await deps.writeAuditLog({
      actor_id: actor.id,
      actor_role: actor.role,
      action: "COMPETITION_UPDATED",
      target_table: "competitions",
      target_id: compId,
      details: updates,
    });
    return jsonResponse({ competition: res.data }, 200, corsHeaders);
  }, allowedOrigins);
}
