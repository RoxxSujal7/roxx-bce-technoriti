import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeManageAdminsHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeManageAdminsHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    async listStaffAndAssignments() {
      const [staffRes, assignRes] = await Promise.all([
        admin
          .from("profiles")
          .select("id, email, full_name, role, is_active, created_at")
          .in("role", ["super_admin", "admin", "coordinator"])
          .order("created_at", { ascending: true }),
        admin
          .from("coordinator_assignments")
          .select("id, coordinator_id, competition_id, created_at, coordinator:profiles!coordinator_assignments_coordinator_id_fkey(email, full_name), competition:competitions(id, title)")
          .order("created_at", { ascending: false }),
      ]);
      if (staffRes.error || assignRes.error) {
        return { staff: [], assignments: [], error: staffRes.error?.message ?? assignRes.error?.message ?? "Failed" };
      }
      return { staff: staffRes.data ?? [], assignments: assignRes.data ?? [], error: null };
    },
    async findProfileByEmailOrId({ id, email }) {
      const query = admin.from("profiles").select("id, email, role, is_active");
      const { data, error } = id
        ? await query.eq("id", id).maybeSingle()
        : await query.eq("email", email ?? "").maybeSingle();
      if (error) {
        throw new Error(`Profile lookup failed: ${error.message}`);
      }
      return data ?? null;
    },
    async updateProfileRoleStatus(targetId, updates, actorId) {
      if (updates.role) {
        const { error } = await admin.rpc("admin_set_profile_role_tx", {
          p_actor_id: actorId,
          p_target_id: targetId,
          p_next_role: updates.role,
        });
        return error ? { error: error.message, audited: false } : { error: null, audited: true };
      }

      if (typeof updates.is_active === "boolean") {
        const { data: prevRow, error: prevErr } = await admin
          .from("profiles")
          .select("is_active")
          .eq("id", targetId)
          .maybeSingle();
        if (prevErr || !prevRow) {
          return { error: prevErr?.message ?? "Profile not found", audited: false };
        }

        // Update GoTrue ban state first so failures never leave an inconsistent/audited DB mutation
        if (typeof admin.auth?.admin?.updateUserById === "function") {
          try {
            const { error: banErr } = await admin.auth.admin.updateUserById(targetId, {
              ban_duration: updates.is_active ? "none" : "876000h",
            });
            if (banErr) {
              return { error: banErr.message || "Failed to update auth session ban state.", audited: false };
            }
          } catch (err) {
            return { error: err instanceof Error ? err.message : "Failed to update auth session ban state.", audited: false };
          }
        }

        const { error: txErr } = await admin.rpc("admin_set_profile_active_tx", {
          p_actor_id: actorId,
          p_target_id: targetId,
          p_is_active: updates.is_active,
        });
        if (txErr) {
          if (typeof admin.auth?.admin?.updateUserById === "function") {
            const { error: revertErr } = await admin.auth.admin.updateUserById(targetId, {
              ban_duration: prevRow.is_active ? "none" : "876000h",
            });
            if (revertErr) {
              console.error(JSON.stringify({ event: "auth_ban_rollback_failed", targetId }));
            }
          }
          return { error: txErr.message, audited: false };
        }
        return { error: null, audited: true };
      }

      return { error: "No supported profile fields specified", audited: false };
    },
    async assignCoordinator(coordinatorId, competitionId, actorId) {
      const { data, error } = await admin.rpc("admin_assign_coordinator_tx", {
        p_actor_id: actorId,
        p_coordinator_id: coordinatorId,
        p_competition_id: competitionId,
      });
      if (error) return { data: null, error: error.message, audited: false };
      return { data, error: null, audited: true };
    },
    async removeCoordinatorAssignment(assignmentId, actorId) {
      const { error } = await admin.rpc("admin_remove_coordinator_tx", {
        p_actor_id: actorId,
        p_assignment_id: assignmentId,
      });
      return error ? { error: error.message, audited: false } : { error: null, audited: true };
    },
    async writeAuditLog(entry) {
      const { error } = await admin.from("audit_logs").insert(entry);
      if (error) {
        throw new Error(`Audit log append failed: ${error.message}`);
      }
    },
  });
  return handler(req);
});
