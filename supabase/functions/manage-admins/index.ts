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
      const { data } = id
        ? await query.eq("id", id).maybeSingle()
        : await query.eq("email", email ?? "").maybeSingle();
      return data ?? null;
    },
    async updateProfileRoleStatus(targetId, updates) {
      const { error } = await admin.from("profiles").update(updates).eq("id", targetId);
      return error ? error.message : null;
    },
    async assignCoordinator(coordinatorId, competitionId, actorId) {
      const { data, error } = await admin
        .from("coordinator_assignments")
        .upsert(
          { coordinator_id: coordinatorId, competition_id: competitionId, assigned_by: actorId },
          { onConflict: "coordinator_id,competition_id" },
        )
        .select("*")
        .single();
      if (error) return { data: null, error: error.message };
      return { data, error: null };
    },
    async removeCoordinatorAssignment(assignmentId) {
      const { error } = await admin.from("coordinator_assignments").delete().eq("id", assignmentId);
      return error ? error.message : null;
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
