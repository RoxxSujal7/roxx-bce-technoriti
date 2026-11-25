import { authenticateRequest, requireRole, type AuthLookup, type UserRole } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { errorResponse, jsonResponse, logSecurityEvent, parseJsonBody } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";
import { cleanText, isValidCompetitionId, isValidUuid } from "../_shared/validation.ts";

export interface ManageAdminsDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  listStaffAndAssignments(): Promise<{
    staff: Record<string, unknown>[];
    assignments: Record<string, unknown>[];
    error: string | null;
  }>;
  findProfileByEmailOrId(idOrEmail: { id?: string; email?: string }): Promise<{
    id: string;
    email: string;
    role: UserRole;
    is_active: boolean;
  } | null>;
  updateProfileRoleStatus(targetId: string, updates: { role?: UserRole; is_active?: boolean }): Promise<string | null>;
  assignCoordinator(coordinatorId: string, competitionId: string, actorId: string): Promise<{ data: Record<string, unknown> | null; error: string | null }>;
  removeCoordinatorAssignment(assignmentId: string): Promise<string | null>;
  writeAuditLog(entry: { actor_id: string; actor_role: string; action: string; target_table: string; target_id: string; details: Record<string, unknown> }): Promise<void>;
}

const ASSIGNABLE_ROLES = new Set<UserRole>(["admin", "coordinator", "participant"]);

export function makeManageAdminsHandler(deps: ManageAdminsDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["GET", "POST"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const forbidden = requireRole(actor, ["super_admin"], corsHeaders);
    if (forbidden) return forbidden;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `manage_admins:${actor.id}`,
      30,
      60,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    if (req.method === "GET") {
      const res = await deps.listStaffAndAssignments();
      if (res.error) {
        return errorResponse(500, "FETCH_FAILED", "Could not fetch administrator directory.", corsHeaders);
      }
      return jsonResponse({ staff: res.staff, assignments: res.assignments }, 200, corsHeaders);
    }

    const parsed = await parseJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) return errorResponse(parsed.status, "INVALID_JSON", parsed.message, corsHeaders);
    const body = parsed.data;
    const action = body.action;

    if (action === "set_role" || action === "set_active") {
      const targetId = isValidUuid(body.target_user_id) ? body.target_user_id.trim() : undefined;
      const targetEmail = cleanText(body.target_email, 5, 254)?.toLowerCase();
      if (!targetId && !targetEmail) {
        return errorResponse(400, "VALIDATION_ERROR", "target_user_id or target_email is required.", corsHeaders);
      }

      const target = await deps.findProfileByEmailOrId({ id: targetId, email: targetEmail });
      if (!target) {
        return errorResponse(404, "NOT_FOUND", "Target account not found. The user must sign up first.", corsHeaders);
      }

      if (target.id === actor.id) {
        return errorResponse(400, "SELF_MODIFICATION_DENIED", "Super admins cannot demote or deactivate themselves.", corsHeaders);
      }

      if (target.role === "super_admin") {
        return errorResponse(403, "FORBIDDEN", "Other super_admin accounts cannot be modified through API.", corsHeaders);
      }

      if (action === "set_role") {
        const nextRole = body.role as UserRole;
        if (!ASSIGNABLE_ROLES.has(nextRole)) {
          return errorResponse(400, "VALIDATION_ERROR", "Role must be admin, coordinator, or participant.", corsHeaders);
        }
        const err = await deps.updateProfileRoleStatus(target.id, { role: nextRole });
        if (err) return errorResponse(500, "UPDATE_FAILED", "Failed to update role.", corsHeaders);

        await deps.writeAuditLog({
          actor_id: actor.id,
          actor_role: actor.role,
          action: "ROLE_UPDATED",
          target_table: "profiles",
          target_id: target.id,
          details: { previous_role: target.role, new_role: nextRole },
        });
        logSecurityEvent("admin_role_updated", { actorId: actor.id, targetId: target.id, nextRole });
        return jsonResponse({ updated: true, target_user_id: target.id, role: nextRole }, 200, corsHeaders);
      } else {
        if (typeof body.is_active !== "boolean") {
          return errorResponse(400, "VALIDATION_ERROR", "is_active boolean is required.", corsHeaders);
        }
        const err = await deps.updateProfileRoleStatus(target.id, { is_active: body.is_active });
        if (err) return errorResponse(500, "UPDATE_FAILED", "Failed to update account status.", corsHeaders);

        await deps.writeAuditLog({
          actor_id: actor.id,
          actor_role: actor.role,
          action: body.is_active ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED",
          target_table: "profiles",
          target_id: target.id,
          details: { role: target.role, is_active: body.is_active },
        });
        return jsonResponse({ updated: true, target_user_id: target.id, is_active: body.is_active }, 200, corsHeaders);
      }
    }

    if (action === "assign_coordinator") {
      const coordId = isValidUuid(body.coordinator_id) ? body.coordinator_id.trim() : null;
      const compId = isValidCompetitionId(body.competition_id) ? body.competition_id.trim() : null;
      if (!coordId || !compId) {
        return errorResponse(400, "VALIDATION_ERROR", "Valid coordinator_id UUID and competition_id are required.", corsHeaders);
      }

      const coord = await deps.findProfileByEmailOrId({ id: coordId });
      if (!coord || coord.role !== "coordinator" || !coord.is_active) {
        return errorResponse(400, "VALIDATION_ERROR", "Target user must be an active coordinator account.", corsHeaders);
      }

      const assigned = await deps.assignCoordinator(coordId, compId, actor.id);
      if (assigned.error) {
        return errorResponse(400, "ASSIGN_FAILED", "Could not assign coordinator to competition.", corsHeaders);
      }

      await deps.writeAuditLog({
        actor_id: actor.id,
        actor_role: actor.role,
        action: "COORDINATOR_ASSIGNED",
        target_table: "coordinator_assignments",
        target_id: String(assigned.data?.id ?? `${coordId}:${compId}`),
        details: { coordinator_id: coordId, competition_id: compId },
      });
      return jsonResponse({ assignment: assigned.data }, 201, corsHeaders);
    }

    if (action === "remove_coordinator") {
      const assignmentId = isValidUuid(body.assignment_id) ? body.assignment_id.trim() : null;
      if (!assignmentId) {
        return errorResponse(400, "VALIDATION_ERROR", "Valid assignment_id UUID is required.", corsHeaders);
      }

      const err = await deps.removeCoordinatorAssignment(assignmentId);
      if (err) return errorResponse(400, "REMOVE_FAILED", "Could not remove coordinator assignment.", corsHeaders);

      await deps.writeAuditLog({
        actor_id: actor.id,
        actor_role: actor.role,
        action: "COORDINATOR_UNASSIGNED",
        target_table: "coordinator_assignments",
        target_id: assignmentId,
        details: {},
      });
      return jsonResponse({ removed: true, assignment_id: assignmentId }, 200, corsHeaders);
    }

    return errorResponse(400, "INVALID_ACTION", "Unsupported manage-admins action.", corsHeaders);
  }, allowedOrigins);
}
